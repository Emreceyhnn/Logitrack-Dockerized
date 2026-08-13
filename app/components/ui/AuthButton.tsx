"use client";

import { Button, ButtonProps, CircularProgress, Box, useTheme } from "@mui/material";
import { motion, AnimatePresence } from "framer-motion";

interface AuthButtonProps extends ButtonProps {
  loading?: boolean;
  loadingText?: string;
}

const AuthButton = ({
  children,
  loading = false,
  loadingText,
  disabled,
  sx,
  ...props
}: AuthButtonProps) => {
  const theme = useTheme();
  return (
    <Button
      fullWidth
      variant="contained"
      disabled={loading || disabled}
      sx={{
        height: 52,
        borderRadius: 2,
        textTransform: "none",
        fontWeight: 700,
        fontSize: "0.95rem",
        position: "relative",
        overflow: "hidden",
        // Keeps label/spinner off the rounded edges regardless of locale.
        px: 2.5,
        bgcolor: "primary.main",
        "&:hover": {
          bgcolor: "primary.dark",
        },
        "&.Mui-disabled": {
          bgcolor: theme.palette.primary._alpha.main_50,
          color: theme.palette.common.white_alpha.main_50,
        },
        boxShadow: `0 8px 16px ${theme.palette.primary._alpha.main_25}`,
        transition: "all 0.2s ease-in-out",
        ...sx,
      }}
      {...props}
    >
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              // Longer localized strings (tr "Kaydediliyor...") must not run
              // into the button edges.
              gap: "8px",
              maxWidth: "100%",
              minWidth: 0,
            }}
          >
            <CircularProgress
              size={16}
              thickness={5}
              sx={{ color: "inherit", flexShrink: 0 }}
            />
            {loadingText && (
              <Box
                component="span"
                sx={{
                  fontSize: "0.8125rem",
                  fontWeight: 600,
                  lineHeight: 1.2,
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {loadingText}
              </Box>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </Button>
  );
};

export default AuthButton;
