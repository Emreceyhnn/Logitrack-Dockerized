/**
 * ADMIN CONSOLE — DELETION TYPES
 * ==============================
 * Client-safe types for the soft-delete, restore, and permanent-erase
 * surfaces.
 *
 * Deletion in this console defaults to SOFT: `deletedAt` is stamped and the
 * tenant-guard extension in db.ts hides the row from every read. Nothing is
 * erased, so the audit trail and the schema's `onDelete: Restrict` foreign
 * keys stay intact and every delete is reversible.
 *
 * The one exception is `hardDeleteUser`, reachable only from the restore
 * view for a user whose `deletedAt` is already set — a deliberate second
 * step that actually removes the row, irreversibly.
 */

export type DeletableEntity =
  | "user"
  | "company"
  | "vehicle"
  | "trailer"
  | "shipment"
  | "route"
  | "warehouse"
  | "customer"
  | "driver"
  | "inventory";

export interface DeletionResult {
  entity: DeletableEntity;
  id: string;
  /** ISO timestamp, or null after a restore. */
  deletedAt: string | null;
  label: string;
  /** Populated for companies: related records hidden alongside it. */
  cascadeSummary?: Record<string, number>;
}

export interface DeletedRecord {
  id: string;
  label: string;
  deletedAt: string;
}

/** The record a confirmation dialog is currently targeting. */
export interface DeletionTarget {
  entity: DeletableEntity;
  id: string;
  label: string;
}

export interface DeletionState {
  target: DeletionTarget | null;
  busy: boolean;
  error: string | null;
  /** Set briefly after a successful delete or restore, for the toast. */
  lastResult: DeletionResult | null;
}

export interface DeletionActions {
  requestDelete: (target: DeletionTarget) => void;
  cancelDelete: () => void;
  confirmDelete: (confirmLabel?: string) => Promise<void>;
  restore: (entity: DeletableEntity, id: string) => Promise<void>;
  hardDeleteUser: (id: string) => Promise<void>;
}

export interface RestorePageState {
  entity: DeletableEntity;
  rows: DeletedRecord[];
  loading: boolean;
  error: string | null;
  pendingId: string | null;
}
