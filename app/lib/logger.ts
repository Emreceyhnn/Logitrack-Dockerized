/**
 * Centralized Application Logger
 * Provides structured JSON logging in production and readable formatting in development.
 * Automatically masks PII data.
 */

// PII fields to mask
const PII_KEYS = [
  "password",
  "token",
  "refreshToken",
  "accessToken",
  "email",
  "phone",
  "address",
  "secret",
  "cookie",
  "session",
];

/**
 * tr-Bir nesnedeki hassas alanları özyinelemeli olarak maskeler.
 * en-Recursively masks sensitive fields in an object.
 * input (
  obj: unknown,
  seen?: WeakSet<object>
)
 * output (unknown)
 */
function maskPII(obj: unknown, seen = new WeakSet()): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== "object") return obj;

  if (seen.has(obj)) return "[Circular]";
  seen.add(obj);

  if (Array.isArray(obj)) {
    return obj.map((item) => maskPII(item, seen));
  }

  const maskedObj: Record<string, unknown> = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      if (PII_KEYS.some((k) => key.toLowerCase().includes(k))) {
        maskedObj[key] = "***MASKED***";
      } else {
        maskedObj[key] = maskPII((obj as Record<string, unknown>)[key], seen);
      }
    }
  }
  return maskedObj;
}

/**
 * tr-Hata nesnelerinden serileştirme için kullanışlı bilgiler çıkarır.
 * en-Extracts useful info from Error objects for serialization
 * input (
  error: unknown
)
 * output (unknown)
 */
function formatError(error: unknown): unknown {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      ...(error as unknown as Record<string, unknown>),
    };
  }

  // Non-Error throwables (e.g. a WebSocket/ErrorEvent from the Neon driver)
  // carry their useful fields as prototype getters, so a plain `for...in`
  // spread over them serializes to `{}`. Pull the common ones explicitly.
  if (typeof ErrorEvent !== "undefined" && error instanceof ErrorEvent) {
    return {
      name: "ErrorEvent",
      message: error.message,
      type: error.type,
      error: error.error instanceof Error ? formatError(error.error) : error.error,
    };
  }
  if (typeof Event !== "undefined" && error instanceof Event) {
    return { name: "Event", type: error.type };
  }

  return error;
}

/**
 * tr-Günlük kaydı girişini oluşturur.
 * en-Builds a log entry.
 * input (
  level: "INFO" | "WARN" | "ERROR" | "DEBUG",
  message: string,
  meta?: unknown
)
 * output (object)
 */
function buildLogEntry(
  level: "INFO" | "WARN" | "ERROR" | "DEBUG",
  message: string,
  meta?: unknown
) {
  // Use crypto.randomUUID if available for correlation ID fallback
  let correlationId = "N/A";
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    correlationId = crypto.randomUUID();
  }

  const entry: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    level,
    message,
    correlationId,
  };

  if (meta !== undefined) {
    entry.meta = maskPII(formatError(meta));
  }

  return entry;
}

/**
 * tr-Uygulama için merkezi günlükleyici.
 * en-Centralized application logger.
 * input (none)
 * output (logger)
 */
export const logger = {
  info: (message: string, meta?: unknown) => {
    const entry = buildLogEntry("INFO", message, meta);
    if (process.env.NODE_ENV === "production") {
      console.log(JSON.stringify(entry));
    } else {
      console.log(`[INFO] ${message}`, meta ? entry.meta : "");
    }
  },
  warn: (message: string, meta?: unknown) => {
    const entry = buildLogEntry("WARN", message, meta);
    if (process.env.NODE_ENV === "production") {
      console.warn(JSON.stringify(entry));
    } else {
      console.warn(`[WARN] ${message}`, meta ? entry.meta : "");
    }
  },
  error: (messageOrError: string | unknown, meta?: unknown) => {
    let message = "";
    let actualMeta = meta;

    if (typeof messageOrError === "string") {
      message = messageOrError;
    } else if (messageOrError instanceof Error) {
      message = messageOrError.message;
      actualMeta = meta ?? messageOrError;
    } else {
      message = String(messageOrError);
      actualMeta = meta ?? messageOrError;
    }

    const entry = buildLogEntry("ERROR", message, actualMeta);
    if (process.env.NODE_ENV === "production") {
      console.error(JSON.stringify(entry));
    } else {
      console.error(`[ERROR] ${message}`, actualMeta ? entry.meta : "");
    }
  },
  debug: (message: string, meta?: unknown) => {
    if (process.env.NODE_ENV !== "production") {
      const entry = buildLogEntry("DEBUG", message, meta);
      console.debug(`[DEBUG] ${message}`, meta ? entry.meta : "");
    }
  },
};
