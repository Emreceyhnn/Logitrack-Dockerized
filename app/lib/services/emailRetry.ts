import { logger } from "@/app/lib/logger";

/**
 * Retry policy for outbound email.
 *
 * Resend fails in two very different ways and they must not be treated alike:
 *
 *   - Transient (429 rate limit, 5xx, network reset): the same request would
 *     likely succeed a moment later, so retrying is correct.
 *   - Permanent (422 invalid address, 403 unverified domain, 401 bad key):
 *     retrying burns quota and delays the caller for a result that cannot
 *     change. These fail immediately.
 *
 * Retries are in-process and bounded: this runs inside a serverless request,
 * so a long backoff would just hit the function timeout. Three attempts over
 * roughly 1.8s covers the overwhelming majority of transient rate-limit blips
 * without holding a request open.
 */

const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 300;

/**
 * Resend enforces 10 requests/second (`ratelimit-policy: 10;w=1`). Batch senders
 * fan out with Promise.all, so a company with 60 drivers would fire 60 requests
 * at once and have most of them rejected with 429 — and because every retry
 * lands in the same one-second window, backoff alone cannot recover them.
 *
 * This gate serialises outbound sends to a fixed minimum spacing, which keeps
 * the burst under the published limit instead of relying on retries to mop up
 * self-inflicted rate limiting. Headroom is deliberate: the limit is per
 * account, so concurrent serverless invocations share it.
 */
const MAX_SENDS_PER_SECOND = 8;
const MIN_SEND_SPACING_MS = Math.ceil(1000 / MAX_SENDS_PER_SECOND);

/**
 * Tail of the send queue. Each caller chains onto it, so sends leave in order
 * with at least MIN_SEND_SPACING_MS between them. Module-scoped: within one
 * serverless invocation every sender shares the same gate.
 */
let sendChain: Promise<void> = Promise.resolve();

/**
 * tr-Giden gönderimleri hız sınırının altında tutmak için sıraya alır.
 *    Her çağrı bir öncekinin ardına eklenir ve aralarında sabit bir boşluk bırakılır.
 * en-Queues outbound sends so they stay under the provider's rate limit. Each caller chains
 *    onto the previous one with a fixed minimum spacing between releases.
 * input ()
 * output (Promise<void>) — resolves when the caller may send
 */
function acquireSendSlot(): Promise<void> {
  const wait = sendChain.then(
    () => new Promise<void>((resolve) => setTimeout(resolve, MIN_SEND_SPACING_MS))
  );
  // Keep the chain alive even if a caller rejects, so one failure cannot
  // wedge the queue for every subsequent send.
  sendChain = wait.catch(() => {});
  return wait;
}

/** HTTP statuses worth a retry. Everything else is a permanent decision. */
const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

const RETRYABLE_NAMES = new Set([
  "rate_limit_exceeded",
  "internal_server_error",
  "application_error",
]);

export interface ResendLikeError {
  name?: string | undefined;
  message?: string | undefined;
  statusCode?: number | undefined;
}

/**
 * tr-Bir hatanın yeniden denemeye değer (geçici) olup olmadığını belirler.
 *    Adres/alan adı/anahtar hataları kalıcıdır ve tekrar denemek kotayı boşa harcar.
 * en-Decides whether an error is transient and therefore worth retrying.
 *    Address/domain/key errors are permanent — retrying them only burns quota.
 * input (error: unknown)
 * output (boolean)
 */
export function isRetryableEmailError(error: unknown): boolean {
  if (!error) return false;

  const candidate = error as ResendLikeError;

  if (typeof candidate.statusCode === "number") {
    return RETRYABLE_STATUS.has(candidate.statusCode);
  }
  if (candidate.name && RETRYABLE_NAMES.has(candidate.name)) return true;

  // Network-level failures surface as plain Error with no status attached.
  const message = (candidate.message ?? String(error)).toLowerCase();
  return (
    message.includes("etimedout") ||
    message.includes("econnreset") ||
    message.includes("socket hang up") ||
    message.includes("network") ||
    message.includes("fetch failed") ||
    message.includes("rate limit") ||
    message.includes("too many requests")
  );
}

/**
 * tr-Belirtilen gönderim işlemini geçici hatalarda üstel bekleme (jitter'lı) ile yeniden dener.
 *    Kalıcı hatalarda ilk denemede durur. Tüm denemeler tükenirse son hatayı fırlatır — böylece
 *    çağıran, kaybın sessizce yutulması yerine kararı kendi verir.
 * en-Retries the given send operation on transient failures using exponential backoff with
 *    jitter, and stops immediately on permanent ones. If every attempt is exhausted it rethrows
 *    the last error, so the caller decides what a permanent loss means rather than having it
 *    silently swallowed here.
 * input (operation: () => Promise<T>, context: string)
 * output (Promise<T>)
 */
export async function withEmailRetry<T>(
  operation: () => Promise<T>,
  context: string
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      // Throttle every attempt, not just the first: retries are themselves
      // requests and must respect the same limit.
      await acquireSendSlot();
      return await operation();
    } catch (error) {
      lastError = error;

      if (!isRetryableEmailError(error) || attempt === MAX_ATTEMPTS) {
        throw error;
      }

      // Exponential backoff with jitter: without jitter, a burst of sends that
      // all hit the same 429 would retry in lockstep and trip the limit again.
      const backoff = BASE_DELAY_MS * 2 ** (attempt - 1);
      const delay = backoff + Math.floor(Math.random() * BASE_DELAY_MS);

      logger.warn(
        `[email] ${context} attempt ${attempt}/${MAX_ATTEMPTS} failed with a transient error; ` +
          `retrying in ${delay}ms. Reason: ${
            error instanceof Error ? error.message : String(error)
          }`
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
