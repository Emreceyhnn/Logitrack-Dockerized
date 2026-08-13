// Barrel re-exporting the session controller, split across submodules under
// ./session/ to keep each file focused and under ~400 lines.
export type { SessionUser, SessionJWTPayload } from "./session/internal";
export {
  toSessionPayload,
  createSession,
  validateSession,
  refreshSession,
} from "./session/core";
export {
  revokeSession,
  revokeAllUserSessions,
  invalidateUserSessionCache,
  clearStaleClaims,
  clearAuthCookies,
  cleanExpiredSessions,
  getUserActiveSessions,
} from "./session/manage";
export { logAuditEvent } from "./session/audit";
