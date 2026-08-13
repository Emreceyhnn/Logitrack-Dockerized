"use server";

import { headers } from "next/headers";
import {
  cloudinary,
  ensureCloudinaryConfigured,
  BUCKET_DELIVERY_TYPE,
  resourceTypeForMime,
  type UploadBucket,
  type CloudinaryResourceType,
} from "../cloudinary";
import { logger } from "@/app/lib/logger";
import { db } from "../db";
import { rateLimit } from "../rate-limiter";
import {
  authenticatedAction,
  maybeAuthenticatedAction,
} from "../auth-middleware";

/**
 * Buckets an UNAUTHENTICATED caller may write to. Uploads happen during the
 * pre-account registration flow (profile avatar, company logo), so these two
 * must stay open; every other bucket — notably `documents`, which holds
 * sensitive files under authenticated delivery — requires an authenticated
 * session.
 */
const ANON_WRITABLE_BUCKETS: ReadonlySet<UploadBucket> = new Set([
  "avatars",
  "general",
]);

interface UploadImageResult {
  success: true;
  url: string;
  publicId: string;
}

interface SignedUrlResult {
  success: true;
  url: string;
  signed: boolean;
  resourceType?: CloudinaryResourceType;
}

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

const SIGNED_URL_TTL_SECONDS = 3600;

// Any "data:image/<subtype>" is accepted — Cloudinary itself validates and
// transcodes the actual image bytes, so pinning an exhaustive subtype list
// here only means legitimate formats (avif, heic, bmp, svg+xml, tiff, ...)
// get rejected before ever reaching that check.
//
// PDF uploads are temporarily disabled service-wide (application/pdf is
// deliberately excluded here) — re-add `|application\/pdf` to ALLOWED_MIME_PATTERN
// to restore them once the service issue is resolved.
const ALLOWED_MIME_PATTERN = /^data:image\/[a-zA-Z0-9.+-]+;/;

/**
 * tr-base64 formatındaki görüntü verisinin geçerliliğini ve boyutunu kontrol eder
 * en-validates the validity and size of the base64-encoded image data
 * input (fileData: string)
 * output (void)
 */
function validateBase64Image(fileData: string): void {
  if (!fileData?.trim()) {
    throw new Error("File data is required.");
  }

  if (!ALLOWED_MIME_PATTERN.test(fileData)) {
    throw new Error(
      fileData.startsWith("data:application/pdf")
        ? "PDF uploads are temporarily unavailable. Please try again later."
        : "Unsupported file type. Only image files are allowed."
    );
  }

  const base64Part = fileData.split(",")[1] ?? "";
  const estimatedBytes = (base64Part.length * 3) / 4;
  if (estimatedBytes > MAX_FILE_SIZE_BYTES) {
    throw new Error(
      `File size exceeds the ${MAX_FILE_SIZE_BYTES / 1024 / 1024} MB limit.`
    );
  }
}

/**
 * tr-verilen dosya URL'sinin geçerli bir URL olup olmadığını doğrular
 * en-validates whether the given file URL is a valid URL
 * input (fileUrl: string)
 * output (void)
 */
function validateFileUrl(fileUrl: string): void {
  if (!fileUrl?.trim()) {
    throw new Error("File URL is required.");
  }
  try {
    new URL(fileUrl);
  } catch {
    throw new Error("Invalid file URL provided.");
  }
}

/**
 * tr-dosyayı Cloudinary'ye yükler
 * en-uploads the file to Cloudinary
 * input (fileData: string, bucket: UploadBucket = "general", folder?: string)
 * output (Promise<UploadImageResult>)
 */
export const uploadImageAction = maybeAuthenticatedAction(
  async (
    _user,
    fileData: string,
    bucket: UploadBucket = "general",
    folder?: string
  ): Promise<UploadImageResult> => {
    if (!_user && !ANON_WRITABLE_BUCKETS.has(bucket)) {
      throw new Error("Authentication required to upload to this bucket.");
    }

    // Authenticated callers are already throttled per-session by
    // `authenticatedAction`; anonymous ones (pre-registration avatar/logo
    // uploads) have no other limiter — Server Action POSTs never pass the
    // /api middleware limiter — so cap them per IP to prevent storage abuse.
    if (!_user) {
      const headerStore = await headers();
      const ip =
        headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        headerStore.get("x-real-ip") ||
        "127.0.0.1";
      const ipLimit = await rateLimit(ip, 10, 3600, "rate-limit:upload-anon:");
      if (!ipLimit.success) {
        throw new Error("Too many uploads. Please try again later.");
      }
    }

    validateBase64Image(fileData);

    // Cloudinary accepts the full data URI directly and derives the extension
    // from it, so no manual buffer handling is needed. We still parse the MIME
    // ourselves to pin resource_type (see resourceTypeForMime).
    const mimeType = fileData.split(";")[0]?.split(":")[1] ?? "";

    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
    // Cloudinary namespaces by folder, not bucket. Keeping the bucket as the
    // top-level folder preserves the old path layout: <bucket>/<folder?>/<name>
    const targetFolder = folder ? `${bucket}/${folder}` : bucket;

    const deliveryType = BUCKET_DELIVERY_TYPE[bucket];
    const resourceType = resourceTypeForMime(mimeType);

    ensureCloudinaryConfigured();

    try {
      const result = await cloudinary.uploader.upload(fileData, {
        folder: targetFolder,
        public_id: fileName,
        // Explicit, never "auto": getSignedUrlAction must be able to
        // reconstruct this exact value from the stored URL, or signatures for
        // private documents won't match and reads 404.
        resource_type: resourceType,
        // `authenticated` assets 404 on their bare delivery URL and require a
        // signed URL — this is the private-bucket equivalent for `documents`.
        type: deliveryType,
        overwrite: false,
      });

      // For `authenticated` assets Cloudinary returns a secure_url that already
      // carries a permanent signature token (".../s--AbC123--/v17.../id.png").
      // Persisting that would hand out non-expiring access to anyone who reads
      // the DB row or a log line, bypassing both the 1-hour expiry and the
      // ownership check in getSignedUrlAction. Strip it and store the bare
      // reference; reads are signed on demand.
      const url =
        deliveryType === "authenticated"
          ? result.secure_url.replace(/\/s--[^/]+--\//, "/")
          : result.secure_url;

      return {
        success: true,
        url,
        publicId: result.public_id,
      };
    } catch (error) {
      logger.error("[uploadImageAction] Cloudinary upload failed:", error);
      const message =
        error instanceof Error ? error.message : "Unknown upload error";
      throw new Error(`Failed to upload to Cloudinary: ${message}`);
    }
  }
);

interface ParsedAssetRef {
  publicId: string;
  resourceType: CloudinaryResourceType;
  extension: string;
}

/**
 * Extracts the Cloudinary public_id and resource_type from a delivery URL.
 *
 * Cloudinary URLs look like:
 *   https://res.cloudinary.com/<cloud>/<resource_type>/<type>/v<version>/<public_id>.<ext>
 * optionally with transformation segments between <type> and the version. The
 * public_id is everything after the version segment, minus the extension.
 *
 * resource_type is read from the path rather than inferred from the file
 * extension: a signature is only valid for the resource_type the asset was
 * actually stored under, and the URL is the one authoritative record of that.
 * 
 * tr-bir teslimat URL'sinden Cloudinary public_id ve resource_type değerlerini çıkarır
 * en-extracts the Cloudinary public_id and resource_type from a delivery URL
 * input (fileUrl: string)
 * output (ParsedAssetRef | null)
 */
function parseAssetRef(fileUrl: string): ParsedAssetRef | null {
  try {
    const { hostname, pathname } = new URL(fileUrl);

    // Legacy pre-migration URLs (e.g. Supabase) are not signable here, and
    // their paths can contain version-looking segments ("/storage/v1/object/")
    // that would otherwise parse into a bogus public_id and produce a broken
    // signed link. Only Cloudinary-hosted assets get signed.
    if (!/(^|\.)res\.cloudinary\.com$/.test(hostname)) {
      return null;
    }

    const segments = pathname.split("/").filter(Boolean);

    // Cloudinary version segments are "v" + a timestamp (10+ digits); the
    // narrower pattern avoids matching short API-version segments like "v1".
    const versionIndex = segments.findIndex((s) => /^v\d{10,}$/.test(s));
    if (versionIndex === -1 || versionIndex === segments.length - 1) {
      return null;
    }

    // Path shape is /<cloud>/<resource_type>/<type>/..., so resource_type sits
    // at index 1 — before any transformation segments.
    const resourceType: CloudinaryResourceType =
      segments[1] === "raw" ? "raw" : "image";

    // Everything after the version is the public_id. Any signature segment
    // ("s--AbC123--") sits *before* the version, so slicing here drops it —
    // which keeps rows written before signature-stripping parseable.
    const publicIdWithExt = segments.slice(versionIndex + 1).join("/");
    const extMatch = publicIdWithExt.match(/\.([^./]+)$/);
    const publicId = extMatch
      ? publicIdWithExt.slice(0, -extMatch[0].length)
      : publicIdWithExt;
    if (!publicId) return null;

    // "raw" delivery URLs carry no extension of their own — Cloudinary
    // echoes back exactly the (extension-less) public_id we stored — so
    // PDF is the only fallback that matches what this app actually uploads
    // under "raw" (see resourceTypeForMime). "image" URLs always carry the
    // real format as their extension.
    const extension = extMatch?.[1] ?? (resourceType === "raw" ? "pdf" : "jpg");

    return { publicId, resourceType, extension };
  } catch {
    return null;
  }
}

/**
 * tr-gizli dosyalara erişim için imzalı ve süreli bir URL oluşturur
 * en-generates a signed and time-limited URL for accessing private files
 * input (fileUrl: string, bucket: UploadBucket = "documents")
 * output (Promise<SignedUrlResult>)
 */
export const getSignedUrlAction = authenticatedAction(
  async (
    user,
    fileUrl: string,
    bucket: UploadBucket = "documents",
    download: boolean = false
  ): Promise<SignedUrlResult> => {
    validateFileUrl(fileUrl);

    // A signed URL grants time-limited read access to the underlying file, so
    // the caller must own a Document row pointing at this exact URL within
    // their own tenant — otherwise any authenticated user could request a
    // signed URL for another company's document by guessing/observing its
    // storage path (IDOR).
    const companyId = user?.companyId || "";
    const ownedDocument = await db.document.findFirst({
      where: { url: fileUrl, companyId },
      select: { id: true, name: true },
    });
    if (!ownedDocument) {
      throw new Error("Document not found or unauthorized.");
    }

    const asset = parseAssetRef(fileUrl);
    if (!asset) {
      return { success: true, url: fileUrl, signed: false };
    }

    ensureCloudinaryConfigured();

    // Uploaded public_ids carry no extension (see uploadImageAction). For
    // "raw" assets (PDFs) Cloudinary has no independent notion of "format" —
    // the delivered filename is exactly the public_id — so the attachment
    // flag must supply the extension itself, or browsers/OSes get a file
    // they can't open. For "image" assets Cloudinary already appends the
    // real format to the delivery URL and does the same for the
    // Content-Disposition filename; appending our own extension there
    // produces "name.jpg" being treated as a second (invalid) format
    // segment, which Cloudinary rejects with a 400. So: name only for
    // images, name+extension for raw.
    let attachmentFlag: string | undefined;
    if (download) {
      const safeName = (ownedDocument.name || "document")
        .replace(/[^a-zA-Z0-9._-]+/g, "_")
        .replace(/\.[a-zA-Z0-9]+$/, "");
      attachmentFlag =
        asset.resourceType === "raw"
          ? `attachment:${safeName}.${asset.extension}`
          : `attachment:${safeName}`;
    }

    try {
      const signedUrl = cloudinary.url(asset.publicId, {
        type: BUCKET_DELIVERY_TYPE[bucket],
        resource_type: asset.resourceType,
        sign_url: true,
        secure: true,
        ...(attachmentFlag ? { flags: attachmentFlag } : {}),
        // Cloudinary signatures are permanent unless the URL also carries an
        // expiry, so set one to match the old 1-hour Supabase signed URLs.
        expires_at: Math.floor(Date.now() / 1000) + SIGNED_URL_TTL_SECONDS,
      });

      return {
        success: true,
        url: signedUrl,
        signed: true,
        resourceType: asset.resourceType,
      };
    } catch (error) {
      logger.error(
        "[getSignedUrlAction] Failed to generate signed URL:",
        error
      );
      throw new Error("Failed to generate a secure viewing link.");
    }
  }
);
