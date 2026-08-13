"use client";

// Centralised dayjs setup (locales + plugins + English `formats` patch).
// The configured singleton is re-exported so `dayjs.tz.setDefault` below uses
// the same instance every picker in the tree relies on.
import dayjs from "@/app/lib/utils/dayjsConfig";
import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { ThemeContext } from "./themeContext";
import { getTheme, type ThemeMode } from "./theme";
import QueryProvider from "../providers/QueryProvider";
import { Toaster } from "@/app/components/toast";
import { useParams } from "next/navigation";
import { saveUserTheme } from "@/app/lib/actions/theme";
import { useOptionalUserContext } from "../context/UserContext";

const THEME_STORAGE_KEY = "logitrack-theme-mode";
const VALID_MODES = ["light", "dark", "system"] as const;
type StoredMode = (typeof VALID_MODES)[number];

/**
 * tr-Kullanıcının tercih ettiği tema modunu (light/dark/system) alır.
 * en-Retrieves the user's preferred theme mode (light/dark/system).
 * input ()
 * output (StoredMode)
 */
function getSavedStoredMode(): StoredMode {
  if (typeof window === "undefined") return "dark";
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY) as StoredMode | null;
    if (saved && (VALID_MODES as readonly string[]).includes(saved))
      return saved;
    // Fallback: the theme cookie is written by saveUserTheme with
    // httpOnly:false precisely so the client can read it. The server no
    // longer forwards it via initialMode (that read forced every route
    // dynamic), so this is the cross-device source when localStorage is cold.
    const cookieTheme = document.cookie
      .split("; ")
      .find((c) => c.startsWith("logitrack-theme="))
      ?.split("=")[1];
    if (
      cookieTheme &&
      (VALID_MODES as readonly string[]).includes(cookieTheme)
    ) {
      return cookieTheme as StoredMode;
    }
    return "dark";
  } catch {
    return "dark";
  }
}

/**
 * tr-Sistemin aktif tema modunu (light/dark) belirler.
 * en-Determines the system's active theme mode (light/dark).
 * input (StoredMode)
 * output (ThemeMode)
 */
function resolveMode(stored: StoredMode): ThemeMode {
  if (stored === "system") {
    if (typeof window === "undefined") return "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return stored;
}

import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import { logger } from "@/app/lib/logger";

/**
 * tr-Uygulama genelindeki tüm bileşenleri sarmalar ve tema, locale, kullanıcı, query ve toast yönetimini sağlar.
 * en-Wraps all application components and provides theme, locale, user, query, and toast management.
 * input ({
  children: React.ReactNode;
  initialMode?: StoredMode;
})
 * output (JSX.Element)
 */
export default function Providers({
  children,
  initialMode,
}: {
  children: React.ReactNode;
  initialMode?: StoredMode;
}) {
  const { user } = useOptionalUserContext();
  // `storedMode` is the user's *preference* ("light" | "dark" | "system");
  // `mode` is the resolved value actually applied to the theme. Keeping the
  // preference in state lets a single effect own the OS-preference listener,
  // so switching to/from "system" adds and removes exactly one listener.
  const [storedMode, setStoredMode] = useState<StoredMode>(
    initialMode || "dark"
  );
  const [mode, setModeState] = useState<ThemeMode>(() =>
    resolveMode(initialMode || "dark")
  );
  const theme = useMemo(() => getTheme(mode), [mode]);
  const params = useParams();
  const lang = (params?.lang as string) || "en";
  const safeLang = ["en", "tr"].includes(lang) ? lang : "en";

  // Set global dayjs timezone when user preferences change
  useEffect(() => {
    if (user?.timezone) {
      dayjs.tz.setDefault(user.timezone);
    }
  }, [user?.timezone]);

  // Hydrate the stored preference from localStorage/cookie after mount. Done
  // here (not during SSR) so marketing pages stay static and there is no
  // hydration mismatch — SSR always renders the "dark" default.
  useEffect(() => {
    const stored = initialMode || getSavedStoredMode();
    setStoredMode(stored);
  }, [initialMode]);

  // Single owner of the resolved mode + the OS-preference listener. Re-runs
  // whenever the preference changes: for "system" it attaches a matchMedia
  // listener and its cleanup removes it before the next run/unmount, so no
  // stale listener survives a switch away from system.
  useEffect(() => {
    setModeState(resolveMode(storedMode));

    if (storedMode !== "system" || typeof window === "undefined")
      return undefined;

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) =>
      setModeState(e.matches ? "dark" : "light");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [storedMode]);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setMode = useCallback((newMode: ThemeMode | "system") => {
    const nextStored = newMode as StoredMode;

    // Drive the resolved mode + listener through the single effect above.
    setStoredMode(nextStored);

    // Skip the persistence round-trip if the preference is unchanged.
    const currentStored =
      typeof window !== "undefined"
        ? localStorage.getItem(THEME_STORAGE_KEY)
        : null;
    if (currentStored === newMode) return;

    try {
      localStorage.setItem(THEME_STORAGE_KEY, newMode);
    } catch {
      // localStorage not available (private browsing, etc.)
    }

    // Debounce server-action call — only fires if user stops clicking for 600ms
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveUserTheme(newMode).catch((err) =>
        logger.error("Redis theme sync error", err)
      );
    }, 600);
  }, []);

  // Clear any pending debounced save on unmount.
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  return (
    <AppRouterCacheProvider options={{ enableCssLayer: true }}>
      <ThemeContext.Provider value={{ mode, setMode }}>
        <LocalizationProvider
          dateAdapter={AdapterDayjs}
          adapterLocale={safeLang}
        >
          <QueryProvider>
            <ThemeProvider theme={theme}>
              <Toaster />
              <CssBaseline />
              {children}
            </ThemeProvider>
          </QueryProvider>
        </LocalizationProvider>
      </ThemeContext.Provider>
    </AppRouterCacheProvider>
  );
}
