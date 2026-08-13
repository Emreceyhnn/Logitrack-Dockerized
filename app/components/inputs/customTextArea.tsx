"use client";

import { InputAdornment, SxProps, TextField, Theme, useTheme } from "@mui/material";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { useState, useRef } from "react";

interface Props {
  label?: string;
  name: string;
  value: string;
  placeholder?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  select?: boolean;
  children?: React.ReactNode;
  sx?: SxProps<Theme>;
  disabled?: boolean;
  error?: boolean | undefined;
  helperText?: string | undefined;
  onBlur?: ((e: React.FocusEvent<HTMLInputElement>) => void) | undefined;
}

const CustomTextArea = ({
  label,
  name,
  value,
  placeholder,
  onChange,
  type = "text",
  select = false,
  children,
  sx,
  disabled = false,
  error = false,
  helperText,
  onBlur,
}: Props) => {
  const theme = useTheme();

  /* ---------------------------------- style --------------------------------- */
  const baseStyles: SxProps<Theme> = {
    "& .MuiOutlinedInput-root": {
      backgroundColor: theme.palette.text.darkBlue._alpha.main_50,
      borderRadius: 2,
      "& fieldset": {
        borderColor: theme.palette.divider_alpha.main_10,
      },
      "&:hover fieldset": {
        borderColor: theme.palette.primary._alpha.main_30,
      },
      "&.Mui-focused fieldset": {
        borderColor: "primary.main",
      },
    },
    "& .MuiInputLabel-root": {
      color: "text.secondary",
      fontSize: "0.85rem",
      "&.Mui-focused": {
        color: "primary.main",
      },
    },
    "& .MuiOutlinedInput-input": {
      color: "white",
    },
  };

  const [localValue, setLocalValue] = useState(value);
  const [prevPropValue, setPrevPropValue] = useState(value);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  if (value !== prevPropValue) {
    setLocalValue(value);
    setPrevPropValue(value);
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (select) {
      onChange(e);
      return;
    }

    const newVal = e.target.value;
    const name = e.target.name;
    setLocalValue(newVal);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      onChange({
        target: { name, value: newVal },
      } as React.ChangeEvent<HTMLInputElement>);
    }, 400);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (!select && timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      onChange({
        target: { name, value: localValue },
      } as React.ChangeEvent<HTMLInputElement>);
    }
    if (onBlur) onBlur(e);
  };

  return (
    <TextField
      fullWidth
      label={label}
      name={name}
      value={select ? value : localValue}
      onChange={handleChange}
      placeholder={placeholder}
      type={!select ? type : undefined}
      select={select}
      error={error}
      helperText={helperText}
      onBlur={handleBlur}
      sx={[baseStyles, ...(Array.isArray(sx) ? sx : [sx])]}
      SelectProps={
        select
          ? {
              IconComponent: KeyboardArrowDownIcon,
              MenuProps: {
                PaperProps: {
                  sx: {
                    mt: 1,
                    bgcolor: "#1A202C",
                    backgroundImage: "none",
                    borderRadius: 2,
                    border: `1px solid ${theme.palette.divider_alpha.main_10}`,
                    boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.8)",
                    "& .MuiMenuItem-root": {
                      fontSize: "0.875rem",
                      py: 1,
                      px: 2,
                      transition: "all 0.2s ease",
                      "&:hover": {
                        bgcolor: theme.palette.primary._alpha.main_08,
                        color: "primary.main",
                      },
                      "&.Mui-selected": {
                        bgcolor: theme.palette.primary._alpha.main_12,
                        color: "primary.main",
                        fontWeight: 600,
                        "&:hover": {
                          bgcolor: theme.palette.primary._alpha.main_18,
                        },
                      },
                    },
                  },
                },
              },
            }
          : undefined
      }
      InputProps={
        !select
          ? {
              startAdornment: children ? (
                <InputAdornment position="start">{children}</InputAdornment>
              ) : undefined,
            }
          : undefined
      }
      disabled={disabled}
    >
      {select ? children : null}
    </TextField>
  );
};

export default CustomTextArea;
