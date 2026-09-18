import { createFileRoute } from "@tanstack/react-router";
import {
  Boxes,
  Package,
  PackageCheck,
  ShoppingCart,
  TriangleAlert,
} from "@/components/ui/icons";

import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Tableau de bord — Everest Distribution" },
      {
        name: "description",
        content: "Vue d’ensemble des stocks, produits et ventes d’Everest Distribution.",
      },
      { property: "og:title", content: "Tableau de bord — Everest Distribution" },
      {
        property: "og:description",
        content: "Gestion centralisée des stocks et centres de vente Everest Distribution.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DashboardPage,
});

const indicators = [
  { title: "Stock total", icon: PackageCheck, tone: "text-success bg-success/10" },
  { title: "Produits", icon: Package, tone: "text-primary bg-brand-soft" },
  { title: "Ventes du mois", icon: ShoppingCart, tone: "text-warning bg-warning/10" },
  { title: "Produits en rupture", icon: TriangleAlert, tone: "text-danger bg-danger/10" },
];

function DashboardPage() {
  return (
    <AppShell>
      <div className="mb-7">
        <p className="mb-1 text-sm font-medium text-accent">Vue d’ensemble</p>
        <h1 className="text-3xl font-bold text-primary sm:text-4xl">Tableau de bord</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Bienvenue sur votre espace de gestion multi-centres.
        </p>
      </div>

      <section
        aria-label="Indicateurs principaux"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {indicators.map((indicator) => {
          const Icon = indicator.icon;
          return (
            <Card key={indicator.title} className="min-h-44 border-border/80 shadow-sm transition-shadow hover:shadow-md">
              <CardHeader className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 p-5 pb-3">
                <CardTitle className="min-w-0 font-sans text-sm font-semibold text-muted-foreground">
                  {indicator.title}
                </CardTitle>
                <span className={`grid size-10 shrink-0 place-items-center rounded-md ${indicator.tone}`}>
                  <Icon className="size-5" aria-hidden="true" />
                </span>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                <div className="mt-2 h-8 w-24 animate-pulse rounded bg-muted" aria-label="Donnée à venir" />
                <div className="mt-4 h-2 w-full rounded-full bg-muted" />
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="mt-6 grid min-h-64 place-items-center border-t border-border pt-6 text-center">
        <div>
          <Boxes className="mx-auto size-9 text-primary/25" aria-hidden="true" />
          <h2 className="mt-3 text-lg font-semibold text-primary">Activité des centres</h2>
          <p className="mt-1 text-sm text-muted-foreground">Les données apparaîtront ici prochainement.</p>
        </div>
      </section>
    </AppShell>
  );
}
