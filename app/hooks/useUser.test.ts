 
import { describe, it, mock, beforeEach, before } from "node:test";
import { expect } from "expect";

// 1. MOCK'LAR
const userContextMock = {
  useUserContext: mock.fn(() => ({ user: { id: "user-1", name: "Test" }, loading: false })),
};

mock.module("../lib/context/UserContext.tsx", { namedExports: userContextMock });

// 2. TEST GRUPLARI
describe("useUser Hook", () => {
  let useUserMod: unknown;

  before(async () => {
    useUserMod = await import("./useUser");
  });

  beforeEach(() => {
    userContextMock.useUserContext.mock.resetCalls();
  });

  it("should_ReturnUserFromContext", () => {
    // Act
    const { user, loading } = useUserMod.useUser();

    // Assert
    expect(user.id).toBe("user-1");
    expect(loading).toBe(false);
    expect(userContextMock.useUserContext.mock.calls.length).toBe(1);
  });
});
