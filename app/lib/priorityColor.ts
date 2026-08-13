import { ChipProps } from "@mui/material";
import { Dictionary } from "./language/language";
import { NotificationType } from "./type/notification";

/**
 * tr-Çeviri tablosunda çalışma zamanı durum anahtarını arar ve yalnızca
 * string eşleşmelerini döndürür (çeviri tabloları nesneleri iç içe barındırabilir, örneğin `common.tooltips`).
 * en-Looks up a runtime status key in a translation table, returning only
 * string hits (translation tables may nest objects, e.g. `common.tooltips`).
 * input (
  table: Record<string, unknown> | undefined,
  key: string
)
 * output (string | undefined)
 */
export const lookupTranslation = (
  table: Record<string, unknown> | undefined,
  key: string
): string | undefined => {
  const value = table?.[key];
  return typeof value === "string" ? value : undefined;
};

/**
 * tr-Önceliğe göre Chip bileşeni için bir renk alır.
 * en-Returns a color for the Chip component based on priority.
 * input (
  priority: string
)
 * output (ChipProps["color"])
 */
export const getPriorityColor = (priority: string): ChipProps["color"] => {
  const normalizedPriority = priority?.toLocaleUpperCase("en-US");

  switch (normalizedPriority) {
    case "CRITICAL":
    case "HIGH":
      return "error";
    case "MEDIUM":
      return "warning";
    case "LOW":
      return "info";
    default:
      return "default";
  }
};

/**
 * tr-Belirli bir durum için durum meta verilerini (renk, etiket, palet anahtarı) alır.
 * en-Returns status metadata (color, label, palette key) for a given status.
 * input (
  status?: string,
  dict?: Dictionary
)
 * output ({
  color: string;
  paletteKey: "success" | "info" | "warning" | "error" | "secondary";
  label: string;
})
 */
export const getStatusMeta = (status?: string, dict?: Dictionary) => {
  const s = status?.toLocaleUpperCase("en-US") || "";

  const getDictColor = (
    paletteKey: "success" | "info" | "warning" | "error" | "secondary",
    fallback: string
  ) => {
    return dict?.primaryColors?.[paletteKey] || fallback;
  };

  const getDictLabel = (key: string) => {
    if (key === "ON_JOB") return dict?.drivers?.onDuty;
    if (key === "OFF_DUTY") return dict?.drivers?.offDuty;
    if (key === "ON_LEAVE") return dict?.drivers?.onLeave;

    return (
      lookupTranslation(dict?.vehicles?.statuses, key) ||
      lookupTranslation(dict?.trailers?.statuses, key) ||
      lookupTranslation(dict?.shipments?.statuses, key) ||
      lookupTranslation(dict?.inventory?.status, key) ||
      lookupTranslation(dict?.warehouseWorker?.status, key) ||
      lookupTranslation(dict?.routes?.statuses, key) ||
      lookupTranslation(dict?.vehicles?.priorities, key) ||
      lookupTranslation(dict?.common, key) ||
      key
        .replace(/_/g, " ")
        .toLocaleLowerCase("en-US")
        .replace(/^\w/, (c) => c.toLocaleUpperCase("en-US"))
    );
  };

  const label = getDictLabel(s);

  switch (s) {
    case "LOW":
    case "IN_PROGRESS":
    case "IN_TRANSIT":
    case "PICKED_UP":
    case "IN_SERVICE":
    case "IDLE":
    case "PROCESSING":
    case "ON_TRIP":
      return {
        color: getDictColor("info", "#4299E1"),
        paletteKey: "info",
        label,
      };
    case "MEDIUM":
    case "MAINTENANCE":
    case "SCHEDULED":
    case "PENDING":
    case "DUE_SOON":
    case "WARNING":
    case "PLANNED":
    case "ASSIGNED":
    case "OPEN":
    case "RETURNED":
      return {
        color: getDictColor("warning", "#F6AD55"),
        paletteKey: "warning",
        label,
      };
    case "HIGH":
    case "CRITICAL":
    case "ERROR":
    case "EXPIRED":
    case "FAILED":
    case "DELAYED":
    case "CANCELLED":
    case "OUT_OF_ORDER":
      return {
        color: getDictColor("error", "#F56565"),
        paletteKey: "error",
        label,
      };
    case "RESOLVED":
    case "CLOSED":
    case "SUCCESS":
    case "COMPLETED":
    case "VALID":
    case "AVAILABLE":
    case "DELIVERED":
    case "ON_DUTY":
    case "ON_JOB":
      return {
        color: getDictColor("success", "#48BB78"),
        paletteKey: "success",
        label,
      };
    case "OFF_DUTY":
    case "ON_LEAVE":
    default:
      return {
        color: getDictColor("secondary", "#718096"),
        paletteKey: "secondary",
        label: label || "-",
      };
  }
};

/**
 * tr-Bir bildirim tipine göre durum rengini alır.
 * en-Returns the status color for a notification type.
 * input (
  t: NotificationType
)
 * output (string)
 */
export const getStatusColor = (t: NotificationType) => {
  switch (t) {
    case "SUCCESS":
      return "success.main";
    case "WARNING":
      return "warning.main";
    case "ERROR":
      return "error.main";
    default:
      return "info.main";
  }
};

/**
 * tr-Bir bildirim tipine göre durumun yarı saydam renk değerini alır.
 * en-Returns the alpha color value of a status based on a notification type.
 * input (
  t: NotificationType
)
 * output (string)
 */
export const resolveStatusAlpha = (t: NotificationType) => {
  switch (t) {
    case "SUCCESS":
      return "success._alpha.main_20";
    case "WARNING":
      return "warning._alpha.main_20";
    case "ERROR":
      return "error._alpha.main_20";
    default:
      return "info._alpha.main_20";
  }
};
