"use client";

import dynamic from "next/dynamic";
import { Box, Skeleton } from "@mui/material";

/**
 * Below-the-fold landing sections, loaded client-side only (`ssr: false`)
 * to keep the initial HTML and bundle small. Lives in its own client
 * component so the landing page itself can stay a Server Component.
 */
const SectionLoader = ({ height = 400 }: { height?: number }) => (
  <Box sx={{ width: "100%", height, display: "flex", alignItems: "center", justifyContent: "center" }}>
    <Skeleton variant="rectangular" width="100%" height="100%" sx={{ bgcolor: "rgba(255,255,255,0.02)" }} />
  </Box>
);

const SocialProof = dynamic(
  () => import("@/app/components/landing/SocialProof"),
  { ssr: false, loading: () => <SectionLoader height={160} /> }
);
const OperationsDashboard = dynamic(
  () => import("@/app/components/landing/OperationsDashboard"),
  { ssr: false, loading: () => <SectionLoader height={600} /> }
);
const FeaturesSection = dynamic(
  () => import("@/app/components/landing/FeaturesSection"),
  { ssr: false, loading: () => <SectionLoader height={800} /> }
);

export default function DeferredSections() {
  return (
    <>
      <SocialProof />
      <OperationsDashboard />
      <FeaturesSection />
    </>
  );
}
