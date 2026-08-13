import { createContext, useContext } from "react";
import type { ThemeMode } from "./theme";

interface ThemeContextType {
  mode: ThemeMode;
  setMode: (mode: ThemeMode | "system") => void;
}

export const ThemeContext = createContext<ThemeContextType | null>(null);

/**
 * tr-Tema modunu ThemeContext'ten alır.
 * en-Retrieves theme mode from ThemeContext.
 * input ()
 * output (ThemeContextType)
 */
export const useThemeMode = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("ThemeContext not found");
  return ctx;
};
