"use client";

import { Stack, Typography, CircularProgress, Backdrop } from "@mui/material";
import { toast } from "sonner";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import { getSignedUrlAction } from "@/app/lib/actions/upload";
import { deleteDocument } from "@/app/lib/controllers/documents";
import { VehicleWithRelations } from "@/app/lib/type/vehicle";
import { useState } from "react";
import { usePathname } from "next/navigation";
import UploadDocumentDialog from "../uploadDocumentDialog";
import DocumentViewerDialog from "../../shared/DocumentViewerDialog";
import { useDateSettings } from "@/app/hooks/useDateSettings";
import DeleteConfirmationDialog from "../../deleteConfirmationDialog";
import { logger } from "@/app/lib/logger";

import DocumentStatsCards from "./sections/DocumentStatsCards";
import DocumentTable from "./sections/DocumentTable";

interface DocumentsTabProps {
  vehicle?: VehicleWithRelations | undefined;
  onUpdate?: (() => void) | undefined;
}

const DocumentsTab = ({ vehicle, onUpdate }: DocumentsTabProps) => {
  const dict = useDictionary();
  const dateSettings = useDateSettings();
  const pathname = usePathname();
  const isDemo = pathname?.includes("/demo");

  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [loadingDoc, setLoadingDoc] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<{ url: string; sourceUrl: string; title: string; fileType?: string; } | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState<{ id: string; name: string; } | null>(null);
  const [isDeletingDoc, setIsDeletingDoc] = useState(false);

  if (!vehicle) return <Typography color="text.secondary">{dict.common.noData}</Typography>;

  const handleUploadSuccess = () => {
    if (onUpdate) onUpdate();
  };

  const handleViewDoc = async (url: string, title: string) => {
    if (!url) return toast.error(dict.toasts.errorNoConnection);
    // getSignedUrlAction is authenticated; in the demo there is no real file
    // behind the mock document anyway.
    if (isDemo) return toast.info(dict.toasts.demoActionDisabled);
    try {
      setLoadingDoc(true);
      const result = await getSignedUrlAction(url);
      if (result.success && result.url) {
        setSelectedDoc({
          url: result.url,
          sourceUrl: url,
          title,
          fileType: result.resourceType === "raw" ? "application/pdf" : "image",
        });
        setViewerOpen(true);
      } else {
        toast.error(dict.toasts.errorNoPermission);
      }
    } catch (error) {
      logger.error("View doc error:", error);
      toast.error(dict.toasts.errorUpload);
    } finally {
      setLoadingDoc(false);
    }
    return;
  };

  const handleDownloadDoc = async (url: string) => {
    if (!url) return toast.error(dict.toasts.errorNoConnection);
    if (isDemo) return toast.info(dict.toasts.demoActionDisabled);
    try {
      const result = await getSignedUrlAction(url, "documents", true);
      if (result.success && result.url) {
        window.open(result.url, "_blank", "noopener,noreferrer");
      } else {
        toast.error(dict.toasts.errorNoPermission);
      }
    } catch (error) {
      logger.error("Download doc error:", error);
      toast.error(dict.toasts.errorUpload);
    }
    return;
  };

  const handleDeleteClick = (id: string, name: string) => {
    setDocToDelete({ id, name });
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!docToDelete) return;
    if (isDemo) {
      setDeleteConfirmOpen(false);
      setDocToDelete(null);
      toast.info(dict.toasts.demoActionDisabled);
      return;
    }
    try {
      setIsDeletingDoc(true);
      await deleteDocument(docToDelete.id);
      toast.success(dict.toasts.successDocumentDelete);
      setDeleteConfirmOpen(false);
      onUpdate?.();
    } catch (error) {
      logger.error("Delete doc error:", error);
      toast.error(dict.toasts.errorDocumentDelete);
    } finally {
      setIsDeletingDoc(false);
      setDocToDelete(null);
    }
  };

  const now = new Date();
  const oneMonthLater = new Date();
  oneMonthLater.setMonth(now.getMonth() + 1);

  // Every document lands in exactly ONE bucket. The previous split double
  // counted: `activeCount` included everything not yet expired — the expiring
  // ones as well — so the tiles summed to more than the document count and
  // "valid" quietly contradicted "expiring soon". A document with no expiry
  // date is its own state rather than being lumped in with expired ones,
  // which had made undated files look like a compliance failure.
  const buckets = vehicle.documents.reduce(
    (acc, d) => {
      if (!d.expiryDate) {
        acc.noExpiry += 1;
        return acc;
      }
      const expiry = new Date(d.expiryDate);
      if (expiry <= now) acc.expired += 1;
      else if (expiry <= oneMonthLater) acc.expiringSoon += 1;
      else acc.valid += 1;
      return acc;
    },
    { valid: 0, expiringSoon: 0, expired: 0, noExpiry: 0 }
  );

  const lastUploadDate = vehicle.documents.reduce((latest, d) => {
    const created = new Date(d.createdAt);
    return created > latest ? created : latest;
  }, new Date(0));

  return (
    <>
      <Stack spacing={2} direction={"row"} maxHeight={450} height={"100%"} alignItems={"stretch"}>
        <DocumentStatsCards
          dict={dict}
          dateSettings={dateSettings}
          validCount={buckets.valid}
          expiringSoonCount={buckets.expiringSoon}
          expiredCount={buckets.expired}
          noExpiryCount={buckets.noExpiry}
          totalCount={vehicle.documents.length}
          lastUploadDate={lastUploadDate}
          onUploadClick={() => setUploadDialogOpen(true)}
        />
        <DocumentTable
          dict={dict}
          dateSettings={dateSettings}
          documents={vehicle.documents}
          onViewDoc={handleViewDoc}
          onDownloadDoc={handleDownloadDoc}
          onDeleteClick={handleDeleteClick}
        />
      </Stack>
      <DeleteConfirmationDialog open={deleteConfirmOpen} onClose={() => !isDeletingDoc && setDeleteConfirmOpen(false)} onConfirm={handleConfirmDelete} title={dict.common.deleteDocumentTitle} description={dict.common.deleteDocumentDesc} loading={isDeletingDoc} />
      <Backdrop sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.drawer + 1 }} open={loadingDoc}>
        <CircularProgress color="inherit" />
      </Backdrop>
      <UploadDocumentDialog open={uploadDialogOpen} onClose={() => setUploadDialogOpen(false)} vehicleId={vehicle.id} onSuccess={handleUploadSuccess} />
      {selectedDoc && (
        <DocumentViewerDialog
          open={viewerOpen}
          onClose={() => setViewerOpen(false)}
          url={selectedDoc.url}
          title={selectedDoc.title}
          fileType={selectedDoc.fileType}
          onDownload={() => handleDownloadDoc(selectedDoc.sourceUrl)}
        />
      )}
    </>
  );
};

export default DocumentsTab;
