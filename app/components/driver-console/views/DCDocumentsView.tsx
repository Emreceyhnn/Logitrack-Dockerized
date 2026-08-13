import { Box, Stack, Typography, Card, Avatar, useTheme } from "@mui/material";
import { Ico } from "@/app/components/warehouse-worker/Ico";
import type { DriverConsoleState } from "@/app/hooks/useDriverConsoleState";

const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  ACTIVE: { color: "#34D399", bg: "rgba(52,211,153,0.14)" },
  MISSING: { color: "#94a3b8", bg: "rgba(148,163,184,0.14)" },
  EXPIRING_SOON: { color: "#f59e0b", bg: "rgba(245,158,11,0.14)" },
  EXPIRED: { color: "#F44336", bg: "rgba(244,67,54,0.14)" },
};

export default function DCDocumentsView({ state }: { state: DriverConsoleState }) {
  const theme = useTheme();
  const { dc, driver, documents } = state;

  return (
    <Stack spacing={2.5}>
      <Card
        sx={{
          bgcolor: theme.palette.background.paper,
          borderRadius: 3,
          p: { xs: 2, sm: 2.5 },
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          gap: { xs: 2, sm: 3 },
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="overline" sx={{ fontWeight: 800, color: theme.palette.text.secondary }}>
            {dc.documentsView.profile}
          </Typography>
          <Typography sx={{ fontSize: 20, fontWeight: 900, mt: 0.75 }}>{driver?.name ?? "—"}</Typography>
          <Typography sx={{ fontSize: 13, color: theme.palette.text.secondary, mt: 0.25 }}>
            {driver?.employeeId} · {driver?.phone}
          </Typography>
          <Typography sx={{ fontSize: 13, color: theme.palette.text.secondary, mt: 0.25 }}>
            {dc.documentsView.languages}: {driver?.languages.join(", ") || "—"}
          </Typography>
        </Box>
        {driver?.hazmatCertified && (
          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            sx={{
              px: 2,
              py: 1.5,
              borderRadius: 3,
              bgcolor: "rgba(168,85,247,0.12)",
              border: "1px solid rgba(168,85,247,0.3)",
              color: "#a855f7",
              fontWeight: 800,
              fontSize: 13,
              height: "fit-content",
            }}
          >
            <Ico d="M12 3 2 20h20L12 3zM12 10v4M12 17h.01" size={16} />
            {dc.documentsView.hazmatCertified}
          </Stack>
        )}
      </Card>

      <Stack spacing={1.5}>
        {documents.map((doc) => {
          const colors = STATUS_COLORS[doc.status] ?? STATUS_COLORS.ACTIVE!;
          return (
            <Card
              key={doc.id}
              sx={{
                bgcolor: theme.palette.background.paper,
                borderRadius: 3,
                px: { xs: 2, sm: 2.25 },
                py: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: { xs: 1.25, sm: 2 },
              }}
            >
              <Stack
                direction="row"
                alignItems="center"
                spacing={{ xs: 1.25, sm: 1.75 }}
                sx={{ minWidth: 0 }}
              >
                <Avatar
                  sx={{
                    flexShrink: 0,
                    width: 38,
                    height: 38,
                    borderRadius: 2.5,
                    bgcolor: "rgba(2,132,199,0.12)",
                    color: "#0284c7",
                  }}
                >
                  <Ico d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" size={18} />
                </Avatar>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontSize: 14, fontWeight: 700, wordBreak: "break-word" }}>
                    {doc.name}
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: theme.palette.text.secondary, mt: 0.25 }}>
                    {dc.documentsView.expiresOn}:{" "}
                    {doc.expiryDate ? new Date(doc.expiryDate).toLocaleDateString("tr-TR") : "—"}
                  </Typography>
                </Box>
              </Stack>
              <Box
                sx={{
                  flexShrink: 0,
                  fontSize: 11,
                  fontWeight: 800,
                  color: colors.color,
                  bgcolor: colors.bg,
                  px: 1.25,
                  py: 0.6,
                  borderRadius: 2,
                  whiteSpace: "nowrap",
                }}
              >
                {dc.documentsView[doc.status]}
              </Box>
            </Card>
          );
        })}
      </Stack>
    </Stack>
  );
}
