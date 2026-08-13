import DCRouteView from "@/app/components/driver-console/views/DCRouteView";
import type { DriverConsoleState } from "@/app/hooks/useDriverConsoleState";

export default function DCRouteTab({ state }: { state: DriverConsoleState }) {
  return <DCRouteView state={state} />;
}
