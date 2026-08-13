-- AlterEnum
-- Postgres cannot use a newly added enum value in the same transaction that
-- adds it, so these values land in their own migration ahead of any code that
-- writes them. ALTER TYPE ... ADD VALUE is additive and non-blocking.
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'EMAIL_VERIFICATION_SENT';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'EMAIL_VERIFIED';
