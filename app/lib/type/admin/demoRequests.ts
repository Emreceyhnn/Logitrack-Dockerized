/**
 * ADMIN CONSOLE — DEMO REQUEST TYPES
 * ==================================
 * Client-safe mirrors of the demo-request review surface.
 *
 * Approving a request is what actually grants dashboard entitlement to someone
 * who requested a demo while already signed in — that path has no other way to
 * redeem the signed `demoToken`, which is only consumed at sign-up.
 */

export type DemoRequestStatus = "PENDING" | "APPROVED" | "REJECTED";

/** Status filter for the queue; "ALL" removes the filter entirely. */
export type DemoRequestStatusFilter = DemoRequestStatus | "ALL";

export interface DemoRequestRow {
  id: string;
  fullName: string;
  email: string;
  company: string | null;
  message: string | null;
  type: "DEMO" | "CONTACT";
  status: DemoRequestStatus;
  /** ISO timestamp. */
  createdAt: string;
  /** Whether an account exists for this email — approving cannot grant without one. */
  hasAccount: boolean;
  /** Entitlement of the matching account; null when no account exists. */
  accessStatus: string | null;
  /** ISO timestamp of the current trial end, when there is one. */
  trialEndsAt: string | null;
}

export interface DecideDemoRequestResult {
  id: string;
  status: DemoRequestStatus;
  trialEndsAt: string | null;
  grantedTo: string | null;
  /** True when the row was updated but no account existed to grant a trial to. */
  accountMissing: boolean;
}
