 
import { describe, it, mock, beforeEach, before } from "node:test";
import { expect } from "expect";

// 1. MOCK'LAR
const reactMock = {
  useMemo: mock.fn((cb) => cb()),
};

const useUserMock = {
  useUser: mock.fn(() => ({ user: { timezone: "Europe/Istanbul", dateFormat: "DD.MM.YYYY", timeFormat: "24h" } })),
};

const languageMock = {
  useLanguage: mock.fn(() => ({ lang: "tr" })),
};

mock.module("react", { namedExports: reactMock });
mock.module("./useUser.ts", { namedExports: useUserMock });
mock.module("../lib/language/DictionaryContext.tsx", { namedExports: languageMock });

// 2. TEST GRUPLARI
describe("useDateSettings Hook", () => {
  let useDateSettingsMod: unknown;

  before(async () => {
    useDateSettingsMod = await import("./useDateSettings");
  });

  beforeEach(() => {
    reactMock.useMemo.mock.resetCalls();
    useUserMock.useUser.mock.resetCalls();
    languageMock.useLanguage.mock.resetCalls();
  });

  it("should_ReturnDateSettingsDerivedFromUserObject", () => {
    // Act
    const settings = useDateSettingsMod.useDateSettings();

    // Assert
    expect(settings.timezone).toBe("Europe/Istanbul");
    expect(settings.dateFormat).toBe("DD.MM.YYYY");
    expect(settings.timeFormat).toBe("24h");
    
    expect(useUserMock.useUser.mock.calls.length).toBe(1);
  });
});
