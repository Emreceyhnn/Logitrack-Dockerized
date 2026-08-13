-- Add FAILED and RETURNED to ShipmentStatus.
-- Failed deliveries and returns were previously unrepresentable; dispatchers
-- had to misuse CANCELLED, which corrupted on-time-delivery KPIs.
ALTER TYPE "ShipmentStatus" ADD VALUE IF NOT EXISTS 'FAILED';
ALTER TYPE "ShipmentStatus" ADD VALUE IF NOT EXISTS 'RETURNED';
