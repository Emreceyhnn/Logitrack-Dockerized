"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Box,
  Stack,
  Typography,
  Button,
  Alert,
  TextField,
} from "@mui/material";
import {
  ArrowBack,
  MarkEmailReadOutlined,
  ErrorOutline,
} from "@mui/icons-material";
import { toast } from "sonner";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import { resendEmailVerification } from "@/app/lib/controllers/users/emailVerification";

export default function VerifyEmailView({
  verified,
  alreadyVerified,
  continueHref,
}: {
  verified: boolean;
  alreadyVerified: boolean;
  continueHref?: string | undefined;
}) {
  const dict = useDictionary();
  const params = useParams();
  const lang = typeof params?.lang === "string" ? params.lang : "en";

  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resent, setResent] = useState(false);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const result = await resendEmailVerification(email);
      if (result && "error" in result && result.error) {
        toast.error(result.error);
        return;
      }
      // The server answers identically whether or not the address exists, so
      // the UI stays just as vague.
      setResent(true);
      setEmail("");
    } catch {
      toast.error(
        dict.auth?.verifyEmailError || "Something went wrong. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (verified) {
    return (
      <Box>
        <Stack spacing={3}>
          <Alert
            icon={<MarkEmailReadOutlined fontSize="inherit" />}
            severity="success"
            sx={{ borderRadius: 2 }}
          >
            {alreadyVerified
              ? dict.auth?.emailAlreadyVerified ||
                "This email address is already verified."
              : dict.auth?.emailVerifiedSuccess ||
                "Your email address has been verified."}
          </Alert>
          <Button
            component={Link}
            href={continueHref ? `/${lang}${continueHref}` : `/${lang}/auth/sign-in`}
            variant="contained"
            fullWidth
            size="large"
            sx={{ py: 1.5, borderRadius: 2, textTransform: "none", fontWeight: 600 }}
          >
            {continueHref
              ? dict.auth?.continueToOnboarding || "Continue"
              : dict.auth?.continueToSignIn || "Continue to Sign In"}
          </Button>
        </Stack>
      </Box>
    );
  }

  if (resent) {
    return (
      <Box>
        <Stack spacing={3}>
          <Alert
            icon={<MarkEmailReadOutlined fontSize="inherit" />}
            severity="success"
            sx={{ borderRadius: 2 }}
          >
            {dict.auth?.verifyEmailResent ||
              "If that address needs verifying, we've sent a new link."}
          </Alert>
          <Typography variant="body2" color="text.secondary">
            {dict.auth?.verifyEmailResentHint ||
              "The link expires in 24 hours and can only be used once. Check your spam folder if it doesn't arrive."}
          </Typography>
          <Box textAlign="center">
            <Button
              component={Link}
              href={`/${lang}/auth/sign-in`}
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
        <Alert
          icon={<ErrorOutline fontSize="inherit" />}
          severity="error"
          sx={{ borderRadius: 2 }}
        >
          {dict.auth?.verifyEmailInvalid ||
            "This verification link is invalid or has expired."}
        </Alert>

        <Box>
          <Typography variant="h5" fontWeight={700} gutterBottom>
            {dict.auth?.verifyEmailResendTitle || "Request a new link"}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {dict.auth?.verifyEmailResendDescription ||
              "Enter your email address and we'll send you a new verification link."}
          </Typography>
        </Box>

        <form onSubmit={handleResend}>
          <Stack spacing={3}>
            <TextField
              fullWidth
              label={dict.auth?.emailAddress || "Email Address"}
              type="email"
              variant="outlined"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
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
                : dict.auth?.verifyEmailResendButton || "Send New Link"}
            </Button>
          </Stack>
        </form>

        <Box textAlign="center" mt={2}>
          <Button
            component={Link}
            href={`/${lang}/auth/sign-in`}
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
