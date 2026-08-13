import {
  Box,
  Grid,
  Stack,
  Typography,
  MenuItem,
  Switch,
  FormControlLabel,
} from "@mui/material";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import { WarehouseType } from "@/app/lib/type/enums";
import {
  WarehouseBasicInfo,
  WarehouseFormActions,
} from "@/app/lib/type/warehouse-form";
import CustomTextArea from "@/app/components/inputs/customTextArea";

import { getUserNow } from "@/app/lib/utils/date";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import { useState, useEffect } from "react";
import { COMMON_TIMEZONES } from "@/app/lib/constants";

interface BasicInfoSectionProps {
  state: WarehouseBasicInfo;
  actions: WarehouseFormActions;
}

const BasicInfoSection = ({ state, actions }: BasicInfoSectionProps) => {
  /* -------------------------------- variables ------------------------------- */
  const dict = useDictionary();

  const f = dict.warehouses.dialogs.fields;
  const [localTime, setLocalTime] = useState(getUserNow(state.timezone));

  useEffect(() => {
    const timer = setInterval(() => {
      setLocalTime(getUserNow(state.timezone));
    }, 1000);
    return () => clearInterval(timer);
  }, [state.timezone]);

  return (
    <Box>
      <Stack spacing={4}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box
            sx={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              bgcolor: "primary.main",
              boxShadow: `0 0 10px theme.palette.primary.main`,
            }}
          />
          <Typography variant="subtitle1" fontWeight={700} color="white">
            {f.identity}
          </Typography>
        </Stack>

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 8 }}>
            <Stack spacing={1}>
              <Typography
                variant="caption"
                color="text.secondary"
                fontWeight={600}
              >
                {f.name} *
              </Typography>
              <CustomTextArea
                name="name"
                placeholder={f.namePlaceholder}
                value={state.name}
                onChange={(e) =>
                  actions.updateBasicInfo({ name: e.target.value })
                }
              />
            </Stack>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Stack spacing={1}>
              <Typography
                variant="caption"
                color="text.secondary"
                fontWeight={600}
              >
                {f.code}
              </Typography>
              <CustomTextArea
                name="code"
                placeholder={f.codePlaceholder}
                value={state.code}
                onChange={(e) =>
                  actions.updateBasicInfo({ code: e.target.value })
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
                {f.type}
              </Typography>
              <CustomTextArea
                name="type"
                select
                value={state.type}
                onChange={(e) =>
                  actions.updateBasicInfo({
                    type: e.target.value as WarehouseType,
                  })
                }
              >
                <MenuItem value="WAREHOUSE">
                  {dict.warehouses.categories.types.WAREHOUSE}
                </MenuItem>
                <MenuItem value="DISTRIBUTION_CENTER">
                  {dict.warehouses.categories.types.DISTRIBUTION_CENTER}
                </MenuItem>
                <MenuItem value="CROSSDOCK">
                  {dict.warehouses.categories.types.CROSSDOCK}
                </MenuItem>
              </CustomTextArea>
            </Stack>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Stack spacing={1}>
              <Typography
                variant="caption"
                color="text.secondary"
                fontWeight={600}
              >
                {f.timezone} *
              </Typography>
              <CustomTextArea
                name="timezone"
                select
                value={state.timezone}
                onChange={(e) =>
                  actions.updateBasicInfo({
                    timezone: e.target.value as string,
                  })
                }
              >
                {COMMON_TIMEZONES.map((tz) => (
                  <MenuItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </MenuItem>
                ))}
              </CustomTextArea>
              <Typography
                variant="caption"
                color="primary.main"
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                  mt: 0.5,
                  fontWeight: 600,
                }}
              >
                <AccessTimeIcon sx={{ fontSize: 14 }} />
                {dict.common.currentTimeAtLocation ||
                  "Current time at location"}
                : {localTime.format("HH:mm:ss")}
              </Typography>
            </Stack>
          </Grid>
        </Grid>

        <Stack spacing={2.5}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  bgcolor: "primary.main",
                }}
              />
              <Typography variant="subtitle1" fontWeight={700} color="white">
                {f.operatingHours}
              </Typography>
            </Stack>
            <FormControlLabel
              control={
                <Switch
                  checked={state.is247}
                  onChange={(e) =>
                    actions.updateBasicInfo({ is247: e.target.checked })
                  }
                  size="small"
                />
              }
              label={
                <Typography
                  variant="caption"
                  fontWeight={600}
                  color="text.secondary"
                >
                  {f.is247}
                </Typography>
              }
              sx={{ color: "text.secondary" }}
            />
          </Stack>

          {!state.is247 && (
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Stack spacing={1}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    fontWeight={600}
                  >
                    {dict.warehouses.dialogs.fields.openingTime}
                  </Typography>
                  <CustomTextArea
                    name="openingTime"
                    type="time"
                    value={state.openingTime || ""}
                    onChange={(e) =>
                      actions.updateBasicInfo({ openingTime: e.target.value })
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
                    {dict.warehouses.dialogs.fields.closingTime}
                  </Typography>
                  <CustomTextArea
                    name="closingTime"
                    type="time"
                    value={state.closingTime || ""}
                    onChange={(e) =>
                      actions.updateBasicInfo({ closingTime: e.target.value })
                    }
                  />
                </Stack>
              </Grid>
            </Grid>
          )}
        </Stack>
      </Stack>
    </Box>
  );
};

export default BasicInfoSection;
