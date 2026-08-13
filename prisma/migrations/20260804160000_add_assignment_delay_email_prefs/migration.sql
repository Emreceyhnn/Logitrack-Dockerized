-- AlterTable
-- Separate email opt-ins for NEW_ASSIGNMENT and DELAY_ALERT notifications.
-- Previously these categories were gated only by notifPushAssignment/notifPushDelay,
-- which the settings UI presents under "Real-Time Signals" (in-app), not "Email Channels".
-- Emailing off those toggles would let a user who disabled every email channel still
-- receive email, so these categories get their own email preferences instead.
-- Defaulting to true matches the existing notifEmailShipment/notifEmailMaint behaviour.
ALTER TABLE "users" ADD COLUMN     "notifEmailAssignment" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifEmailDelay" BOOLEAN NOT NULL DEFAULT true;
