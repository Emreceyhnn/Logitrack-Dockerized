import { useState } from "react";
import { useVehicleMutations } from "@/app/hooks/useVehicles";
import { uploadImageAction } from "@/app/lib/actions/upload";
import { Dayjs } from "dayjs";
import { logger } from "@/app/lib/logger";
import { Dictionary } from "@/app/lib/language/language";

export const useUploadDocument = (vehicleId: string, onSuccess: () => void, onClose: () => void, dict: Dictionary) => {
  const [type, setType] = useState("");
  const [name, setName] = useState("");
  const [expiryDate, setExpiryDate] = useState<Dayjs | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { uploadDocument } = useVehicleMutations();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      // PDF uploads are temporarily disabled service-wide; catch it here too
      // (not just server-side in uploadImageAction) so the user sees why
      // immediately instead of after picking a file and clicking upload.
      if (selectedFile.type === "application/pdf") {
        setError(dict.vehicles.dialogs.pdfUploadDisabled || "PDF uploads are temporarily unavailable. Please try again later.");
        e.target.value = "";
        return;
      }
      setFile(selectedFile);
      setError(null);
      if (!name) setName(selectedFile.name);
      if (selectedFile.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onloadend = () => setFilePreview(reader.result as string);
        reader.readAsDataURL(selectedFile);
      } else {
        setFilePreview(null);
      }
    }
  };

  const handleClose = () => {
    setType(""); setName(""); setExpiryDate(null); setFile(null); setFilePreview(null); setError(null);
    onClose();
  };

  const handleSubmit = async () => {
    if (!type || !name || !file) { setError(dict.common.fillAllFields); return; }
    setError(null);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const uploadResult = await uploadImageAction(base64, "documents", `vehicles/${vehicleId}`);
      await uploadDocument.mutateAsync({
        vehicleId,
        data: {
          type: type as import("@/app/lib/type/enums").DocumentType,
          name, url: uploadResult.url, expiryDate: expiryDate?.toDate(), status: "ACTIVE",
        },
      });
      onSuccess(); handleClose();
    } catch (err: unknown) {
      logger.error(err);
      setError(err instanceof Error ? err.message : dict.vehicles.dialogs.failedToUploadDocument || "Failed to upload document");
    }
  };

  return { type, setType, name, setName, expiryDate, setExpiryDate, file, setFile, filePreview, loading: uploadDocument.isPending, error, handleFileChange, handleSubmit, handleClose };
};
