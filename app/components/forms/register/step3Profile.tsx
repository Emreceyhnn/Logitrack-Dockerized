"use client";

import { useState, useRef } from "react";
import {
  Box,
  Stack,
  Typography,
  Avatar,
  CircularProgress,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { useFormikContext } from "formik";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import { uploadImageAction } from "@/app/lib/actions/upload";
import { logger } from "@/app/lib/logger";


export default function Step3Profile() {
  /* -------------------------------- VARIABLES ------------------------------- */
  const dict = useDictionary();
  const { values, setFieldValue } = useFormikContext<{ avatarUrl: string }>();
  /* --------------------------------- STATES --------------------------------- */
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* -------------------------------- HANDLERS -------------------------------- */
  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      // FileReader is callback-based, so the upload must be awaited through a
      // promise. Doing the upload inside `reader.onloadend` instead would let a
      // rejection escape as an unhandled rejection — the try/catch only covers
      // the synchronous readAsDataURL call — and would flip `uploading` off in
      // `finally` before the upload had actually finished.
      const base64String = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () =>
          reject(reader.error ?? new Error("Failed to read file."));
        reader.readAsDataURL(file);
      });

      const result = await uploadImageAction(
        base64String,
        "avatars",
        "register-flow"
      );

      if (result.success) {
        setFieldValue("avatarUrl", result.url);
      }
    } catch (error) {
      logger.error("Upload failed:", error);
    } finally {
      setUploading(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <Stack spacing={3} alignItems="center">
      <Box sx={{ width: "100%", textAlign: "left" }}>
        <Typography variant="h5" sx={{ color: "#fff", fontWeight: 600, mb: 1 }}>
          {dict.auth.finalTouches}
        </Typography>
        <Typography
          sx={{ color: "rgba(255, 255, 255, 0.6)", fontSize: "14px" }}
        >
          {dict.auth.profileDescription}
        </Typography>
      </Box>

      <Box
        sx={{ position: "relative", my: 2, cursor: "pointer" }}
        onClick={handleAvatarClick}
      >
        <input
          type="file"
          ref={fileInputRef}
          hidden
          accept="image/*"
          onChange={handleFileChange}
        />
        <Avatar
          src={values.avatarUrl || undefined}
          sx={{
            width: 120,
            height: 120,
            bgcolor: "rgba(255, 255, 255, 0.05)",
            border: "2px dashed rgba(255, 255, 255, 0.2)",
            position: "relative",
            transition: "all 0.3s ease",
            "&:hover": {
              borderColor: "#38bdf8",
              bgcolor: "rgba(56, 189, 248, 0.05)",
            },
          }}
        >
          {uploading ? (
            <CircularProgress size={40} sx={{ color: "#38bdf8" }} />
          ) : (
            !values.avatarUrl && (
              <CloudUploadIcon
                sx={{ fontSize: 40, color: "rgba(255, 255, 255, 0.3)" }}
              />
            )
          )}
        </Avatar>
        <Typography
          variant="caption"
          sx={{
            display: "block",
            mt: 1,
            color: uploading ? "#38bdf8" : "rgba(255, 255, 255, 0.5)",
            textAlign: "center",
          }}
        >
          {uploading
            ? dict.auth.uploading
            : values.avatarUrl
              ? dict.auth.changePhoto
              : dict.auth.uploadProfilePicture}
        </Typography>
      </Box>

      <Box
        sx={{
          bgcolor: "rgba(56, 189, 248, 0.05)",
          p: 3,
          borderRadius: "12px",
          border: "1px solid rgba(56, 189, 248, 0.2)",
          width: "100%",
        }}
      >
        <Typography
          variant="body2"
          sx={{ color: "rgba(255, 255, 255, 0.8)", lineHeight: 1.6 }}
        >
          {dict.auth.termsAgreement}
        </Typography>
      </Box>
    </Stack>
  );
}
