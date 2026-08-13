 
import { describe, it, before, mock, beforeEach } from "node:test";
import { expect } from "expect";
import { renderToString } from "react-dom/server";
import React from "react";
global.React = React;

// MOCKLAR
const useDictionaryMock = mock.fn(() => ({
  auth: { finalTouches: "Final", profileDescription: "Desc", uploading: "Uping", changePhoto: "Change", uploadProfilePicture: "Upload", termsAgreement: "Terms" }
}));

mock.module("../../../lib/language/DictionaryContext.tsx", { namedExports: { useDictionary: useDictionaryMock } });
mock.module("../../../lib/actions/upload.ts", { namedExports: { uploadImageAction: mock.fn() } });

mock.module("formik", {
  namedExports: {
    useFormikContext: () => ({ values: { avatarUrl: "" }, setFieldValue: mock.fn() })
  }
});

mock.module("@mui/material", {
  namedExports: {
    Box: ({ children  }: Record<string, unknown>) => <div data-testid="Box">{children}</div>,
    Stack: ({ children  }: Record<string, unknown>) => <div data-testid="Stack">{children}</div>,
    Typography: ({ children  }: Record<string, unknown>) => <div data-testid="Typography">{children}</div>,
    Avatar: ({ children  }: Record<string, unknown>) => <div data-testid="Avatar">{children}</div>,
    CircularProgress: () => <div data-testid="CircularProgress" />
  }
});

mock.module("@mui/icons-material/CloudUpload", { defaultExport: () => <div data-testid="CloudUploadIcon" /> });

describe("Step3Profile Component", () => {
  let Step3Profile: unknown;

  before(async () => {
    const mod = await import("./step3Profile");
    Step3Profile = mod.default;
  });

  beforeEach(() => {
    useDictionaryMock.mock.resetCalls();
  });

  describe("Step3Profile() bileşeni", () => {
    it("should_InitializeWithoutErrors_WhenRendered", async () => {
      let error = null;
      let html = "";
      try {
        html = renderToString(<Step3Profile />);
      } catch (e) {
        error = e;
      }
      
      expect(error).toBeNull();
      expect(html).toContain("data-testid=\"Avatar\"");
    });
  });
});
