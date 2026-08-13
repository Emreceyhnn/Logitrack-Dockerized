import DCShipmentsView from "@/app/components/driver-console/views/DCShipmentsView";
import type { DriverConsoleState } from "@/app/hooks/useDriverConsoleState";

export default function DCShipmentsTab({ state }: { state: DriverConsoleState }) {
  return <DCShipmentsView state={state} />;
}
