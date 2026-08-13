import {
  Box,
  Card,
  Stack,
  Typography,
  IconButton,
  useTheme,
  Grid,
} from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import CircularProgress from "@mui/material/CircularProgress";
import Backdrop from "@mui/material/Backdrop";
import { toast } from "sonner";
import { useState } from "react";
import { getSignedUrlAction } from "@/app/lib/actions/upload";
import DocumentViewerDialog from "../shared/DocumentViewerDialog";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import { DriverWithRelations } from "@/app/lib/type/driver";
import { useDateSettings } from "@/app/hooks/useDateSettings";
import { formatDisplayDate } from "@/app/lib/utils/date";
import { logger } from "@/app/lib/logger";


interface DocumentsTabProps {
  driver?: DriverWithRelations;
}

const DocumentsTab = ({ driver }: DocumentsTabProps) => {
  const theme = useTheme();
  const dict = useDictionary();
  const dateSettings = useDateSettings();

  /* --------------------------------- states --------------------------------- */
  const [viewerOpen, setViewerOpen] = useState(false);
  const [loadingDoc, setLoadingDoc] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<{
    url: string;
    sourceUrl: string;
    title: string;
    fileType?: string;
  } | null>(null);

  if (!driver) {
    return (
      <Typography color="text.secondary">
        {dict.drivers.noDriverSelected}
      </Typography>
    );
  }

  const hasValidLicense =
    driver.licenseNumber &&
    driver.licenseExpiry &&
    new Date(driver.licenseExpiry) > new Date();

  /* -------------------------------- handlers -------------------------------- */
  const handleViewDoc = async (url: string, title: string) => {
    if (!url) {
      toast.error(dict.toasts.errorGeneric);
      return;
    }

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
        toast.error(dict.toasts.errorGeneric);
      }
    } catch (error) {
      logger.error("View doc error:", error);
      toast.error(dict.common.errorOccurred);
    } finally {
      setLoadingDoc(false);
    }
  };

  const handleDownloadDoc = async (url: string) => {
    if (!url) {
      toast.error(dict.toasts.errorGeneric);
      return;
    }
    try {
      // The documents bucket is private; sign the URL on demand before opening.
      // Pass download=true to force Cloudinary to return it as an attachment
      const result = await getSignedUrlAction(url, "documents", true);
      if (result.success && result.url) {
        window.open(result.url, "_blank", "noopener,noreferrer");
      } else {
        toast.error(dict.toasts.errorGeneric);
      }
    } catch (error) {
      logger.error("Download doc error:", error);
      toast.error(dict.common.errorOccurred);
    }
  };

  return (
    <Stack
      spacing={3}
      sx={{
        overflowY: "auto",
        maxHeight: 450,
        pr: 1,
        "&::-webkit-scrollbar": {
          width: 6,
        },
        "&::-webkit-scrollbar-track": {
          backgroundColor: theme.palette.background.paper_alpha.main_10,
          borderRadius: 4,
        },
        "&::-webkit-scrollbar-thumb": {
          backgroundColor: theme.palette.text.secondary_alpha.main_20,
          borderRadius: 4,
          "&:hover": {
            backgroundColor: theme.palette.text.secondary_alpha.main_40,
          },
        },
      }}
    >
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card
            sx={{
              p: 2.5,
              borderRadius: 3,
              bgcolor: hasValidLicense
                ? theme.palette.success._alpha.main_05
                : theme.palette.error._alpha.main_05,
              border: `1px solid ${
                hasValidLicense
                  ? theme.palette.success._alpha.main_20
                  : theme.palette.error._alpha.main_20
              }`,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 1.5,
              height: "100%",
            }}
          >
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                bgcolor: hasValidLicense
                  ? theme.palette.success._alpha.main_10
                  : theme.palette.error._alpha.main_10,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: hasValidLicense ? "success.main" : "error.main",
              }}
            >
              {hasValidLicense ? (
                <CheckCircleOutlineIcon fontSize="medium" />
              ) : (
                <ErrorOutlineIcon fontSize="medium" />
              )}
            </Box>
            <Stack alignItems="center" spacing={0.5}>
              <Typography
                variant="body2"
                color="text.secondary"
                fontWeight={600}
              >
                {dict.drivers.labels.licenseStatus}
              </Typography>
              <Typography component="div"
                variant="h6"
                fontWeight={700}
                color={hasValidLicense ? "success.main" : "error.main"}
              >
                {hasValidLicense
                  ? dict.drivers.labels.compliant
                  : dict.drivers.labels.actionRequired}
              </Typography>
            </Stack>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 8 }}>
          <Stack spacing={2}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Box
                sx={{
                  p: 0.8,
                  borderRadius: 1,
                  bgcolor: theme.palette.primary._alpha.main_10,
                  color: theme.palette.primary.main,
                  display: "flex",
                }}
              >
                <InsertDriveFileOutlinedIcon fontSize="small" />
              </Box>
              <Typography variant="subtitle1" fontWeight={700} color="white">
                {dict.drivers.labels.officialDocuments}
              </Typography>
            </Stack>

            <Stack spacing={1.5}>
              {driver.documents && driver.documents.length > 0 ? (
                driver.documents.map((doc) => (
                  <Stack
                    key={doc.id}
                    direction="row"
                    spacing={2}
                    alignItems="center"
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      bgcolor: theme.palette.background.paper_alpha.main_30,
                      border: `1px solid ${theme.palette.divider_alpha.main_10}`,
                      transition: "all 0.2s ease",
                      "&:hover": {
                        borderColor: theme.palette.primary._alpha.main_30,
                        bgcolor: theme.palette.primary._alpha.main_05,
                      },
                    }}
                  >
                    <Box
                      sx={{
                        p: 1.5,
                        borderRadius: 1.5,
                        bgcolor: theme.palette.primary._alpha.main_10,
                        color: theme.palette.primary.main,
                        display: "flex",
                      }}
                    >
                      <InsertDriveFileOutlinedIcon />
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        variant="body1"
                        fontWeight={600}
                        color="white"
                        noWrap
                      >
                        {doc.name === "License Scan"
                          ? dict.drivers.labels.physicalLicense
                          : doc.name}{" "}
                        -{" "}
                        {(dict.vehicles.docTypes as Record<string, string>)?.[
                          doc.type
                        ] || doc.type}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {doc.expiryDate
                          ? `${dict.drivers.labels.expiryPrefix}${formatDisplayDate(doc.expiryDate, dateSettings)}`
                          : dict.drivers.labels.noExpiry}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={1}>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewDoc(doc.url, doc.name);
                        }}
                        sx={{
                          color: theme.palette.primary.main,
                          bgcolor: theme.palette.primary._alpha.main_10,
                          "&:hover": {
                            bgcolor: theme.palette.primary._alpha.main_20,
                          },
                        }}
                      >
                        <VisibilityOutlinedIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadDoc(doc.url);
                        }}
                        sx={{
                          color: theme.palette.primary.main,
                          bgcolor: theme.palette.primary._alpha.main_10,
                          "&:hover": {
                            bgcolor: theme.palette.primary._alpha.main_20,
                          },
                        }}
                      >
                        <FileDownloadOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Stack>
                ))
              ) : (
                <Box
                  sx={{
                    p: 3,
                    borderRadius: 2,
                    bgcolor: theme.palette.error._alpha.main_05,
                    border: `1px dashed ${theme.palette.error._alpha.main_20}`,
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 1.5,
                  }}
                >
                  <InfoOutlinedIcon
                    fontSize="small"
                    color="error"
                    sx={{ mt: 0.2 }}
                  />
                  <Box>
                    <Typography variant="body2" color="white" fontWeight={600}>
                      {dict.drivers.labels.noDocsUploaded}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {dict.drivers.labels.noDocsDesc}
                    </Typography>
                  </Box>
                </Box>
              )}
            </Stack>
          </Stack>
        </Grid>
      </Grid>

      <Backdrop
        sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={loadingDoc}
      >
        <CircularProgress color="inherit" />
      </Backdrop>

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
    </Stack>
  );
};

export default DocumentsTab;
