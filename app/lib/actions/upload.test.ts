import { describe, it, mock, beforeEach, before } from "node:test";
import { expect } from "expect";

// 1. MOCK'LAR
const uploaderMock = {
  upload: mock.fn(async () => ({
    secure_url: "https://res.cloudinary.com/demo/image/upload/v1/general/test.png",
    public_id: "general/test",
  })),
};

const cloudinaryMock = {
  uploader: uploaderMock,
  url: mock.fn(() => "https://signed.url"),
};

const BUCKET_DELIVERY_TYPE = {
  vehicles: "upload",
  documents: "authenticated",
  avatars: "upload",
  general: "upload",
};

const resourceTypeForMime = (mimeType: string) => {
  if (mimeType === "application/pdf") return "raw";
  if (mimeType.startsWith("image/")) return "image";
  return "raw";
};

const authMiddlewareMock = {
  authenticatedAction: mock.fn((cb) => cb),
  maybeAuthenticatedAction: mock.fn((cb) => cb),
};

const headersMock = {
  headers: mock.fn(async () => ({
    get: mock.fn(() => "127.0.0.1"),
  })),
};

const rateLimiterMock = {
  rateLimit: mock.fn(async () => ({ success: true })),
};

const dbMock = {
  document: {
    findFirst: mock.fn(),
  },
};

mock.module("../cloudinary.ts", {
  namedExports: {
    cloudinary: cloudinaryMock,
    BUCKET_DELIVERY_TYPE,
    resourceTypeForMime,
    ensureCloudinaryConfigured: () => {},
    isCloudinaryConfigured: () => true,
  },
});
mock.module("../auth-middleware.ts", { namedExports: authMiddlewareMock });
mock.module("next/headers", { namedExports: headersMock });
mock.module("../rate-limiter.ts", { namedExports: rateLimiterMock });
mock.module("../db.ts", { namedExports: { db: dbMock } });

// 2. TEST GRUPLARI
describe("Upload Actions", () => {
  let uploadActions: unknown;

  before(async () => {
    uploadActions = await import("./upload");
  });

  beforeEach(() => {
    uploaderMock.upload.mock.resetCalls();
    cloudinaryMock.url.mock.resetCalls();
  });

  describe("uploadImageAction() metodu", () => {
    const mockUser = { id: "user-1" };
    const mockBase64 =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

    it("should_UploadImageAndReturnSecureUrl_WhenValidBase64Provided", async () => {
      // Act
      const result = await uploadActions.uploadImageAction(
        mockUser,
        mockBase64,
        "general"
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.url).toBe(
        "https://res.cloudinary.com/demo/image/upload/v1/general/test.png"
      );
      expect(result.publicId).toBe("general/test");
      expect(uploaderMock.upload.mock.calls.length).toBe(1);
    });

    it("should_UploadDocumentsAsAuthenticated_ToPreservePrivacy", async () => {
      // Act
      await uploadActions.uploadImageAction(
        mockUser,
        mockBase64,
        "documents",
        "invoices"
      );

      // Assert — private delivery, and bucket prefixes the folder path
      const opts = uploaderMock.upload.mock.calls[0].arguments[1];
      expect(opts.type).toBe("authenticated");
      expect(opts.folder).toBe("documents/invoices");
    });

    it("should_PinResourceType_ForEveryAcceptedFormat", async () => {
      // resource_type must never be "auto": getSignedUrlAction reconstructs it
      // from the stored URL, so an unobservable server-side choice would break
      // signature generation for private documents.
      //
      // PDF uploads are temporarily disabled service-wide (see
      // should_RejectPdfUpload_WhileServiceIsDisabled below), so only image
      // formats are exercised here.
      const formats = [
        { mime: "image/jpeg", expected: "image" },
        { mime: "image/jpg", expected: "image" },
        { mime: "image/png", expected: "image" },
        { mime: "image/webp", expected: "image" },
        { mime: "image/gif", expected: "image" },
      ];

      for (const { mime, expected } of formats) {
        uploaderMock.upload.mock.resetCalls();
        await uploadActions.uploadImageAction(
          mockUser,
          `data:${mime};base64,aGVsbG8=`,
          "documents"
        );
        const opts = uploaderMock.upload.mock.calls[0].arguments[1];
        expect(opts.resource_type).toBe(expected);
        expect(opts.type).toBe("authenticated");
      }
    });

    it("should_RejectPdfUpload_WhileServiceIsDisabled", async () => {
      await expect(
        uploadActions.uploadImageAction(
          mockUser,
          "data:application/pdf;base64,JVBERi0=",
          "documents"
        )
      ).rejects.toThrow(/PDF uploads are temporarily unavailable/);
      expect(uploaderMock.upload.mock.calls.length).toBe(0);
    });

    it("should_RoundTripResourceType_FromUploadToSignedUrl", async () => {
      // End-to-end guard: whatever resource_type an asset is stored under must
      // be the one used to sign it back, or every document read 404s.
      uploaderMock.upload.mock.mockImplementationOnce(async () => ({
        secure_url:
          "https://res.cloudinary.com/daeiwh3qr/image/authenticated/v1712345678/documents/invoice.png",
        public_id: "documents/invoice",
      }));

      const uploaded = await uploadActions.uploadImageAction(
        mockUser,
        mockBase64,
        "documents"
      );
      const uploadResourceType =
        uploaderMock.upload.mock.calls[0].arguments[1].resource_type;

      dbMock.document.findFirst.mock.mockImplementation(async () => ({
        id: "doc-1",
      }));
      await uploadActions.getSignedUrlAction(
        mockUser,
        uploaded.url,
        "documents"
      );

      const signOpts = cloudinaryMock.url.mock.calls[0].arguments[1];
      expect(signOpts.resource_type).toBe(uploadResourceType);
    });

    it("should_StripPermanentSignature_FromStoredDocumentUrl", async () => {
      // Cloudinary's secure_url for authenticated assets embeds a permanent
      // signature token. Persisting it would grant non-expiring access to
      // anyone reading the DB row, bypassing the 1h expiry and the ownership
      // check — so the stored URL must be the bare, unsigned reference.
      uploaderMock.upload.mock.mockImplementationOnce(async () => ({
        secure_url:
          "https://res.cloudinary.com/daeiwh3qr/image/authenticated/s--AbC123--/v1712345678/documents/secret.png",
        public_id: "documents/secret",
      }));

      const result = await uploadActions.uploadImageAction(
        mockUser,
        mockBase64,
        "documents"
      );

      expect(result.url).not.toMatch(/\/s--[^/]+--\//);
      expect(result.url).toBe(
        "https://res.cloudinary.com/daeiwh3qr/image/authenticated/v1712345678/documents/secret.png"
      );
    });

    it("should_KeepSecureUrlIntact_ForPublicBuckets", async () => {
      // Public assets carry no signature token; leave their URL untouched.
      uploaderMock.upload.mock.mockImplementationOnce(async () => ({
        secure_url:
          "https://res.cloudinary.com/daeiwh3qr/image/upload/v1712345678/vehicles/truck.png",
        public_id: "vehicles/truck",
      }));

      const result = await uploadActions.uploadImageAction(
        mockUser,
        mockBase64,
        "vehicles"
      );

      expect(result.url).toBe(
        "https://res.cloudinary.com/daeiwh3qr/image/upload/v1712345678/vehicles/truck.png"
      );
    });

    it("should_ThrowError_WhenAnonymousUploadsToPrivateBucket", async () => {
      // Act & Assert — documents is not anon-writable
      await expect(
        uploadActions.uploadImageAction(null, mockBase64, "documents")
      ).rejects.toThrow("Authentication required to upload to this bucket.");
      expect(uploaderMock.upload.mock.calls.length).toBe(0);
    });

    it("should_ThrowError_WhenFileTypeIsUnsupported", async () => {
      const invalidBase64 = "data:application/xml;base64,PHhtbD4...";
      await expect(
        uploadActions.uploadImageAction(mockUser, invalidBase64)
      ).rejects.toThrow("Unsupported file type");
    });

    it("should_RateLimitAnonymousUploads_WhenLimitExceeded", async () => {
      // Arrange — anonymous caller, per-IP limiter says no
      rateLimiterMock.rateLimit.mock.mockImplementationOnce(async () => ({
        success: false,
      }));

      // Act & Assert
      await expect(
        uploadActions.uploadImageAction(null, mockBase64, "avatars")
      ).rejects.toThrow("Too many uploads");
      expect(uploaderMock.upload.mock.calls.length).toBe(0);
    });

    it("should_NotRateLimit_AuthenticatedUploads", async () => {
      // Arrange
      rateLimiterMock.rateLimit.mock.resetCalls();

      // Act
      await uploadActions.uploadImageAction(mockUser, mockBase64, "general");

      // Assert — session-based throttling is authenticatedAction's job
      expect(rateLimiterMock.rateLimit.mock.calls.length).toBe(0);
    });
  });

  describe("getSignedUrlAction() metodu", () => {
    const mockUser = { id: "user-1", companyId: "company-1" };
    const docUrl =
      "https://res.cloudinary.com/demo/image/authenticated/v1712345678/documents/test.pdf";

    beforeEach(() => {
      dbMock.document.findFirst.mock.resetCalls();
    });

    it("should_GenerateSignedUrl_WhenValidUrlProvided", async () => {
      // Arrange — the caller's tenant owns a Document row for this URL
      dbMock.document.findFirst.mock.mockImplementation(async () => ({
        id: "doc-1",
      }));

      // Act
      const result = await uploadActions.getSignedUrlAction(
        mockUser,
        docUrl,
        "documents"
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.url).toBe("https://signed.url");
      expect(result.signed).toBe(true);
      expect(cloudinaryMock.url.mock.calls.length).toBe(1);

      // public_id is parsed out of the delivery URL, version and extension stripped
      const [publicId, opts] = cloudinaryMock.url.mock.calls[0].arguments;
      expect(publicId).toBe("documents/test");
      expect(opts.sign_url).toBe(true);
      expect(opts.type).toBe("authenticated");
      expect(opts.expires_at).toBeGreaterThan(Math.floor(Date.now() / 1000));

      // Ownership check is tenant-scoped
      expect(dbMock.document.findFirst.mock.calls[0].arguments[0].where).toEqual({
        url: docUrl,
        companyId: "company-1",
      });
    });

    it("should_ThrowError_WhenDocumentIsNotOwnedByTenant", async () => {
      // Arrange — no Document row in the caller's tenant points at this URL
      dbMock.document.findFirst.mock.mockImplementation(async () => null);

      // Act & Assert — IDOR guard blocks signing foreign storage paths
      await expect(
        uploadActions.getSignedUrlAction(
          mockUser,
          "https://res.cloudinary.com/demo/image/authenticated/v1/documents/other.pdf",
          "documents"
        )
      ).rejects.toThrow("Document not found or unauthorized.");
      expect(cloudinaryMock.url.mock.calls.length).toBe(0);
    });

    it("should_ReturnUnsignedUrl_WhenPublicIdCannotBeParsed", async () => {
      // Arrange — a legacy (pre-migration) Supabase URL has no /v<version>/ segment
      dbMock.document.findFirst.mock.mockImplementation(async () => ({
        id: "doc-legacy",
      }));

      // Act
      const result = await uploadActions.getSignedUrlAction(
        mockUser,
        "https://stcbrfzcftmdbpukxsxw.supabase.co/storage/v1/object/documents/old.pdf",
        "documents"
      );

      // Assert — degrades to the raw URL rather than emitting a broken signature
      expect(result.signed).toBe(false);
      expect(cloudinaryMock.url.mock.calls.length).toBe(0);
    });

    it("should_ParseSignedLegacyUrls_WrittenBeforeStripping", async () => {
      // Rows saved before signature-stripping still contain an "s--TOKEN--"
      // segment; those must remain signable rather than silently 404.
      dbMock.document.findFirst.mock.mockImplementation(async () => ({
        id: "doc-legacy-signed",
      }));

      const result = await uploadActions.getSignedUrlAction(
        mockUser,
        "https://res.cloudinary.com/daeiwh3qr/image/authenticated/s--AbC123--/v1712345678/documents/old.pdf",
        "documents"
      );

      expect(result.signed).toBe(true);
      expect(cloudinaryMock.url.mock.calls[0].arguments[0]).toBe(
        "documents/old"
      );
    });

    it("should_ThrowError_WhenUrlIsInvalid", async () => {
      await expect(
        uploadActions.getSignedUrlAction(mockUser, "not-a-url")
      ).rejects.toThrow("Invalid file URL provided.");
    });

    it("should_SetAttachmentFilenameWithoutExtension_WhenDownloadingImageDocument", async () => {
      // Image assets: Cloudinary already appends the real format to both the
      // delivery URL and the Content-Disposition filename. Appending our own
      // extension on top (e.g. "Insurance_Photo.jpg") makes Cloudinary parse
      // it as an invalid second format segment and reject the request with
      // an HTTP 400 — so the attachment name must be bare here.
      dbMock.document.findFirst.mock.mockImplementation(async () => ({
        id: "doc-img",
        name: "Insurance Photo",
      }));

      await uploadActions.getSignedUrlAction(
        mockUser,
        "https://res.cloudinary.com/demo/image/authenticated/v1712345678/documents/1786190533464-nlh6ef.jpg",
        "documents",
        true
      );

      const opts = cloudinaryMock.url.mock.calls[0].arguments[1];
      expect(opts.flags).toBe("attachment:Insurance_Photo");
    });

    it("should_SetAttachmentFilenameWithPdfExtension_WhenDownloadingRawDocument", async () => {
      dbMock.document.findFirst.mock.mockImplementation(async () => ({
        id: "doc-pdf",
        name: "Vehicle Registration",
      }));

      await uploadActions.getSignedUrlAction(
        mockUser,
        "https://res.cloudinary.com/demo/raw/authenticated/v1712345678/documents/1786190533464-nlh6ef",
        "documents",
        true
      );

      const opts = cloudinaryMock.url.mock.calls[0].arguments[1];
      expect(opts.flags).toBe("attachment:Vehicle_Registration.pdf");
    });

    it("should_NotSetAttachmentFlag_WhenNotDownloading", async () => {
      dbMock.document.findFirst.mock.mockImplementation(async () => ({
        id: "doc-view",
        name: "Vehicle Registration",
      }));

      await uploadActions.getSignedUrlAction(mockUser, docUrl, "documents", false);

      const opts = cloudinaryMock.url.mock.calls[0].arguments[1];
      expect(opts.flags).toBeUndefined();
    });

    it("should_NotAppendExtension_WhenLegacyImageUrlHasNoExtension", async () => {
      // Guards against a URL shape this app shouldn't produce going forward,
      // but may still hold from before this fix — an image delivery URL with
      // no extension at all. Image attachments never carry an extension
      // (Cloudinary appends its own), so this must behave the same as any
      // other image download.
      dbMock.document.findFirst.mock.mockImplementation(async () => ({
        id: "doc-legacy-img",
        name: "old scan",
      }));

      await uploadActions.getSignedUrlAction(
        mockUser,
        "https://res.cloudinary.com/demo/image/authenticated/v1712345678/documents/legacy-no-ext",
        "documents",
        true
      );

      const opts = cloudinaryMock.url.mock.calls[0].arguments[1];
      expect(opts.flags).toBe("attachment:old_scan");
    });

    it("should_ReturnResourceType_ForConsumerPreviewBranching", async () => {
      // The client (DocumentViewerDialog) can't infer PDF vs image from an
      // extension-less signed URL, so it relies on this field instead.
      dbMock.document.findFirst.mock.mockImplementation(async () => ({
        id: "doc-raw",
        name: "test",
      }));

      const result = await uploadActions.getSignedUrlAction(
        mockUser,
        "https://res.cloudinary.com/demo/raw/authenticated/v1712345678/documents/abc",
        "documents"
      );

      expect(result.resourceType).toBe("raw");
    });
  });
});
