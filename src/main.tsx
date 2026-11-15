import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { registerSW } from "virtual:pwa-register";
import "./index.css";
import "./i18n";
import { router } from "./app/router";
import { applyTheme, storedTheme } from "./lib/theme";
import { isSupabaseConfigured } from "./lib/supabase";
import { ConfigMissing } from "./app/ConfigMissing";
import { queryPersister, shouldPersistQuery } from "./lib/offline/persist";

registerSW({ immediate: true });

applyTheme(storedTheme());

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (count, error) => {
        const code = (error as { code?: string } | null)?.code;
        if (code === "42501" || code === "PGRST116") return false;
        return count < 2;
      },
      refetchOnWindowFocus: false,
      // Keep cached data for a week so site screens work offline.
      gcTime: 7 * 24 * 60 * 60 * 1000,
      networkMode: "offlineFirst",
    },
    mutations: { networkMode: "offlineFirst" },
  },
});

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    {isSupabaseConfigured ? (
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister: queryPersister,
          maxAge: 7 * 24 * 60 * 60 * 1000,
          buster: "tiir-1",
          dehydrateOptions: { shouldDehydrateQuery: (q) => q.state.status === "success" && shouldPersistQuery(q.queryKey) },
        }}
      >
        <RouterProvider router={router} />
      </PersistQueryClientProvider>
    ) : (
      <ConfigMissing />
    )}
  </React.StrictMode>,
);
