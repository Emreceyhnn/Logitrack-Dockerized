import { describe, it, before, mock, beforeEach } from "node:test";
import { expect } from "expect";

function makeRequest(authHeader?: string) {
  return {
    headers: {
      get: (key: string) => {
        if (key === "authorization") return authHeader ?? null;
        return null;
      },
    },
  } as unknown;
}

const mockNextResponse = {
  json: mock.fn((body: unknown, init?: { status?: number }) => ({
    _body: body,
    _status: init?.status ?? 200,
  })),
};
mock.module("next/server", {
  namedExports: { NextResponse: mockNextResponse, NextRequest: class {} },
});

const dbMock = {
  subscription: {
    findMany: mock.fn(async () => []),
    update: mock.fn(async () => ({})),
  },
};
mock.module("../../../lib/db.ts", { namedExports: { db: dbMock } });

const sendSubscriptionEmailMock = mock.fn(async () => true);
mock.module("../../../lib/services/email.ts", {
  namedExports: { sendSubscriptionEmail: sendSubscriptionEmailMock },
});

const makeSub = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  plan: "Pro",
  user: { email: `${id}@test.com`, name: "Test", language: "en" },
  ...overrides,
});

describe("GET /api/cron/subscription-lifecycle", () => {
  let GET: unknown;

  before(async () => {
    (process.env as unknown).CRON_SECRET = "cron-secret-123";
    const mod = await import("./route");
    GET = mod.GET;
  });

  beforeEach(() => {
    dbMock.subscription.findMany.mock.resetCalls();
    dbMock.subscription.update.mock.resetCalls();
    sendSubscriptionEmailMock.mock.resetCalls();
    mockNextResponse.json.mock.resetCalls();

    dbMock.subscription.findMany.mock.mockImplementation(async () => []);
    sendSubscriptionEmailMock.mock.mockImplementation(async () => true);
  });

  it("should_Return401_WhenAuthHeaderIsMissing", async () => {
    const res: unknown = await GET(makeRequest());
    expect(res._status).toBe(401);
    expect(res._body).toEqual({ error: "Unauthorized" });
  });

  it("should_Return401_WhenAuthHeaderIsWrong", async () => {
    const res: unknown = await GET(makeRequest("Bearer wrong-secret"));
    expect(res._status).toBe(401);
  });

  it("should_QueryExactDayWindows_ForReminders", async () => {
    // Act
    await GET(makeRequest("Bearer cron-secret-123"));

    // Assert — reminders must target an exact remaining-day count (3 and 1).
    // A range like "within 3 days" would re-match the same user on
    // consecutive daily runs and mail them repeatedly.
    const reminderCalls = dbMock.subscription.findMany.mock.calls.slice(0, 2);
    for (const call of reminderCalls) {
      const where = call.arguments[0].where;
      expect(where.status).toBe("TRIAL");
      expect(where.trialEndsAt.gte).toBeInstanceOf(Date);
      expect(where.trialEndsAt.lt).toBeInstanceOf(Date);
      // Exactly one calendar day wide
      const span = where.trialEndsAt.lt.getTime() - where.trialEndsAt.gte.getTime();
      expect(span).toBe(24 * 60 * 60 * 1000);
    }
  });

  it("should_SendReminder_WhenTrialEndsWithinThresholdDay", async () => {
    // Arrange — first reminder window (3 days) returns one subscription
    let call = 0;
    dbMock.subscription.findMany.mock.mockImplementation(async () => {
      call++;
      return call === 1 ? [makeSub("s-1")] : [];
    });

    // Act
    const res: unknown = await GET(makeRequest("Bearer cron-secret-123"));

    // Assert
    expect(res._body.remindersSent).toBe(1);
    const [recipient, payload] = sendSubscriptionEmailMock.mock.calls[0].arguments;
    expect(recipient.email).toBe("s-1@test.com");
    expect(payload.kind).toBe("TRIAL_ENDING");
    expect(payload.daysRemaining).toBe(3);
  });

  it("should_MarkExpiredAndNotify_WhenTrialHasLapsed", async () => {
    // Arrange — reminder windows empty, lapsed query returns one row
    let call = 0;
    dbMock.subscription.findMany.mock.mockImplementation(async () => {
      call++;
      return call === 3 ? [makeSub("s-9")] : [];
    });

    // Act
    const res: unknown = await GET(makeRequest("Bearer cron-secret-123"));

    // Assert — status is persisted so tomorrow's run cannot re-mail this user
    expect(res._body.markedExpired).toBe(1);
    expect(res._body.expiredSent).toBe(1);
    const updateArgs = dbMock.subscription.update.mock.calls[0].arguments[0];
    expect(updateArgs.where.id).toBe("s-9");
    expect(updateArgs.data.status).toBe("EXPIRED");
    expect(sendSubscriptionEmailMock.mock.calls[0].arguments[1].kind).toBe("TRIAL_ENDED");
  });

  it("should_StillMarkExpired_WhenEmailFails", async () => {
    // Arrange — the mail bounces, but the row must still leave TRIAL,
    // otherwise the job retries it every day forever.
    let call = 0;
    dbMock.subscription.findMany.mock.mockImplementation(async () => {
      call++;
      return call === 3 ? [makeSub("s-7")] : [];
    });
    sendSubscriptionEmailMock.mock.mockImplementation(async () => false);

    // Act
    const res: unknown = await GET(makeRequest("Bearer cron-secret-123"));

    // Assert
    expect(dbMock.subscription.update.mock.calls.length).toBe(1);
    expect(res._body.markedExpired).toBe(1);
    expect(res._body.expiredSent).toBe(0);
  });
});
