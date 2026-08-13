"use client";

import AddVehicleDialog from "@/app/components/dialogs/vehicle/addVehicleDialog";
import EditVehicleDialog from "@/app/components/dialogs/vehicle/editVehicleDialog";
import VehicleDialog from "@/app/components/dialogs/vehicle/vehicleDetailsDialog";
import DeleteConfirmationDialog from "@/app/components/dialogs/deleteConfirmationDialog";
import AddTrailerDialog from "@/app/components/dialogs/vehicle/addTrailerDialog";
import EditTrailerDialog from "@/app/components/dialogs/vehicle/editTrailerDialog";
import TrailerAssignmentDialog from "@/app/components/dialogs/vehicle/trailerAssignmentDialog";
import { VehicleWithRelations } from "@/app/lib/type/vehicle";
import { TrailerWithRelations } from "@/app/lib/type/trailer";
import { Dictionary } from "@/app/lib/language/language";

interface VehicleDialogsProps {
  contentState: {
    dict: Dictionary;
    activeTab: number;
    addDialogOpen: boolean;
    setAddDialogOpen: (open: boolean) => void;
    editDialogOpen: boolean;
    setEditDialogOpen: (open: boolean) => void;
    deleteDialogOpen: boolean;
    setDeleteDialogOpen: (open: boolean) => void;
    actionVehicle: VehicleWithRelations | null;
    setActionVehicle: (vehicle: VehicleWithRelations | null) => void;
    addTrailerOpen: boolean;
    setAddTrailerOpen: (open: boolean) => void;
    editTrailerOpen: boolean;
    setEditTrailerOpen: (open: boolean) => void;
    assignTrailerOpen: boolean;
    setAssignTrailerOpen: (open: boolean) => void;
    actionTrailer: TrailerWithRelations | null;
    setActionTrailer: (trailer: TrailerWithRelations | null) => void;
    vehicles: VehicleWithRelations[] | null | undefined;
    state: { selectedVehicleId: string | null };
    actions: { selectVehicle: (vehicle: null) => void };
    handleAddSuccess: () => void;
    handleEditFormSuccess: () => void;
    handleDeleteConfirm: () => void;
    handleDialogDeleteSuccess: () => void;
    refreshAll: () => void;
    deleteMutation: { isPending: boolean };
    deleteTrailerMut: { isPending: boolean };
    tabFromUrl: string | null;
    selectedVehicle: VehicleWithRelations | null;
  };
}

export default function VehicleDialogs({ contentState }: VehicleDialogsProps) {
  const {
    dict,
    activeTab,
    addDialogOpen,
    setAddDialogOpen,
    editDialogOpen,
    setEditDialogOpen,
    deleteDialogOpen,
    setDeleteDialogOpen,
    actionVehicle,
    setActionVehicle,
    addTrailerOpen,
    setAddTrailerOpen,
    editTrailerOpen,
    setEditTrailerOpen,
    assignTrailerOpen,
    setAssignTrailerOpen,
    actionTrailer,
    setActionTrailer,
    vehicles,
    state,
    actions,
    handleAddSuccess,
    handleEditFormSuccess,
    handleDeleteConfirm,
    handleDialogDeleteSuccess,
    refreshAll,
    deleteMutation,
    deleteTrailerMut,
    tabFromUrl,
    selectedVehicle,
  } = contentState;

  return (
    <>
      <AddVehicleDialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} onSuccess={handleAddSuccess} />
      <AddTrailerDialog open={addTrailerOpen} onClose={() => setAddTrailerOpen(false)} onSuccess={refreshAll} />
      
      <EditTrailerDialog
         key={`edit-trailer-${actionTrailer?.id}`}
         open={editTrailerOpen}
         onClose={() => { setEditTrailerOpen(false); setActionTrailer(null); }}
         onSuccess={refreshAll}
         trailer={actionTrailer}
      />
      
      <TrailerAssignmentDialog open={assignTrailerOpen} onClose={() => setAssignTrailerOpen(false)} trailer={actionTrailer} />

      {selectedVehicle && (
        <VehicleDialog
          key={state.selectedVehicleId}
          open={!!state.selectedVehicleId}
          onClose={() => actions.selectVehicle(null)}
          vehicleData={vehicles?.find((v: VehicleWithRelations) => v.id === state.selectedVehicleId)}
          onUpdateSuccess={refreshAll}
          onDeleteSuccess={handleDialogDeleteSuccess}
          initialTab={tabFromUrl ? parseInt(tabFromUrl) : 0}
        />
      )}

      {actionVehicle && (
        <EditVehicleDialog
          key={`edit-vehicle-${actionVehicle.id}`}
          open={editDialogOpen}
          onClose={() => { setEditDialogOpen(false); setActionVehicle(null); }}
          onSuccess={handleEditFormSuccess}
          vehicle={actionVehicle}
        />
      )}

      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
        title={dict.common.confirmDelete}
        description={`${dict.common.deleteDocumentDesc || "Are you sure you want to delete this item?"} (${activeTab === 0 ? actionVehicle?.plate : actionTrailer?.plate})`}
        loading={activeTab === 0 ? deleteMutation.isPending : deleteTrailerMut.isPending}
      />
    </>
  );
}
