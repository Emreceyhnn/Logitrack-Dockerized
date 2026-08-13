import Link from "next/link";
import { Suspense } from "react";
import { Box, Stack, Typography } from "@mui/material";
import SignUpStepper from "./register/signUpStepper";
import { getDictionary } from "@/app/lib/language/language";

export default async function RegisterForm({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  /* -------------------------------- VARIABLES ------------------------------- */
  const { lang } = await params;
  const dict = await getDictionary(lang);

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
        <Stack
          direction="row"
          spacing={3}
          mb={4}
          alignItems="center"
          justifyContent="center"
        >
          <Typography
            sx={{
              fontWeight: 600,
              fontSize: "24px",
              letterSpacing: "-0.02em",
              color: "#FFFFFF",
              position: "relative",
              "&::after": {
                content: '""',
                position: "absolute",
                bottom: -8,
                left: 0,
                width: "100%",
                height: 2,
                bgcolor: "#38bdf8",
                borderRadius: 2,
              },
            }}
          >
            {dict.auth.register}
          </Typography>

          <Link
            href={`/${lang}/auth/sign-in`}
            style={{ textDecoration: "none" }}
          >
            <Typography
              sx={{
                fontWeight: 500,
                fontSize: "24px",
                letterSpacing: "-0.02em",
                color: "rgba(255, 255, 255, 0.3)",
                transition: "color 0.2s ease",
                "&:hover": {
                  color: "rgba(255, 255, 255, 0.6)",
                },
              }}
            >
              {dict.auth.login}
            </Typography>
          </Link>
        </Stack>

        <Suspense fallback={null}>
          <SignUpStepper />
        </Suspense>
      </Box>
    </Box>
  );
}
