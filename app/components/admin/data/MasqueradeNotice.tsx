"use client";

import { Box, Stack, Typography, useTheme, alpha } from "@mui/material";
import { UserRoundX } from "lucide-react";
import { useDictionary } from "@/app/lib/language/DictionaryContext";

/**
 * tr-Masquerade özelliğinin neden uygulanmadığını açıklar.
 * en-Explains why "sign in as this user" is absent.
 *
 *    This is a deliberate omission, not an oversight. `SessionJWTPayload` in
 *    `controllers/session/internal.ts` carries no impersonation claim, and
 *    `generateAccessToken` hardcodes the claim set. A masquerade token minted
 *    with the existing helpers would therefore be byte-for-byte a normal login:
 *      - the audit trail would attribute the impersonated user's actions to
 *        them, with no link back to the admin who performed them;
 *      - the app shell could not show an "impersonating" banner, so an admin
 *        could forget they were still in someone else's account;
 *      - the token could not be revoked separately from the user's own session.
 *    Shipping that would trade a support convenience for an unattributable
 *    audit log, which is the opposite of what an admin console is for.
 *
 *    Rendered inside the Users screen so the capability's absence is visible
 *    where an operator would look for it.
 * input ()
 * output (JSX.Element)
 */
export default function MasqueradeNotice() {
  const theme = useTheme();
  const dict = useDictionary();
  const t = dict.admin.data.masquerade;

  return (
    <Box
      sx={{
        mt: 4,
        p: 2.5,
        borderRadius: 3,
        border: `1px dashed ${theme.palette.divider}`,
        backgroundColor: alpha(theme.palette.kpi.amber, 0.04),
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="flex-start">
        <Box
          sx={{
            width: 30,
            height: 30,
            borderRadius: 1.5,
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
            color: theme.palette.kpi.amber,
            backgroundColor: alpha(theme.palette.kpi.amber, 0.12),
          }}
        >
          <UserRoundX size={16} />
        </Box>

        <Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography sx={{ fontSize: 13.5, fontWeight: 700 }}>
              {t.title}
            </Typography>
            <Box
              component="span"
              sx={{
                fontSize: 10,
                fontWeight: 700,
                px: 0.75,
                py: 0.2,
                borderRadius: 0.75,
                color: theme.palette.text.secondary,
                border: `1px solid ${theme.palette.divider}`,
              }}
            >
              {t.unavailable}
            </Box>
          </Stack>

          <Typography
            sx={{
              fontSize: 12.5,
              color: theme.palette.text.secondary,
              mt: 0.75,
              lineHeight: 1.65,
              maxWidth: 760,
            }}
          >
            {t.body}
          </Typography>
        </Box>
      </Stack>
    </Box>
  );
}
