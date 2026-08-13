import { useQuery } from "@tanstack/react-query";
import { driverConsoleKeys } from "@/app/lib/query-keys/driverConsole.keys";
import type { DriverConsoleDashboard } from "@/app/lib/type/driverConsole";

async function fetchDriverConsoleDashboard(): Promise<DriverConsoleDashboard> {
  const res = await fetch("/api/driver-console/dashboard", {
    method: "GET",
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error(`[useDriverConsole] fetch failed: ${res.status}`);
  }

  return res.json();
}

export function useDriverConsole() {
  return useQuery<DriverConsoleDashboard>({
    queryKey: driverConsoleKeys.dashboard(),
    queryFn: fetchDriverConsoleDashboard,
    staleTime: 1000 * 30,
    placeholderData: (previousData) => previousData,
  });
}
