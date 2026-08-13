"use server";

import { db } from "../../db";
import { EmailNotVerifiedError } from "../../errors";

export interface VerifiableUser {
  id: string;
  emailVerified?: boolean;
}

/**
 * tr-Kullanıcının e-posta adresinin doğrulanmış olmasını zorunlu kılar. Doğrulanmamışsa
 *    EmailNotVerifiedError fırlatır. Dışarıya e-posta çıkaran veya kalıcı yapı kuran
 *    aksiyonlarda (şirket kurma, davet gönderme) çağrılır.
 * en-Requires the user's email address to be verified, throwing EmailNotVerifiedError otherwise.
 *    Used to gate actions that send outbound email or create durable structure (company creation,
 *    invitations) — the places where an unproven address does real damage.
 *
 *    The JWT claim is authoritative when present. It is only absent on tokens minted before this
 *    field existed, and those fall back to a DB read rather than being denied outright, so a
 *    still-valid old session isn't locked out mid-flight.
 * input (user: VerifiableUser)
 * output (Promise<void>)
 */
export async function requireVerifiedEmail(user: VerifiableUser): Promise<void> {
  if (user.emailVerified === true) return;

  // Absent claim (pre-existing token) — resolve against the database instead of
  // assuming the worst, then apply the same rule.
  if (user.emailVerified === undefined) {
    const record = await db.user.findUnique({
      where: { id: user.id },
      select: { emailVerifiedAt: true },
    });
    if (record?.emailVerifiedAt) return;
  }

  throw new EmailNotVerifiedError();
}
