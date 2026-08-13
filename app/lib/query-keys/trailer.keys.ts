import { TrailerFilters } from "@/app/lib/type/trailer";

export const trailerKeys = {
  all: ["trailers"] as const,
  lists: () => [...trailerKeys.all, "list"] as const,
  list: (filters: TrailerFilters) => [...trailerKeys.lists(), { filters }] as const,
  details: () => [...trailerKeys.all, "detail"] as const,
  detail: (id: string) => [...trailerKeys.details(), id] as const,
  kpis: () => [...trailerKeys.all, "kpis"] as const,
  assignments: (trailerId: string) => [...trailerKeys.detail(trailerId), "assignments"] as const,
};
