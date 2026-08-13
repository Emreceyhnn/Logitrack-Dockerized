import { Stack, Box, Typography, Card, Avatar, useTheme } from "@mui/material";
import type { Theme } from "@mui/material/styles";
import type {
  Movement,
  WarehouseWorkerDict,
} from "@/app/lib/type/warehouseWorkerClient";
import { I, zoneLabel } from "@/app/lib/utils/warehouseWorkerUi";
import { Ico } from "./Ico";

export function getMoveMetaFor(
  type: string,
  theme: Theme,
  ww?: WarehouseWorkerDict
) {
  const moveMeta: Record<string, { color: string; bg: string; label?: string }> = {
    PICK: { color: theme.palette.kpi.amber, bg: "rgba(245,158,11,0.14)", label: ww?.ui?.PICK || "PICK" },
    PACK: { color: theme.palette.kpi.emerald, bg: "rgba(52,211,153,0.14)", label: ww?.ui?.PACK || "PACK" },
    PUT: { color: theme.palette.kpi.cyan, bg: "rgba(56,189,248,0.14)", label: ww?.ui?.PUT || "PUT" },
    PUTAWAY: { color: theme.palette.kpi.cyan, bg: "rgba(56,189,248,0.14)", label: ww?.ui?.PUTAWAY || "PUT" },
    RESTOCK: { color: theme.palette.kpi.cyan, bg: "rgba(34,211,238,0.14)", label: ww?.ui?.RESTOCK || "RESTOCK" },
    RESTOCK_REQUEST: {
      color: theme.palette.kpi.cyan,
      bg: "rgba(34,211,238,0.14)",
      label: ww?.ui?.RESTOCK_REQUEST || "RESTOCK",
    },
    STOCK_IN: { color: theme.palette.kpi.emerald, bg: "rgba(52,211,153,0.14)", label: ww?.ui?.STOCK_IN || "IN" },
    ADJUSTMENT: { color: theme.palette.kpi.purple, bg: "rgba(139,92,246,0.14)", label: ww?.ui?.ADJUSTMENT || "ADJ" },
  };

  const MOVE_FALLBACK = {
    color: "rgba(255,255,255,0.6)",
    bg: "rgba(255,255,255,0.08)",
  };

  const m = moveMeta[type] ?? MOVE_FALLBACK;
  return {
    color: m.color,
    bg: m.bg,
    label: (moveMeta[type]?.label ?? type).slice(0, 10),
  };
}

interface WWLiveFeedProps {
  fd: Movement[];
  ww: WarehouseWorkerDict;
}

export default function WWLiveFeed({ fd, ww }: WWLiveFeedProps) {
  const theme = useTheme();

  return (
    <Card sx={{ bgcolor: theme.palette.background.paper, color: theme.palette.text.primary, borderRadius: 3 }}>
      <Stack
        direction="row"
        alignItems="center"
        spacing={1.5}
        sx={{ p: { xs: 2, md: 2.5 }, borderBottom: `1px solid ${theme.palette.divider}` }}
      >
        <Avatar
          sx={{ bgcolor: `${theme.palette.kpi.purple}1f`, color: theme.palette.kpi.purple, borderRadius: 2 }}
        >
          <Ico d={I.activity} size={19} />
        </Avatar>
        <Typography sx={{ fontWeight: 700, fontSize: 16 }}>
          {ww.ui.liveMovements}
        </Typography>
      </Stack>
      {/* Column headers belong to the desktop table only — on mobile each row
          becomes a self-labelling card, so a header strip would be dead weight. */}
      <Stack
        direction="row"
        spacing={2}
        sx={{
          display: { xs: "none", md: "flex" },
          px: 3,
          py: 1.5,
          borderBottom: `1px solid ${theme.palette.divider}`,
          fontSize: 10,
          fontWeight: 800,
          color: theme.palette.text.secondary,
          textTransform: "uppercase",
        }}
      >
        <Box sx={{ width: 90 }}>{ww.ui.type}</Box>
        <Box sx={{ flex: 1 }}>{ww.ui.item}</Box>
        <Box sx={{ width: 80, textAlign: "right" }}>{ww.ui.qty}</Box>
        <Box sx={{ width: 80 }}>{ww.ui.zone}</Box>
        <Box sx={{ width: 120 }}>{ww.ui.by}</Box>
        <Box sx={{ width: 90, textAlign: "right" }}>{ww.ui.time}</Box>
      </Stack>
      {/* Cards are taller than table rows, so the mobile viewport gets more
          room before it starts scrolling internally. */}
      <Box sx={{ maxHeight: { xs: 440, md: 320 }, overflowY: "auto" }}>
        {fd.length === 0 ? (
          <Stack 
            alignItems="center" 
            justifyContent="center" 
            spacing={2} 
            sx={{ 
              py: 6, 
              px: 3, 
              minHeight: 220,
              m: 2,
              borderRadius: 3,
              border: `1px dashed ${theme.palette.divider}`,
              bgcolor: "rgba(255,255,255,0.01)"
            }}
          >
            <Avatar 
              sx={{ 
                bgcolor: "rgba(255,255,255,0.03)", 
                color: "rgba(255,255,255,0.3)", 
                width: 56, 
                height: 56,
                border: "1px solid rgba(255,255,255,0.05)"
              }}
            >
              <Ico d={I.activity} size={24} />
            </Avatar>
            <Box textAlign="center">
              <Typography sx={{ fontSize: 16, fontWeight: 700, color: theme.palette.text.secondary, mb: 0.5 }}>
                {ww.ui.noMovements ?? "Henüz hareket yok"}
              </Typography>
              <Typography sx={{ fontSize: 13, color: "rgba(255,255,255,0.3)", fontWeight: 500 }}>
                {ww.ui.noMovementsDesc ?? "Canlı stok hareketleri burada listelenecektir."}
              </Typography>
            </Box>
          </Stack>
        ) : (
          fd.map((mv) => {
            const mm = getMoveMetaFor(mv.type, theme, ww);
            const qty = mv.qty > 0 ? `+${mv.qty}` : String(mv.qty);
            return (
              <Box
                key={mv.id}
                sx={{ borderBottom: `1px solid ${theme.palette.divider}` }}
              >
                {/* Desktop: the six-column table row, matching the header strip. */}
                <Stack
                  direction="row"
                  spacing={2}
                  alignItems="center"
                  sx={{ display: { xs: "none", md: "flex" }, px: 3, py: 1.5 }}
                >
                  <Box
                    sx={{
                      width: 90,
                      textAlign: "center",
                      bgcolor: mm.bg,
                      color: mm.color,
                      py: 0.5,
                      borderRadius: 2,
                      fontSize: 10,
                      fontWeight: 800,
                    }}
                  >
                    {mm.label}
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography noWrap sx={{ fontSize: 13, fontWeight: 600 }}>
                      {mv.name}
                    </Typography>
                    <Typography
                      noWrap
                      sx={{
                        fontSize: 11,
                        fontFamily: "monospace",
                        color: theme.palette.text.secondary,
                      }}
                    >
                      {mv.sku}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      width: 80,
                      textAlign: "right",
                      color: mm.color,
                      fontFamily: "monospace",
                      fontSize: 14,
                      fontWeight: 800,
                    }}
                  >
                    {qty}
                  </Box>
                  <Box
                    sx={{
                      width: 80,
                      fontSize: 12,
                      fontWeight: 600,
                      color: theme.palette.text.secondary,
                    }}
                  >
                    {zoneLabel(mv.zone, ww)}
                  </Box>
                  <Box
                    sx={{
                      width: 120,
                      fontSize: 12,
                      fontWeight: 600,
                      color: mv.self ? theme.palette.primary.main : theme.palette.text.secondary,
                    }}
                  >
                    {mv.who}
                  </Box>
                  <Box
                    sx={{
                      width: 90,
                      textAlign: "right",
                      fontSize: 12,
                      fontFamily: "monospace",
                      color: theme.palette.text.secondary,
                    }}
                  >
                    {mv.t}
                  </Box>
                </Stack>

                {/* Mobile: the same record as a card. Type, item and quantity
                    lead; zone/who/time drop to a labelled meta line so nothing
                    needs horizontal scrolling to read. */}
                <Stack
                  spacing={1}
                  sx={{ display: { xs: "flex", md: "none" }, px: 2, py: 1.75 }}
                >
                  <Stack direction="row" alignItems="flex-start" spacing={1.5}>
                    <Box
                      sx={{
                        flexShrink: 0,
                        minWidth: 68,
                        textAlign: "center",
                        bgcolor: mm.bg,
                        color: mm.color,
                        px: 0.75,
                        py: 0.5,
                        borderRadius: 2,
                        fontSize: 10,
                        fontWeight: 800,
                      }}
                    >
                      {mm.label}
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontSize: 13.5, fontWeight: 700 }}>
                        {mv.name}
                      </Typography>
                      <Typography
                        noWrap
                        sx={{
                          fontSize: 11,
                          fontFamily: "monospace",
                          color: theme.palette.text.secondary,
                        }}
                      >
                        {mv.sku}
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        flexShrink: 0,
                        color: mm.color,
                        fontFamily: "monospace",
                        fontSize: 15,
                        fontWeight: 800,
                      }}
                    >
                      {qty}
                    </Box>
                  </Stack>
                  <Stack
                    direction="row"
                    flexWrap="wrap"
                    sx={{
                      gap: 1.5,
                      pl: "80px",
                      fontSize: 11,
                      fontWeight: 600,
                      color: theme.palette.text.secondary,
                    }}
                  >
                    <Box component="span">
                      {ww.ui.zone}: {zoneLabel(mv.zone, ww) || "—"}
                    </Box>
                    <Box
                      component="span"
                      sx={{
                        color: mv.self ? theme.palette.primary.main : "inherit",
                      }}
                    >
                      {ww.ui.by}: {mv.who}
                    </Box>
                    <Box component="span" sx={{ fontFamily: "monospace" }}>
                      {mv.t}
                    </Box>
                  </Stack>
                </Stack>
              </Box>
            );
          })
        )}
      </Box>
    </Card>
  );
}
