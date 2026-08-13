import DCDashboardView from "@/app/components/driver-console/views/DCDashboardView";
import type { DriverConsoleState } from "@/app/hooks/useDriverConsoleState";

export default function DCDashboardTab({ state }: { state: DriverConsoleState }) {
  return <DCDashboardView state={state} />;
}
