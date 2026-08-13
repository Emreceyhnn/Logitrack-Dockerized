/**
 * TR: E-posta adresindeki alan adını (@ işaretinden sonrasını) döndürür.
 * EN: Extracts and returns the domain part of an email address (after the @ symbol).
 * Input: email (string)
 * Output: string (Örn/Ex: "gmail.com")
 */
export function getEmailDomain(email: string): string {
  const at = email.lastIndexOf("@");
  if (at === -1 || at === email.length - 1) return "";
  return email.slice(at + 1).trim().toLowerCase();
}
