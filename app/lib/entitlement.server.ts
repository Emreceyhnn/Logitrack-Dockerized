import "server-only";

import { SignJWT, jwtVerify } from "jose";
import { db } from "./db";
import type { AccessStatus, AccessSummary } from "./entitlement";

/** Length of a self-serve / demo-approved trial, in days. */
export const TRIAL_DAYS = 7;

// ─── Demo-request signup token ─────────────────────────────────────────────
// A brand-new signup gets no trial by default (see resolveEntitlement below) —
// only someone arriving from an approved "Request a Demo" submission should
// land in /onboarding with a live trial. That provenance is carried across
// the redirect to /auth/sign-up as a short-lived, signed JWT (not a plain
// ?ref=demo query param, which anyone could type into the URL bar) binding
// the token to the exact email that filed the demo request.
const DEMO_TOKEN_TTL = "30m";

/**
 * tr-JWT secret'ini döndürür.
 * en-Returns the JWT secret.
 * input (none)
 * output (string)
 */
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret)
    throw new Error("JWT_SECRET environment variable is not defined");
  return secret;
}

/**
 * tr-Demo kayıt tokeni oluşturur.
 * en-Creates a demo signup token.
 * input (
  email: string
)
 * output (string)
 */
export async function createDemoSignupToken(email: string): Promise<string> {
  const secret = new TextEncoder().encode(getJwtSecret());
  return new SignJWT({ email: email.toLowerCase(), purpose: "demo-signup" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(DEMO_TOKEN_TTL)
    .sign(secret);
}

/**
 * tr-Demo kayıt tokenini doğrular.
 * en-Verifies a demo signup token.
 * input (
  token: string | undefined | null,
  expectedEmail: string
)
 * output (boolean)
 */
export async function verifyDemoSignupToken(
  token: string | undefined | null,
  expectedEmail: string
): Promise<boolean> {
  if (!token) return false;
  try {
    const secret = new TextEncoder().encode(getJwtSecret());
    const { payload } = await jwtVerify(token, secret);
    return (
      payload.purpose === "demo-signup" &&
      typeof payload.email === "string" &&
      payload.email === expectedEmail.toLowerCase()
    );
  } catch {
    return false;
  }
}

/**
 * tr-Bir kullanıcıya deneme süresi verir veya yeniler.
 * en-Grants (or renews) a user's self-serve trial.
 * input (
  userId: string
)
 * output ({ trialEndsAt: Date })
 */
export async function grantTrial(
  userId: string
): Promise<{ trialEndsAt: Date }> {
  const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
  await db.subscription.upsert({
    where: { userId },
    create: { userId, status: "TRIAL", trialEndsAt },
    update: { status: "TRIAL", trialEndsAt },
  });
  return { trialEndsAt };
}

/**
 * tr-Kullanıcının aboneliğini okur ve erişim özetini döndürür.
 * en-Reads a user's subscription and returns the access summary.
 * input (
  userId: string
)
 * output (AccessSummary)
 */
export async function resolveEntitlement(
  userId: string
): Promise<AccessSummary> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { companyId: true, subscription: { select: { status: true, trialEndsAt: true } } },
  });

  if (!user) return { accessStatus: "NONE", trialEndsAt: null };

  let sub = user.subscription;

  if (!sub && user.companyId) {
    // Inherit the subscription from the company (usually the admin who created it)
    const companySub = await db.subscription.findFirst({
      where: {
        user: { companyId: user.companyId },
        status: { in: ["ACTIVE", "TRIAL"] }
      },
      orderBy: { createdAt: "asc" },
      select: { status: true, trialEndsAt: true }
    });
    
    if (companySub) {
      sub = companySub;
    } else {
      // Fallback to any subscription if no ACTIVE/TRIAL is found
      const anySub = await db.subscription.findFirst({
        where: { user: { companyId: user.companyId } },
        orderBy: { createdAt: "asc" },
        select: { status: true, trialEndsAt: true }
      });
      if (anySub) sub = anySub;
    }
  }

  if (!sub) return { accessStatus: "NONE", trialEndsAt: null };

  const trialEndsAt = sub.trialEndsAt ? sub.trialEndsAt.getTime() : null;

  let status: AccessStatus = sub.status;
  if (
    status === "TRIAL" &&
    (trialEndsAt === null || Date.now() >= trialEndsAt)
  ) {
    status = "EXPIRED";
  }

  return { accessStatus: status, trialEndsAt };
}
