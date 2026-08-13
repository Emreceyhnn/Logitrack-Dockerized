import DCDocumentsView from "@/app/components/driver-console/views/DCDocumentsView";
import type { DriverConsoleState } from "@/app/hooks/useDriverConsoleState";

export default function DCDocumentsTab({ state }: { state: DriverConsoleState }) {
  return <DCDocumentsView state={state} />;
}
