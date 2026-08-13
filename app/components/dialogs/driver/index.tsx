"use client";

import {
  Avatar,
  Box,
  Button,
  Chip,
  Dialog,
  DialogContent,
  IconButton,
  Stack,
  Tab,
  Tabs,
  Typography,
  useTheme,
  PaletteColor,
} from "@mui/material";

import { DriverWithRelations } from "@/app/lib/type/driver";
import { useState } from "react";
import OverviewTab from "./overviewTab";
import DocumentsTab from "./documentsTab";
import CloseIcon from "@mui/icons-material/Close";
import EditIcon from "@mui/icons-material/Edit";
import PhoneIcon from "@mui/icons-material/Phone";
import EmailIcon from "@mui/icons-material/Email";
import BadgeIcon from "@mui/icons-material/Badge";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import { getStatusMeta } from "@/app/lib/priorityColor";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

interface DriverDialogParams {
  open: boolean;
  onClose: () => void;
  onEdit?: (driver: DriverWithRelations) => void;
  onDelete?: (id: string) => void;
  driverData: DriverWithRelations | null;
  initialTab?: number;
}

function CustomTabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `simple-tab-${index}`,
    "aria-controls": `simple-tabpanel-${index}`,
  };
}

const DriverDialog = (params: DriverDialogParams) => {
  const { open, onClose, driverData, onEdit, onDelete, initialTab } = params;
  const dict = useDictionary();

  /* --------------------------------- states --------------------------------- */
  const [value, setValue] = useState(initialTab ?? 0);

  /* -------------------------------- variables ------------------------------- */
  const theme = useTheme();

  /* -------------------------------- handlers -------------------------------- */
  const handleChange = (_event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  if (!driverData) return null;

  const statusMeta = getStatusMeta(driverData.status, dict);
  
  const paletteKey = statusMeta.paletteKey as keyof typeof theme.palette;
  const paletteColor = theme.palette[paletteKey] as PaletteColor;
  const statusColor = paletteColor?.main || statusMeta.color;
  const statusAlpha = paletteColor?._alpha || theme.palette.primary._alpha;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 4,
          backgroundImage: "none",
          border: `1px solid ${theme.palette.divider_alpha.main_10}`,
          overflow: "hidden",
        },
      }}
    >
      <Box
        sx={{
          p: 4,
          background: `linear-gradient(135deg, ${statusAlpha.main_15} 0%, ${theme.palette.background.paper_alpha.main_00} 100%)`,
          borderBottom: `1px solid ${theme.palette.divider_alpha.main_05}`,
        }}
      >
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="flex-start"
        >
          <Stack direction="row" spacing={3} alignItems="center">
            <Box
              sx={{
                p: 0.5,
                borderRadius: 4,
                bgcolor: theme.palette.common.white_alpha.main_03,
                border: `1px solid ${statusAlpha.main_15}`,
                boxShadow: `0 0 0 4px ${statusAlpha.main_02}`,
              }}
            >
              <Avatar
                variant="rounded"
                src={driverData.user.avatarUrl || undefined}
                sx={{
                  bgcolor: statusAlpha.main_10,
                  color: statusColor,
                  width: 80,
                  height: 80,
                  fontSize: "2.2rem",
                  fontWeight: 800,
                  borderRadius: 3,
                  boxShadow: `0 8px 16px ${theme.palette.common.black_alpha.main_30}`,
                  border: `1px solid ${statusAlpha.main_30}`,
                  background: !driverData.user.avatarUrl
                    ? `linear-gradient(135deg, ${statusAlpha.main_20} 0%, ${statusAlpha.main_05} 100%)`
                    : "transparent",
                }}
              >
                {driverData.user.name?.charAt(0).toLocaleUpperCase('en-US')}
              </Avatar>
            </Box>
            <Stack spacing={1}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Typography
                  variant="h4"
                  fontWeight={800}
                  sx={{ color: "text.primary" }}
                >
                  {driverData.user.name} {driverData.user.surname}
                </Typography>
                <Chip
                  label={statusMeta.label}
                  size="small"
                  sx={{
                    height: 24,
                    fontWeight: 700,
                    bgcolor: statusAlpha.main_10,
                    color: statusColor,
                    border: `1px solid ${statusAlpha.main_20}`,
                  }}
                />
              </Stack>
              <Stack spacing={1}>
                {driverData.employeeId && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                  >
                    <BadgeIcon fontSize="small" sx={{ fontSize: "1rem" }} />
                    {driverData.employeeId}
                  </Typography>
                )}

                <Stack direction="row" spacing={2} alignItems="center">
                  {driverData.phone && (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                    >
                      <PhoneIcon fontSize="small" sx={{ fontSize: "1rem" }} />
                      {driverData.phone}
                    </Typography>
                  )}
                  {driverData.user.email && (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                    >
                      <EmailIcon fontSize="small" sx={{ fontSize: "1rem" }} />
                      {driverData.user.email}
                    </Typography>
                  )}
                </Stack>
              </Stack>
            </Stack>
          </Stack>

          <Stack direction="row" spacing={1}>
            {onEdit && (
              <Button
                variant="outlined"
                startIcon={<EditIcon />}
                size="small"
                onClick={() => {
                  onClose();
                  onEdit(driverData);
                }}
                sx={{
                  textTransform: "none",
                  borderColor: theme.palette.divider,
                  color: theme.palette.text.secondary,
                  "&:hover": {
                    borderColor: theme.palette.text.primary,
                    color: theme.palette.text.primary,
                  },
                }}
              >
                {dict.common.edit}
              </Button>
            )}
            {onDelete && (
              <Button
                variant="outlined"
                color="error"
                size="small"
                onClick={() => {
                  onClose();
                  onDelete(driverData.id);
                }}
                sx={{
                  textTransform: "none",
                  borderColor: "error.main",
                  color: "error.main",
                  "&:hover": {
                    bgcolor: theme.palette.error._alpha.main_10,
                  },
                }}
              >
                {dict.common.delete}
              </Button>
            )}
            <IconButton
              onClick={onClose}
              size="small"
              sx={{
                bgcolor: theme.palette.text.secondary_alpha.main_10,
                "&:hover": {
                  bgcolor: theme.palette.text.secondary_alpha.main_20,
                },
              }}
             aria-label="close">
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Stack>
      </Box>

      <DialogContent sx={{ p: 0 }}>
        <Stack>
          <Box
            sx={{
              px: 4,
              pt: 2,
              borderBottom: `1px solid ${theme.palette.divider_alpha.main_05}`,
              bgcolor: theme.palette.background.paper_alpha.main_20,
            }}
          >
            <Tabs
              value={value}
              onChange={handleChange}
              aria-label="driver details tabs"
              TabIndicatorProps={{
                sx: {
                  height: 3,
                  borderTopLeftRadius: 3,
                  borderTopRightRadius: 3,
                  bgcolor: theme.palette.primary.main,
                },
              }}
              sx={{
                minHeight: 48,
                "& .MuiTab-root": {
                  color: "text.secondary",
                  fontWeight: 600,
                  fontSize: 14,
                  textTransform: "none",
                  minHeight: 48,
                  px: 3,
                  "&.Mui-selected": {
                    color: "text.primary",
                  },
                },
              }}
            >
              <Tab label={dict.drivers.tabs.overview} {...a11yProps(0)} />
              <Tab label={dict.drivers.tabs.documents} {...a11yProps(1)} />
            </Tabs>
          </Box>
          <Box sx={{ p: 4, minHeight: 400 }}>
            <CustomTabPanel value={value} index={0}>
              <OverviewTab driver={driverData} />
            </CustomTabPanel>
            <CustomTabPanel value={value} index={1}>
              <DocumentsTab driver={driverData} />
            </CustomTabPanel>
          </Box>
        </Stack>
      </DialogContent>
    </Dialog>
  );
};

export default DriverDialog;
