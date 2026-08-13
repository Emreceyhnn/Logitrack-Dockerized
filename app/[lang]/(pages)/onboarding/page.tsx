"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Container,
  Card,
  CardContent,
  Button,
  Stack,
  CircularProgress,
  useTheme,
} from "@mui/material";
import { Business, AddBusiness, HomeRounded, RocketLaunch } from "@mui/icons-material";
import Link from "next/link";
import { useDictionary, useLanguage } from "@/app/lib/language/DictionaryContext";
import { formatMessage } from "@/app/lib/language/language";
import { getLocalizedPath } from "@/app/lib/language/navigation";
import CreateCompanyDialog from "@/app/components/dialogs/company/CreateCompanyDialog";
import JoinCompanyDialog from "@/app/components/dialogs/company/JoinCompanyDialog";
import { getMyJoinRequest, cancelJoinRequest } from "@/app/lib/controllers/joinRequests";
import { getMyInvitations, acceptExistingUserInvitation, declineExistingUserInvitation } from "@/app/lib/controllers/invitations";
import { checkAndSyncCompany, canCreateCompany, getEmailVerificationGate } from "./actions";
import { toast } from "sonner";
import Tooltip from "@mui/material/Tooltip";
import VerifyEmailGate from "@/app/components/dialogs/company/VerifyEmailGate";

export default function OnboardingPage() {
  const theme = useTheme();
  const dict = useDictionary();
  const { lang: locale } = useLanguage();

  const [isCreateCompanyOpen, setIsCreateCompanyOpen] = useState(false);
  const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false);
  const [checkingPending, setCheckingPending] = useState(true);
  const [canCreate, setCanCreate] = useState(false);
  const [needsEmailVerification, setNeedsEmailVerification] = useState(false);
  const [pendingRequest, setPendingRequest] = useState<{ id: string; companyName: string } | null>(null);
  const [pendingInvitations, setPendingInvitations] = useState<{ id: string; company: { name: string }; role: { name: string } }[]>([]);

  useEffect(() => {
    // Sequential, not parallel: checkAndSyncCompany may rotate the auth cookies
    // (refreshSession) when it finds a companyId the JWT doesn't have yet. Any
    // request already in flight with the old token would then hash to a session
    // row that no longer exists and fail. Only fetch the onboarding data once
    // we know no re-mint is happening.
    checkAndSyncCompany().then((hasCompany) => {
      if (hasCompany) {
        window.location.href = `/${locale}/overview`;
        return;
      }
      return Promise.all([
        getMyJoinRequest(),
        getMyInvitations(),
        canCreateCompany(),
        getEmailVerificationGate(),
      ])
        .then(([req, invs, createAllowed, verificationGate]) => {
          if (req) setPendingRequest({ id: req.id, companyName: req.company.name });
          if (invs) setPendingInvitations(invs);
          setCanCreate(createAllowed);
          setNeedsEmailVerification(verificationGate.needsVerification);
        })
        .finally(() => setCheckingPending(false));
    }).catch(() => setCheckingPending(false));
  }, [locale]);

  const handleAcceptInvitation = async (id: string) => {
    const loadingToast = toast.loading(dict.onboarding?.accepting || "Accepting...");
    try {
      await acceptExistingUserInvitation(id);
      toast.success(dict.onboarding?.invitationAccepted || "Invitation accepted!", { id: loadingToast });
      window.location.href = `/${locale}/overview`;
    } catch (err) {
      const e = err as Error;
      toast.error(e.message || dict.toasts.errorGeneric, { id: loadingToast });
    }
  };

  const handleDeclineInvitation = async (id: string) => {
    const loadingToast = toast.loading(dict.onboarding?.declining || "Declining...");
    try {
      await declineExistingUserInvitation(id);
      setPendingInvitations((prev) => prev.filter((inv) => inv.id !== id));
      toast.success(dict.onboarding?.invitationDeclined || "Invitation declined.", { id: loadingToast });
    } catch (err) {
      const e = err as Error;
      toast.error(e.message || dict.toasts.errorGeneric, { id: loadingToast });
    }
  };

  const handleCancelRequest = async () => {
    if (!pendingRequest) return;
    const id = pendingRequest.id;
    setPendingRequest(null);
    try {
      await cancelJoinRequest(id);
    } catch {
      toast.error(dict.toasts.errorGeneric);
    }
  };

  // The real "Request a Demo" surface is the contact page's form, tagged with
  // ?type=demo so the resulting DemoRequest row is typed DEMO instead of
  // CONTACT — same pattern the landing hero's CTA already uses.
  const requestDemoHref = `/${locale}${getLocalizedPath("/contact", locale)}?type=demo`;

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "background.default",
        py: 8,
        position: "relative",
      }}
    >
      <Button
        component={Link}
        href={`/${locale}?landing=true`}
        startIcon={<HomeRounded sx={{ fontSize: 18 }} />}
        sx={{
          position: "fixed",
          top: { xs: 12, sm: 20 },
          left: { xs: 12, sm: 20 },
          zIndex: 10,
          textTransform: "none",
          fontWeight: 700,
          fontSize: "0.8rem",
          borderRadius: "999px",
          px: 1.75,
          py: 0.5,
          color: "text.secondary",
        }}
      >
        {dict.common.backToHome || "Back to Home"}
      </Button>

      <Container maxWidth="md">
        <Box textAlign="center" mb={6}>
          <Typography variant="h3" fontWeight={800} gutterBottom>
            {formatMessage(
              dict.onboarding?.welcomeTitle || "Welcome to {name}",
              { name: dict.common.logitrack }
            )}
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            maxWidth="sm"
            mx="auto"
          >
            {dict.onboarding?.welcomeSubtitle ||
              "You have successfully registered your account. To proceed to the dashboard, you need to be associated with a company."}
          </Typography>
        </Box>

        {checkingPending ? (
          <Stack alignItems="center" py={6}>
            <CircularProgress size={32} />
          </Stack>
        ) : needsEmailVerification ? (
          <Card
            sx={{
              maxWidth: 480,
              mx: "auto",
              borderRadius: 4,
              border: `1px solid ${theme.palette.divider}`,
            }}
          >
            <VerifyEmailGate />
          </Card>
        ) : pendingRequest ? (
          <Card
            sx={{
              maxWidth: 480,
              mx: "auto",
              borderRadius: 4,
              border: `1px solid ${theme.palette.divider}`,
            }}
          >
            <CardContent sx={{ p: 4, textAlign: "center" }}>
              <Box
                sx={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  backgroundColor: theme.palette.secondary._alpha?.main_10 || "rgba(156, 39, 176, 0.1)",
                  color: theme.palette.secondary.main,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  mx: "auto",
                  mb: 3,
                }}
              >
                <Business fontSize="large" />
              </Box>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                {formatMessage(dict.onboarding.joinPendingTitle, { company: pendingRequest.companyName })}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                {formatMessage(dict.onboarding.joinPendingDescription, { company: pendingRequest.companyName })}
              </Typography>
              <Button variant="outlined" color="secondary" onClick={handleCancelRequest}>
                {dict.onboarding.cancelRequest}
              </Button>
            </CardContent>
          </Card>
        ) : pendingInvitations.length > 0 ? (
          <Stack spacing={4} alignItems="center">
            <Typography variant="h5" fontWeight={700}>
              {dict.onboarding?.pendingInvitations || "Pending Invitations"}
            </Typography>
            {pendingInvitations.map((invitation) => (
              <Card
                key={invitation.id}
                sx={{
                  width: "100%",
                  maxWidth: 480,
                  borderRadius: 4,
                  border: `1px solid ${theme.palette.divider}`,
                }}
              >
                <CardContent sx={{ p: 4, textAlign: "center" }}>
                  <Box
                    sx={{
                      width: 64,
                      height: 64,
                      borderRadius: "50%",
                      backgroundColor: theme.palette.success._alpha?.main_10 || "rgba(76, 175, 80, 0.1)",
                      color: theme.palette.success.main,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      mx: "auto",
                      mb: 3,
                    }}
                  >
                    <Business fontSize="large" />
                  </Box>
                  <Typography variant="h6" fontWeight={700} gutterBottom>
                    {dict.onboarding?.youHaveBeenInvited || "You have been invited!"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                    {formatMessage(
                      dict.onboarding?.invitedYouToJoinAs || "{company} has invited you to join as a {role}.",
                      { company: invitation.company.name, role: invitation.role.name }
                    )}
                  </Typography>
                  <Stack direction="row" spacing={2} justifyContent="center">
                    <Button variant="outlined" color="error" onClick={() => handleDeclineInvitation(invitation.id)}>
                      {dict.onboarding?.decline || "Decline"}
                    </Button>
                    <Button variant="contained" color="success" onClick={() => handleAcceptInvitation(invitation.id)}>
                      {dict.onboarding?.acceptInvitation || "Accept Invitation"}
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
        ) : (
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={4}
          justifyContent="center"
        >
          {/* Create Company — disabled without a live trial/plan; createCompany
              enforces the same check server-side, this just avoids letting
              someone fill out the whole dialog only to hit an error at the end. */}
          <Card
            sx={{
              flex: 1,
              borderRadius: 4,
              border: `1px solid ${theme.palette.divider}`,
              opacity: canCreate ? 1 : 0.6,
              transition: "transform 0.2s, box-shadow 0.2s, opacity 0.2s",
              "&:hover": canCreate
                ? {
                    transform: "translateY(-4px)",
                    boxShadow: theme.shadows[4],
                    borderColor: theme.palette.primary.main,
                  }
                : undefined,
            }}
          >
            <CardContent
              sx={{
                p: 4,
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                height: "100%",
              }}
            >
              <Box
                sx={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  backgroundColor: theme.palette.primary._alpha.main_10,
                  color: theme.palette.primary.main,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  mx: "auto",
                  mb: 3,
                }}
              >
                <AddBusiness fontSize="large" />
              </Box>
              <Typography variant="h5" fontWeight={700} gutterBottom>
                {dict.onboarding?.createTitle || "Create a New Company"}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mb: 4, flex: 1 }}
              >
                {dict.onboarding?.createDescription ||
                  "Register a new logistics or transport company. You will be set as the initial Administrator with full control."}
              </Typography>
              {canCreate ? (
                <Button
                  variant="contained"
                  size="large"
                  fullWidth
                  onClick={() => setIsCreateCompanyOpen(true)}
                  sx={{ borderRadius: 2, py: 1.5 }}
                >
                  {dict.onboarding?.createButton || "Create Company"}
                </Button>
              ) : (
                // No live trial/plan: createCompany would reject this anyway
                // (crud.ts re-checks hasAccess server-side), so send the user
                // straight to the real demo-request flow instead of a disabled
                // button that only explains itself on hover.
                <Tooltip
                  title={
                    dict.onboarding?.createRequiresAccess ||
                    "Creating a company requires an active plan or trial. Request a demo to get started, or join an existing company instead."
                  }
                >
                  <Button
                    component={Link}
                    href={requestDemoHref}
                    variant="contained"
                    size="large"
                    fullWidth
                    endIcon={<RocketLaunch />}
                    sx={{ borderRadius: 2, py: 1.5 }}
                  >
                    {dict.onboarding?.requestDemoButton || "Request a Demo"}
                  </Button>
                </Tooltip>
              )}
            </CardContent>
          </Card>

          {/* Join Company */}
          <Card
            sx={{
              flex: 1,
              position: "relative",
              borderRadius: 4,
              border: `1px solid ${theme.palette.divider}`,
              transition: "transform 0.2s, box-shadow 0.2s",
              "&:hover": {
                transform: "translateY(-4px)",
                boxShadow: theme.shadows[4],
                borderColor: theme.palette.secondary.main,
              },
            }}
          >
            <CardContent
              sx={{
                p: 4,
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                height: "100%",
              }}
            >
              <Box
                sx={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  backgroundColor:
                    theme.palette.secondary._alpha?.main_10 ||
                    "rgba(156, 39, 176, 0.1)",
                  color: theme.palette.secondary.main,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  mx: "auto",
                  mb: 3,
                }}
              >
                <Business fontSize="large" />
              </Box>
              <Typography variant="h5" fontWeight={700} gutterBottom>
                {dict.onboarding?.joinTitle || "Join an Existing Company"}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mb: 4, flex: 1 }}
              >
                {dict.onboarding?.joinDescription ||
                  "If your company already uses LogiTrack, you can request to join using an invite code or your company email."}
              </Typography>
              <Button
                variant="outlined"
                color="secondary"
                size="large"
                fullWidth
                onClick={() => setIsJoinDialogOpen(true)}
                sx={{
                  borderRadius: 2,
                  py: 1.5,
                  borderWidth: 2,
                }}
              >
                {dict.onboarding?.joinButton || "Join Company"}
              </Button>
            </CardContent>
          </Card>
        </Stack>
        )}
      </Container>

      <CreateCompanyDialog
        open={isCreateCompanyOpen}
        onClose={() => setIsCreateCompanyOpen(false)}
        onSuccess={(newLang?: string) => {
          setIsCreateCompanyOpen(false);
          // Land directly on the dashboard. A full navigation (not client
          // router) is intentional: creating the company changes companyId, so
          // the proxy must re-mint the token on the next request for the
          // dashboard's tenant-scoped queries to resolve.
          window.location.href = `/${newLang || locale}/overview`;
        }}
      />

      <JoinCompanyDialog
        open={isJoinDialogOpen}
        onClose={() => setIsJoinDialogOpen(false)}
        onSuccess={(result) => {
          setIsJoinDialogOpen(false);
          setPendingRequest(result);
        }}
      />
    </Box>
  );
}
