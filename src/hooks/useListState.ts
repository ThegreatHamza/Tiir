import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { DEFAULT_PAGE_SIZE, PAGE_SIZES, parseSort, serializeSort, type ListParams, type SortState } from "@/lib/list";

/** List state (search, filters, sort, page) kept in the URL so it survives reloads and can be shared. */
export function useListState(defaultSort: SortState = null) {
  const [params, setParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState(params.get("q") ?? "");

  const state: ListParams = useMemo(() => {
    const filters: Record<string, string> = {};
    params.forEach((v, k) => {
      if (k.startsWith("f_") && v) filters[k.slice(2)] = v;
    });
    const size = Number(params.get("size"));
    return {
      q: params.get("q") ?? "",
      page: Math.max(1, Number(params.get("page")) || 1),
      pageSize: (PAGE_SIZES as readonly number[]).includes(size) ? size : DEFAULT_PAGE_SIZE,
      sort: params.has("sort") ? parseSort(params.get("sort")) : defaultSort,
      filters,
      showDeleted: params.get("deleted") === "1",
    };
  }, [params, defaultSort]);

  const update = useCallback(
    (mutate: (p: URLSearchParams) => void, resetPage = true) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          mutate(next);
          if (resetPage) next.delete("page");
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  // Debounce the search box.
  useEffect(() => {
    const id = window.setTimeout(() => {
      if (searchInput !== state.q) update((p) => (searchInput ? p.set("q", searchInput) : p.delete("q")));
    }, 300);
    return () => window.clearTimeout(id);
  }, [searchInput, state.q, update]);

  return {
    state,
    searchInput,
    setSearchInput,
    setPage: (page: number) => update((p) => (page > 1 ? p.set("page", String(page)) : p.delete("page")), false),
    setPageSize: (size: number) => update((p) => p.set("size", String(size))),
    setSort: (sort: SortState) =>
      update((p) => {
        const s = serializeSort(sort);
        if (s) p.set("sort", s);
        else p.set("sort", "");
      }),
    setFilter: (key: string, value: string) => update((p) => (value ? p.set(`f_${key}`, value) : p.delete(`f_${key}`))),
    setShowDeleted: (on: boolean) => update((p) => (on ? p.set("deleted", "1") : p.delete("deleted"))),
    clearFilters: () =>
      update((p) => {
        [...p.keys()].filter((k) => k.startsWith("f_") || k === "q" || k === "deleted").forEach((k) => p.delete(k));
        setSearchInput("");
      }),
  };
}

export type ListStateApi = ReturnType<typeof useListState>;
