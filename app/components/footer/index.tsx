import { Box, Divider, Stack, Typography } from "@mui/material";
import { getDictionary } from "@/app/lib/language/language";

export default async function Footer({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  /* -------------------------------- VARIABLES ------------------------------- */
  const { lang } = await params;
  const dict = await getDictionary(lang);

  return (
    <Box
      component="footer"
      sx={{
        bgcolor: "background.paper",
        px: { xs: 3, md: 8 },
        py: 6,
      }}
    >
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={6}
        justifyContent="space-between"
      >
        <Stack spacing={1} maxWidth={300}>
          <Typography
            sx={{
              fontWeight: 800,
              fontSize: 24,
              letterSpacing: "-0.05em",
              textTransform: "uppercase",
            }}
          >
            {dict.common.logitrack}
          </Typography>
          <Typography color="text.secondary" fontSize={14}>
            {dict.footer.description}
          </Typography>
        </Stack>

        <Stack direction="row" spacing={8}>
          <Stack spacing={1}>
            <Typography fontWeight={600}>{dict.footer.product}</Typography>
            <Typography variant="body2" color="text.secondary">
              {dict.footer.features}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {dict.footer.pricing}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {dict.footer.roadmap}
            </Typography>
          </Stack>

          <Stack spacing={1}>
            <Typography fontWeight={600}>{dict.footer.company}</Typography>
            <Typography variant="body2" color="text.secondary">
              {dict.footer.about}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {dict.footer.blog}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {dict.footer.careers}
            </Typography>
          </Stack>

          <Stack spacing={1}>
            <Typography fontWeight={600}>{dict.footer.legal}</Typography>
            <Typography variant="body2" color="text.secondary">
              {dict.footer.privacyPolicy}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {dict.footer.termsOfService}
            </Typography>
          </Stack>
        </Stack>
      </Stack>

      <Divider sx={{ my: 4 }} />

      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        alignItems="center"
        spacing={2}
      >
        <Typography variant="body2" color="text.secondary">
          © {new Date().getFullYear()} {dict.common.logitrack}.{" "}
          {dict.footer.rights}
        </Typography>

        <Typography variant="body2" color="text.secondary">
          {dict.footer.builtFor}
        </Typography>
      </Stack>
    </Box>
  );
}
