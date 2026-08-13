"use client";

import { useMemo } from "react";
import { ThemeProvider } from "@mui/material";
import { getTheme } from "./theme";

/**
 * tr-Landing sayfalarını kalıcı olarak koyu modda çalışan bir MUI temasıyla sarmalar.
 * Kullanıcının ThemeContext'te bulunan Light/Dark tercihini yoksayar.
 * en-Wraps landing pages in a MUI theme that runs permanently in dark mode.
 * Ignores the user's Light/Dark preference from ThemeContext.
 * input (children: React.ReactNode)
 * output (JSX.Element)
 */
export default function LandingThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const darkTheme = useMemo(() => getTheme("dark"), []);

  return <ThemeProvider theme={darkTheme}>{children}</ThemeProvider>;
}
