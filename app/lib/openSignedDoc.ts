"use client";

import { getSignedUrlAction } from "@/app/lib/actions/upload";
import { logger } from "@/app/lib/logger";

/**
 * tr-Gizli 'documents' bucket'ında saklanan bir belge için kısa ömürlü imzalı URL çözer ve yeni bir sekmede açar.
 * en-Resolves a short-lived signed URL for a document stored in the private
 * `documents` bucket and opens it in a new tab.
 * input (
  url: string
)
 * output (Promise<void>)
 */
export async function openSignedDoc(url: string): Promise<void> {
  if (!url) return;
  try {
    const result = await getSignedUrlAction(url);
    if (result.success && result.url) {
      window.open(result.url, "_blank", "noopener,noreferrer");
    }
  } catch (error) {
    logger.error("[openSignedDoc] failed:", error);
  }
}
