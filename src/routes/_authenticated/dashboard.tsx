import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute, useRouteContext } from "@tanstack/react-router";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowDownUp, Building2, LoaderCircle, PackageCheck, ShoppingCart, TriangleAlert } from "@/components/ui/icons";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MouvementDialog, LIBELLES_TYPES } from "@/components/stock/mouvement-dialog";
import { supabase } from "@/integrations/supabase/client";
import { fcfa, fetchMouvements, nombre, valeurVente, type Mvt } from "@/lib/stats";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Tableau de bord — Everest Distribution" },
      { name: "description", content: "Vue d’ensemble des stocks, produits et ventes d’Everest Distribution." },
      { property: "og:title", content: "Tableau de bord — Everest Distribution" },
      { property: "og:description", content: "Gestion centralisée des stocks et centres de vente Everest Distribution." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DashboardPage,
});

const ENTREES = new Set(["entree"]);
const SORTIES = new Set(["vente", "casse_invendu", "sortie_vers_centre"]);

function DashboardPage() {
  const { user, profile, roles } = useRouteContext({ from: "/_authenticated" });
  const isManager = roles.includes("admin") || roles.includes("gestionnaire_entrepot");
  const isResponsable = roles.includes("responsable_centre") && !!profile.centre_id;
  const [venteOpen, setVenteOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stockTotal, setStockTotal] = useState(0);
  const [ruptures, setRuptures] = useState(0);
  const [mvts, setMvts] = useState<Mvt[]>([]);
  const [centres, setCentres] = useState<Record<string, string>>({});

  const charger = useCallback(async () => {
    const now = new Date();
    const debutMois = new Date(now.getFullYear(), now.getMonth(), 1);
    const il30 = new Date(now.getTime() - 29 * 86400000);
    il30.setHours(0, 0, 0, 0);
    const depuis = debutMois < il30 ? debutMois : il30;
    const [stocks, mouvements, ctr] = await Promise.all([
      supabase.from("stocks").select("quantite_unites"),
      fetchMouvements({ depuis }),
      supabase.from("centres").select("id, nom"),
    ]);
    const lignes = stocks.data ?? [];
    setStockTotal(lignes.reduce((s, l) => s + l.quantite_unites, 0));
    setRuptures(lignes.filter((l) => l.quantite_unites === 0).length);
    setMvts(mouvements);
    setCentres(Object.fromEntries((ctr.data ?? []).map((c) => [c.id, c.nom])));
    setLoading(false);
  }, []);

  useEffect(() => {
    void charger();
    const ch = supabase
      .channel("dashboard-stocks")
      .on("postgres_changes", { event: "*", schema: "public", table: "stocks" }, () => void charger())
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [charger]);

  const d = useMemo(() => {
    const now = new Date();
    const debutMois = new Date(now.getFullYear(), now.getMonth(), 1);
    const ventes = mvts.filter((m) => m.type_mouvement === "vente");
    const ventesMois = ventes.filter((m) => new Date(m.created_at) >= debutMois).reduce((s, m) => s + valeurVente(m), 0);
    const jours: { jour: string; key: string; Entrées: number; Sorties: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const dt = new Date(now.getTime() - i * 86400000);
      jours.push({ key: dt.toDateString(), jour: dt.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }), Entrées: 0, Sorties: 0 });
    }
    const idx = Object.fromEntries(jours.map((j, i) => [j.key, i]));
    for (const m of mvts) {
      const i = idx[new Date(m.created_at).toDateString()];
      if (i === undefined) continue;
      if (isResponsable) {
        if (m.centre_destination_id === profile.centre_id) jours[i]!.Entrées += m.quantite_unites;
        if (m.centre_source_id === profile.centre_id) jours[i]!.Sorties += m.quantite_unites;
      } else {
        if (ENTREES.has(m.type_mouvement)) jours[i]!.Entrées += m.quantite_unites;
        else if (SORTIES.has(m.type_mouvement) && m.type_mouvement !== "sortie_vers_centre") jours[i]!.Sorties += m.quantite_unites;
      }
    }
    const top = new Map<string, { nom: string; q: number; v: number }>();
    const parCentre = new Map<string, { q: number; v: number }>();
    for (const m of ventes.filter((m) => new Date(m.created_at) >= debutMois)) {
      const t = top.get(m.produit_id) ?? { nom: m.produits?.nom ?? "—", q: 0, v: 0 };
      t.q += m.quantite_unites; t.v += valeurVente(m); top.set(m.produit_id, t);
      const k = m.centre_source_id ?? "entrepot";
      const c = parCentre.get(k) ?? { q: 0, v: 0 };
      c.q += m.quantite_unites; c.v += valeurVente(m); parCentre.set(k, c);
    }
    return {
      ventesMois,
      jours,
      top: [...top.values()].sort((a, b) => b.q - a.q).slice(0, 5),
      classement: [...parCentre.entries()].map(([id, v]) => ({ id, ...v })).sort((a, b) => b.v - a.v).slice(0, 10),
      derniers: mvts.slice(0, 10),
    };
  }, [mvts, isResponsable, profile.centre_id]);

  const cartes = [
    { title: "Stock total en temps réel", value: `${nombre(stockTotal)} unités`, icon: PackageCheck, tone: "text-success bg-success/10" },
    { title: "Ventes du mois", value: fcfa(d.ventesMois), icon: ShoppingCart, tone: "text-accent bg-accent/10" },
    { title: "Produits en rupture", value: nombre(ruptures), icon: TriangleAlert, tone: "text-danger bg-danger/10" },
  ];

  return (
    <AppShell>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-sm font-medium text-accent">Vue d’ensemble</p>
          <h1 className="text-3xl font-bold text-primary sm:text-4xl">Tableau de bord</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {isResponsable ? `Données de votre centre : ${centres[profile.centre_id!] ?? ""}` : "Entrepôt central et tous les centres."}
          </p>
        </div>
        {isResponsable && (
          <Button className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => setVenteOpen(true)}>
            <ShoppingCart className="size-4" /> Enregistrer une vente
          </Button>
        )}
      </div>

      {isResponsable && (
        <MouvementDialog open={venteOpen} onOpenChange={setVenteOpen} isManager={false} centreDuProfil={profile.centre_id ?? null}
          utilisateurId={user.id} typesAutorises={["vente"]} titre="Enregistrer une vente" onSaved={() => void charger()} />
      )}

      {loading ? (
        <div className="grid min-h-64 place-items-center"><LoaderCircle className="size-7 animate-spin text-primary" /></div>
      ) : (
        <>
          <section aria-label="Indicateurs principaux" className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {cartes.map((c) => {
              const Icon = c.icon;
              return (
                <Card key={c.title} className="shadow-sm">
                  <CardHeader className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 p-5 pb-2">
                    <CardTitle className="font-sans text-sm font-semibold text-muted-foreground">{c.title}</CardTitle>
                    <span className={`grid size-10 place-items-center rounded-md ${c.tone}`}><Icon className="size-5" /></span>
                  </CardHeader>
                  <CardContent className="px-5 pb-5"><p className="text-2xl font-bold text-primary">{c.value}</p></CardContent>
                </Card>
              );
            })}
          </section>

          <Card className="mt-6">
            <CardHeader><CardTitle className="text-lg text-primary">Mouvements de stock — 30 derniers jours</CardTitle></CardHeader>
            <CardContent className="h-72 px-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={d.jours}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="jour" tick={{ fontSize: 11 }} interval={4} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Entrées" fill="var(--primary)" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Sorties" fill="var(--accent)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-lg text-primary">Produits les plus vendus (mois)</CardTitle></CardHeader>
              <CardContent>
                {d.top.length === 0 ? <p className="text-sm text-muted-foreground">Aucune vente ce mois-ci.</p> : (
                  <ol className="space-y-3">
                    {d.top.map((p, i) => (
                      <li key={p.nom + i} className="flex items-center justify-between gap-3 text-sm">
                        <span className="flex items-center gap-3"><span className="grid size-7 place-items-center rounded-full bg-accent/15 font-bold text-primary">{i + 1}</span>{p.nom}</span>
                        <span className="text-right"><b className="text-primary">{nombre(p.q)}</b> u. · {fcfa(p.v)}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2 text-lg text-primary"><ArrowDownUp className="size-4" /> Derniers mouvements</CardTitle></CardHeader>
              <CardContent>
                {d.derniers.length === 0 ? <p className="text-sm text-muted-foreground">Aucun mouvement.</p> : (
                  <ul className="divide-y text-sm">
                    {d.derniers.map((m) => (
                      <li key={m.id} className="flex items-center justify-between gap-3 py-2">
                        <span className="min-w-0"><b className="text-primary">{LIBELLES_TYPES[m.type_mouvement]}</b> · {m.produits?.nom}</span>
                        <span className="shrink-0 text-muted-foreground">{nombre(m.quantite_unites)} u. · {new Date(m.created_at).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          {isManager && (
            <Card className="mt-6">
              <CardHeader><CardTitle className="flex items-center gap-2 text-lg text-primary"><Building2 className="size-4" /> Centres les plus performants (ventes du mois)</CardTitle></CardHeader>
              <CardContent>
                {d.classement.length === 0 ? <p className="text-sm text-muted-foreground">Aucune vente ce mois-ci.</p> : (
                  <ol className="space-y-3">
                    {d.classement.map((c, i) => {
                      const max = d.classement[0]!.v || 1;
                      return (
                        <li key={c.id} className="text-sm">
                          <div className="flex justify-between"><span><b>{i + 1}.</b> {c.id === "entrepot" ? "Entrepôt central" : centres[c.id] ?? "Centre"}</span><span className="font-semibold text-primary">{fcfa(c.v)}</span></div>
                          <div className="mt-1 h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-accent" style={{ width: `${(c.v / max) * 100}%` }} /></div>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </AppShell>
  );
}
