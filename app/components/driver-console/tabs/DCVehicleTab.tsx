import DCVehicleView from "@/app/components/driver-console/views/DCVehicleView";
import type { DriverConsoleState } from "@/app/hooks/useDriverConsoleState";

export default function DCVehicleTab({ state }: { state: DriverConsoleState }) {
  return <DCVehicleView state={state} />;
}
