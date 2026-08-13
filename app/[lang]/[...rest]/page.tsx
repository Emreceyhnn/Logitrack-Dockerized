import { notFound } from "next/navigation";

/**
 * Catch-all for unmatched paths under /[lang]. Without this, unknown URLs
 * fall through to the root not-found page, which renders outside the
 * [lang] layout — no dictionary, no theme. Triggering notFound() here keeps
 * the 404 inside the localized, themed layout.
 */
export default function CatchAllNotFound() {
  notFound();
}
