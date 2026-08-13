/**
 * Controller Guard — eliminates the repetitive try-catch + log + rethrow
 * pattern that appears 60+ times across all controllers.
 *
 * Usage:
 *   return controllerGuard("createShipment", async () => { ... });
 */

import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { AppError, ConflictError, fromZodError } from "../../errors";
import { logger } from "@/app/lib/logger";


/**
 * tr-denetleyici (controller) işlemlerini sarar, hataları yakalar ve yapılandırılmış log/hata fırlatma işlemlerini yönetir
 * en-wraps a controller operation, catching errors, and handling structured logging/error throwing
 * input (operationName: string, fn: () => Promise<T>, options?: { fallback: T })
 * output (Promise<T>)
 */
export async function controllerGuard<T>(
  operationName: string,
  fn: () => Promise<T>,
  options?: { fallback: T }
): Promise<T> {
  try {
    return await fn();
  } catch (error: unknown) {
    // Next.js internal digest — must be re-thrown untouched
    if (
      error instanceof Error &&
      "digest" in error &&
      (error as { digest?: string }).digest === "DYNAMIC_SERVER_USAGE"
    ) {
      throw error;
    }

    // Graceful-degradation caller: log and return the fallback value.
    if (options) {
      logger.error(`[${operationName}] Failed, returning fallback:`, error);
      return options.fallback;
    }

    // Prisma unique constraint violations → structured ConflictError
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const target = (error.meta?.target as string[] | undefined)?.join(", ");
      const conflictError = new ConflictError(
        target
          ? `A record with this ${target} already exists.`
          : "A record with these values already exists."
      );
      logger.error(`[${operationName}] Unique constraint violation:`, target);
      throw conflictError;
    }

    // Zod validation failures → structured ValidationError
    if (error instanceof ZodError) {
      const issues = error.issues.map((i) => ({
        path: i.path.map((p) => String(p)),
        message: i.message,
      }));
      const validationError = fromZodError({ issues });
      logger.error(`[${operationName}] Validation failed:`, validationError.message);
      throw validationError;
    }

    // Known application errors — log and re-throw as-is
    if (error instanceof AppError) {
      logger.error(`[${operationName}] ${error.name}:`, error.message);
      throw error;
    }

    // Unknown errors — log full stack and re-throw
    logger.error(`[${operationName}] Unexpected error:`, error);
    throw error;
  }
}
