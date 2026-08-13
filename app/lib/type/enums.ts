/**
 * CLIENT-SAFE ENUMS & ENTITY TYPES
 * =================================
 * These enums and interfaces EXACTLY mirror the Prisma schema. They are defined
 * as plain TypeScript so they can be safely imported by both Server and Client
 * components without triggering Prisma's browser-side bundling error.
 *
 * Import rule:
 *   - Controllers / Server Actions   → import from "@prisma/client"
 *   - Everything else (UI, hooks)    → import from "@/app/lib/type/enums"
 *
 * Split across ./enums/ to keep each file focused and under ~400 lines.
 */

export * from "./enums/enums";
export * from "./enums/entities";
