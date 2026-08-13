"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  Box,
  Button,
  CircularProgress,
  Container,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import HourglassTopIcon from "@mui/icons-material/HourglassTop";
import { useDictionary, useLanguage } from "@/app/lib/language/DictionaryContext";
import { pollDashboardAccess } from "@/app/lib/actions/demoRequest";
import { logoutAction } from "@/app/lib/actions/auth";

// How often the screen re-checks entitlement. Short enough to feel instant once
// a trial lands, long enough to stay gentle on the DB while a tab sits open.
const POLL_INTERVAL_MS = 5000;

/**
 * "Awaiting access" screen. Reached when a signed-in user's entitlement is
 * still NONE — normally a transient window right after signup (the self-serve
 * trial is granted in the same request, so most users never see this), or the
 * fallback if that grant failed / a manual approval is pending.
 *
 * It polls {@link pollDashboardAccess} (a fresh, DB-backed check, not the stale
 * JWT) and, the moment access resolves, does a full-page navigation to "/". The
 * proxy then refreshes the token — minting one that carries the new
 * entitlement — and routes the user on to onboarding / dashboard.
 */
export default function PendingAccessPage() {
  const theme = useTheme();
  const dict = useDictionary();
  const { lang: locale } = useLanguage();

  const [granted, setGranted] = useState(false);
  const [checking, setChecking] = useState(false);
  // Guards against overlapping checks (a slow request + the interval firing).
  const inFlight = useRef(false);

  const check = useCallback(async () => {
    if (inFlight.current || granted) return;
    inFlight.current = true;
    setChecking(true);
    try {
      const ok = await pollDashboardAccess();
      if (ok) {
        setGranted(true);
        // Full navigation (not client router) so the proxy's refresh flow runs
        // and re-mints the access token with the new entitlement.
        window.location.href = `/${locale}`;
      }
    } finally {
      inFlight.current = false;
      setChecking(false);
    }
  }, [granted, locale]);

  useEffect(() => {
    // Check immediately on mount, then on an interval until access lands.
    check();
    const id = setInterval(check, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [check]);

  const handleSignOut = async () => {
    await logoutAction();
    window.location.href = `/${locale}`;
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "background.default",
        py: 8,
      }}
    >
      <Container maxWidth="sm">
        <Stack spacing={4} alignItems="center" textAlign="center">
          <Box
            sx={{
              width: 88,
              height: 88,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: granted
                ? theme.palette.success._alpha?.main_10 ||
                  "rgba(46, 125, 50, 0.1)"
                : theme.palette.primary._alpha.main_10,
              color: granted
                ? theme.palette.success.main
                : theme.palette.primary.main,
            }}
          >
            {granted ? (
              <CheckCircleIcon sx={{ fontSize: 44 }} />
            ) : (
              <HourglassTopIcon sx={{ fontSize: 44 }} />
            )}
          </Box>

          <Box>
            <Typography variant="h4" fontWeight={800} gutterBottom>
              {granted
                ? dict.pendingAccess.grantedTitle
                : dict.pendingAccess.title}
            </Typography>
            <Typography color="text.secondary" maxWidth="sm" mx="auto">
              {granted
                ? dict.pendingAccess.grantedSubtitle
                : dict.pendingAccess.subtitle}
            </Typography>
          </Box>

          {!granted && (
            <>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <CircularProgress size={18} thickness={5} />
                <Typography variant="body2" color="text.secondary">
                  {dict.pendingAccess.checking}
                </Typography>
              </Stack>

              <Typography variant="caption" color="text.secondary">
                {dict.pendingAccess.hint}
              </Typography>

              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={2}
                sx={{ pt: 1 }}
              >
                <Button
                  variant="contained"
                  onClick={check}
                  disabled={checking}
                  sx={{ borderRadius: 2, px: 4, py: 1.25 }}
                >
                  {dict.pendingAccess.checkNow}
                </Button>
                <Button
                  variant="outlined"
                  onClick={handleSignOut}
                  sx={{ borderRadius: 2, px: 4, py: 1.25 }}
                >
                  {dict.pendingAccess.signOut}
                </Button>
              </Stack>

              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ maxWidth: 360 }}
              >
                {dict.pendingAccess.help}
              </Typography>
            </>
          )}
        </Stack>
      </Container>
    </Box>
  );
}
