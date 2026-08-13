import Link from "next/link";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  Stack,
  Button,
  Avatar,
  Box,
  Typography,
  Select,
  MenuItem,
  useTheme,
} from "@mui/material";
import type {
  WarehouseWorkerDict,
  WarehouseOption,
} from "@/app/lib/type/warehouseWorkerClient";
import { buildDashboardHomeHref } from "@/app/lib/language/navigation";
import { Ico } from "./Ico";
import UserAccountNav from "../nav/UserAccountNav";

// Mirrors DashboardHeader: the bell pulls the firebase SDK (~237 kB) in via
// useNotifications, so it is lazy-loaded to keep it out of this route's First
// Load JS. The 40px placeholder holds its slot while the chunk streams in.
const NotificationBell = dynamic(
  () => import("../notifications/NotificationBell"),
  { ssr: false, loading: () => <Box sx={{ width: 40, height: 40 }} /> }
);

interface WWHeaderProps {
  ww: WarehouseWorkerDict;
  lang: string;
  locked: boolean;
  warehouseId: string;
  setSelectedWarehouseId: (id: string) => void;
  warehouse: { name: string; code: string; city: string };
  warehouseOptions: WarehouseOption[];
  /** Overrides the default profile menu — used by the demo panel to swap in a mutation-safe stand-in. */
  accountSlot?: ReactNode;
}

export default function WWHeader({
  ww,
  lang,
  locked,
  warehouseId,
  setSelectedWarehouseId,
  warehouse,
  warehouseOptions,
  accountSlot,
}: WWHeaderProps) {
  const theme = useTheme();
  // Demo visitors must return to the demo overview — the real one is
  // protected and would bounce them to sign-in.
  const backHref = buildDashboardHomeHref(usePathname(), lang);

  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      sx={{
        height: { xs: 62, md: 78 },
        bgcolor: theme.palette.background.sidebar,
        borderBottom: `1px solid ${theme.palette.divider}`,
        px: { xs: 1.5, md: 3 },
        gap: 1,
        flexShrink: 0,
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        spacing={2}
        sx={{ minWidth: 0, flex: 1 }}
      >
        {!locked && (
          <Button
            component={Link}
            href={backHref}
            startIcon={<Ico d="M19 12H5M12 19l-7-7 7-7" size={15} />}
            sx={{
              // Duplicated by the bottom nav's Back slot on mobile.
              display: { xs: "none", md: "inline-flex" },
              color: theme.palette.text.secondary,
              bgcolor: "rgba(255,255,255,0.05)",
              borderRadius: 3,
              textTransform: "none",
              flexShrink: 0,
            }}
          >
            {ww.backToPanel}
          </Button>
        )}
        <Avatar
          sx={{
            // Hidden on the narrowest screens: the warehouse name and code
            // carry the identity, and the glyph is what gives way first.
            display: { xs: "none", sm: "flex" },
            bgcolor: `${theme.palette.primary.main}1f`,
            color: theme.palette.primary.main,
            borderRadius: 3,
            width: 46,
            height: 46,
            flexShrink: 0,
          }}
        >
          <Ico d="M3 21h18M4 21V9l8-4 8 4v12M9 21v-6h6v6" size={24} />
        </Avatar>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            sx={{ minWidth: 0 }}
          >
            {warehouseOptions.length > 1 ? (
              <Select
                value={warehouseId}
                onChange={(e) => setSelectedWarehouseId(e.target.value as string)}
                variant="outlined"
                sx={{
                  minWidth: 0,
                  "& .MuiOutlinedInput-notchedOutline": { border: "none" },
                  "& .MuiSelect-select": {
                    py: 0.5,
                    pl: 0,
                    pr: 3,
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    minWidth: 0,
                  },
                  "&:hover": { bgcolor: "rgba(255,255,255,0.02)", borderRadius: 2 },
                }}
                renderValue={(selected) => {
                  const w = warehouseOptions.find((o) => o.id === selected) || warehouse;
                  return (
                    <>
                      <Typography
                        noWrap
                        sx={{
                          fontSize: { xs: 15, md: 19 },
                          fontWeight: 700,
                          minWidth: 0,
                        }}
                      >
                        {w.name}
                      </Typography>
                      <Box
                        sx={{
                          flexShrink: 0,
                          fontSize: 11,
                          fontWeight: 600,
                          color: theme.palette.primary.main,
                          bgcolor: `${theme.palette.primary.main}1f`,
                          px: 1,
                          py: 0.5,
                          borderRadius: 2,
                        }}
                      >
                        {w.code}
                      </Box>
                    </>
                  );
                }}
              >
                {warehouseOptions.map((w) => (
                  <MenuItem key={w.id} value={w.id}>
                    <Typography sx={{ fontWeight: 500, mr: 1 }}>{w.name}</Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      {w.code}
                    </Typography>
                  </MenuItem>
                ))}
              </Select>
            ) : (
              <>
                <Typography
                  noWrap
                  sx={{
                    fontSize: { xs: 15, md: 19 },
                    fontWeight: 700,
                    minWidth: 0,
                  }}
                >
                  {warehouse.name}
                </Typography>
                <Box
                  sx={{
                    flexShrink: 0,
                    fontSize: 11,
                    fontWeight: 600,
                    color: theme.palette.primary.main,
                    bgcolor: `${theme.palette.primary.main}1f`,
                    px: 1,
                    py: 0.5,
                    borderRadius: 2,
                  }}
                >
                  {warehouse.code}
                </Box>
              </>
            )}
          </Stack>
          <Typography
            noWrap
            sx={{
              // The shortened 62px mobile header has no room for a second line.
              display: { xs: "none", md: "block" },
              fontSize: 12,
              color: theme.palette.text.secondary,
            }}
          >
            {warehouse.city} · {ww.ui.aisles}
          </Typography>
        </Box>
      </Stack>
      <Stack
        direction="row"
        alignItems="center"
        spacing={{ xs: 1, md: 2 }}
        // Without this the account block keeps its natural width and overlaps
        // the warehouse name on a narrow header.
        sx={{ flexShrink: 0, minWidth: 0 }}
      >
        {/* The demo panel swaps in its own account slot; it has no real signed-in
            user behind it, so the bell (which reads the live user context) is
            omitted there rather than rendering permanently empty. */}
        {accountSlot ? (
          accountSlot
        ) : (
          <>
            <NotificationBell user={null} />
            <UserAccountNav user={null} />
          </>
        )}
      </Stack>
    </Stack>
  );
}
