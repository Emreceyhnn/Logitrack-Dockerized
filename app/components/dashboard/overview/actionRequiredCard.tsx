"use client";

import {
  Box,
  Divider,
  List,
  ListItem,
  ListItemButton,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import CustomCard from "../../cards/card";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import PersonIcon from "@mui/icons-material/Person";
import SummarizeIcon from "@mui/icons-material/Summarize";
import WarehouseIcon from "@mui/icons-material/Warehouse";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import { ReactNode } from "react";
import { ActionRequiredItems } from "@/app/lib/type/overview";
import { useRouter, usePathname } from "next/navigation";
import { useLanguage } from "@/app/lib/language/DictionaryContext";
import { getStatusMeta } from "@/app/lib/priorityColor";

interface ActionRequiredCardProps {
  alerts?: ActionRequiredItems[];
}

const ActionRequiredCard = ({ alerts = [] }: ActionRequiredCardProps) => {
  const { lang, dict } = useLanguage();
  const theme = useTheme();
  const router = useRouter();

  const pathname = usePathname();

  const getMessage = (i: ActionRequiredItems) => {
    if (i.messageKey === "ISSUE_ALERT" && i.messageParams) {
      const priority = String(i.messageParams.priority);
      const status = String(i.messageParams.status);
      const p = getStatusMeta(priority, dict).label || priority;
      const s = getStatusMeta(status, dict).label || status;
      return (dict.dashboard.overview.actionRequired.ISSUE_ALERT as string)
        .replace("{priority}", p)
        .replace("{status}", s);
    }
    // Document alerts spell out what expired and whose it is — "the inspection
    // document for vehicle 34ABC123 expired on 3 Mar 2026" — instead of a bare
    // date with no subject.
    if (
      (i.messageKey === "DOC_EXPIRED_DETAIL" ||
        i.messageKey === "DOC_EXPIRING_DETAIL") &&
      i.messageParams
    ) {
      const p = i.messageParams;
      const t = dict.dashboard.overview.actionRequired as Record<string, string>;

      // Pick the phrasing that matches the owner: vehicles and drivers need
      // different wording in Turkish ("aracının" vs "adlı sürücünün"), and a
      // document with neither must not render a dangling "of vehicle".
      const ownerKind = String(p.ownerKind ?? "none");
      const suffix =
        ownerKind === "vehicle" ? "" : ownerKind === "driver" ? "_DRIVER" : "_NONE";
      const template = t[`${i.messageKey}${suffix}`] ?? t[i.messageKey] ?? "";

      const date = p.date
        ? new Intl.DateTimeFormat(lang, {
            day: "numeric",
            month: "short",
            year: "numeric",
          }).format(new Date(String(p.date)))
        : "";

      const docTypeKey = String(p.docType ?? "OTHER");
      const docTypeLabel =
        (dict.vehicles?.docTypes as Record<string, string> | undefined)?.[
          docTypeKey
        ] ?? docTypeKey;

      return template
        .replace("{owner}", String(p.owner ?? ""))
        .replace("{docType}", docTypeLabel)
        .replace("{date}", date);
    }
    if (i.messageKey === "DOC_EXPIRES" && i.messageParams) {
      const d = new Intl.DateTimeFormat(lang, { day: "numeric", month: "short", year: "numeric" }).format(new Date(i.messageParams.date ?? ""));
      return (dict.dashboard.overview.actionRequired.DOC_EXPIRES as string).replace("{date}", d);
    }
    if (i.messageKey === "DOC_EXPIRY_APPROACHING") {
      return dict.dashboard.overview.actionRequired.DOC_EXPIRY_APPROACHING as string;
    }
    return i.message;
  };

  // "3 gün kaldı" / "12 gün geçti" — the date alone does not convey how urgent
  // something is at a glance.
  const countdownLabel = (i: ActionRequiredItems): string | null => {
    if (!i.urgency || i.messageParams?.daysLeft === undefined) return null;
    const t = dict.dashboard.overview.actionRequired as Record<string, string>;
    const days = Number(i.messageParams.daysLeft);
    if (!Number.isFinite(days)) return null;

    if (days < 0) return t.expiredDaysAgo?.replace("{days}", String(-days)) ?? null;
    if (days === 0) return t.expiresToday ?? null;
    return t.expiresInDays?.replace("{days}", String(days)) ?? null;
  };

  // Expired items get their own error-toned icon so the row reads as a breach
  // even before the text is parsed.
  const expiredIcon = (
    <Box
      sx={{
        bgcolor: theme.palette.error._alpha.main_10,
        color: theme.palette.error.main,
        width: 32,
        height: 32,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "8px",
      }}
    >
      <ErrorOutlineIcon sx={{ fontSize: 18 }} />
    </Box>
  );

  const handleActionClick = (link?: string) => {
    if (link) {
      const isDemo = pathname?.includes("/demo");
      const finalLink = isDemo && !link.startsWith("/demo") ? `/demo${link}` : link;
      router.push(finalLink);
    }
  };

  const setType: Record<ActionRequiredItems["type"], ReactNode> = {
    SHIPMENT_DELAY: (
      <Box
        sx={{
          bgcolor: theme.palette.error._alpha.main_10,
          color: theme.palette.error.main,
          width: 32,
          height: 32,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "8px",
        }}
      >
        <LocalShippingIcon sx={{ fontSize: 18 }} />
      </Box>
    ),
    vehicle: (
      <Box
        sx={{
          bgcolor: theme.palette.warning._alpha.main_10,
          color: theme.palette.warning.main,
          width: 32,
          height: 32,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "8px",
        }}
      >
        <DirectionsCarIcon sx={{ fontSize: 18 }} />
      </Box>
    ),
    driver: (
      <Box
        sx={{
          bgcolor: theme.palette.secondary._alpha.main_10,
          color: theme.palette.secondary.main,
          width: 32,
          height: 32,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "8px",
        }}
      >
        <PersonIcon sx={{ fontSize: 18 }} />
      </Box>
    ),
    DOCUMENT_DUE: (
      <Box
        sx={{
          bgcolor: theme.palette.info._alpha.main_10,
          color: theme.palette.info.main,
          width: 32,
          height: 32,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "8px",
        }}
      >
        <SummarizeIcon sx={{ fontSize: 18 }} />
      </Box>
    ),
    warehouse: (
      <Box
        sx={{
          bgcolor: theme.palette.success._alpha.main_10,
          color: theme.palette.success.main,
          width: 32,
          height: 32,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "8px",
        }}
      >
        <WarehouseIcon sx={{ fontSize: 18 }} />
      </Box>
    ),
  };
  return (
    <CustomCard
      sx={{
        padding: "0 0 6px 0",
        height: 420,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        p={2}
      >
        <Typography sx={{ fontSize: 18, fontWeight: 600 }}>
          {dict.dashboard.overview.actionRequired.title}
        </Typography>
        {alerts.length > 0 && (
          <Box
            sx={{
              bgcolor: theme.palette.error._alpha.main_10,
              color: theme.palette.error.main,
              px: 1,
              py: 0.25,
              borderRadius: "12px",
              fontSize: "0.75rem",
              fontWeight: 700,
            }}
          >
            {dict.dashboard.overview.actionRequired.pendingCount.replace(
              "{count}",
              alerts.length.toString()
            )}
          </Box>
        )}
      </Stack>
      <Divider />

      <Box sx={{ flexGrow: 1, overflowY: "auto" }}>
        {alerts.length === 0 ? (
          <Stack
            alignItems="center"
            justifyContent="center"
            height="100%"
            minHeight={200}
            spacing={2}
            p={3}
          >
            <Box sx={{ color: "success.main", opacity: 0.5 }}>
              <CheckCircleOutlineIcon sx={{ fontSize: 48 }} />
            </Box>
            <Typography variant="body2" color="text.secondary" align="center">
              {dict.dashboard.overview.actionRequired.allClear}
            </Typography>
          </Stack>
        ) : (
          <List sx={{ p: 0 }}>
            {alerts.map((i, index) => (
              <Box key={index}>
                <ListItem disablePadding>
                  <ListItemButton
                    onClick={() => handleActionClick(i.link)}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "start",
                      gap: 2,
                      p: 2,
                      transition: "background-color 0.2s",
                      "&:hover": {
                        bgcolor: "action.hover",
                      },
                    }}
                  >
                    {i.urgency === "EXPIRED" ? expiredIcon : setType[i.type]}

                    <Stack spacing={0.25} sx={{ minWidth: 0 }}>
                      <Stack
                        direction="row"
                        spacing={0.75}
                        alignItems="center"
                        flexWrap="wrap"
                      >
                        <Typography
                          fontSize={14}
                          fontWeight={600}
                          color="text.primary"
                        >
                          {i.title}
                        </Typography>
                        {/* An expired document is a live compliance breach, so
                            it carries a filled badge rather than the same muted
                            treatment as an upcoming renewal. */}
                        {i.urgency === "EXPIRED" && (
                          <Box
                            sx={{
                              bgcolor: theme.palette.error.main,
                              color: theme.palette.error.contrastText,
                              px: 0.75,
                              py: 0.125,
                              borderRadius: "6px",
                              fontSize: "0.65rem",
                              fontWeight: 800,
                              letterSpacing: 0.3,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {dict.dashboard.overview.actionRequired.badgeExpired}
                          </Box>
                        )}
                        {i.urgency === "EXPIRING_SOON" && (
                          <Box
                            sx={{
                              border: `1px solid ${theme.palette.warning.main}`,
                              color: theme.palette.warning.main,
                              px: 0.75,
                              py: 0.125,
                              borderRadius: "6px",
                              fontSize: "0.65rem",
                              fontWeight: 700,
                              letterSpacing: 0.3,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {
                              dict.dashboard.overview.actionRequired
                                .badgeExpiringSoon
                            }
                          </Box>
                        )}
                      </Stack>
                      <Typography
                        fontSize={13}
                        color={
                          i.urgency === "EXPIRED"
                            ? "error.main"
                            : "text.secondary"
                        }
                        fontWeight={i.urgency === "EXPIRED" ? 600 : 400}
                      >
                        {getMessage(i)}
                      </Typography>
                      {countdownLabel(i) && (
                        <Typography
                          fontSize={12}
                          color={
                            i.urgency === "EXPIRED"
                              ? "error.main"
                              : "text.secondary"
                          }
                        >
                          {countdownLabel(i)}
                        </Typography>
                      )}
                    </Stack>
                  </ListItemButton>
                </ListItem>
                {index !== alerts.length - 1 && <Divider />}
              </Box>
            ))}
          </List>
        )}
      </Box>
    </CustomCard>
  );
};

export default ActionRequiredCard;
