import { Box, Container, Typography } from "@mui/material";

export default function Playground() {
  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      <Box
        sx={{
          p: 4,
          borderRadius: 4,
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <Typography
          variant="h4"
          fontWeight={700}
          gutterBottom
          textAlign="center"
        >
          Route Optimizer Playground
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          textAlign="center"
          mb={4}
        >
          Strictly memoized Google Maps Directions API to prevent billing
          spikes.
        </Typography>
      </Box>
    </Container>
  );
}
