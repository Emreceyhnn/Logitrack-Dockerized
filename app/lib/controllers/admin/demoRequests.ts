import "server-only";

import { db } from "@/app/lib/db";
import { logger } from "@/app/lib/logger";
import { ValidationError, NotFoundError } from "@/app/lib/errors";
import { invalidateUserSessionCache } from "@/app/lib/controllers/session/manage";
import type { DemoRequestStatus } from "@prisma/client";

/**
 * DEMO REQUEST REVIEW
 * ===================
 * The console surface for the "Request a Demo" queue. Callers must have passed
 * `platformAdminAction`.
 *
 * WHY THIS EXISTS
 * `submitDemoRequest` only ever writes a PENDING row. The self-serve trial is
 * granted at SIGN-UP, from a signed `demoToken` — so a visitor who requests a
 * demo while ALREADY signed in never gets one: they can't re-register, the
 * token is never redeemed, their entitlement stays NONE, and /onboarding keeps
 * the "create a company" card disabled. They then file another request, and
 * another. This page is the missing manual step that closes that loop.
 *
 * The trial length is chosen per approval rather than fixed: a prospect trialing
 * a pilot and an internal tester need very different windows, and editing an
 * env var to serve one account is not a workflow.
 */

/** Guard rails on the operator-supplied trial window. */
const MIN_TRIAL_DAYS = 1;
const MAX_TRIAL_DAYS = 365;

export interface DemoRequestRow {
  id: string;
  fullName: string;
  email: string;
  company: string | null;
  message: string | null;
  type: "DEMO" | "CONTACT";
  status: DemoRequestStatus;
  createdAt: string;
  /**
   * Whether an account exists for this email. Approving a request whose email
   * has no account cannot grant anything — the operator needs to see that
   * BEFORE clicking, not discover it from a no-op.
   */
  hasAccount: boolean;
  /** Current entitlement of the matching account, when there is one. */
  accessStatus: string | null;
  trialEndsAt: string | null;
}

export interface ListDemoRequestsInput {
  status?: DemoRequestStatus | undefined;
  type?: "DEMO" | "CONTACT" | undefined;
  limit?: number | undefined;
}

/**
 * tr-Demo taleplerini, eşleşen hesabın erişim durumuyla birlikte listeler.
 * en-Lists demo requests alongside the entitlement of the matching account.
 * input (input: ListDemoRequestsInput)
 * output (Promise<DemoRequestRow[]>)
 */
export async function listDemoRequests(
  input: ListDemoRequestsInput = {}
): Promise<DemoRequestRow[]> {
  const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);

  const requests = await db.demoRequest.findMany({
    where: {
      ...(input.status ? { status: input.status } : {}),
      ...(input.type ? { type: input.type } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  if (requests.length === 0) return [];

  // One batched lookup instead of a query per row: the queue is displayed as a
  // table and N+1 here would be N+1 on every refresh.
  const emails = [...new Set(requests.map((r) => r.email.toLowerCase()))];
  const accounts = await db.user.findMany({
    where: { email: { in: emails } },
    select: {
      email: true,
      subscription: { select: { status: true, trialEndsAt: true } },
    },
  });

  const byEmail = new Map(accounts.map((a) => [a.email.toLowerCase(), a]));

  return requests.map((r) => {
    const account = byEmail.get(r.email.toLowerCase());
    return {
      id: r.id,
      fullName: r.fullName,
      email: r.email,
      company: r.company,
      message: r.message,
      type: r.type,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      hasAccount: Boolean(account),
      accessStatus: account?.subscription?.status ?? (account ? "NONE" : null),
      trialEndsAt: account?.subscription?.trialEndsAt?.toISOString() ?? null,
    };
  });
}

export interface DecideDemoRequestInput {
  id: string;
  status: DemoRequestStatus;
  /** Trial length in days. Required (and only meaningful) when approving. */
  trialDays?: number | undefined;
}

export interface DecideDemoRequestResult {
  id: string;
  status: DemoRequestStatus;
  /** Null when no account matched the email, so nothing was granted. */
  trialEndsAt: string | null;
  grantedTo: string | null;
  /** True when the row was updated but no entitlement could be applied. */
  accountMissing: boolean;
}

/**
 * tr-Bir demo talebini onaylar/reddeder ve onaylandıysa süresi belirtilen
 *    deneme hakkını tanımlar.
 * en-Approves or rejects a demo request, granting a trial of the operator's
 *    chosen length on approval.
 *
 *    Rejecting (or reverting to PENDING) deliberately does NOT revoke an
 *    existing trial: the request row and the entitlement are separate facts,
 *    and silently cutting off access someone is mid-way through using is a
 *    bigger surprise than leaving it to expire. Withdrawing access is the
 *    subscription's own concern, not a side effect of triaging a form.
 * input (adminId: string, input: DecideDemoRequestInput)
 * output (Promise<DecideDemoRequestResult>)
 */
export async function decideDemoRequest(
  adminId: string,
  input: DecideDemoRequestInput
): Promise<DecideDemoRequestResult> {
  const approving = input.status === "APPROVED";

  if (approving) {
    const days = input.trialDays;
    if (typeof days !== "number" || !Number.isFinite(days)) {
      throw new ValidationError("A trial length is required to approve", {
        trialDays: ["Trial length is required"],
      });
    }
    if (!Number.isInteger(days) || days < MIN_TRIAL_DAYS || days > MAX_TRIAL_DAYS) {
      throw new ValidationError(
        `Trial length must be a whole number between ${MIN_TRIAL_DAYS} and ${MAX_TRIAL_DAYS} days`,
        { trialDays: [`Between ${MIN_TRIAL_DAYS} and ${MAX_TRIAL_DAYS} days`] }
      );
    }
  }

  const existing = await db.demoRequest.findUnique({
    where: { id: input.id },
    select: { id: true, email: true },
  });
  if (!existing) throw new NotFoundError("Demo request not found");

  await db.demoRequest.update({
    where: { id: input.id },
    data: { status: input.status },
  });

  if (!approving) {
    return {
      id: input.id,
      status: input.status,
      trialEndsAt: null,
      grantedTo: null,
      accountMissing: false,
    };
  }

  const account = await db.user.findUnique({
    where: { email: existing.email.toLowerCase() },
    select: { id: true },
  });

  // No account yet: the person requested a demo before signing up. The row is
  // still marked APPROVED so the queue reflects the decision, and their signup
  // will carry a demoToken that grants the trial on its own path.
  if (!account) {
    logger.info(
      `[admin/demoRequests] ${input.id} approved by ${adminId} but no account exists for ${existing.email}`
    );
    return {
      id: input.id,
      status: input.status,
      trialEndsAt: null,
      grantedTo: null,
      accountMissing: true,
    };
  }

  const trialEndsAt = new Date(
    Date.now() + (input.trialDays as number) * 24 * 60 * 60 * 1000
  );

  await db.subscription.upsert({
    where: { userId: account.id },
    create: { userId: account.id, status: "TRIAL", trialEndsAt },
    update: { status: "TRIAL", trialEndsAt },
  });

  // Their signed JWT still says accessStatus=NONE. Without this they stay
  // gated on /onboarding until the token expires (up to an hour) — the exact
  // stall this page exists to fix. Marking the claims stale routes their next
  // request through /api/auth/refresh, re-minting the token from current DB
  // state. Sessions are NOT revoked: that would kill the refresh token too.
  await invalidateUserSessionCache(account.id);

  logger.info(
    `[admin/demoRequests] ${input.id} approved by ${adminId}: ` +
      `${input.trialDays}-day trial for ${existing.email} until ${trialEndsAt.toISOString()}`
  );

  return {
    id: input.id,
    status: input.status,
    trialEndsAt: trialEndsAt.toISOString(),
    grantedTo: account.id,
    accountMissing: false,
  };
}
