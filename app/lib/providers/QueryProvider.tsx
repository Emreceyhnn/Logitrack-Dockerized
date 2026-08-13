"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { useState } from "react";

// Lazy-load devtools so they are NEVER included in the production JS bundle.
// `next/dynamic` with ssr:false produces a separate chunk that is only
// fetched when NODE_ENV === "development", keeping prod bundles lean.
const ReactQueryDevtools =
  process.env.NODE_ENV === "development"
    ? dynamic(
        () =>
          import("@tanstack/react-query-devtools").then(
            (mod) => mod.ReactQueryDevtools
          ),
        { ssr: false }
      )
    : () => null;

/**
 * tr-Uygulama genelinde React Query sağlayıcısını (provider) yapılandırır ve entegre eder
 * en-Configures and integrates the React Query provider across the application
 * input (props: { children: React.ReactNode })
 * output (JSX.Element)
 */
export default function QueryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
