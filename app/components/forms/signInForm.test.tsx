 
import { describe, it, before, mock, beforeEach } from "node:test";
import { expect } from "expect";
import { renderToString } from "react-dom/server";
import React from "react";
global.React = React;

// MOCKLAR
const useDictionaryMock = mock.fn(() => ({
  auth: { register: "Register", login: "Login", welcome: "Welcome", signInDescription: "Desc", email: "Email", password: "Password", loggingIn: "Logging in", logInNow: "Log in now", forgotPasswordPrompt: "Forgot?", resetIt: "Reset" }
}));

mock.module("next/navigation", {
  namedExports: { useRouter: mock.fn(() => ({ push: mock.fn(), refresh: mock.fn() })), useParams: mock.fn(() => ({ lang: "en" })) }
});

mock.module("next/link", { defaultExport: ({ children  }: Record<string, unknown>) => <a data-testid="Link">{children}</a> });

const useLanguageMock = mock.fn(() => ({
  lang: "en",
  dict: useDictionaryMock(),
  changeLanguage: mock.fn(),
}));
mock.module("../../lib/language/DictionaryContext.tsx", {
  namedExports: { useDictionary: useDictionaryMock, useLanguage: useLanguageMock },
});
mock.module("../../lib/controllers/users.ts", { namedExports: { LoginUser: mock.fn(), LoginWithGoogle: mock.fn() } });
mock.module("../../lib/validationSchema.ts", { namedExports: { loginValidationSchema: mock.fn() } });
mock.module("../../lib/styled/styledFieldBox.ts", { namedExports: { StyledTextFieldAuth: () => <input data-testid="StyledTextFieldAuth" /> } });
mock.module("../ui/AuthButton.tsx", { defaultExport: ({ children  }: Record<string, unknown>) => <button data-testid="AuthButton">{children}</button> });
// GoogleSignInButton renders the real @react-oauth/google <GoogleLogin>,
// which throws outside a GoogleOAuthProvider — stub it out.
mock.module("../ui/GoogleSignInButton.tsx", { defaultExport: () => <div data-testid="GoogleSignInButton" /> });

mock.module("formik", {
  namedExports: {
    Field: ({ children, name  }: Record<string, unknown>) => <div data-testid={`Field-${name}`}>{typeof children === "function" ? children({ field: { name }, meta: {} }) : children}</div>,
    Form: ({ children  }: Record<string, unknown>) => <form data-testid="Form">{children}</form>,
    Formik: ({ children  }: Record<string, unknown>) => <div data-testid="Formik">{typeof children === "function" ? children({ handleSubmit: () => {} }) : children}</div>
  }
});

mock.module("@mui/material", {
  namedExports: {
    Box: ({ children  }: Record<string, unknown>) => <div data-testid="Box">{children}</div>,
    Stack: ({ children  }: Record<string, unknown>) => <div data-testid="Stack">{children}</div>,
    Typography: ({ children  }: Record<string, unknown>) => <div data-testid="Typography">{children}</div>,
    InputAdornment: ({ children  }: Record<string, unknown>) => <div data-testid="InputAdornment">{children}</div>,
    IconButton: ({ children  }: Record<string, unknown>) => <button data-testid="IconButton">{children}</button>,
    CircularProgress: () => <div data-testid="CircularProgress" />,
    Divider: ({ children }: Record<string, unknown>) => <div data-testid="Divider">{children}</div>,
  }
});

mock.module("@mui/icons-material/VisibilityOff", { defaultExport: () => <div data-testid="VisibilityOffIcon" /> });
mock.module("@mui/icons-material/Visibility", { defaultExport: () => <div data-testid="VisibilityIcon" /> });

describe("LoginForm Component", () => {
  let LoginForm: unknown;

  before(async () => {
    const mod = await import("./signInForm");
    LoginForm = mod.default;
  });

  beforeEach(() => {
    useDictionaryMock.mock.resetCalls();
  });

  describe("LoginForm() bileşeni", () => {
    it("should_InitializeWithoutErrors_WhenRendered", async () => {
      let error = null;
      let html = "";
      try {
        html = renderToString(<LoginForm />);
      } catch (e) {
        error = e;
      }
      
      expect(error).toBeNull();
      expect(html).toContain("data-testid=\"Formik\"");
    });
  });
});
