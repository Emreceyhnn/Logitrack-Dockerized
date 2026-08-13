"use client";

import { Grid, Stack } from "@mui/material";
import { Dayjs } from "dayjs";
import { useEffect, useState, ChangeEvent } from "react";
import { usePathname } from "next/navigation";
import { useFormikContext } from "formik";
import { toast } from "sonner";
import { AddDriverDocument, DriverFormValues, EditDriverFormValues } from "@/app/lib/type/driver";
import { getWarehouses } from "@/app/lib/controllers/warehouse";
import { getVehicles } from "@/app/lib/controllers/vehicle";
import { useUser } from "@/app/hooks/useUser";
import { Warehouse } from "@/app/lib/type/enums";
import { VehicleStatus } from "@/app/lib/type/enums";
import { VehicleWithRelations } from "@/app/lib/type/vehicle";
import { useDateSettings } from "@/app/hooks/useDateSettings";
import { formatDisplayDate } from "@/app/lib/utils/date";
import { logger } from "@/app/lib/logger";
import { useDictionary } from "@/app/lib/language/DictionaryContext";

import { OperationalAssignmentSection } from "./sections/OperationalAssignmentSection";
import { SettingsSection } from "./sections/SettingsSection";
import { AdditionalDocsSection } from "./sections/AdditionalDocsSection";
import { ProfileSummarySidebar } from "./sections/ProfileSummarySidebar";

interface DriverFormSecondStepProps {
  setStep: (step: number) => void;
  userSummary: {
    name: string;
    surname: string;
    email: string;
  } | null;
}

const DriverFormSecondStep = ({
  setStep,
  userSummary,
}: DriverFormSecondStepProps) => {
  /* -------------------------------- variables ------------------------------- */
  const dict = useDictionary();
  const { user } = useUser();
  const pathname = usePathname();
  const isDemo = pathname?.includes("/demo");
  const dateSettings = useDateSettings();
  const { values, setFieldValue } =
    useFormikContext<DriverFormValues | EditDriverFormValues>();

  /* --------------------------------- states --------------------------------- */
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [vehicles, setVehicles] = useState<VehicleWithRelations[]>([]);

  /* ------------------------------- lifecycles ------------------------------- */
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      if (isDemo) {
        setWarehouses([
          {
            id: "demo-warehouse-1",
            code: "IST-01",
            name: "İstanbul Depo",
            address: "Sanayi Mah. No:1",
            city: "İstanbul",
            country: "Türkiye",
            timezone: "Europe/Istanbul",
          },
        ]);
        setVehicles([
          {
            id: "demo-vehicle-1",
            plate: "34 DEF 456",
            brand: "Mercedes",
            model: "Actros",
            status: VehicleStatus.AVAILABLE,
          } as VehicleWithRelations,
        ]);
        return;
      }
      try {
        const [wData, vData] = await Promise.all([
          getWarehouses(),
          getVehicles({ status: [VehicleStatus.AVAILABLE] }),
        ]);
        setWarehouses(wData);
        setVehicles(vData);
      } catch (error) {
        logger.error("Failed to fetch Step 2 data:", error);
      }
    };
    fetchData();
  }, [user, isDemo]);

  /* -------------------------------- handlers -------------------------------- */
  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      // PDF uploads are temporarily disabled service-wide; the actual
      // upload happens later via uploadImageAction (which also rejects
      // PDFs), but filtering here surfaces the reason immediately.
      const selectedFiles = Array.from(e.target.files);
      const pdfCount = selectedFiles.filter((f) => f.type === "application/pdf").length;
      const acceptedFiles = selectedFiles.filter((f) => f.type !== "application/pdf");
      if (pdfCount > 0) {
        toast.error(dict.vehicles.dialogs.pdfUploadDisabled || "PDF uploads are temporarily unavailable. Please try again later.");
      }
      if (acceptedFiles.length === 0) {
        e.target.value = "";
        return;
      }
      const newDocs: AddDriverDocument[] = acceptedFiles.map(
        (file: File) => {
          const previewUrl = file.type.startsWith("image/")
            ? URL.createObjectURL(file)
            : undefined;
          return {
            id: crypto.randomUUID(),
            name: file.name,
            type: "OTHER",
            expiryDate: null,
            file: file,
            previewUrl,
            size: (file.size / (1024 * 1024)).toFixed(2) + " MB",
            uploadedAt: formatDisplayDate(new Date(), dateSettings),
          };
        }
      );
      setFieldValue("documents", [...values.documents, ...newDocs]);
    }
  };

  const updateDocExpiry = (id: string, date: Dayjs | null) => {
    const updatedDocs = values.documents.map((doc) =>
      doc.id === id ? { ...doc, expiryDate: date ? date.toDate() : null } : doc
    );
    setFieldValue("documents", updatedDocs);
  };

  const removeDoc = (id: string) => {
    const docToRemove = values.documents.find((d) => d.id === id);
    if (docToRemove?.previewUrl) {
      URL.revokeObjectURL(docToRemove.previewUrl);
    }
    setFieldValue(
      "documents",
      values.documents.filter((doc) => doc.id !== id)
    );
  };

  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: 7.5 }}>
        <Stack spacing={4}>
          <OperationalAssignmentSection warehouses={warehouses} vehicles={vehicles} />
          <SettingsSection />
          <AdditionalDocsSection 
            handleFileUpload={handleFileUpload} 
            updateDocExpiry={updateDocExpiry} 
            removeDoc={removeDoc} 
          />
        </Stack>
      </Grid>
      <Grid size={{ xs: 12, md: 4.5 }}>
        <ProfileSummarySidebar setStep={setStep} userSummary={userSummary} />
      </Grid>
    </Grid>
  );
};

export default DriverFormSecondStep;
