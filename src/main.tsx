import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./index.css";
import "./i18n";
import { router } from "./app/router";
import { applyTheme, storedTheme } from "./lib/theme";
import { isSupabaseConfigured } from "./lib/supabase";
import { ConfigMissing } from "./app/ConfigMissing";

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
    },
  },
});

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    {isSupabaseConfigured ? (
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    ) : (
      <ConfigMissing />
    )}
  </React.StrictMode>,
);
