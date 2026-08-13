import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/app/lib/auth-middleware";
import { getDictionary } from "@/app/lib/language/language";
import { Box, Typography, Container, Card, CardContent } from "@mui/material";
import { Group } from "@mui/icons-material";

export default async function UsersPage({
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
            {dict.users?.title || "User Management"}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {dict.users?.subtitle ||
              "Manage company users, roles, and access permissions."}
          </Typography>
        </Box>

        <Card sx={{ borderRadius: 4, boxShadow: 2 }}>
          <CardContent sx={{ textAlign: "center", py: 10 }}>
            <Group sx={{ fontSize: 64, color: "text.secondary", mb: 2, opacity: 0.5 }} />
            <Typography variant="h5" fontWeight={600} gutterBottom>
              {dict.common?.comingSoon || "Coming Soon"}
            </Typography>
            <Typography variant="body2" color="text.secondary" maxWidth="sm" mx="auto">
              {dict.users?.comingSoonDescription ||
                "The User Management module is currently under development. Soon you will be able to invite team members, assign specific roles (e.g. Dispatcher, Manager, Admin), and track user activity logs."}
            </Typography>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
