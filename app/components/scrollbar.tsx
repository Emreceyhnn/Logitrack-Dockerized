export interface ScrollbarTheme {
  palette?: {
    scroll?: {
      color: string;
      hover: string;
      background: string;
    };
  };
}

export const getScrollbarStyles = (theme: ScrollbarTheme) => {
  const scroll = theme.palette?.scroll;

  if (!scroll) return {};

  return {
    scrollbarWidth: "thin",
    scrollbarColor: `${scroll.color} transparent`,

    "&::-webkit-scrollbar": {
      width: 6,
      height: 6,
    },

    "&::-webkit-scrollbar-track": {
      backgroundColor: "transparent",
    },

    "&::-webkit-scrollbar-track-piece": {
      backgroundColor: scroll.background,
      borderRadius: 999,
      marginBlock: 6,
      marginInline: 6,
    },

    "&::-webkit-scrollbar-thumb": {
      backgroundColor: scroll.color,
      borderRadius: 999,
      minHeight: 40,
      margin: 2,
      transition: "background-color 0.2s ease",
    },

    "&::-webkit-scrollbar-thumb:hover": {
      backgroundColor: scroll.hover,
    },
  };
};
