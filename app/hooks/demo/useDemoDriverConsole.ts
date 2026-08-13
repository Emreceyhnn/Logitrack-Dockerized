import { useQuery } from "@tanstack/react-query";
import type { DriverConsoleDashboard } from "@/app/lib/type/driverConsole";

async function fetchDemoDriverConsoleDashboard(): Promise<DriverConsoleDashboard> {
  const res = await fetch("/api/demo/driver-console/dashboard", { method: "GET" });
  if (!res.ok) {
    throw new Error(`[useDemoDriverConsole] fetch failed: ${res.status}`);
  }
  return res.json();
}

export function useDemoDriverConsole() {
  return useQuery<DriverConsoleDashboard>({
    queryKey: ["demo", "driver-console", "dashboard"],
    queryFn: fetchDemoDriverConsoleDashboard,
    staleTime: 1000 * 30,
    placeholderData: (previousData) => previousData,
  });
}
