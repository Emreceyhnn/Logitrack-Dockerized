"use client";

import {
  Avatar,
  Box,
  Chip,
  Divider,
  Paper,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import PhoneIcon from "@mui/icons-material/Phone";
import EmailIcon from "@mui/icons-material/Email";
import AssignmentIcon from "@mui/icons-material/Assignment";
import { CustomerWithRelations } from "@/app/lib/type/customer";
import { useDictionary } from "@/app/lib/language/DictionaryContext";

interface CustomerContactPanelProps {
  customer: CustomerWithRelations;
}

export default function CustomerContactPanel({
  customer,
}: CustomerContactPanelProps) {
  const theme = useTheme();
  const dict = useDictionary();

  return (
    <Box
      sx={{
        width: { xs: "100%", md: "35%" },
        p: 3,
        borderRight: {
          md: `1px solid ${theme.palette.divider_alpha.main_05}`,
        },
        borderBottom: {
          xs: `1px solid ${theme.palette.divider_alpha.main_05}`,
          md: "none",
        },
        bgcolor: theme.palette.common.black_alpha.main_20,
      }}
    >
      <Stack spacing={4}>
        {/* Primary Contact */}
        <Box>
          <Typography
            variant="overline"
            color="text.secondary"
            fontWeight={700}
            letterSpacing={1.2}
            display="block"
            mb={2}
          >
            {dict.common.contactInfo}
          </Typography>

          <Paper
            variant="outlined"
            sx={{
              p: 2,
              borderRadius: 2,
              bgcolor: theme.palette.background.paper_alpha.main_02,
              borderColor: theme.palette.divider_alpha.main_10,
            }}
          >
            <Stack spacing={1.5}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Avatar sx={{ width: 32, height: 32, fontSize: "0.875rem" }}>
                  {customer.name?.charAt(0)}
                </Avatar>
                <Box>
                  <Typography variant="body2" fontWeight={700} color="white">
                    {customer.email || dict.common.noEmail}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {customer.phone || dict.common.noPhone}
                  </Typography>
                </Box>
              </Stack>
              <Divider sx={{ borderStyle: "dashed" }} />
              <Stack spacing={1}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <PhoneIcon
                    fontSize="small"
                    color="action"
                    sx={{ fontSize: "1rem" }}
                  />
                  <Typography variant="body2">
                    {customer.phone || dict.common.na}
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <EmailIcon
                    fontSize="small"
                    color="action"
                    sx={{ fontSize: "1rem" }}
                  />
                  <Typography
                    variant="body2"
                    sx={{
                      wordBreak: "break-all",
                      color: theme.palette.common.white_alpha.main_70,
                    }}
                  >
                    {customer.email || dict.common.na}
                  </Typography>
                </Stack>
              </Stack>
            </Stack>
          </Paper>
        </Box>

        {/* Address Details (Locations) */}
        <Box>
          <Typography
            variant="overline"
            color="text.secondary"
            fontWeight={700}
            letterSpacing={1.2}
            display="block"
            mb={2}
          >
            {dict.customers.registeredLocations}
          </Typography>
          <Stack spacing={2}>
            {customer.locations && customer.locations.length > 0 ? (
              customer.locations.map((loc, idx) => (
                <Stack
                  key={loc.id || idx}
                  direction="row"
                  spacing={1.5}
                  alignItems="flex-start"
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: theme.palette.background.paper_alpha.main_02,
                    border: `1px solid ${theme.palette.divider_alpha.main_05}`,
                  }}
                >
                  <LocationOnIcon
                    color={loc.isDefault ? "primary" : "action"}
                    fontSize="small"
                    sx={{ mt: 0.2 }}
                  />
                  <Box>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography
                        variant="caption"
                        fontWeight={600}
                        color="text.secondary"
                      >
                        {loc.name}
                      </Typography>
                      {loc.isDefault && (
                        <Chip
                          label={dict.customers.fields.isDefault}
                          size="small"
                          sx={{
                            height: 16,
                            fontSize: "0.6rem",
                            bgcolor: theme.palette.primary._alpha.main_10,
                            color: theme.palette.primary.main,
                          }}
                        />
                      )}
                    </Stack>
                    <Typography variant="body2" fontWeight={500} mt={0.5}>
                      {loc.address || dict.customers.noLocations}
                    </Typography>
                  </Box>
                </Stack>
              ))
            ) : (
              <Typography
                variant="body2"
                color="text.secondary"
                fontStyle="italic"
              >
                {dict.customers.noLocations}
              </Typography>
            )}
          </Stack>

          <Stack
            direction="row"
            spacing={1.5}
            alignItems="center"
            sx={{ pt: 3 }}
          >
            <AssignmentIcon color="action" fontSize="small" />
            <Typography
              variant="caption"
              fontWeight={600}
              color="text.secondary"
            >
              {dict.customers.fields.taxId.split(" / ")[0]}:{" "}
              <Box component="span" color="white">
                {customer.taxId || dict.common.na}
              </Box>
            </Typography>
          </Stack>
        </Box>
      </Stack>
    </Box>
  );
}
