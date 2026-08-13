import { describe, it, before, mock, afterEach } from "node:test";
import { expect } from "expect";
import {
  render,
  screen,
  cleanup,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import React from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";

// 1. MOCK'LAR (Imports'dan ÖNCE tanımlanmalı!)

const useDictionaryMock = mock.fn(() => ({
  common: { close: "Close" },
  auth: {
    verifyEmailGateTitle: "Verify your email first",
    verifyEmailGateBody: "Press the button below to send the verification link.",
    verifyEmailGateSent: "Verification link sent to {email}.",
    verifyEmailGateSend: "Send Verification Email",
    verifyEmailGateSending: "Sending…",
    verifyEmailResendButton: "Send New Link",
    verifyEmailResent: "We've sent a new link.",
    verifyEmailResentHint: "The link expires in 24 hours.",
    verifyEmailError: "Something went wrong.",
  },
}));

mock.module("../../../lib/language/DictionaryContext.tsx", {
  namedExports: { useDictionary: useDictionaryMock },
});

const toastMock = {
  success: mock.fn(),
  error: mock.fn(),
};
mock.module("sonner", { namedExports: { toast: toastMock } });

// auth-middleware is pulled in through the server action's module graph and
// imports `redirect` at load time.
mock.module("next/navigation", {
  namedExports: {
    redirect: mock.fn(),
    useRouter: mock.fn(() => ({ push: mock.fn(), refresh: mock.fn() })),
    usePathname: mock.fn(() => "/"),
    useParams: mock.fn(() => ({ lang: "en" })),
  },
});

const sendMyEmailVerificationMock = mock.fn(async () => ({
  success: true as const,
  email: "founder@example.com",
}));
mock.module("../../../lib/controllers/users.ts", {
  namedExports: { sendMyEmailVerification: sendMyEmailVerificationMock },
});

// The app augments the palette with `_alpha` tints (see lib/theme); a bare
// createTheme() lacks them and the component reads primary._alpha.main_10.
const theme = createTheme({
  palette: {
    primary: {
      main: "#1976d2",
      _alpha: { main_10: "rgba(25,118,210,0.1)" },
    },
  },
} as Parameters<typeof createTheme>[0]);

// 2. TEST GRUPLARI
describe("VerifyEmailGate RTL Component", () => {

  let VerifyEmailGate: React.ComponentType<{ onClose: () => void }>;

  const renderGate = (onClose = mock.fn()) =>
    render(
      <ThemeProvider theme={theme}>
        <VerifyEmailGate onClose={onClose} />
      </ThemeProvider>
    );

  before(async () => {
    VerifyEmailGate = (await import("./VerifyEmailGate")).default;
  });

  afterEach(() => {
    cleanup();
    sendMyEmailVerificationMock.mock.resetCalls();
    toastMock.success.mock.resetCalls();
    toastMock.error.mock.resetCalls();
  });

  it("should_RenderPrompt_WhenOpened", () => {
    renderGate();
    expect(screen.getByText("Verify your email first")).toBeDefined();
    expect(screen.getByText(/Press the button below/)).toBeDefined();
  });

  // The whole point of the gate: one press sends the mail — no form to fill in
  // first, which is what the old flow demanded before rejecting the submission.
  it("should_SendVerificationEmail_WhenButtonPressed", async () => {
    renderGate();

    fireEvent.click(screen.getByText("Send Verification Email"));

    await waitFor(() => {
      expect(sendMyEmailVerificationMock.mock.calls.length).toBe(1);
    });
    expect(toastMock.success.mock.calls.length).toBe(1);
  });

  it("should_ShowResolvedAddress_WhenSendSucceeds", async () => {
    renderGate();

    fireEvent.click(screen.getByText("Send Verification Email"));

    // The address comes back from the server action — the session has no email.
    await waitFor(() => {
      expect(
        screen.getByText("Verification link sent to founder@example.com.")
      ).toBeDefined();
    });
    expect(screen.getByText("The link expires in 24 hours.")).toBeDefined();
  });

  it("should_ShowError_WhenActionReturnsError", async () => {
    sendMyEmailVerificationMock.mock.mockImplementationOnce(async () => ({
      error: "Too many requests. Please try again later.",
    }));

    renderGate();
    fireEvent.click(screen.getByText("Send Verification Email"));

    await waitFor(() => {
      expect(toastMock.error.mock.calls.length).toBe(1);
    });
    // A failed send must not claim success.
    expect(toastMock.success.mock.calls.length).toBe(0);
  });

  it("should_CallOnClose_WhenClosePressed", () => {
    const onClose = mock.fn();
    renderGate(onClose);

    fireEvent.click(screen.getByText("Close"));

    expect(onClose.mock.calls.length).toBe(1);
  });
});
