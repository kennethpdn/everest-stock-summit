import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowDownUp,
  Bell,
  Boxes,
  Building2,
  ChevronDown,
  CircleUserRound,
  FileChartColumn,
  LayoutDashboard,
  LogOut,
  Menu,
  Mountain,
  Package,
  PackageCheck,
  Search,
  Settings,
  ShoppingCart,
  TriangleAlert,
  Truck,
  Users,
} from "@/components/ui/icons";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";

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

const navigation = [
  { label: "Tableau de bord", icon: LayoutDashboard, active: true },
  { label: "Produits", icon: Package },
  { label: "Stocks", icon: Boxes },
  { label: "Mouvements", icon: ArrowDownUp },
  { label: "Centres de vente", icon: Building2 },
  { label: "Réapprovisionnement", icon: Truck },
  { label: "Rapports", icon: FileChartColumn },
  { label: "Utilisateurs", icon: Users },
  { label: "Paramètres", icon: Settings },
];

const indicators = [
  { title: "Stock total", icon: PackageCheck, tone: "text-success bg-success/10" },
  { title: "Produits", icon: Package, tone: "text-primary bg-brand-soft" },
  { title: "Ventes du mois", icon: ShoppingCart, tone: "text-warning bg-warning/10" },
  { title: "Produits en rupture", icon: TriangleAlert, tone: "text-danger bg-danger/10" },
];

function Brand() {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="relative grid size-11 shrink-0 place-items-center rounded-md bg-sidebar-accent text-sidebar-primary">
        <Mountain className="size-7" strokeWidth={1.8} aria-hidden="true" />
        <span className="absolute inset-x-1 top-1 h-3 rounded-[50%] border-t-2 border-sidebar-primary" />
      </div>
      <div className="min-w-0">
        <p className="font-display text-[15px] font-bold leading-tight text-sidebar-foreground">
          EVEREST
        </p>
        <p className="text-[9px] font-semibold leading-tight text-sidebar-primary">DISTRIBUTION</p>
        <p className="mt-1 max-w-36 text-[7px] leading-tight text-sidebar-foreground/60">
          L’EXCELLENCE AU SOMMET DE LA DISTRIBUTION
        </p>
      </div>
    </div>
  );
}

function Navigation({ mobile = false }: { mobile?: boolean }) {
  return (
    <nav aria-label="Navigation principale" className="mt-8 flex flex-1 flex-col gap-1">
      {navigation.map((item) => {
        const Icon = item.icon;
        const content = (
          <Button
            variant="ghost"
            className={`h-11 w-full justify-start px-3 text-[13px] font-medium ${
              item.active
                ? "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90 hover:text-sidebar-primary-foreground"
                : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            }`}
            aria-current={item.active ? "page" : undefined}
            aria-label={item.label}
          >
            <Icon className="size-[18px]" strokeWidth={1.8} aria-hidden="true" />
            <span>{item.label}</span>
          </Button>
        );

        return mobile ? (
          <SheetClose asChild key={item.label}>
            {content}
          </SheetClose>
        ) : (
          <div key={item.label}>{content}</div>
        );
      })}
    </nav>
  );
}

function Header() {
  const navigate = useNavigate();
  const { profile, roles } = Route.useRouteContext();
  const isAdmin = roles.includes("admin");
  const initials = profile.nom_complet.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  async function signOut() { await supabase.auth.signOut(); await navigate({ to: "/auth", replace: true }); }
  return (
    <header className="sticky top-0 z-30 grid h-17 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b bg-card px-4 md:px-7">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden" aria-label="Ouvrir le menu">
            <Menu className="size-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="flex w-[286px] flex-col border-sidebar-border bg-sidebar p-5 text-sidebar-foreground">
          <SheetTitle className="sr-only">Menu principal</SheetTitle>
          <SheetDescription className="sr-only">Accès aux rubriques de l’application</SheetDescription>
          <Brand />
          <Navigation mobile />
          <p className="border-t border-sidebar-border pt-4 text-xs text-sidebar-foreground/50">Version 1.0</p>
        </SheetContent>
      </Sheet>

      <div className="relative col-span-1 hidden max-w-xl md:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          placeholder="Rechercher un produit, un centre…"
          aria-label="Recherche globale"
          className="h-10 w-full rounded-md border border-input bg-secondary pl-10 pr-4 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
        />
      </div>
      <div className="min-w-0 md:hidden">
        <p className="truncate font-display text-base font-semibold text-primary">Everest Distribution</p>
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
              <Bell className="size-5 text-primary" />
              <span className="absolute right-2 top-2 size-2 rounded-full bg-danger ring-2 ring-card" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72 p-2">
            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <p className="px-2 py-5 text-center text-sm text-muted-foreground">Aucune notification pour le moment.</p>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-11 gap-2 px-1.5 sm:px-2" aria-label="Menu utilisateur">
               <span className="grid size-8 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">{initials}</span>
              <span className="hidden text-left lg:block">
                 <span className="block text-xs font-semibold text-foreground">{profile.nom_complet}</span>
                 <span className="block text-[11px] font-normal text-muted-foreground">{isAdmin ? "Administrateur" : "Utilisateur autorisé"}</span>
              </span>
              <ChevronDown className="hidden size-4 text-muted-foreground sm:block" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>Mon compte</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem><CircleUserRound /> Profil</DropdownMenuItem>
             {isAdmin && <DropdownMenuItem asChild><Link to="/admin/utilisateurs"><Users /> Utilisateurs en attente</Link></DropdownMenuItem>}
             <DropdownMenuItem className="text-danger focus:text-danger" onSelect={() => void signOut()}><LogOut /> Déconnexion</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

function DashboardPage() {
  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar p-5 text-sidebar-foreground md:flex">
        <Brand />
        <Navigation />
        <p className="border-t border-sidebar-border pt-4 text-xs text-sidebar-foreground/50">Version 1.0</p>
      </aside>

      <div className="min-w-0 md:ml-64">
        <Header />
        <main className="px-4 py-7 sm:px-6 md:px-8 md:py-9">
          <div className="mx-auto max-w-7xl">
            <div className="mb-7">
              <p className="mb-1 text-sm font-medium text-accent">Vue d’ensemble</p>
              <h1 className="text-3xl font-bold text-primary sm:text-4xl">Tableau de bord</h1>
              <p className="mt-2 text-sm text-muted-foreground">Bienvenue sur votre espace de gestion multi-centres.</p>
            </div>

            <section aria-label="Indicateurs principaux" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {indicators.map((indicator) => {
                const Icon = indicator.icon;
                return (
                  <Card key={indicator.title} className="min-h-44 border-border/80 shadow-sm transition-shadow hover:shadow-md">
                    <CardHeader className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 p-5 pb-3">
                      <CardTitle className="min-w-0 font-sans text-sm font-semibold text-muted-foreground">
                        {indicator.title}
                      </CardTitle>
                      <span className={`grid size-10 shrink-0 place-items-center rounded-md ${indicator.tone}`}>
                        <Icon className="size-5" strokeWidth={1.8} aria-hidden="true" />
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
          </div>
        </main>
      </div>
    </div>
  );
}