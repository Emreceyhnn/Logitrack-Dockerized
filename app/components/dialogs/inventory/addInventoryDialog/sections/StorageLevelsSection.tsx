"use client";

import {
  Box,
  Grid,
  Stack,
  Typography,
  useTheme,
  MenuItem,
} from "@mui/material";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import { useState, useEffect } from "react";
import { AddInventoryStorageLevels } from "@/app/lib/type/add-inventory";
import CustomTextArea from "@/app/components/inputs/customTextArea";
import { Warehouse } from "@/app/lib/type/enums";
import { getWarehouses } from "@/app/lib/controllers/warehouse";
import { useWarehouseZones } from "@/app/hooks/useWarehouses";
import { useUser } from "@/app/hooks/useUser";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { logger } from "@/app/lib/logger";


interface StorageLevelsSectionProps {
  state: AddInventoryStorageLevels;
  updateStorageLevels: (data: Partial<AddInventoryStorageLevels>) => void;
  /**
   * Set when the dialog was opened from a specific warehouse's own tab. The
   * destination is already decided there, so the picker is locked and says so
   * — leaving it enabled implied a choice that the caller had in fact made.
   */
  lockedWarehouseId?: string | undefined;
}

const StorageLevelsSection = ({
  state,
  updateStorageLevels,
  lockedWarehouseId,
}: StorageLevelsSectionProps) => {
  /* -------------------------------- variables ------------------------------- */
  const dict = useDictionary();
  const theme = useTheme();
  const { user } = useUser();

  /* ---------------------------------- state --------------------------------- */
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const { data: zones } = useWarehouseZones(state.warehouseId || undefined);

  // Local string state for smooth numeric input (handles decimals/empty better)
  const [localQuantity, setLocalQuantity] = useState(
    state.initialQuantity === 0 ? "" : state.initialQuantity.toString()
  );
  const [localMinStock, setLocalMinStock] = useState(
    state.minStockLevel === 0 ? "" : state.minStockLevel.toString()
  );

  const handleNumChange = (
    field: keyof AddInventoryStorageLevels,
    val: string,
    setLocal: (v: string) => void
  ) => {
    setLocal(val);
    const parsed = parseInt(val);
    updateStorageLevels({ [field]: isNaN(parsed) ? 0 : parsed });
  };

  /* -------------------------------- lifecycle ------------------------------- */
  useEffect(() => {
    const fetchWarehouses = async () => {
      if (!user || !user.companyId) return;
      try {
        const data = await getWarehouses();
        setWarehouses(data);
      } catch (error) {
        logger.error("Failed to fetch warehouses:", error);
      }
    };
    fetchWarehouses();
  }, [user]);

  return (
    <Box>
      <Stack spacing={4}>
        <Stack spacing={0.5}>
          <Typography variant="subtitle1" fontWeight={700} color="white">
            {dict.inventory.dialogs.storageAndLevels}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {dict.inventory.dialogs.storageDesc}
          </Typography>
        </Stack>

        <Stack spacing={4}>
          <Stack spacing={2}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box sx={{ color: theme.palette.primary.main, display: "flex" }}>
                <InfoOutlinedIcon fontSize="small" />
              </Box>
              <Typography variant="subtitle2" fontWeight={700} color="white">
                {dict.inventory.dialogs.warehouseLocation}
              </Typography>
            </Stack>
            <Stack spacing={1}>
              <Typography
                variant="caption"
                color="text.secondary"
                fontWeight={600}
              >
                {dict.inventory.dialogs.selectFacility}
              </Typography>
              <CustomTextArea
                name="warehouseId"
                select
                value={state.warehouseId}
                disabled={Boolean(lockedWarehouseId)}
                onChange={(e) =>
                  updateStorageLevels({ warehouseId: e.target.value })
                }
              >
                {/* Rendered even while the list is loading, so a locked picker
                    still shows its own warehouse instead of an empty box. */}
                {lockedWarehouseId &&
                  !warehouses.some((w) => w.id === lockedWarehouseId) && (
                    <MenuItem value={lockedWarehouseId}>
                      {dict.common.loading}
                    </MenuItem>
                  )}
                <MenuItem value="" disabled>
                  {dict.common.noData}
                </MenuItem>
                {warehouses.map((w) => (
                  <MenuItem key={w.id} value={w.id}>
                    {w.name} ({w.code})
                  </MenuItem>
                ))}
              </CustomTextArea>
              {lockedWarehouseId && (
                <Typography variant="caption" color="text.secondary">
                  {dict.inventory.dialogs.warehouseLockedHint}
                </Typography>
              )}
            </Stack>
            {state.warehouseId && (
              <Stack spacing={1}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontWeight={600}
                >
                  {dict.warehouses.dialogs.zones.code}
                </Typography>
                <CustomTextArea
                  name="zone"
                  select
                  value={state.zone || ""}
                  onChange={(e) => updateStorageLevels({ zone: e.target.value })}
                >
                  <MenuItem value="">{dict.warehouses.dialogs.fields.unassigned}</MenuItem>
                  {(zones || []).map((z) => (
                    <MenuItem key={z.id} value={z.code}>
                      {z.code}
                      {z.name ? ` · ${z.name}` : ""}
                    </MenuItem>
                  ))}
                </CustomTextArea>
                {!zones?.length && (
                  <Typography variant="caption" color="text.secondary">
                    {dict.warehouses.dialogs.zones.empty}
                  </Typography>
                )}
              </Stack>
            )}
          </Stack>

          <Stack spacing={2}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box sx={{ color: theme.palette.primary.main, display: "flex" }}>
                <InfoOutlinedIcon fontSize="small" />
              </Box>
              <Typography variant="subtitle2" fontWeight={700} color="white">
                {dict.inventory.dialogs.stockConfig}
              </Typography>
            </Stack>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Stack spacing={1}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    fontWeight={600}
                  >
                    {dict.inventory.dialogs.initialQuantity}
                  </Typography>
                  <CustomTextArea
                    name="initialQuantity"
                    type="number"
                    placeholder="0"
                    value={localQuantity}
                    onChange={(e) =>
                      handleNumChange(
                        "initialQuantity",
                        e.target.value,
                        setLocalQuantity
                      )
                    }
                  />
                </Stack>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Stack spacing={1}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    fontWeight={600}
                  >
                    {dict.inventory.dialogs.minStockAlert}
                  </Typography>
                  <CustomTextArea
                    name="minStockLevel"
                    type="number"
                    placeholder="10"
                    value={localMinStock}
                    onChange={(e) =>
                      handleNumChange(
                        "minStockLevel",
                        e.target.value,
                        setLocalMinStock
                      )
                    }
                  />
                </Stack>
              </Grid>
            </Grid>
          </Stack>

          <Box
            sx={{
              p: 2.5,
              borderRadius: 3,
              bgcolor: theme.palette.primary._alpha.main_05,
              border: `1px solid ${theme.palette.primary._alpha.main_10}`,
              display: "flex",
              gap: 2,
            }}
          >
            <Box sx={{ color: theme.palette.primary.main, mt: 0.5 }}>
              <InfoOutlinedIcon fontSize="small" />
            </Box>
            <Stack spacing={0.5}>
              <Typography variant="caption" fontWeight={700} color="white">
                {dict.inventory.dialogs.movementDetails}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ lineHeight: 1.5 }}
              >
                {dict.inventory.dialogs.putawayDesc}
              </Typography>
            </Stack>
          </Box>
        </Stack>
      </Stack>
    </Box>
  );
};

export default StorageLevelsSection;
