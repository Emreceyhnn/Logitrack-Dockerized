 
import { describe, it, before } from "node:test";
import { expect } from "expect";

describe("Scrollbar Styles Service", () => {
  let getScrollbarStyles: unknown;

  before(async () => {
    const mod = await import("./scrollbar");
    getScrollbarStyles = mod.getScrollbarStyles;
  });

  describe("getScrollbarStyles() fonksiyonu", () => {
    it("should_ReturnEmptyObject_WhenThemeHasNoScrollPalette", async () => {
      // Act
      const styles = getScrollbarStyles({ palette: {} });
      
      // Assert
      expect(styles).toEqual({});
    });

    it("should_ReturnScrollbarStyles_WhenThemeIsValid", async () => {
      // Arrange
      const theme = {
        palette: {
          scroll: {
            color: "#888",
            hover: "#555",
            background: "#f1f1f1"
          }
        }
      };
      
      // Act
      const styles = getScrollbarStyles(theme);
      
      // Assert
      expect(styles.scrollbarColor).toBe("#888 transparent");
      expect(styles["&::-webkit-scrollbar-thumb"].backgroundColor).toBe("#888");
      expect(styles["&::-webkit-scrollbar-thumb:hover"].backgroundColor).toBe("#555");
      expect(styles["&::-webkit-scrollbar-track-piece"].backgroundColor).toBe("#f1f1f1");
    });
  });
});
