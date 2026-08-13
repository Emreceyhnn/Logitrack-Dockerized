import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/app/lib/auth-middleware";
import { getDictionary } from "@/app/lib/language/language";
import { Box, Typography, Container, Card, CardContent } from "@mui/material";
import { LocalGasStation } from "@mui/icons-material";

export default async function FuelPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/en/auth/sign-in");
  }

  const { lang } = await params;
  const dict = await getDictionary(lang);

  return (
    <Box p={4} width="100%">
      <Container maxWidth="lg">
        <Box mb={4}>
          <Typography variant="h4" component="h1" fontWeight={800} color="text.primary" gutterBottom>
            {dict.fuel?.title || "Fuel Management"}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {dict.fuel?.pageSubtitle ||
              "Manage fuel logs, track consumption, and monitor vehicle efficiency."}
          </Typography>
        </Box>

        <Card sx={{ borderRadius: 4, boxShadow: 2 }}>
          <CardContent sx={{ textAlign: "center", py: 10 }}>
            <LocalGasStation sx={{ fontSize: 64, color: "text.secondary", mb: 2, opacity: 0.5 }} />
            <Typography variant="h5" fontWeight={600} gutterBottom>
              {dict.common?.comingSoon || "Coming Soon"}
            </Typography>
            <Typography variant="body2" color="text.secondary" maxWidth="sm" mx="auto">
              {dict.fuel?.comingSoonDescription ||
                "We are currently building the advanced fuel management module. This feature will allow you to track fuel consumption per vehicle, integrate with fuel cards, and generate efficiency reports."}
            </Typography>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
