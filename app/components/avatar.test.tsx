 
import { describe, it, before, mock } from "node:test";
import { expect } from "expect";

// 1. MOCK'LAR
// Rating bileşenini izole etmek için mockluyoruz
mock.module("./rating.tsx", {
  defaultExport: (props: Record<string, unknown>) => ({ type: "CustomRatingMock", props }),
});

mock.module("@mui/material", {
  namedExports: {
    Avatar: () => null,
    Box: () => null,
    Typography: () => null,
  },
});

describe("DriverAvatar Component", () => {
  let DriverAvatar: unknown;

  before(async () => {
    // Modülü mocklamadan sonra yüklüyoruz
    const mod = await import("./avatar");
    DriverAvatar = mod.default;
  });

  describe("DriverAvatar() bileşeni", () => {
    it("should_ReturnAvatarWithCorrectProps_WhenSizeIsMedium", async () => {
      // Arrange
      const props = {
        avatarUrl: "https://example.com/avatar.jpg",
        name: "John",
        surname: "Doe",
        rating: 4.5,
        size: "medium"
      };

      // Act
      const element = DriverAvatar(props);
      
      // Assert
      expect(element).toBeDefined();
      // Medium size gap is 1
      expect(element.props.sx.gap).toBe(1);
      
      const children = element.props.children;
      expect(Array.isArray(children)).toBe(true);
      
      // İlk çocuk Avatar bileşenidir
      const avatarComponent = children[0];
      expect(avatarComponent.props.src).toBe("https://example.com/avatar.jpg");
      expect(avatarComponent.props.sx.width).toBe(40);
      expect(avatarComponent.props.sx.height).toBe(40);
    });

    it("should_ReturnAvatarWithSmallSize_WhenSizeIsSmall", async () => {
      // Act
      const element = DriverAvatar({
        avatarUrl: "https://example.com/avatar.jpg",
        name: "Jane",
        surname: "Smith",
        rating: 5,
        size: "small"
      });
      
      // Assert
      // Small size gap is 0.75
      expect(element.props.sx.gap).toBe(0.75);
      const avatarComponent = element.props.children[0];
      expect(avatarComponent.props.sx.width).toBe(32);
    });
  });
});
