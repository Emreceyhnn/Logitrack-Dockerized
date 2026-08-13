import React, { useState } from "react";
import {
  Stack,
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  useTheme,
} from "@mui/material";
import type { Theme } from "@mui/material/styles";
import type {
  SkuInfo,
  WarehouseWorkerDict,
} from "@/app/lib/type/warehouseWorkerClient";
import { zoneLabel } from "@/app/lib/utils/warehouseWorkerUi";

interface WWScanSectionProps {
  scanResult: SkuInfo | null;
  scanInput: string;
  setScanInput: (v: string) => void;
  doScan: (raw: string) => void;
  simScan: () => void;
  scanQty: number;
  setScanQty: React.Dispatch<React.SetStateAction<number>>;
  log: (kind: "PICK" | "PACK" | "STOCK_IN" | "PUTAWAY") => void;
  adjust: (counted: number, reason: string) => void;
  setScanResult: (v: SkuInfo | null) => void;
  ww: WarehouseWorkerDict;
}

export default function WWScanSection({
  scanResult,
  scanInput,
  setScanInput,
  doScan,
  simScan,
  scanQty,
  setScanQty,
  log,
  adjust,
  setScanResult,
  ww,
}: WWScanSectionProps) {
  const theme = useTheme();

  // Adjustment sub-flow: when open, the action grid is replaced by an
  // expected-vs-counted form. `counted` seeds from the qty stepper so a worker
  // who already counted with +/− doesn't re-enter it.
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [counted, setCounted] = useState<string>("");
  const [reason, setReason] = useState("");

  const expected = scanResult?.onHand;
  const knownSku = expected !== undefined;
  const countedNum = counted.trim() === "" ? NaN : Number(counted);
  const validCount = Number.isFinite(countedNum) && countedNum >= 0;
  const diff = validCount && knownSku ? countedNum - expected : null;

  const closeAdjust = () => {
    setAdjustOpen(false);
    setCounted("");
    setReason("");
  };

  const submitAdjust = () => {
    if (!validCount || !reason.trim()) return;
    adjust(countedNum, reason.trim());
    closeAdjust();
  };

  return (
    <Box sx={{ p: { xs: 2, md: 2.5 } }}>
      {!scanResult ? (
        <>
          {/* The barcode field needs the full width on a phone, so the scan
              button drops below it instead of squeezing the input. */}
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
            <TextField
              fullWidth
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && doScan(scanInput)}
              placeholder={ww.ui.scanPlaceholder}
              variant="outlined"
              sx={{
                input: { color: theme.palette.text.primary },
                "& .MuiOutlinedInput-root": {
                  borderRadius: 3,
                  bgcolor: "rgba(255,255,255,0.04)",
                },
              }}
            />
            <Button
              variant="contained"
              onClick={() => doScan(scanInput)}
              sx={{
                borderRadius: 3,
                bgcolor: theme.palette.primary.main,
                px: { xs: 2.5, md: 4 },
                height: { xs: 48, sm: "auto" },
                flexShrink: 0,
              }}
            >
              {ww.ui.scanBtn}
            </Button>
          </Stack>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            spacing={1}
            sx={{ mt: 1.5 }}
          >
            <Typography
              variant="caption"
              sx={{ color: theme.palette.text.secondary, minWidth: 0 }}
            >
              {ww.ui.scanHint}
            </Typography>
            <Button
              size="small"
              onClick={simScan}
              sx={{
                textTransform: "none",
                color: theme.palette.primary.main,
                flexShrink: 0,
              }}
            >
              {ww.ui.simScan}
            </Button>
          </Stack>
        </>
      ) : (
        <>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "stretch", sm: "center" }}
            spacing={{ xs: 1.5, sm: 0 }}
            sx={{
              p: 2,
              bgcolor: "rgba(255,255,255,0.04)",
              borderRadius: 3,
              border: `1px solid ${theme.palette.divider}`,
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                flexWrap="wrap"
                useFlexGap
              >
                <Typography
                  sx={{
                    color: theme.palette.primary.main,
                    fontFamily: "monospace",
                    fontSize: 12,
                  }}
                >
                  {scanResult.sku}
                </Typography>
                <Box
                  sx={{
                    px: 1,
                    py: 0.5,
                    borderRadius: 1.5,
                    bgcolor: "rgba(255,255,255,0.06)",
                    color: "rgba(255,255,255,0.5)",
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                >
                  {ww.ui.zone} {zoneLabel(scanResult.zone, ww)}
                </Box>
                {/* Proactive low-stock flag right where the worker scans. */}
                {scanResult.lowStock && (
                  <Box
                    sx={{
                      px: 1,
                      py: 0.5,
                      borderRadius: 1.5,
                      bgcolor: `${theme.palette.kpi.amber}1f`,
                      color: theme.palette.kpi.amber,
                      fontSize: 10,
                      fontWeight: 800,
                    }}
                  >
                    {ww.ui.lowStockBadge}
                    {scanResult.available !== undefined &&
                    scanResult.minStock !== undefined
                      ? ` ${scanResult.available}/${scanResult.minStock}`
                      : ""}
                  </Box>
                )}
              </Stack>
              <Typography
                sx={{
                  mt: 1,
                  fontSize: 18,
                  fontWeight: 600,
                  color: theme.palette.text.primary,
                }}
              >
                {scanResult.name}
              </Typography>
            </Box>
            {/* Full-width on mobile with 44px targets — this gets tapped with
                gloves on, so the buttons stay thumb-sized. */}
            <Stack
              direction="row"
              alignItems="center"
              justifyContent={{ xs: "space-between", sm: "flex-start" }}
              spacing={1}
              sx={{
                bgcolor: "rgba(0,0,0,0.25)",
                p: 0.5,
                borderRadius: 3,
                alignSelf: { xs: "stretch", sm: "center" },
                flexShrink: 0,
              }}
            >
              <IconButton
                onClick={() => setScanQty((q) => Math.max(1, q - 1))}
                sx={{ color: "#fff", width: 44, height: 44, fontSize: 20 }}
              >
                −
              </IconButton>
              <Typography
                sx={{
                  fontSize: 22,
                  fontWeight: 800,
                  minWidth: 32,
                  textAlign: "center",
                  color: "#fff",
                }}
              >
                {scanQty}
              </Typography>
              <IconButton
                onClick={() => setScanQty((q) => q + 1)}
                sx={{ color: "#fff", width: 44, height: 44, fontSize: 20 }}
              >
                +
              </IconButton>
            </Stack>
          </Stack>
          {adjustOpen ? (
            <AdjustForm
              ww={ww}
              theme={theme}
              knownSku={knownSku}
              expected={expected}
              counted={counted}
              setCounted={setCounted}
              reason={reason}
              setReason={setReason}
              diff={diff}
              canSubmit={validCount && !!reason.trim() && knownSku}
              onSubmit={submitAdjust}
              onCancel={closeAdjust}
            />
          ) : (
            <>
              {/* Outbound (PICK/PACK) and inbound (STOCK_IN/PUTAWAY) log actions,
                  same pattern, so incoming goods have a first-class button too. */}
              <Box
                sx={{
                  mt: 1.5,
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: { xs: 1, sm: 1.5 },
                }}
              >
                {(
                  [
                    { kind: "PICK", label: ww.ui.logPick, bg: theme.palette.kpi.amber },
                    { kind: "PACK", label: ww.ui.logPack, bg: theme.palette.kpi.emerald },
                    { kind: "STOCK_IN", label: ww.ui.logStockIn, bg: theme.palette.kpi.cyan },
                    { kind: "PUTAWAY", label: ww.ui.logPutaway, bg: theme.palette.primary.main },
                  ] as const
                ).map((b) => (
                  <Button
                    key={b.kind}
                    fullWidth
                    onClick={() => log(b.kind)}
                    sx={{
                      minHeight: 54,
                      px: 1,
                      borderRadius: 3,
                      bgcolor: b.bg,
                      color: "#000",
                      fontWeight: 800,
                      // Turkish labels ("Stok Girişi") are long for a half-width
                      // cell — let them wrap instead of clipping.
                      fontSize: { xs: 13, sm: 14 },
                      lineHeight: 1.25,
                      textAlign: "center",
                      whiteSpace: "normal",
                      hyphens: "auto",
                      "&:hover": { bgcolor: b.bg, filter: "brightness(1.05)" },
                    }}
                  >
                    {b.label}
                  </Button>
                ))}
              </Box>
              {/* Eksik/fazla reconciliation — seed the count from the stepper. */}
              <Button
                fullWidth
                onClick={() => {
                  setCounted(String(scanQty));
                  setReason("");
                  setAdjustOpen(true);
                }}
                sx={{
                  mt: 1.5,
                  height: 48,
                  borderRadius: 3,
                  border: `1px solid ${theme.palette.divider}`,
                  color: theme.palette.text.primary,
                  textTransform: "none",
                  fontWeight: 700,
                }}
              >
                {ww.ui.logAdjust}
              </Button>
              <Button
                fullWidth
                onClick={() => setScanResult(null)}
                sx={{
                  mt: 1.5,
                  height: 44,
                  borderRadius: 3,
                  border: `1px solid ${theme.palette.divider}`,
                  color: theme.palette.text.secondary,
                  textTransform: "none",
                  fontWeight: 600,
                }}
              >
                {ww.ui.cancelScan}
              </Button>
            </>
          )}
        </>
      )}
    </Box>
  );
}

interface AdjustFormProps {
  ww: WarehouseWorkerDict;
  theme: Theme;
  knownSku: boolean;
  expected: number | undefined;
  counted: string;
  setCounted: (v: string) => void;
  reason: string;
  setReason: (v: string) => void;
  diff: number | null;
  canSubmit: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}

function AdjustForm({
  ww,
  theme,
  knownSku,
  expected,
  counted,
  setCounted,
  reason,
  setReason,
  diff,
  canSubmit,
  onSubmit,
  onCancel,
}: AdjustFormProps) {
  // Tone the difference by direction: short (eksik) reads as a warning, surplus
  // (fazla) as info, an exact match as muted.
  const diffMeta =
    diff === null
      ? null
      : diff < 0
        ? { color: theme.palette.kpi.amber, label: ww.ui.adjustShort, sign: "" }
        : diff > 0
          ? { color: theme.palette.kpi.cyan, label: ww.ui.adjustSurplus, sign: "+" }
          : {
              color: theme.palette.text.secondary,
              label: ww.ui.adjustMatch,
              sign: "",
            };

  const cellSx = {
    flex: 1,
    minWidth: 0,
    p: 1.5,
    borderRadius: 2,
    bgcolor: "rgba(255,255,255,0.04)",
    border: `1px solid ${theme.palette.divider}`,
  } as const;

  return (
    <Box sx={{ mt: 1.5 }}>
      <Typography sx={{ fontWeight: 700, fontSize: 14, mb: 1.5 }}>
        {ww.ui.adjustTitle}
      </Typography>

      {!knownSku ? (
        <Typography
          sx={{ color: theme.palette.kpi.amber, fontSize: 13, mb: 1.5 }}
        >
          {ww.ui.adjustUnknownSku}
        </Typography>
      ) : (
        <>
          <Stack
            direction="row"
            spacing={{ xs: 1, sm: 1.5 }}
            alignItems="stretch"
          >
            <Box sx={cellSx}>
              <Typography
                variant="caption"
                sx={{ color: theme.palette.text.secondary }}
              >
                {ww.ui.adjustExpected}
              </Typography>
              <Typography sx={{ fontSize: 22, fontWeight: 800 }}>
                {expected}
              </Typography>
            </Box>
            <Box sx={cellSx}>
              <Typography
                variant="caption"
                sx={{ color: theme.palette.text.secondary }}
              >
                {ww.ui.adjustCounted}
              </Typography>
              <TextField
                autoFocus
                value={counted}
                onChange={(e) =>
                  setCounted(e.target.value.replace(/[^\d]/g, ""))
                }
                inputMode="numeric"
                variant="standard"
                InputProps={{ disableUnderline: true }}
                sx={{
                  mt: 0.5,
                  input: {
                    fontSize: 22,
                    fontWeight: 800,
                    color: theme.palette.text.primary,
                    padding: 0,
                  },
                }}
              />
            </Box>
          </Stack>

          {/* Auto-computed, read-only: the worker never does the subtraction. */}
          {diffMeta && (
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              spacing={1}
              sx={{
                mt: 1.5,
                px: 1.5,
                py: 1,
                borderRadius: 2,
                bgcolor: "rgba(255,255,255,0.03)",
              }}
            >
              <Typography
                variant="caption"
                sx={{ color: theme.palette.text.secondary, flexShrink: 0 }}
              >
                {ww.ui.adjustDiff}
              </Typography>
              <Typography
                sx={{
                  color: diffMeta.color,
                  fontWeight: 800,
                  textAlign: "right",
                  minWidth: 0,
                }}
              >
                {diffMeta.sign}
                {diff} · {diffMeta.label}
              </Typography>
            </Stack>
          )}

          <TextField
            fullWidth
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            label={ww.ui.adjustReason}
            placeholder={ww.ui.adjustReasonPlaceholder}
            multiline
            minRows={2}
            sx={{ mt: 1.5 }}
          />
        </>
      )}

      <Stack direction="row" spacing={{ xs: 1, sm: 1.5 }} sx={{ mt: 1.5 }}>
        <Button
          fullWidth
          onClick={onCancel}
          sx={{
            height: 48,
            whiteSpace: "nowrap",
            borderRadius: 3,
            border: `1px solid ${theme.palette.divider}`,
            color: theme.palette.text.secondary,
            textTransform: "none",
            fontWeight: 600,
          }}
        >
          {ww.ui.cancelScan}
        </Button>
        <Button
          fullWidth
          disabled={!canSubmit}
          onClick={onSubmit}
          sx={{
            height: 48,
            borderRadius: 3,
            bgcolor: theme.palette.primary.main,
            color: "#000",
            fontWeight: 800,
            textTransform: "none",
            "&.Mui-disabled": {
              bgcolor: "rgba(255,255,255,0.08)",
              color: theme.palette.text.secondary,
            },
          }}
        >
          {ww.ui.adjustSubmit}
        </Button>
      </Stack>
    </Box>
  );
}
