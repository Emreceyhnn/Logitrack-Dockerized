"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

export interface TableParamsOptions {
  defaultPageSize?: number;
  defaultSortField?: string;
  defaultSortOrder?: "asc" | "desc";
}

export function useTableParams(options?: TableParamsOptions) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const page = Number(searchParams.get("page")) || 1;
  const pageSize =
    Number(searchParams.get("pageSize")) || options?.defaultPageSize || 10;
  const search = searchParams.get("search") || "";
  const sortField =
    searchParams.get("sortBy") || options?.defaultSortField || "";
  const sortOrder =
    (searchParams.get("sortOrder") as "asc" | "desc") ||
    options?.defaultSortOrder ||
    "asc";

  const getArrayFilter = useCallback(
    (key: string): string[] => {
      return searchParams.getAll(key);
    },
    [searchParams]
  );

  const getFilter = useCallback(
    (key: string): string | undefined => {
      return searchParams.get(key) || undefined;
    },
    [searchParams]
  );

  const updateParams = useCallback(
    (
      updates: Record<string, string | string[] | number | undefined | null>,
      replace = true
    ) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, value]) => {
        if (value === undefined || value === null || value === "") {
          params.delete(key);
        } else if (Array.isArray(value)) {
          params.delete(key);
          if (value.length > 0) {
            value.forEach((v) => params.append(key, String(v)));
          }
        } else {
          params.set(key, String(value));
        }
      });

      const newUrl = `${pathname}?${params.toString()}`;
      if (replace) {
        router.replace(newUrl, { scroll: false });
      } else {
        router.push(newUrl, { scroll: false });
      }
    },
    [pathname, router, searchParams]
  );

  const setPage = useCallback(
    (newPage: number) => {
      updateParams({ page: newPage });
    },
    [updateParams]
  );

  const setPageSize = useCallback(
    (newPageSize: number) => {
      updateParams({ pageSize: newPageSize, page: 1 });
    },
    [updateParams]
  );

  const setSearch = useCallback(
    (newSearch: string) => {
      updateParams({ search: newSearch, page: 1 }, true);
    },
    [updateParams]
  );

  const setSort = useCallback(
    (field: string, order?: "asc" | "desc") => {
      let newOrder = order;
      if (!newOrder) {
        if (sortField === field) {
          newOrder = sortOrder === "asc" ? "desc" : "asc";
        } else {
          newOrder = "asc";
        }
      }
      updateParams({ sortBy: field, sortOrder: newOrder, page: 1 });
    },
    [sortField, sortOrder, updateParams]
  );

  const setFilter = useCallback(
    (key: string, value: string | string[] | undefined) => {
      updateParams({ [key]: value, page: 1 }, true);
    },
    [updateParams]
  );

  const clearAllFilters = useCallback(
    (keysToClear: string[]) => {
      const updates: Record<string, undefined> = {};
      keysToClear.forEach((key) => {
        updates[key] = undefined;
      });

      updateParams({ ...updates, search: undefined, page: 1 }, false);
    },
    [updateParams]
  );

  return {
    page,
    pageSize,
    search,
    sortField,
    sortOrder,
    getFilter,
    getArrayFilter,
    setPage,
    setPageSize,
    setSearch,
    setSort,
    setFilter,
    clearAllFilters,
    updateParams,
  };
}
