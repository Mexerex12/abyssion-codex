import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { supabase } from "@/integrations/supabase/client";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center corner-frame p-10">
        <p className="hud-label">404</p>
        <h1 className="mt-4 text-display text-4xl font-bold text-foreground">Documento não localizado</h1>
        <div className="mt-8">
          <Link
            to="/"
            className="inline-flex items-center justify-center border border-cyan/40 bg-cyan/10 px-5 py-2 text-mono text-xs uppercase tracking-[0.18em] text-cyan transition-colors hover:bg-cyan hover:text-cyan-foreground"
          >
            Voltar
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center corner-frame p-10">
        <p className="hud-label text-destructive">Erro</p>
        <h1 className="mt-4 text-display text-2xl font-semibold text-foreground">
          Falha ao carregar
        </h1>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="border border-cyan/40 bg-cyan/10 px-4 py-2 text-mono text-xs uppercase tracking-[0.18em] text-cyan hover:bg-cyan hover:text-cyan-foreground"
          >
            Tentar novamente
          </button>
          <a
            href="/"
            className="border border-border px-4 py-2 text-mono text-xs uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
          >
            Início
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Abyssion SMP" },
      {
        name: "description",
        content:
          "Site oficial de Lore",
      },
      { property: "og:title", content: "Abyssion SMP" },
      {
        property: "og:description",
        content: "Site oficial de Lore",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "theme-color", content: "#08090b" },
      { name: "twitter:title", content: "Abyssion SMP" },
      { name: "twitter:description", content: "Site oficial de Lore" },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/df710330-67b5-4a81-ae4b-46cbadd9aa8d/id-preview-d01f0c3a--7c7afc81-b86b-4160-9403-cb04e42874ea.lovable.app-1782726429494.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/df710330-67b5-4a81-ae4b-46cbadd9aa8d/id-preview-d01f0c3a--7c7afc81-b86b-4160-9403-cb04e42874ea.lovable.app-1782726429494.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        router.invalidate();
        if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [router, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <Toaster theme="dark" position="bottom-right" />
    </QueryClientProvider>
  );
}
