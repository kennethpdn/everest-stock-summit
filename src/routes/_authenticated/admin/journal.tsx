import { useEffect, useMemo, useState } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { LoaderCircle, Search } from "@/components/ui/icons";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/admin/journal")({
  beforeLoad: ({ context }) => {
    if (!context.roles.includes("admin")) throw redirect({ to: "/dashboard" });
  },
  head: () => ({
    meta: [
      { title: "Journal d’audit — Everest Distribution" },
      { name: "description", content: "Historique des connexions, modifications de stock et changements de permissions." },
      { property: "og:title", content: "Journal d’audit — Everest Distribution" },
      { property: "og:description", content: "Traçabilité complète des actions sensibles." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: JournalPage,
});

const LIBELLES: Record<string, string> = { connexion: "Connexion", stock: "Stock", permission: "Permission" };
const TONS: Record<string, string> = {
  connexion: "bg-primary/10 text-primary",
  stock: "bg-accent/15 text-primary",
  permission: "bg-danger/10 text-danger",
};

function JournalPage() {
  const [rows, setRows] = useState<Tables<"journal_audit">[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [categorie, setCategorie] = useState("tous");
  const [recherche, setRecherche] = useState("");
  const [du, setDu] = useState("");
  const [au, setAu] = useState("");

  useEffect(() => {
    setLoading(true);
    let q = supabase.from("journal_audit").select("*").order("created_at", { ascending: false }).limit(500);
    if (categorie !== "tous") q = q.eq("categorie", categorie);
    if (du) q = q.gte("created_at", new Date(du).toISOString());
    if (au) q = q.lte("created_at", new Date(`${au}T23:59:59`).toISOString());
    void q.then(({ data, error: e }) => {
      if (e) setError("Impossible de charger le journal.");
      else setRows(data ?? []);
      setLoading(false);
    });
  }, [categorie, du, au]);

  const filtres = useMemo(() => {
    const s = recherche.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) =>
      [r.action, r.description, r.auteur_nom, r.cible].some((v) => v?.toLowerCase().includes(s)),
    );
  }, [rows, recherche]);

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <p className="text-sm font-semibold text-accent">ADMINISTRATION</p>
          <h1 className="mt-1 text-3xl font-bold text-primary">Journal d’audit</h1>
          <p className="mt-2 text-sm text-muted-foreground">Connexions, modifications de stock et changements de permissions.</p>
        </div>
        <Card>
          <CardContent className="grid gap-3 p-4 sm:grid-cols-4">
            <div className="relative sm:col-span-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Rechercher…" value={recherche} onChange={(e) => setRecherche(e.target.value)} />
            </div>
            <Select value={categorie} onValueChange={setCategorie}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="tous">Toutes les catégories</SelectItem>
                <SelectItem value="connexion">Connexions</SelectItem>
                <SelectItem value="stock">Stock</SelectItem>
                <SelectItem value="permission">Permissions</SelectItem>
              </SelectContent>
            </Select>
            <Input type="date" aria-label="Du" value={du} onChange={(e) => setDu(e.target.value)} />
            <Input type="date" aria-label="Au" value={au} onChange={(e) => setAu(e.target.value)} />
          </CardContent>
        </Card>
        {error && <p role="alert" className="border-l-2 border-danger bg-danger/5 px-3 py-2 text-sm text-danger">{error}</p>}
        {loading ? (
          <div className="grid min-h-56 place-items-center"><LoaderCircle className="size-7 animate-spin text-primary" /></div>
        ) : filtres.length === 0 ? (
          <p className="border border-dashed bg-card p-10 text-center text-sm text-muted-foreground">Aucun événement trouvé.</p>
        ) : (
          <div className="overflow-x-auto border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
                <tr><th className="p-3">Date</th><th className="p-3">Catégorie</th><th className="p-3">Action</th><th className="p-3">Concerne</th><th className="p-3">Détails</th><th className="p-3">Auteur</th></tr>
              </thead>
              <tbody>
                {filtres.map((r) => (
                  <tr key={r.id} className="border-t align-top">
                    <td className="whitespace-nowrap p-3">{new Date(r.created_at).toLocaleString("fr-FR")}</td>
                    <td className="p-3"><Badge variant="secondary" className={TONS[r.categorie]}>{LIBELLES[r.categorie] ?? r.categorie}</Badge></td>
                    <td className="p-3 font-medium text-primary">{r.action}</td>
                    <td className="p-3">{r.cible ?? "—"}</td>
                    <td className="p-3 text-muted-foreground">{r.description ?? "—"}</td>
                    <td className="p-3">{r.auteur_nom ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
