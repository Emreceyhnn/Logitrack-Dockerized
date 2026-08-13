"use client";

import { Box, Typography, TextField, Button, Stack, Alert } from "@mui/material";
import Link from "next/link";
import { useState } from "react";
import { ArrowBack, MarkEmailReadOutlined } from "@mui/icons-material";
import { toast } from "sonner";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import { requestPasswordReset } from "@/app/lib/controllers/users/passwordReset";

export default function ForgotPasswordPage() {
  const dict = useDictionary();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const result = await requestPasswordReset(email);
      if (result && "error" in result && result.error) {
        toast.error(result.error);
        return;
      }
      // The server answers identically whether or not the address is
      // registered, so the UI must stay just as vague — a distinct message
      // here would undo the enumeration protection behind it.
      setSent(true);
      setEmail("");
    } catch {
      toast.error(
        dict.auth?.resetLinkError || "Something went wrong. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (sent) {
    return (
      <Box>
        <Stack spacing={3}>
          <Alert
            icon={<MarkEmailReadOutlined fontSize="inherit" />}
            severity="success"
            sx={{ borderRadius: 2 }}
          >
            {dict.auth?.resetLinkSent ||
              "If an account exists for that address, we've sent a password reset link."}
          </Alert>
          <Typography variant="body2" color="text.secondary">
            {dict.auth?.resetLinkSentHint ||
              "The link expires in 60 minutes and can only be used once. Check your spam folder if it doesn't arrive."}
          </Typography>
          <Box textAlign="center">
            <Button
              component={Link}
              href="/en/auth/sign-in"
              startIcon={<ArrowBack />}
              sx={{ textTransform: "none", color: "text.secondary" }}
            >
              {dict.auth?.backToSignIn || "Back to Sign In"}
            </Button>
          </Box>
        </Stack>
      </Box>
    );
  }

  return (
    <Box>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4" fontWeight={800} gutterBottom>
            {dict.auth?.forgotPasswordTitle || "Forgot Password"}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {dict.auth?.forgotPasswordDescription ||
              "Enter your email address and we'll send you a link to reset your password."}
          </Typography>
        </Box>

        <form onSubmit={handleSubmit}>
          <Stack spacing={3}>
            <TextField
              fullWidth
              label={dict.auth?.emailAddress || "Email Address"}
              type="email"
              variant="outlined"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                },
              }}
            />

            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={isSubmitting}
              sx={{
                py: 1.5,
                borderRadius: 2,
                textTransform: "none",
                fontSize: 16,
                fontWeight: 600,
              }}
            >
              {isSubmitting
                ? dict.auth?.sending || "Sending..."
                : dict.auth?.sendResetLink || "Send Reset Link"}
            </Button>
          </Stack>
        </form>

        <Box textAlign="center" mt={2}>
          <Button
            component={Link}
            href="/en/auth/sign-in"
            startIcon={<ArrowBack />}
            sx={{ textTransform: "none", color: "text.secondary" }}
          >
            {dict.auth?.backToSignIn || "Back to Sign In"}
          </Button>
        </Box>
      </Stack>
    </Box>
  );
}
