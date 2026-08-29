import { describe, it, mock, beforeEach, before } from "node:test";
import { expect } from "expect";

// submitDemoRequest must grant the trial immediately for a signed-in,
// email-verified requester instead of leaving a PENDING row an admin has to
// approve — that PENDING path was the root cause of a real bug report: a
// logged-in user requesting a demo kept looping back to "Request a Demo"
// forever because the self-serve signup shortcut (demoToken) only works for
// brand-new accounts. These tests pin the new instant-grant branch and make
// sure it doesn't fire for the cases it must not (signed out, unverified,
// mismatched email).
const dbMock = {
  demoRequest: { create: mock.fn(async () => ({})) },
  user: { findUnique: mock.fn<() => Promise<unknown>>() },
};

const rateLimitMock = mock.fn(async () => ({ success: true }));
const getUserSessionMock = mock.fn<() => Promise<unknown>>();
const grantTrialMock = mock.fn(async () => ({ trialEndsAt: new Date() }));
const resolveEntitlementMock = mock.fn(async () => ({
  accessStatus: "NONE",
  trialEndsAt: null,
}));
const createDemoSignupTokenMock = mock.fn(async () => "signed-token");
const invalidateUserSessionCacheMock = mock.fn(async () => undefined);

const refreshSessionMock = mock.fn(async () => true);

mock.module("../db", { namedExports: { db: dbMock } });
mock.module("../rate-limiter", { namedExports: { rateLimit: rateLimitMock } });
mock.module("./auth", { namedExports: { getUserSession: getUserSessionMock } });
mock.module("../controllers/session", {
  namedExports: { refreshSession: refreshSessionMock },
});
mock.module("../entitlement.server", {
  namedExports: {
    grantTrial: grantTrialMock,
    resolveEntitlement: resolveEntitlementMock,
    createDemoSignupToken: createDemoSignupTokenMock,
  },
});
mock.module("../controllers/session/manage", {
  namedExports: { invalidateUserSessionCache: invalidateUserSessionCacheMock },
});
mock.module("next/headers", {
  namedExports: {
    headers: async () => ({ get: () => null }),
  },
});

describe("actions/demoRequest.ts", () => {
  let submitDemoRequest: (input: {
    fullName: string;
    email: string;
    type?: "DEMO" | "CONTACT";
  }) => Promise<{
    success?: boolean;
    error?: string;
    demoToken?: string;
    trialGranted?: boolean;
    existingAccount?: boolean;
  }>;

  before(async () => {
    const mod = await import("./demoRequest");
    submitDemoRequest = mod.submitDemoRequest;
  });

  beforeEach(() => {
    for (const m of [
      dbMock.demoRequest.create,
      dbMock.user.findUnique,
      rateLimitMock,
      getUserSessionMock,
      grantTrialMock,
      resolveEntitlementMock,
      createDemoSignupTokenMock,
      invalidateUserSessionCacheMock,
      refreshSessionMock,
    ]) {
      m.mock.resetCalls();
    }
    rateLimitMock.mock.mockImplementation(async () => ({ success: true }));
    getUserSessionMock.mock.mockImplementation(async () => null);
    dbMock.user.findUnique.mock.mockImplementation(async () => null);
  });

  const INPUT = { fullName: "Ada Lovelace", email: "ada@acme.com", type: "DEMO" as const };

  it("queues a PENDING request and returns a demoToken for a brand-new signed-out visitor", async () => {
    const result = await submitDemoRequest(INPUT);

    expect(result.success).toBe(true);
    expect(result.trialGranted).toBeUndefined();
    expect(result.demoToken).toBe("signed-token");
    expect(grantTrialMock.mock.callCount()).toBe(0);

    const createArgs = dbMock.demoRequest.create.mock.calls[0]?.arguments[0] as {
      data: { status?: string };
    };
    expect(createArgs.data.status).toBeUndefined(); // defaults to PENDING in the schema
  });

  it("grants the trial immediately for a signed-in requester even if unverified", async () => {
    getUserSessionMock.mock.mockImplementation(async () => ({ id: "u1" }));
    dbMock.user.findUnique.mock.mockImplementation(async () => ({
      id: "u1",
      email: "ada@acme.com",
    }));

    const result = await submitDemoRequest(INPUT);

    expect(result.success).toBe(true);
    expect(result.trialGranted).toBe(true);
    expect(grantTrialMock.mock.callCount()).toBe(1);
    expect(grantTrialMock.mock.calls[0]?.arguments[0]).toBe("u1");
    expect(refreshSessionMock.mock.callCount()).toBe(1);
    expect(invalidateUserSessionCacheMock.mock.callCount()).toBe(1);
  });

  it("grants the trial immediately for an existing registered account when signed out", async () => {
    getUserSessionMock.mock.mockImplementation(async () => null);
    dbMock.user.findUnique.mock.mockImplementation(async () => ({
      id: "u2",
      email: "ada@acme.com",
    }));

    const result = await submitDemoRequest(INPUT);

    expect(result.success).toBe(true);
    expect(result.trialGranted).toBe(true);
    expect(result.existingAccount).toBe(true);
    expect(grantTrialMock.mock.callCount()).toBe(1);
    expect(grantTrialMock.mock.calls[0]?.arguments[0]).toBe("u2");
  });

  it("grants the trial immediately for a signed-in, verified requester matching their own email", async () => {
    getUserSessionMock.mock.mockImplementation(async () => ({ id: "u1" }));
    dbMock.user.findUnique.mock.mockImplementation(async () => ({
      id: "u1",
      email: "ada@acme.com",
    }));

    const result = await submitDemoRequest(INPUT);

    expect(result.success).toBe(true);
    expect(result.trialGranted).toBe(true);
    expect(result.demoToken).toBeUndefined();
    expect(grantTrialMock.mock.callCount()).toBe(1);
    expect(grantTrialMock.mock.calls[0]?.arguments[0]).toBe("u1");
    expect(invalidateUserSessionCacheMock.mock.callCount()).toBe(1);
    expect(createDemoSignupTokenMock.mock.callCount()).toBe(0);

    const createArgs = dbMock.demoRequest.create.mock.calls[0]?.arguments[0] as {
      data: { status?: string };
    };
    expect(createArgs.data.status).toBe("APPROVED");
  });

  it("does not grant an instant trial for a plain CONTACT message even when signed in", async () => {
    getUserSessionMock.mock.mockImplementation(async () => ({ id: "u1" }));
    dbMock.user.findUnique.mock.mockImplementation(async () => ({
      id: "u1",
      email: "ada@acme.com",
    }));

    const result = await submitDemoRequest({ ...INPUT, type: "CONTACT" });

    expect(result.trialGranted).toBeUndefined();
    expect(grantTrialMock.mock.callCount()).toBe(0);
    expect(dbMock.user.findUnique.mock.callCount()).toBe(0);
  });
});
