import { styled } from "@mui/material/styles";
import TextField from "@mui/material/TextField";

export const StyledTextFieldAuth = styled(TextField)(() => ({
  "& .MuiOutlinedInput-root": {
    height: 49,
    borderRadius: 8,
    backgroundColor: "#1F1F1F",
    opacity: 0.4,
    boxShadow: "0px 4px 16px rgba(22, 22, 22, 0.08)",

    "& fieldset": {
      borderColor: "#38bdf8",
      borderWidth: 1,
    },

    "&:hover fieldset": {
      borderColor: "#38bdf8",
    },

    "&.Mui-focused": {
      opacity: 1,
    },

    "&.Mui-focused fieldset": {
      borderColor: "#38bdf8",
      borderWidth: 1,
    },
  },

  "& .MuiInputBase-input": {
    padding: "14px 18px",
    fontFamily: "Poppins",
    fontSize: 14,
    lineHeight: "21px",
    letterSpacing: "-0.02em",
    color: "#FFFFFF",
  },

  "& input::placeholder": {
    color: "#FFFFFF",
    opacity: 0.6,
  },
}));

export const StyledTextField = styled(TextField)(({ theme }) => ({
  "& .MuiOutlinedInput-root": {
    height: 49,
    borderRadius: 8,
    backgroundColor: theme.palette.background.paper,
    opacity: 0.4,
    boxShadow: "0px 4px 16px rgba(22, 22, 22, 0.08)",

    "& fieldset": {
      borderColor: theme.palette.primary.main,
      borderWidth: 1,
    },

    "&:hover fieldset": {
      borderColor: theme.palette.primary.main,
    },

    "&.Mui-focused": {
      opacity: 1,
    },

    "&.Mui-focused fieldset": {
      borderColor: theme.palette.secondary.main,
      borderWidth: 1,
    },
  },

  "& .MuiInputBase-input": {
    padding: "14px 18px",
    fontFamily: "Poppins",
    fontSize: 14,
    lineHeight: "21px",
    letterSpacing: "-0.02em",
    color: theme.palette.text.primary,
  },

  "& input::placeholder": {
    color: theme.palette.text.primary,
    opacity: 0.6,
  },
}));
