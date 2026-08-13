import Link from "next/link";
import { Box, Stack, Typography } from "@mui/material";
import { getDictionary } from "@/app/lib/language/language";
import { getInvitationByToken } from "@/app/lib/controllers/invitations";
import AcceptInviteFormClient from "./acceptInvite/acceptInviteFormClient";

export default async function AcceptInviteForm({
  params,
  token,
}: {
  params: Promise<{ lang: string }>;
  token: string | undefined;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang);

  const invitation = token ? await getInvitationByToken(token) : { error: "Missing invitation token." };

  return (
    <Box
      maxWidth={{ sm: 420, xs: "95%" }}
      width={"100%"}
      bgcolor={"rgba(8, 12, 24, 0.75)"}
      sx={{
        backdropFilter: "blur(25px)",
        border: "1px solid rgba(56, 189, 248, 0.15)",
        boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.8)",
      }}
      borderRadius={"24px"}
    >
      <Box p={{ xs: "30px", sm: "50px" }}>
        <Stack spacing={1} mb={4} alignItems="center" textAlign="center">
          <Typography
            sx={{
              fontWeight: 600,
              fontSize: "24px",
              letterSpacing: "-0.02em",
              color: "#FFFFFF",
            }}
          >
            {dict.company.dialogs.inviteByEmail}
          </Typography>
        </Stack>

        {"error" in invitation ? (
          <Stack spacing={2} alignItems="center" textAlign="center">
            <Typography sx={{ color: "rgba(255,255,255,0.7)" }}>{invitation.error}</Typography>
            <Link href={`/${lang}/auth/sign-in`} style={{ color: "#38bdf8" }}>
              {dict.auth.login}
            </Link>
          </Stack>
        ) : (
          <AcceptInviteFormClient
            token={token as string}
            email={invitation.email}
            companyName={invitation.companyName}
            lang={lang}
          />
        )}
      </Box>
    </Box>
  );
}
