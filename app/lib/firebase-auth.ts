"use client";

import { signInWithCustomToken } from "firebase/auth";
import { auth } from "./firebase";
import { getFirebaseCustomTokenAction } from "./actions/firebaseToken";

/**
 * tr-Firebase istemci SDK'sının, herhangi bir Gerçek Zamanlı Veritabanı aboneliği
 * çalışmadan önce, arayanın `companyId` claimini taşıyan özel bir token ile
 * oturum açmasını sağlar.
 * en-Ensures the Firebase client SDK is signed in with a custom token carrying the
 * caller's `companyId` claim before any Realtime Database subscription runs.
 *
 * RTDB security rules deny all reads/writes to unauthenticated clients and scope
 * every tenant node by `auth.token.companyId`, so subscriptions MUST await this
 * first. The promise is memoised so concurrent subscribers share a single
 * sign-in round-trip; it is reset on failure so a later attempt can retry.
 */
let authPromise: Promise<void> | null = null;

/**
 * tr-Firebase istemci SDK'sını, arayanın `companyId` claimini taşıyan özel
 * bir token ile oturum açmasını sağlar.
 * en-Ensures the Firebase client SDK is signed in with a custom token carrying the
 * caller's `companyId` claim.
 * input (none)
 * output (Promise<void>)
 */
export function ensureFirebaseAuth(): Promise<void> {
  if (auth.currentUser) return Promise.resolve();

  // The public Live Demo has no session: getFirebaseCustomTokenAction is an
  // authenticatedAction, so calling it would redirect the anonymous visitor to
  // /auth/sign-in the moment a details dialog mounted a tracking subscription.
  // Reject instead — every caller already routes failures to its onError path
  // and falls back to the static DB location.
  if (typeof window !== "undefined" && window.location.pathname.includes("/demo")) {
    return Promise.reject(new Error("Firebase auth is unavailable in the demo"));
  }

  if (authPromise) return authPromise;

  authPromise = (async () => {
    const result = await getFirebaseCustomTokenAction();
    if ("error" in result) {
      throw new Error(`Firebase auth failed: ${result.error}`);
    }
    await signInWithCustomToken(auth, result.token);
  })().catch((err) => {
    // Allow a subsequent call to retry instead of caching the rejection.
    authPromise = null;
    throw err;
  });

  return authPromise;
}
