"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  Box,
  Typography,
  Button,
  IconButton,
  Stack,
  useTheme,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { useGuidedTour } from "@/app/lib/context/GuidedTourContext";
import { useDictionary } from "@/app/lib/language/DictionaryContext";

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

/**
 * GuidedTourOverlay
 *
 * Renders a semi-transparent overlay that highlights a specific DOM element
 * for the current tour step. Shows a tooltip with title, description, and
 * Next/Prev/Close controls.
 */
export default function GuidedTourOverlay() {
  const theme = useTheme();
  const dict = useDictionary();
  const { state, nextStep, prevStep, closeTour } = useGuidedTour();
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const currentStep = state.isActive ? state.steps[state.currentStep] : null;

  const measure = useCallback(() => {
    if (!currentStep) {
      setTargetRect(null);
      return;
    }
    const el = document.querySelector(currentStep.targetSelector);
    if (!el) {
      setTargetRect(null);
      return;
    }
    const r = el.getBoundingClientRect();
    setTargetRect({
      top: r.top + window.scrollY,
      left: r.left + window.scrollX,
      width: r.width,
      height: r.height,
    });

    // Scroll element into view smoothly
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [currentStep]);

  useEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure);
    };
  }, [measure]);

  // Re-measure after a short delay to allow scroll animations to finish
  useEffect(() => {
    if (!state.isActive) return;
    const timer = setTimeout(measure, 350);
    return () => clearTimeout(timer);
  }, [state.currentStep, state.isActive, measure]);

  // Keyboard navigation
  useEffect(() => {
    if (!state.isActive) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeTour();
      if (e.key === "ArrowRight" || e.key === "Enter") nextStep();
      if (e.key === "ArrowLeft") prevStep();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [state.isActive, closeTour, nextStep, prevStep]);

  // Lock body scroll while tour is active
  useEffect(() => {
    if (state.isActive) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [state.isActive]);

  if (!state.isActive || !currentStep) return null;

  const padding = 8;
  const totalSteps = state.steps.length;
  const stepNumber = state.currentStep + 1;
  const isFirst = state.currentStep === 0;
  const isLast = state.currentStep === totalSteps - 1;

  // Compute tooltip position
  const placement = currentStep.placement || "bottom";
  const tooltipStyle: Record<string, string | number> = {
    position: "absolute",
    zIndex: 10002,
    maxWidth: 380,
    width: "90vw",
  };

  if (targetRect) {
    // We know max width is 380
    const tooltipWidth = 380;
    // Calculate ideal left position (centered on target)
    const idealLeft = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
    // Clamp between 16px from left and 16px from right (accounting for tooltip width)
    const clampedLeft = Math.max(16, Math.min(idealLeft, window.innerWidth - tooltipWidth - 16));

    switch (placement) {
      case "bottom":
        tooltipStyle.top = targetRect.top + targetRect.height + padding + 12;
        tooltipStyle.left = clampedLeft;
        // If bottom placement pushes tooltip below the viewport, flip to top
        if (typeof tooltipStyle.top === 'number' && tooltipStyle.top + 220 > window.scrollY + window.innerHeight) {
          tooltipStyle.top = targetRect.top - padding - 12;
          tooltipStyle.transform = "translateY(-100%)";
        }
        break;
      case "top":
        tooltipStyle.top = targetRect.top - padding - 12;
        tooltipStyle.left = clampedLeft;
        tooltipStyle.transform = "translateY(-100%)";
        // If top placement pushes tooltip above the viewport, flip to bottom
        if (typeof tooltipStyle.top === 'number' && tooltipStyle.top - 220 < window.scrollY) {
          tooltipStyle.top = targetRect.top + targetRect.height + padding + 12;
          tooltipStyle.transform = "";
        }
        break;
      case "right":
        tooltipStyle.top = targetRect.top + targetRect.height / 2;
        tooltipStyle.left = targetRect.left + targetRect.width + padding + 12;
        tooltipStyle.transform = "translateY(-50%)";
        // Prevent right overflow by falling back to bottom (or top if bottom overflows)
        if (Number(tooltipStyle.left) + tooltipWidth > window.innerWidth) {
          tooltipStyle.left = clampedLeft;
          tooltipStyle.top = targetRect.top + targetRect.height + padding + 12;
          tooltipStyle.transform = "";
          if (typeof tooltipStyle.top === 'number' && tooltipStyle.top + 220 > window.scrollY + window.innerHeight) {
            tooltipStyle.top = targetRect.top - padding - 12;
            tooltipStyle.transform = "translateY(-100%)";
            if (tooltipStyle.top - 220 < window.scrollY) {
              // center fallback
              tooltipStyle.top = Math.max(window.scrollY + 100, window.scrollY + window.innerHeight / 2);
              tooltipStyle.left = "50%";
              tooltipStyle.transform = "translate(-50%, -50%)";
            }
          }
        }
        break;
      case "left":
        tooltipStyle.top = targetRect.top + targetRect.height / 2;
        tooltipStyle.left = targetRect.left - padding - 12;
        tooltipStyle.transform = "translate(-100%, -50%)";
        // Prevent left overflow by falling back to bottom (or top if bottom overflows)
        if (Number(tooltipStyle.left) - tooltipWidth < 0) {
          tooltipStyle.left = clampedLeft;
          tooltipStyle.top = targetRect.top + targetRect.height + padding + 12;
          tooltipStyle.transform = "";
          if (typeof tooltipStyle.top === 'number' && tooltipStyle.top + 220 > window.scrollY + window.innerHeight) {
            tooltipStyle.top = targetRect.top - padding - 12;
            tooltipStyle.transform = "translateY(-100%)";
            if (tooltipStyle.top - 220 < window.scrollY) {
              // center fallback
              tooltipStyle.top = Math.max(window.scrollY + 100, window.scrollY + window.innerHeight / 2);
              tooltipStyle.left = "50%";
              tooltipStyle.transform = "translate(-50%, -50%)";
            }
          }
        }
        break;
      case "center":
        tooltipStyle.top = Math.max(
          window.scrollY + 100,
          Math.min(targetRect.top + targetRect.height / 2, window.scrollY + window.innerHeight - 150)
        );
        tooltipStyle.left = "50%";
        tooltipStyle.transform = "translate(-50%, -50%)";
        break;
    }
    
    // Ensure tooltip doesn't completely disappear vertically
    if (typeof tooltipStyle.top === 'number') {
       if (tooltipStyle.top < window.scrollY + 16) {
           tooltipStyle.top = window.scrollY + 16;
       } else {
           // Also clamp bottom just in case
           const maxTop = window.scrollY + window.innerHeight - 250;
           if (tooltipStyle.top > maxTop && !tooltipStyle.transform?.toString().includes("-100%")) {
               tooltipStyle.top = maxTop;
           }
       }
    }
  } else {
    // Centered fallback if element not found
    tooltipStyle.top = "50%";
    tooltipStyle.left = "50%";
    tooltipStyle.transform = "translate(-50%, -50%)";
  }

  return (
    <Box
      ref={overlayRef}
      onClick={(e) => {
        if (e.target === overlayRef.current) closeTour();
      }}
      sx={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        pointerEvents: "auto",
      }}
    >
      {/* SVG overlay with cutout for the highlighted element */}
      <svg
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
        }}
      >
        <defs>
          <mask id="guided-tour-mask">
            <rect width="100%" height="100%" fill="white" />
            {targetRect && (
              <rect
                x={targetRect.left - padding}
                y={targetRect.top - padding - window.scrollY}
                width={targetRect.width + padding * 2}
                height={targetRect.height + padding * 2}
                rx={12}
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.6)"
          mask="url(#guided-tour-mask)"
          style={{ pointerEvents: "auto" }}
        />
      </svg>

      {/* Highlight ring around target */}
      {targetRect && (
        <Box
          sx={{
            position: "absolute",
            top: targetRect.top - padding - window.scrollY,
            left: targetRect.left - padding,
            width: targetRect.width + padding * 2,
            height: targetRect.height + padding * 2,
            borderRadius: "12px",
            border: `2px solid ${theme.palette.primary.main}`,
            boxShadow: `0 0 0 4px ${theme.palette.primary.main}33, 0 0 24px ${theme.palette.primary.main}22`,
            pointerEvents: "none",
            transition: "all 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
            animation: "tour-pulse 2s ease-in-out infinite",
            "@keyframes tour-pulse": {
              "0%, 100%": {
                boxShadow: `0 0 0 4px ${theme.palette.primary.main}33, 0 0 24px ${theme.palette.primary.main}22`,
              },
              "50%": {
                boxShadow: `0 0 0 6px ${theme.palette.primary.main}55, 0 0 32px ${theme.palette.primary.main}44`,
              },
            },
          }}
        />
      )}

      {/* Tooltip card */}
      <Box
        sx={{
          ...tooltipStyle,
          top:
            typeof tooltipStyle.top === "number"
              ? (tooltipStyle.top as number) - window.scrollY
              : tooltipStyle.top,
          bgcolor:
            theme.palette.mode === "dark"
              ? "rgba(20, 24, 32, 0.97)"
              : "rgba(255, 255, 255, 0.97)",
          backdropFilter: "blur(20px)",
          borderRadius: "16px",
          border: `1px solid ${theme.palette.divider}`,
          boxShadow:
            theme.palette.mode === "dark"
              ? "0 20px 48px rgba(0,0,0,0.5)"
              : "0 20px 48px rgba(0,0,0,0.12)",
          p: 3,
          transition: "all 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
          animation: "tour-fadein 0.3s ease-out",
          "@keyframes tour-fadein": {
            from: { opacity: 0, transform: `${tooltipStyle.transform || ""} scale(0.95)` },
            to: { opacity: 1, transform: `${tooltipStyle.transform || ""} scale(1)` },
          },
        }}
      >
        {/* Header */}
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="flex-start"
          mb={1.5}
        >
          <Box
            sx={{
              px: 1.5,
              py: 0.5,
              borderRadius: "8px",
              bgcolor: theme.palette.primary._alpha?.main_10 || theme.palette.primary.main + "1A",
              color: theme.palette.primary.main,
              fontSize: "0.7rem",
              fontWeight: 700,
            }}
          >
            {stepNumber} / {totalSteps}
          </Box>
          <IconButton size="small" onClick={closeTour} sx={{ mt: -0.5, mr: -0.5 }} aria-label="close">
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>

        {/* Title */}
        <Typography
          fontWeight={700}
          fontSize={16}
          color="text.primary"
          sx={{ mb: 1 }}
        >
          {currentStep.title}
        </Typography>

        {/* Description */}
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 2.5, lineHeight: 1.6 }}
        >
          {currentStep.description}
        </Typography>

        {/* Progress dots */}
        <Stack direction="row" spacing={0.5} justifyContent="center" mb={2}>
          {state.steps.map((_, i) => (
            <Box
              key={i}
              sx={{
                width: i === state.currentStep ? 20 : 6,
                height: 6,
                borderRadius: 3,
                bgcolor:
                  i === state.currentStep
                    ? theme.palette.primary.main
                    : theme.palette.divider,
                transition: "all 0.3s ease",
              }}
            />
          ))}
        </Stack>

        {/* Actions */}
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Button
            size="small"
            startIcon={<ArrowBackIcon />}
            disabled={isFirst}
            onClick={prevStep}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              color: "text.secondary",
              "&:hover": { color: "text.primary" },
            }}
          >
            {dict.common.guidedTour?.prev || "Prev"}
          </Button>

          <Button
            size="small"
            variant="contained"
            endIcon={!isLast ? <ArrowForwardIcon /> : undefined}
            onClick={nextStep}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              borderRadius: "10px",
              px: 2.5,
              boxShadow: `0 4px 12px ${theme.palette.primary.main}33`,
            }}
          >
            {isLast
              ? dict.common.guidedTour?.finish || "Finish"
              : dict.common.guidedTour?.next || "Next"}
          </Button>
        </Stack>
      </Box>
    </Box>
  );
}
