 
import { describe, it, before, mock } from "node:test";
import { expect } from "expect";
import { renderToString } from "react-dom/server";
import React from "react";
global.React = React;

// MOCKLAR
mock.module("next/link", { defaultExport: ({ children  }: Record<string, unknown>) => <a data-testid="Link">{children}</a> });
mock.module("../../lib/language/language.ts", { namedExports: { getDictionary: mock.fn(async () => ({ auth: { register: "Register", login: "Login" } })) } });
mock.module("./register/signUpStepper.tsx", { defaultExport: () => <div data-testid="SignUpStepper" /> });

mock.module("@mui/material", {
  namedExports: {
    Box: ({ children  }: Record<string, unknown>) => <div data-testid="Box">{children}</div>,
    Stack: ({ children  }: Record<string, unknown>) => <div data-testid="Stack">{children}</div>,
    Typography: ({ children  }: Record<string, unknown>) => <div data-testid="Typography">{children}</div>
  }
});

describe("RegisterForm Component", () => {
  let RegisterForm: unknown;

  before(async () => {
    const mod = await import("./signUpForm");
    RegisterForm = mod.default;
  });

  describe("RegisterForm() bileşeni", () => {
    it("should_InitializeWithoutErrors_WhenRendered", async () => {
      let error = null;
      let html = "";
      try {
        const element = await RegisterForm({ params: Promise.resolve({ lang: "en" }) });
        html = renderToString(element);
      } catch (e) {
        error = e;
      }
      
      expect(error).toBeNull();
      expect(html).toContain("data-testid=\"SignUpStepper\"");
    });
  });
});
