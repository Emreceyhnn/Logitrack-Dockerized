"use client";

import React, { useState, useEffect } from "react";
import {
  Avatar,
  Box,
  Button,
  Chip,
  Dialog,
  DialogContent,
  Divider,
  Grid,
  IconButton,
  PaletteColor,
  Stack,
  Tab,
  Tabs,
  Typography,
  useTheme,
} from "@mui/material";
import {
  Close as CloseIcon,
  Edit as EditIcon,
  History as HistoryIcon,
  Assessment as OverviewIcon,
} from "@mui/icons-material";
import {
  InventoryDetailsProps,
  InventoryMovement,
  InventoryWithRelations,
} from "@/app/lib/type/inventory";
import {
  getInventoryMovements,
  getInventoryBySku,
} from "@/app/lib/controllers/inventory";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import { useInventoryMutations } from "@/app/hooks/useInventory";
import { toast } from "sonner";
import StockMetricsPanel from "./sections/StockMetricsPanel";
import PhysicalSpecsPanel from "./sections/PhysicalSpecsPanel";
import { logger } from "@/app/lib/logger";
import MovementHistoryPanel from "./sections/MovementHistoryPanel";
import { usePathname } from "next/navigation";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function CustomTabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`inventory-tabpanel-${index}`}
      aria-labelledby={`inventory-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 0 }}>{children}</Box>}
    </div>
  );
}

export default function InventoryDetailsDialog({
  isOpen,
  onClose,
  item,
  onEdit,
}: InventoryDetailsProps) {
  const theme = useTheme();
  const dict = useDictionary();
  const pathname = usePathname();
  const isDemo = pathname?.includes("/demo");
  const [tabValue, setTabValue] = useState(0);

  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [loadingMovements, setLoadingMovements] = useState(false);
  const [otherLocations, setOtherLocations] = useState<
    InventoryWithRelations[]
  >([]);

  const loadMovements = React.useCallback(async () => {
    if (!item) return;
    setLoadingMovements(true);
    if (isDemo) {
      setMovements([
        {
          id: "m-1",
          sku: item.sku,
          warehouseId: item.warehouseId,
          quantity: 50,
          type: "PUTAWAY",
          notes: "Initial load",
          createdAt: new Date(Date.now() - 3600000 * 24),
          updatedAt: new Date(Date.now() - 3600000 * 24),
          userId: "demo-user-id",
          companyId: "demo-company-id",
        } as unknown as InventoryMovement
      ]);
      setLoadingMovements(false);
      return;
    }
    try {
      const data = await getInventoryMovements(item.sku, item.warehouseId);
      setMovements(data as InventoryMovement[]);
    } catch (error) {
      logger.error("Failed to load movements", error);
    } finally {
      setLoadingMovements(false);
    }
  }, [item, isDemo]);

  /* ---------------------------------- ADJUSTMENT STATE ------------------------- */
  const [adjustAmount, setAdjustAmount] = useState<number>(0);
  const [adjustType, setAdjustType] = useState<string>("ADJUSTMENT");
  const [adjustNote, setAdjustNote] = useState<string>("");
  const { adjustStock } = useInventoryMutations();

  const handleAdjustStock = async () => {
    if (!item || adjustAmount === 0) return;

    // adjustStock is an authenticated mutation — browsing the dialog is fine
    // in the demo, but committing an adjustment would redirect to sign-in.
    if (isDemo) {
      toast.info(dict.toasts.demoActionDisabled);
      return;
    }

    try {
      await adjustStock.mutateAsync({
        id: item.id,
        delta: adjustAmount,
        type: adjustType as import("@/app/lib/type/enums").MovementType,
        notes: adjustNote,
      });
      toast.success(dict.toasts.successUpdate);
      setAdjustAmount(0);
      setAdjustNote("");
      loadMovements();
    } catch (err) {
      const error = err as Error;
      toast.error(error.message || dict.common.errorOccurred);
    }
  };

  const loadOtherLocations = React.useCallback(async () => {
    if (!item) return;
    if (isDemo) {
      setOtherLocations([
        {
          id: "inv-demo-other-1",
          sku: item.sku,
          name: item.name,
          warehouseId: "wh-demo-other-id",
          warehouse: {
            id: "wh-demo-other-id",
            name: "İzmir Depo",
          },
          quantity: 200,
          minStock: 20,
          maxStock: 1000,
          createdAt: new Date(),
          updatedAt: new Date(),
          companyId: "demo-company",
          unit: item.unit,
          location: "B-12",
          batchNumber: "B-001",
          expiryDate: null,
        } as unknown as InventoryWithRelations
      ]);
      return;
    }
    try {
      const data = await getInventoryBySku(item.sku);
      setOtherLocations(
        data.filter((l: InventoryWithRelations) => l.id !== item.id)
      );
    } catch (err) {
      logger.error("Failed to load other locations", err);
    }
  }, [item, isDemo]);

  useEffect(() => {
    if (isOpen && item) {
       
      loadOtherLocations();
    }
  }, [isOpen, item, loadOtherLocations]);

  useEffect(() => {
    if (isOpen && item && tabValue === 1) {
       
      loadMovements();
    }
  }, [isOpen, item, tabValue, loadMovements]);

  if (!item) return null;

  const isLowStock = item.quantity <= item.minStock;
  const statusLabel =
    item.quantity === 0
      ? dict.inventory.status.outOfStock
      : isLowStock
        ? dict.inventory.status.lowStock
        : dict.inventory.status.inStock;

  const statusColor =
    item.quantity === 0 ? "error" : isLowStock ? "warning" : "success";

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      PaperProps={{
        sx: {
          backgroundImage: "none",
          borderRadius: 4,
          border: `1px solid ${theme.palette.divider_alpha.main_10}`,
          overflow: "hidden",
        },
      }}
    >
      {/* Header */}
      <Box sx={{ p: 3, pb: 0 }}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="flex-start"
        >
          <Stack direction="row" spacing={3} alignItems="center">
            <Avatar
              variant="rounded"
              src={item.imageUrl || undefined}
              sx={{
                width: 56,
                height: 56,
                bgcolor: theme.palette.primary._alpha.main_10,
                color: theme.palette.primary.main,
                border: `1px solid ${theme.palette.primary._alpha.main_20}`,
                fontSize: "1.75rem",
                fontWeight: 800,
                borderRadius: 2,
                "& img": {
                  objectFit: "cover",
                },
              }}
            >
              {!item.imageUrl && item.name.charAt(0)}
            </Avatar>
            <Stack spacing={0.5}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Typography
                  component="div"
                  variant="h6"
                  fontWeight={800}
                  color="text.primary"
                >
                  {item.name}
                </Typography>
                <Chip
                  label={statusLabel}
                  size="small"
                  sx={{
                    fontWeight: 700,
                    height: 20,
                    fontSize: "0.65rem",
                    bgcolor: (theme.palette[statusColor] as PaletteColor)._alpha
                      .main_10,
                    color: (theme.palette[statusColor] as PaletteColor).light,
                    border: `1px solid ${(theme.palette[statusColor] as PaletteColor)._alpha.main_20}`,
                  }}
                />
              </Stack>
              <Typography variant="body2" color="text.secondary">
                {dict.inventory.fields.sku}: {item.sku} • {item.warehouse.name}
              </Typography>
            </Stack>
          </Stack>

          <Stack direction="row" spacing={1}>
            {onEdit && (
              <IconButton
                onClick={() => onEdit(item.id)}
                sx={{
                  color: "primary.main",
                  bgcolor: theme.palette.primary._alpha.main_10,
                  "&:hover": {
                    bgcolor: theme.palette.primary._alpha.main_20,
                  },
                }}
              >
                <EditIcon fontSize="small" />
              </IconButton>
            )}
            <IconButton onClick={onClose} sx={{ color: "text.secondary" }} aria-label="close">
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Stack>

        <Tabs
          value={tabValue}
          onChange={(_, v) => setTabValue(v)}
          sx={{
            mt: 3,

            minHeight: 40,
            "& .MuiTab-root": {
              color: theme.palette.text.secondary_alpha.main_50,
              fontSize: "0.75rem",
              fontWeight: 700,
              textTransform: "uppercase",
              minHeight: 40,
              minWidth: 100,
              p: 0,
            },
            "& .Mui-selected": {
              color: `${theme.palette.primary.main} !important`,
            },
            "& .MuiTabs-indicator": {
              bgcolor: theme.palette.primary.main,
              height: 3,
              borderRadius: "3px 3px 0 0",
            },
          }}
        >
          <Tab
            icon={<OverviewIcon sx={{ fontSize: "1.1rem" }} />}
            iconPosition="start"
            label={dict.inventory.dialogs.overview}
            sx={{ mr: 2 }}
          />
          <Tab
            icon={<HistoryIcon sx={{ fontSize: "1.1rem" }} />}
            iconPosition="start"
            label={dict.inventory.dialogs.history}
          />
        </Tabs>
      </Box>

      <Divider sx={{ borderColor: theme.palette.divider_alpha.main_10 }} />

      <DialogContent sx={{ p: 0, minHeight: 400 }}>
        {/* Overview Tab */}
        <CustomTabPanel value={tabValue} index={0}>
          <Grid container>
            <StockMetricsPanel
              item={item}
              adjustAmount={adjustAmount}
              setAdjustAmount={setAdjustAmount}
              adjustType={adjustType}
              setAdjustType={setAdjustType}
              adjustNote={adjustNote}
              setAdjustNote={setAdjustNote}
              onAdjust={handleAdjustStock}
              isAdjusting={adjustStock.isPending}
            />
            <PhysicalSpecsPanel item={item} otherLocations={otherLocations} />
          </Grid>
        </CustomTabPanel>

        {/* History Tab */}
        <CustomTabPanel value={tabValue} index={1}>
          <MovementHistoryPanel
            movements={movements}
            loadingMovements={loadingMovements}
          />
        </CustomTabPanel>
      </DialogContent>

      <Box
        sx={{
          p: 3,
          px: 4,
          bgcolor: theme.palette.background.default_alpha.main_10,
          borderTop: `1px solid ${theme.palette.divider_alpha.main_10}`,
        }}
      >
        <Stack direction="row" spacing={2} justifyContent="flex-end">
          <Button
            onClick={onClose}
            sx={{
              px: 3,
              fontWeight: 600,
              color: "text.secondary",
              textTransform: "none",
              "&:hover": { color: "text.primary" },
            }}
          >
            {dict.inventory.dialogs.closeView}
          </Button>
          <Button
            startIcon={<EditIcon />}
            variant="contained"
            onClick={() => onEdit(item.id)}
            sx={{
              minWidth: 160,
              borderRadius: 2,
              fontWeight: 700,
              textTransform: "none",
              boxShadow: `0 8px 24px ${theme.palette.primary._alpha.main_20}`,
            }}
          >
            {dict.inventory.dialogs.modifySpecs}
          </Button>
        </Stack>
      </Box>
    </Dialog>
  );
}
