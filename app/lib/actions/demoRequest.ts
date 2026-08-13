"use server";

import { headers } from "next/headers";
import { db } from "../db";
import { rateLimit } from "../rate-limiter";
import { getUserSession } from "./auth";
import { hasAccess } from "../entitlement";
import {
  grantTrial,
  resolveEntitlement,
  createDemoSignupToken,
} from "../entitlement.server";
import { invalidateUserSessionCache } from "../controllers/session/manage";
import { logger } from "@/app/lib/logger";

export type DemoRequestKind = "DEMO" | "CONTACT";

export interface DemoRequestInput {
  fullName: string;
  email: string;
  company?: string | undefined;
  message?: string | undefined;
  type?: DemoRequestKind | undefined;
}

export interface DemoRequestResult {
  success?: boolean;
  error?: string;
  demoToken?: string;
  /** True when the caller was already a verified account and got the trial immediately, with no admin approval or re-signup needed. */
  trialGranted?: boolean;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * tr-landing sayfasındaki demo talep formunu işler ve veritabanına kaydeder
 * en-processes the demo request form from the landing page and saves it to the database
 * input (input: DemoRequestInput)
 * output (Promise<DemoRequestResult>)
 */
export async function submitDemoRequest(
  input: DemoRequestInput
): Promise<DemoRequestResult> {
  try {
    const headerStore = await headers();
    const ip =
      headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      headerStore.get("x-real-ip") ||
      "127.0.0.1";

    const ipLimit = await rateLimit(ip, 5, 3600, "rate-limit:demo-request:");
    if (!ipLimit.success) {
      return {
        error: "Too many requests. Please try again in an hour.",
      };
    }

    const fullName = input.fullName?.trim() ?? "";
    const email = input.email?.trim().toLowerCase() ?? "";
    const company = input.company?.trim() || null;
    const message = input.message?.trim() || null;

    if (!fullName) return { error: "VALIDATION_FULLNAME" };
    if (!email) return { error: "VALIDATION_EMAIL_REQUIRED" };
    if (!EMAIL_RE.test(email)) return { error: "VALIDATION_EMAIL_INVALID" };

    const type = input.type === "DEMO" ? "DEMO" : "CONTACT";

    // A signed-in, email-verified user requesting a demo can't use the
    // self-serve "sign up with a demoToken" shortcut below — they already
    // have an account, so re-registering is a dead end. Left as PENDING,
    // their request just sits in the admin queue while /onboarding keeps
    // showing "create a company" as disabled (see admin/demoRequests.ts's
    // file header for the full history of this gap). Since we already know
    // who they are and that they own the address, skip the manual-approval
    // wait and grant the trial immediately, recording the request as
    // already approved rather than leaving a stale PENDING row behind it.
    if (type === "DEMO") {
      const session = await getUserSession().catch(() => null);
      if (session?.id) {
        const dbUser = await db.user.findUnique({
          where: { id: session.id },
          select: { email: true, emailVerifiedAt: true },
        });
        if (dbUser?.emailVerifiedAt && dbUser.email.toLowerCase() === email) {
          await db.demoRequest.create({
            data: {
              fullName: fullName.slice(0, 200),
              email: email.slice(0, 320),
              company: company?.slice(0, 200) ?? null,
              message: message?.slice(0, 2000) ?? null,
              type,
              status: "APPROVED",
            },
          });
          await grantTrial(session.id);
          await invalidateUserSessionCache(session.id);
          return { success: true, trialGranted: true };
        }
      }
    }

    await db.demoRequest.create({
      data: {
        fullName: fullName.slice(0, 200),
        email: email.slice(0, 320),
        company: company?.slice(0, 200) ?? null,
        message: message?.slice(0, 2000) ?? null,
        type,
      },
    });

    if (type === "DEMO") {
      const demoToken = await createDemoSignupToken(email);
      return { success: true, demoToken };
    }

    return { success: true };
  } catch (error) {
    logger.error("submitDemoRequest failed:", error);
    return { error: "INTERNAL" };
  }
}

/**
 * tr-kullanıcının aktif bir aboneliği veya deneme sürümü olup olmadığını kontrol eder
 * en-checks if the user has an active subscription or trial
 * input ()
 * output (Promise<boolean>)
 */
export async function hasDashboardAccess(): Promise<boolean> {
  try {
    const session = await getUserSession();
    if (!session?.id) return false;
    return hasAccess(session.accessStatus, session.trialEndsAt);
  } catch (error) {
    logger.error("hasDashboardAccess failed:", error);
    return false;
  }
}

/**
 * tr-bekleme ekranındayken kullanıcının erişim hakkının onaylanıp onaylanmadığını kontrol eder
 * en-polls to check if the user's access has been approved while on the pending screen
 * input ()
 * output (Promise<boolean>)
 */
export async function pollDashboardAccess(): Promise<boolean> {
  try {
    const session = await getUserSession();
    if (!session?.id) return false;
    const access = await resolveEntitlement(session.id);
    return hasAccess(access.accessStatus, access.trialEndsAt);
  } catch (error) {
    logger.error("pollDashboardAccess failed:", error);
    return false;
  }
}

/**
 * tr-yapılan bir demo talebini onaylar ve kullanıcıya 7 günlük deneme süresi tanımlar
 * en-approves a demo request and grants the user a 7-day trial
 * input (demoRequestId: string)
 * output (Promise<{ success?: boolean; error?: string }>)
 */
export async function approveDemoRequest(
  demoRequestId: string
): Promise<{ success?: boolean; error?: string }> {
  try {
    const demo = await db.demoRequest.update({
      where: { id: demoRequestId },
      data: { status: "APPROVED" },
      select: { email: true },
    });

    const account = await db.user.findUnique({
      where: { email: demo.email.toLowerCase() },
      select: { id: true },
    });

    if (!account) {
      return { success: true };
    }

    await grantTrial(account.id);

    return { success: true };
  } catch (error) {
    logger.error("approveDemoRequest failed:", error);
    return { error: "INTERNAL" };
  }
}
