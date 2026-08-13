"use client";

import { useMemo } from "react";
import { useUser } from "./useUser";
import { DateSettings } from "../lib/utils/date";
import { useLanguage } from "../lib/language/DictionaryContext";

export function useDateSettings(): DateSettings {
  const { user } = useUser();
  const { lang } = useLanguage();

  return useMemo(
    () => ({
      timezone: user?.timezone || "UTC",
      // Fall back to the locale's conventional format when the user hasn't
      // picked one (Turkish dates are written 30.06.2026, not 30/06/2026).
      dateFormat:
        user?.dateFormat || (lang === "tr" ? "DD.MM.YYYY" : "DD/MM/YYYY"),
      timeFormat: user?.timeFormat || "24h",
    }),
    [user?.timezone, user?.dateFormat, user?.timeFormat, lang]
  );
}
