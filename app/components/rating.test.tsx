 
import { describe, it, before, mock } from "node:test";
import { expect } from "expect";

mock.module("@mui/material", {
  namedExports: {
    Stack: () => null,
  },
});
mock.module("@mui/icons-material/Star", {
  defaultExport: () => null,
});
mock.module("@mui/icons-material/StarHalf", {
  defaultExport: () => null,
});
mock.module("@mui/icons-material/StarBorder", {
  defaultExport: () => null,
});

describe("CustomRating Component", () => {
  let CustomRating: unknown;

  before(async () => {
    // Modülü dinamik import ile yüklüyoruz
    const mod = await import("./rating");
    CustomRating = mod.default;
  });

  describe("CustomRating() bileşeni", () => {
    it("should_Return5Stars_WhenValueIs5", async () => {
      // Act
      const element = CustomRating({ value: 5, max: 5, size: "medium" });
      
      // Assert
      expect(element).toBeDefined();
      expect(element.props.direction).toBe("row");
      expect(Array.isArray(element.props.children)).toBe(true);
      expect(element.props.children.length).toBe(5);
    });

    const senaryolar = [
      { size: "small", expectedSpacing: 0.25 },
      { size: "medium", expectedSpacing: 0.5 },
      { size: "large", expectedSpacing: 0.75 },
    ];

    senaryolar.forEach(({ size, expectedSpacing }) => {
      it(`should_Apply${expectedSpacing}Spacing_WhenSizeIs${size}`, async () => {
        // Act
        const element = CustomRating({ value: 3, max: 5, size });
        
        // Assert
        expect(element.props.spacing).toBe(expectedSpacing);
      });
    });
  });
});
