import { Stack, Typography } from "@mui/material";
import type { Issue, MaintenanceRecord } from "@/app/lib/type/enums";
import { IssueStatus, VehicleStatus } from "@/app/lib/type/enums";
import { VehicleWithRelations } from "@/app/lib/type/vehicle";
import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import ReportIssueDialog from "../reportIssueDialog";
import MaintenanceRecordDialog from "../maintenanceRecordDialog";
import MaintenanceDetailDialog from "../maintenanceDetailDialog";
import IssueDetailDialog from "../issueDetailDialog";
import { updateVehicleStatus } from "@/app/lib/controllers/vehicle";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import { logger } from "@/app/lib/logger";

import { VehicleStatusCard } from "./VehicleStatusCard";
import { OpenIssuesCard } from "./OpenIssuesCard";
import { MaintenanceHistoryCard } from "./MaintenanceHistoryCard";

interface MaintenanceTabProps {
  vehicle?: VehicleWithRelations | undefined;
  onUpdate?: (() => void) | undefined;
}

const MaintenanceTab = ({ vehicle, onUpdate }: MaintenanceTabProps) => {
  const dict = useDictionary();
  const pathname = usePathname();
  const isDemo = pathname?.includes("/demo");
  const scrollRef = useRef<HTMLDivElement>(null);

  /* --------------------------------- states --------------------------------- */
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [maintenanceDialogOpen, setMaintenanceDialogOpen] = useState(false);
  const [maintenanceDetailOpen, setMaintenanceDetailOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<MaintenanceRecord | null>(null);
  const [issueDetailOpen, setIssueDetailOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);

  /* -------------------------------- effects --------------------------------- */
  useEffect(() => {
    if (scrollRef.current) {
      // Use a small timeout to ensure DOM is fully rendered before scrolling
      const timer = setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 100);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [vehicle?.maintenanceRecords]);

  if (!vehicle) {
    return <Typography color="text.secondary">{dict.common.noData}</Typography>;
  }

  /* -------------------------------- handlers -------------------------------- */
  const handleUpdate = () => {
    onUpdate?.();
  };

  const handleIssueClick = (issue: Issue) => {
    setSelectedIssue(issue);
    setIssueDetailOpen(true);
  };

  const handleVehicleStatusChange = async (newStatus: VehicleStatus) => {
    // Authenticated action — in the demo it would bounce the visitor to sign-in.
    if (isDemo) {
      toast.info(dict.toasts.demoActionDisabled);
      return;
    }
    try {
      await updateVehicleStatus(vehicle.id, newStatus);
      handleUpdate();
    } catch (error) {
      logger.error("Failed to update vehicle status:", error);
    }
  };

  /* -------------------------------- variables ------------------------------- */
  const maintenanceHistory = (vehicle.maintenanceRecords || []).slice(-10);
  const openIssues =
    vehicle.issues?.filter(
      (i) =>
        i.status === IssueStatus.OPEN || i.status === IssueStatus.IN_PROGRESS
    ) || [];

  return (
    <Stack spacing={2}>
      <Stack spacing={2} direction={"row"} justifyContent={"space-between"}>
        <VehicleStatusCard
          vehicle={vehicle}
          handleVehicleStatusChange={handleVehicleStatusChange}
        />
        <OpenIssuesCard
          openIssues={openIssues}
          setReportDialogOpen={setReportDialogOpen}
          handleIssueClick={handleIssueClick}
        />
      </Stack>
      <Stack sx={{ flex: 1, minHeight: 0 }}>
        <MaintenanceHistoryCard
          maintenanceHistory={maintenanceHistory}
          scrollRef={scrollRef}
          setMaintenanceDialogOpen={setMaintenanceDialogOpen}
          setSelectedRecord={setSelectedRecord}
          setMaintenanceDetailOpen={setMaintenanceDetailOpen}
        />
      </Stack>

      {/* Report Issue Dialog */}
      <ReportIssueDialog
        open={reportDialogOpen}
        onClose={() => setReportDialogOpen(false)}
        onSuccess={handleUpdate}
        vehicleId={vehicle.id}
        vehiclePlate={vehicle.plate}
      />

      {/* Maintenance Record Dialog */}
      <MaintenanceRecordDialog
        open={maintenanceDialogOpen}
        onClose={() => setMaintenanceDialogOpen(false)}
        onSuccess={handleUpdate}
        vehicleId={vehicle.id}
      />

      {/* Issue Detail Dialog */}
      <IssueDetailDialog
        open={issueDetailOpen}
        onClose={() => setIssueDetailOpen(false)}
        issue={selectedIssue}
        onUpdate={handleUpdate}
      />
      {/* Maintenance Detail Dialog */}
      <MaintenanceDetailDialog
        open={maintenanceDetailOpen}
        onClose={() => {
          setMaintenanceDetailOpen(false);
          setSelectedRecord(null);
        }}
        record={selectedRecord}
        onSuccess={handleUpdate}
      />
    </Stack>
  );
};

export default MaintenanceTab;
