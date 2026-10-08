import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useRouteContext } from "@tanstack/react-router";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { FileChartColumn, LoaderCircle } from "@/components/ui/icons";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { fcfa, fetchMouvements, nombre, valeurVente, type Mvt } from "@/lib/stats";

export const Route = createFileRoute("/_authenticated/rapports")({
  head: () => ({
    meta: [
      { title: "Rapports — Everest Distribution" },
      { name: "description", content: "Rapports de ventes par centre et par période, exportables en Excel et PDF." },
      { property: "og:title", content: "Rapports — Everest Distribution" },
      { property: "og:description", content: "Analyse des ventes multi-centres d’Everest Distribution." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RapportsPage,
});

type Periode = "semaine" | "mois" | "perso";
const iso = (d: Date) => d.toISOString().slice(0, 10);
const TOUS = "tous";

function bornes(p: Periode, du: string, au: string) {
  const now = new Date();
  if (p === "semaine") { const d = new Date(now.getTime() - 6 * 86400000); d.setHours(0, 0, 0, 0); return { depuis: d, jusqua: now }; }
  if (p === "mois") return { depuis: new Date(now.getFullYear(), now.getMonth(), 1), jusqua: now };
  return { depuis: new Date(`${du}T00:00:00`), jusqua: new Date(`${au}T23:59:59`) };
}

function RapportsPage() {
  const { profile, roles } = useRouteContext({ from: "/_authenticated" });
  const isManager = roles.includes("admin") || roles.includes("gestionnaire_entrepot");
  const [periode, setPeriode] = useState<Periode>("mois");
  const [du, setDu] = useState(iso(new Date(Date.now() - 29 * 86400000)));
  const [au, setAu] = useState(iso(new Date()));
  const [centre, setCentre] = useState(TOUS);
  const [produit, setProduit] = useState(TOUS);
  const [centres, setCentres] = useState<{ id: string; nom: string }[]>([]);
  const [produits, setProduits] = useState<{ id: string; nom: string }[]>([]);
  const [ventes, setVentes] = useState<Mvt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void supabase.from("centres").select("id, nom").order("nom").then(({ data }) => setCentres(data ?? []));
    void supabase.from("produits").select("id, nom").order("nom").then(({ data }) => setProduits(data ?? []));
  }, []);

  useEffect(() => {
    const { depuis, jusqua } = bornes(periode, du, au);
    if (isNaN(depuis.getTime()) || isNaN(jusqua.getTime())) return;
    setLoading(true); setError("");
    fetchMouvements({
      depuis, jusqua, types: ["vente"],
      centreId: isManager ? (centre === TOUS ? undefined : centre) : profile.centre_id ?? undefined,
      produitId: produit === TOUS ? undefined : produit,
    })
      .then(setVentes)
      .catch(() => setError("Impossible de charger les ventes."))
      .finally(() => setLoading(false));
  }, [periode, du, au, centre, produit, isManager, profile.centre_id]);

  const nomCentre = (id: string | null) => (id ? centres.find((c) => c.id === id)?.nom ?? "Centre" : "Entrepôt central");

  const r = useMemo(() => {
    const parCentre = new Map<string, { centre: string; quantite: number; montant: number }>();
    const parJour = new Map<string, { jour: string; montant: number }>();
    let total = 0, unites = 0;
    for (const m of ventes) {
      const v = valeurVente(m); total += v; unites += m.quantite_unites;
      const k = m.centre_source_id ?? "entrepot";
      const c = parCentre.get(k) ?? { centre: nomCentre(m.centre_source_id), quantite: 0, montant: 0 };
      c.quantite += m.quantite_unites; c.montant += v; parCentre.set(k, c);
      const j = m.created_at.slice(0, 10);
      const pj = parJour.get(j) ?? { jour: new Date(j).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }), montant: 0 };
      pj.montant += v; parJour.set(j, pj);
    }
    return {
      total, unites,
      centres: [...parCentre.values()].sort((a, b) => b.montant - a.montant),
      jours: [...parJour.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v),
      lignes: ventes.map((m) => ({ date: new Date(m.created_at).toLocaleString("fr-FR"), centre: nomCentre(m.centre_source_id), produit: m.produits?.nom ?? "—", quantite: m.quantite_unites, montant: valeurVente(m) })),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ventes, centres]);

  const libellePeriode = (() => { const b = bornes(periode, du, au); return `du ${b.depuis.toLocaleDateString("fr-FR")} au ${b.jusqua.toLocaleDateString("fr-FR")}`; })();

  async function exportExcel() {
    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(r.centres.map((c) => ({ Centre: c.centre, "Quantité (unités)": c.quantite, "Montant (FCFA)": c.montant }))), "Ventes par centre");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(r.lignes.map((l) => ({ Date: l.date, Centre: l.centre, Produit: l.produit, "Quantité (unités)": l.quantite, "Montant (FCFA)": l.montant }))), "Détail des ventes");
    XLSX.writeFile(wb, `rapport-ventes-${iso(new Date())}.xlsx`);
  }

  async function exportPdf() {
    const { jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;
    const doc = new jsPDF();
    const navy: [number, number, number] = [11, 45, 91];
    const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(n).replace(/\u202f|\u00a0/g, " ");
    doc.setTextColor(...navy); doc.setFontSize(16); doc.text("Everest Distribution — Rapport des ventes", 14, 18);
    doc.setFontSize(10); doc.setTextColor(31, 41, 55);
    doc.text(`Période ${libellePeriode} · Total : ${fmt(r.total)} FCFA · ${fmt(r.unites)} unités`, 14, 26);
    autoTable(doc, { startY: 32, head: [["Centre", "Quantité", "Montant (FCFA)"]], body: r.centres.map((c) => [c.centre, fmt(c.quantite), fmt(c.montant)]), headStyles: { fillColor: navy }, theme: "striped" });
    autoTable(doc, { head: [["Date", "Centre", "Produit", "Qté", "Montant (FCFA)"]], body: r.lignes.map((l) => [l.date, l.centre, l.produit, fmt(l.quantite), fmt(l.montant)]), headStyles: { fillColor: [240, 165, 0], textColor: navy }, theme: "striped", styles: { fontSize: 8 } });
    doc.save(`rapport-ventes-${iso(new Date())}.pdf`);
  }

  return (
    <AppShell>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-sm font-medium text-accent">Analyse</p>
          <h1 className="text-3xl font-bold text-primary sm:text-4xl">Rapports</h1>
          <p className="mt-2 text-sm text-muted-foreground">{isManager ? "Ventes de tous les centres." : "Ventes de votre centre uniquement."}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" disabled={!ventes.length} onClick={() => void exportExcel()}>Exporter Excel</Button>
          <Button className="bg-accent text-accent-foreground hover:bg-accent/90" disabled={!ventes.length} onClick={() => void exportPdf()}>Exporter PDF</Button>
        </div>
      </div>

      <Card>
        <CardContent className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5"><Label>Période</Label>
            <Select value={periode} onValueChange={(v) => setPeriode(v as Periode)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="semaine">7 derniers jours</SelectItem><SelectItem value="mois">Mois en cours</SelectItem><SelectItem value="perso">Personnalisée</SelectItem></SelectContent>
            </Select>
          </div>
          {periode === "perso" && (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5"><Label htmlFor="du">Du</Label><Input id="du" type="date" value={du} onChange={(e) => setDu(e.target.value)} /></div>
              <div className="space-y-1.5"><Label htmlFor="au">Au</Label><Input id="au" type="date" value={au} onChange={(e) => setAu(e.target.value)} /></div>
            </div>
          )}
          {isManager && (
            <div className="space-y-1.5"><Label>Centre</Label>
              <Select value={centre} onValueChange={setCentre}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value={TOUS}>Tous les centres</SelectItem>{centres.map((c) => <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5"><Label>Produit</Label>
            <Select value={produit} onValueChange={setProduit}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value={TOUS}>Tous les produits</SelectItem>{produits.map((p) => <SelectItem key={p.id} value={p.id}>{p.nom}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {error && <p role="alert" className="mt-4 border-l-2 border-danger bg-danger/5 px-3 py-2 text-sm text-danger">{error}</p>}

      {loading ? (
        <div className="grid min-h-56 place-items-center"><LoaderCircle className="size-7 animate-spin text-primary" /></div>
      ) : ventes.length === 0 ? (
        <div className="mt-6 grid min-h-56 place-items-center border border-dashed bg-card text-center">
          <div><FileChartColumn className="mx-auto size-9 text-primary/25" /><p className="mt-3 text-sm text-muted-foreground">Aucune vente sur cette période.</p></div>
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Chiffre d’affaires</p><p className="mt-1 text-2xl font-bold text-primary">{fcfa(r.total)}</p></CardContent></Card>
            <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Unités vendues</p><p className="mt-1 text-2xl font-bold text-primary">{nombre(r.unites)}</p></CardContent></Card>
          </div>

          <Card className="mt-6">
            <CardHeader><CardTitle className="text-lg text-primary">Ventes par jour (FCFA)</CardTitle></CardHeader>
            <CardContent className="h-64 px-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={r.jours}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="jour" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => fcfa(v)} />
                  <Bar dataKey="montant" name="Ventes" fill="var(--primary)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader><CardTitle className="text-lg text-primary">Ventes par centre</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-muted-foreground"><tr><th className="py-2">Centre</th><th className="py-2 text-right">Quantité</th><th className="py-2 text-right">Montant</th></tr></thead>
                <tbody>{r.centres.map((c) => <tr key={c.centre} className="border-t"><td className="py-2 font-medium text-primary">{c.centre}</td><td className="py-2 text-right">{nombre(c.quantite)}</td><td className="py-2 text-right font-semibold">{fcfa(c.montant)}</td></tr>)}</tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}
    </AppShell>
  );
}
