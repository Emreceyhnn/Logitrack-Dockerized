import { Box, IconButton, Stack, Typography, useTheme } from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs, { Dayjs } from "dayjs";
import { useFormikContext } from "formik";
import { DriverFormValues, EditDriverFormValues } from "@/app/lib/type/driver";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import { ChangeEvent } from "react";

interface AdditionalDocsSectionProps {
  handleFileUpload: (e: ChangeEvent<HTMLInputElement>) => void;
  updateDocExpiry: (id: string, date: Dayjs | null) => void;
  removeDoc: (id: string) => void;
}

export const AdditionalDocsSection = ({
  handleFileUpload,
  updateDocExpiry,
  removeDoc,
}: AdditionalDocsSectionProps) => {
  const theme = useTheme();
  const dict = useDictionary();
  const { values } = useFormikContext<DriverFormValues | EditDriverFormValues>();

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" spacing={1} alignItems="center">
        <Box
          sx={{
            p: 0.8,
            borderRadius: 1,
            bgcolor: theme.palette.primary._alpha.main_10,
            color: theme.palette.primary.main,
            display: "flex",
          }}
        >
          <CloudUploadIcon fontSize="small" />
        </Box>
        <Typography variant="subtitle1" fontWeight={700} color="white">
          {dict.drivers.fields.additionalDocs}
        </Typography>
      </Stack>

      <Box
        component="label"
        sx={{
          p: 3,
          borderRadius: 3,
          border: `2px dashed ${theme.palette.divider_alpha.main_20}`,
          bgcolor: theme.palette.background.paper_alpha.main_30,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 1.5,
          cursor: "pointer",
          transition: "all 0.2s ease",
          "&:hover": {
            borderColor: theme.palette.primary._alpha.main_50,
            bgcolor: theme.palette.primary._alpha.main_05,
          },
        }}
      >
        <input type="file" hidden multiple onChange={handleFileUpload} />
        <Box
          sx={{
            p: 1.5,
            borderRadius: "50%",
            bgcolor: theme.palette.primary._alpha.main_10,
            color: theme.palette.primary.main,
          }}
        >
          <CloudUploadIcon />
        </Box>
        <Typography variant="body2" fontWeight={600} color="white">
          {dict.landing.hero.discover}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          PNG, JPG (MAX 10MB)
        </Typography>
      </Box>

      <Stack spacing={1.5}>
        {values.documents.map((doc) => (
          <Stack
            key={doc.id}
            spacing={1.5}
            sx={{
              p: 2,
              borderRadius: 2,
              bgcolor: theme.palette.text.darkBlue._alpha.main_50,
              border: `1px solid ${theme.palette.divider_alpha.main_10}`,
            }}
          >
            <Stack direction="row" spacing={2} alignItems="center">
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 1,
                  bgcolor: theme.palette.primary._alpha.main_10,
                  color: theme.palette.primary.main,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                }}
              >
                {doc.previewUrl ? (
                  <Box
                    component="img"
                    src={doc.previewUrl}
                    sx={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <InsertDriveFileIcon fontSize="small" />
                )}
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  variant="body2"
                  fontWeight={600}
                  color="white"
                  noWrap
                >
                  {doc.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {doc.size}
                </Typography>
              </Box>
              <IconButton
                size="small"
                onClick={() => removeDoc(doc.id)}
                sx={{ color: "text.secondary" }}
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Stack>

            <Box>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mb: 1, display: "block", fontWeight: 500 }}
              >
                {dict.common.date}
              </Typography>
              <DatePicker
                value={doc.expiryDate ? dayjs(doc.expiryDate) : null}
                onChange={(newValue) => updateDocExpiry(doc.id, newValue)}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    size: "small",
                    placeholder: dict.common.noData,
                    sx: {
                      "& .MuiOutlinedInput-root": {
                        backgroundColor:
                          theme.palette.background.paper_alpha.main_10,
                        borderRadius: 1.5,
                        fontSize: "0.8rem",
                        "& fieldset": {
                          borderColor: theme.palette.divider_alpha.main_10,
                        },
                        "&:hover fieldset": {
                          borderColor: theme.palette.primary._alpha.main_20,
                        },
                      },
                      "& .MuiOutlinedInput-input": { color: "text.primary" },
                      "& .MuiIconButton-root": {
                        color: theme.palette.common.white_alpha.main_50,
                      },
                    },
                  },
                }}
              />
            </Box>
          </Stack>
        ))}
      </Stack>
    </Stack>
  );
};
