/**
 * Shared zod-based query/body validation for API route handlers.
 *
 * Every route previously parsed `searchParams` by hand — `parseInt` without
 * NaN guards and `as SomeEnum` casts that let arbitrary strings reach Prisma.
 * This module centralises that: pagination is coerced safely (bad input falls
 * back to a default instead of NaN) and enum params are validated (unknown
 * values yield a 400 instead of silently hitting the database).
 */

import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";

/**
 * Collapses URLSearchParams into a plain object; repeated keys become arrays.
 * 
 * tr-URLSearchParams nesnesini düz bir nesneye dönüştürür
 * en-collapses URLSearchParams into a plain object
 * input (sp: URLSearchParams)
 * output (Record<string, string | string[]>)
 */
function searchParamsToObject(
  sp: URLSearchParams
): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  for (const key of new Set(sp.keys())) {
    const all = sp.getAll(key);
    out[key] = all.length > 1 ? all : all[0] ?? "";
  }
  return out;
}

export type QueryParseResult<T> =
  | { success: true; data: T }
  | { success: false; response: NextResponse };

/**
 * Validates a request's query string against `schema`. On failure returns a
 * ready-to-send 400 response; on success returns the typed, validated data.
 * 
 * tr-bir isteğin sorgu dizesini belirtilen şemaya göre doğrular
 * en-validates a request's query string against the given schema
 * input (req: NextRequest, schema: T)
 * output (QueryParseResult<z.infer<T>>)
 */
export function parseQueryParams<T extends z.ZodType>(
  req: NextRequest,
  schema: T
): QueryParseResult<z.infer<T>> {
  const result = schema.safeParse(
    searchParamsToObject(req.nextUrl.searchParams)
  );
  if (!result.success) {
    return {
      success: false,
      response: NextResponse.json(
        { error: "Invalid query parameters", details: result.error.flatten() },
        { status: 400 }
      ),
    };
  }
  return { success: true, data: result.data };
}

/**
 * Validates a JSON request body against `schema`. Returns a 400 response for
 * malformed JSON or schema violations.
 * 
 * tr-bir JSON istek gövdesini belirtilen şemaya göre doğrular
 * en-validates a JSON request body against the given schema
 * input (req: NextRequest, schema: T)
 * output (Promise<QueryParseResult<z.infer<T>>>)
 */
export async function parseJsonBody<T extends z.ZodType>(
  req: NextRequest,
  schema: T
): Promise<QueryParseResult<z.infer<T>>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return {
      success: false,
      response: NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }),
    };
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    return {
      success: false,
      response: NextResponse.json(
        { error: "Invalid request body", details: result.error.flatten() },
        { status: 400 }
      ),
    };
  }
  return { success: true, data: result.data };
}

/* ── Reusable field schemas ─────────────────────────────────────────────── */

/** 1-based page number; missing or invalid input falls back to 1. */
export const pageParam = z.coerce.number().int().min(1).catch(1);

/** Page size with a configurable default; capped at 100 to bound query cost. */
export const pageSizeParam = (def = 10) =>
  z.coerce.number().int().min(1).max(100).catch(def);

/**
 * Non-empty trimmed search term, or undefined when absent/blank. Capped at
 * 100 chars — a search box has no legitimate use for more, and an unbounded
 * length lets a caller push arbitrarily large `contains` scans at the DB.
 */
export const searchParam = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .optional()
  .catch(undefined);

/** "asc" | "desc" sort direction, optional. */
export const sortOrderParam = z.enum(["asc", "desc"]).optional();

/** Free-form sort field name, optional. */
export const sortFieldParam = z.string().trim().min(1).optional();

/** "true"/"false" flag → boolean, or undefined when the param is absent. */
export const boolParam = z
  .enum(["true", "false"])
  .transform((v) => v === "true")
  .optional();

/**
 * A single enum value coming from a query param (validated), or undefined.
 * `values` is a client-safe enum const object (e.g. from lib/type/enums).
 * 
 * tr-sorgu parametresinden gelen tek bir enum değerini doğrular
 * en-validates a single enum value coming from a query param
 * input (values: T)
 * output (z.ZodOptional<z.ZodNativeEnum<T>>)
 */
export function enumParam<T extends Record<string, string>>(values: T) {
  return z.nativeEnum(values).optional();
}

/**
 * One-or-many enum values from repeated query params (`?status=A&status=B`)
 * normalised to an array, with every entry validated. Undefined when absent.
 * 
 * tr-tekrarlanan sorgu parametrelerinden gelen enum değerlerini dizi olarak doğrular
 * en-validates one-or-many enum values from repeated query params as an array
 * input (values: T)
 * output (z.ZodOptional<z.ZodEffects<z.ZodUnion<[z.ZodNativeEnum<T>, z.ZodArray<z.ZodNativeEnum<T>>]>>>)
 */
export function enumArrayParam<T extends Record<string, string>>(values: T) {
  const inner = z.nativeEnum(values);
  return z
    .union([inner, z.array(inner)])
    .transform((v) => (Array.isArray(v) ? v : [v]))
    .optional();
}
