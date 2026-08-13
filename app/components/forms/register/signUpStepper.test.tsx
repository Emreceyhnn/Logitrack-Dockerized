 
import { describe, it, before, mock, beforeEach } from "node:test";
import { expect } from "expect";
import { renderToString } from "react-dom/server";
import React from "react";
global.React = React;

// MOCKLAR
const useDictionaryMock = mock.fn(() => ({
  auth: { personalInfo: "PInfo", security: "Sec", review: "Rev", unexpectedError: "Err", registering: "Reging", continuing: "Conting", completeRegistration: "Comp", continue: "Cont" },
  common: { back: "Back" }
}));

mock.module("next/navigation", {
  namedExports: {
    useRouter: mock.fn(() => ({ push: mock.fn(), refresh: mock.fn() })),
    useParams: mock.fn(() => ({ lang: "en" })),
    useSearchParams: mock.fn(() => new URLSearchParams()),
  }
});

const useLanguageMock = mock.fn(() => ({
  lang: "en",
  dict: useDictionaryMock(),
  changeLanguage: mock.fn(),
}));
mock.module("../../../lib/language/DictionaryContext.tsx", {
  namedExports: { useDictionary: useDictionaryMock, useLanguage: useLanguageMock },
});
mock.module("../../../lib/controllers/users.ts", { namedExports: { RegisterUser: mock.fn(), LoginWithGoogle: mock.fn() } });
mock.module("../../../lib/validationSchema.ts", { namedExports: { signUpValidationSchema: mock.fn(() => [{}, {}, {}]) } });
mock.module("../../ui/AuthButton.tsx", { defaultExport: ({ children  }: Record<string, unknown>) => <button data-testid="AuthButton">{children}</button> });

// GoogleSignInButton renders the real @react-oauth/google <GoogleLogin>,
// which throws outside a GoogleOAuthProvider — stub it like the step components.
mock.module("../../ui/GoogleSignInButton.tsx", { defaultExport: () => <div data-testid="GoogleSignInButton" /> });

mock.module("./step1PersonalInfo.tsx", { defaultExport: () => <div data-testid="Step1PersonalInfo" /> });
mock.module("./step2Security.tsx", { defaultExport: () => <div data-testid="Step2Security" /> });
mock.module("./step3Profile.tsx", { defaultExport: () => <div data-testid="Step3Profile" /> });

mock.module("formik", {
  namedExports: {
    Form: ({ children  }: Record<string, unknown>) => <form data-testid="Form">{children}</form>,
    Formik: ({ children  }: Record<string, unknown>) => <div data-testid="Formik">{typeof children === "function" ? children({ handleSubmit: () => {} }) : children}</div>
  }
});

mock.module("@mui/material", {
  namedExports: {
    Box: ({ children  }: Record<string, unknown>) => <div data-testid="Box">{children}</div>,
    Button: ({ children  }: Record<string, unknown>) => <button data-testid="Button">{children}</button>,
    Stack: ({ children  }: Record<string, unknown>) => <div data-testid="Stack">{children}</div>,
    Step: ({ children  }: Record<string, unknown>) => <div data-testid="Step">{children}</div>,
    StepLabel: ({ children  }: Record<string, unknown>) => <div data-testid="StepLabel">{children}</div>,
    Stepper: ({ children  }: Record<string, unknown>) => <div data-testid="Stepper">{children}</div>,
    Typography: ({ children  }: Record<string, unknown>) => <div data-testid="Typography">{children}</div>,
    styled: () => () => function StyledMock({ children  }: Record<string, unknown>) { return <div data-testid="Styled">{children}</div>; },
    StepConnector: function StepConnectorMock() { return <div data-testid="StepConnector" />; },
    stepConnectorClasses: { alternativeLabel: "", active: "", completed: "", line: "" },
    CircularProgress: () => <div data-testid="CircularProgress" />,
    Divider: ({ children }: Record<string, unknown>) => <div data-testid="Divider">{children}</div>,
  }
});

mock.module("@mui/icons-material/Check", { defaultExport: () => <div data-testid="CheckIcon" /> });

describe("SignUpStepper Component", () => {
  let SignUpStepper: unknown;

  before(async () => {
    const mod = await import("./signUpStepper");
    SignUpStepper = mod.default;
  });

  beforeEach(() => {
    useDictionaryMock.mock.resetCalls();
  });

  describe("SignUpStepper() bileşeni", () => {
    it("should_InitializeWithoutErrors_WhenRendered", async () => {
      let error = null;
      let html = "";
      try {
        html = renderToString(<SignUpStepper />);
      } catch (e) {
        error = e;
      }
      
      expect(error).toBeNull();
      expect(html).toContain("data-testid=\"Formik\"");
    });
  });
});
