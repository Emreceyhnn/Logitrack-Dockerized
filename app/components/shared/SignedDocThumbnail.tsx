"use client";

import { useEffect, useState } from "react";
import { Box } from "@mui/material";
import ImageIcon from "@mui/icons-material/Image";
import { getSignedUrlAction } from "@/app/lib/actions/upload";

/**
 * 48×48 clickable thumbnail for a document stored in the private `documents`
 * bucket. The stored URL cannot be used directly (bucket is private), so we
 * resolve a short-lived signed URL on demand and use it for both the preview
 * image and the click-to-open action.
 */
export default function SignedDocThumbnail({ url }: { url: string }) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!url) {
      setSignedUrl(null);
      return;
    }
    let active = true;
    getSignedUrlAction(url)
      .then((r) => {
        if (active && r.success) setSignedUrl(r.url);
      })
      .catch(() => {
        if (active) setSignedUrl(null);
      });
    return () => {
      active = false;
    };
  }, [url]);

  const isImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(url);

  return (
    <Box
      sx={{
        width: 48,
        height: 48,
        borderRadius: 1,
        bgcolor: "primary._alpha.main_10",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "primary.main",
        overflow: "hidden",
        cursor: "pointer",
      }}
      onClick={() => {
        if (signedUrl) window.open(signedUrl, "_blank", "noopener,noreferrer");
      }}
    >
      {isImage && signedUrl ? (
        <Box
          component="img"
          src={signedUrl}
          sx={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        <ImageIcon />
      )}
    </Box>
  );
}
