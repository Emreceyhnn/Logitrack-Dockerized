"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";

// Return type intentionally left un-annotated (res.json() → any), mirroring the
// real fetchCompanyDashboard: the content component reads fields off `result`
// and casts them, and an explicit interface here trips exactOptionalPropertyTypes
// when the optional statsTrends is later assigned into CompanyPageData.
async function fetchDemoCompanyDashboard() {
  const res = await fetch("/api/demo/company/dashboard", {
    method: "GET",
  });

  if (!res.ok) {
    throw new Error(`[useDemoCompany] fetch failed: ${res.status}`);
  }

  return res.json();
}

// Demo-local mirror of useCompanyWithDashboard — reads the public mock
// endpoint. No mutations (the real deleteMember mutation is not re-exported).
export function useDemoCompanyWithDashboard() {
  return useQuery({
    queryKey: ["demo", "company", "dashboard"],
    queryFn: () => fetchDemoCompanyDashboard(),
    staleTime: 1000 * 60 * 5,
    placeholderData: keepPreviousData,
  });
}
