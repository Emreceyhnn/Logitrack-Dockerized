// tr-Rol kimliğinden davet e-postası gibi sunucu tarafı içerikte kullanılacak
//    yerelleştirilmiş rol adına eşleme. dict.company.roles ile senkron tutulmalı.
// en-Maps a role id to the localized label used in server-rendered content like
//    invite emails. Keep in sync with dict.company.roles.
//
// Not a server action module ("use server" files may only export async
// functions) — plain helper, safe to import from server code.
const ROLE_LABELS: Record<string, { en: string; tr: string }> = {
  role_admin: { en: "Administrator", tr: "Yönetici" },
  role_manager: { en: "Warehouse Manager", tr: "Depo Müdürü" },
  role_dispatcher: { en: "Dispatcher", tr: "Sevkiyat Sorumlusu" },
  role_warehouse: { en: "Warehouse Operator", tr: "Depo Çalışanı" },
  role_default: { en: "Staff", tr: "Personel" },
  role_driver: { en: "Driver", tr: "Sürücü" },
};

/**
 * tr-rol kimliğine karşılık gelen yerelleştirilmiş rol adını döndürür
 * en-returns the localized role name for the given role id
 * input (roleId: string, lang: "en" | "tr")
 * output (string)
 */
export function getRoleLabel(roleId: string, lang: "en" | "tr"): string {
  return ROLE_LABELS[roleId]?.[lang] ?? roleId;
}
