import { v2 as cloudinary } from "cloudinary";

// Server-only client. This module is imported exclusively from "use server"
// code (see app/lib/actions/upload.ts) and MUST have the API secret. Signed
// uploads and signed delivery URLs are both derived from it.
const cloudName = process.env.CLOUDINARY_CLOUD_NAME || "logitrack_dev";
const apiKey = process.env.CLOUDINARY_API_KEY || "dev_key";
const apiSecret = process.env.CLOUDINARY_API_SECRET || "dev_secret";

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
  secure: true,
});

/**
 * tr-Cloudinary yapılandırılmış mı kontrol eder.
 * en-Checks if Cloudinary is configured.
 * input (void)
 * output (boolean)
 */
export function isCloudinaryConfigured(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}

/**
 * tr-Cloudinary yapılandırılmamışsa hata verir.
 * en-Throws an error if Cloudinary is not configured.
 * input (void)
 * output (void)
 */
export function ensureCloudinaryConfigured(): void {
  if (!isCloudinaryConfigured()) {
    throw new Error(
      "[Cloudinary] Missing CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY or " +
        "CLOUDINARY_API_SECRET. The server Cloudinary client requires all " +
        "three; refusing to execute with a degraded/unsigned fallback."
    );
  }
}

export { cloudinary };

export type UploadBucket = "vehicles" | "documents" | "avatars" | "general";

export const BUCKET_DELIVERY_TYPE: Record<
  UploadBucket,
  "upload" | "authenticated"
> = {
  vehicles: "upload",
  documents: "authenticated",
  avatars: "upload",
  general: "upload",
};

export type CloudinaryResourceType = "image" | "raw";

/**
 * tr-MIME tipine göre kaynak türünü döndürür.
 * en-Returns the resource type based on the MIME type.
 * input (
  mimeType: string
)
 * output (CloudinaryResourceType)
 */
export function resourceTypeForMime(mimeType: string): CloudinaryResourceType {
  if (mimeType === "application/pdf") return "raw";
  if (mimeType.startsWith("image/")) return "image";
  return "raw";
}
