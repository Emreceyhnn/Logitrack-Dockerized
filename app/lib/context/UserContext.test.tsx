 
import { describe, it, mock, beforeEach, before } from "node:test";
import { expect } from "expect";

// 1. MOCK'LAR

// Mock React Hooks and Context
const reactMock = {
  createContext: mock.fn(() => ({ Provider: "MockProvider" })),
  useContext: mock.fn(),
};

// React 17+ JSX Runtime Mock (Next.js default uses these for JSX compilation)
const jsxRuntimeMock = {
  jsx: mock.fn((type, props) => ({ type, props })),
  jsxs: mock.fn((type, props) => ({ type, props })),
  Fragment: "MockFragment",
};

// Modülleri Sisteme Enjekte Etme
mock.module("react", {
  namedExports: {
    createContext: reactMock.createContext,
    useContext: reactMock.useContext,
  },
});

mock.module("react/jsx-runtime", {
  namedExports: jsxRuntimeMock,
});

mock.module("react/jsx-dev-runtime", {
  namedExports: jsxRuntimeMock,
});

// 2. TEST GRUPLARI
describe("UserContext", () => {
  let contextModule: unknown;

  before(async () => {
    contextModule = await import("./UserContext");
  });

  beforeEach(() => {
    reactMock.useContext.mock.resetCalls();
    jsxRuntimeMock.jsx.mock.resetCalls();
  });

  describe("useUserContext()", () => {
    it("should_ThrowError_WhenUsedOutsideProvider", () => {
      // Arrange
      reactMock.useContext.mock.mockImplementation(() => undefined);

      // Act & Assert
      expect(() => {
        contextModule.useUserContext();
      }).toThrow("useUserContext must be used within a UserProvider");
    });

    it("should_ReturnContext_WhenUsedWithinProvider", () => {
      // Arrange
      const mockContextValue = { user: { id: "1", roleId: "admin" }, loading: false };
      reactMock.useContext.mock.mockImplementation(() => mockContextValue);

      // Act
      const result = contextModule.useUserContext();

      // Assert
      expect(result).toBe(mockContextValue);
      expect(reactMock.useContext.mock.calls.length).toBe(1);
    });
  });

  describe("UserProvider()", () => {
    it("should_RenderProvider_WithCorrectValueAndLoadingStateFalse", () => {
      // Arrange
      const mockUser = { id: "test-user", roleId: "role_admin" };
      
      // Act
      // Calling a React Component as a plain function returns its JSX object mapping
      const result = contextModule.UserProvider({
        children: "test-child-component",
        initialUser: mockUser as unknown,
      });

      // Assert
      // Because we mocked jsx-runtime, result is the object { type, props }
      expect(result.props.value.user).toBe(mockUser);
      expect(result.props.value.loading).toBe(false);
      expect(result.props.children).toBe("test-child-component");
    });
  });
});
