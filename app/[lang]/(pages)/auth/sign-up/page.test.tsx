 
import { describe, it, before, mock, afterEach } from "node:test";
import { expect } from "expect";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";

// Mock child component
mock.module("../../../../components/forms/signUpForm.tsx", {
  defaultExport: () => <div data-testid="sign-up-form">Sign Up Form</div>,
});

describe("SignUpPage Component", () => {
  let SignUpPage: unknown;

  before(async () => {
    const mod = await import("./page");
    SignUpPage = mod.default;
  });

  afterEach(() => {
    cleanup();
  });

  describe("SignUpPage() Render Testleri", () => {
    it("should_RenderSignUpForm_Correctly", async () => {
      // Act
      render(<SignUpPage params={Promise.resolve({ lang: "en" })} />);

      // Assert
      expect(screen.getByTestId("sign-up-form")).toBeTruthy();
    });
  });
});
