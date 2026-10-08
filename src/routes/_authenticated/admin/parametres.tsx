import { useEffect, useMemo, useState } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { toast } from "sonner";
import { LoaderCircle, LockKeyhole, Search } from "@/components/ui/icons";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/admin/parametres")({
  beforeLoad: ({ context }) => {
    if (!context.roles.includes("admin")) throw redirect({ to: "/dashboard" });
  },
  head: () => ({
    meta: [
      { title: "Paramètres — Everest Distribution" },
      { name: "description", content: "Paramètres généraux, seuils d’alerte et traçabilité des actions sensibles." },
      { property: "og:title", content: "Paramètres — Everest Distribution" },
      { property: "og:description", content: "Configuration et historique des actions sensibles." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ParametresPage,
});

type Params = Tables<"parametres">;
type Audit = Tables<"journal_audit">;
const FUSEAUX = ["Africa/Porto-Novo", "Africa/Lagos", "Africa/Abidjan", "UTC"];
const FORMATS: Record<string, string> = { unites: "Unités", packs: "Packs", unites_et_packs: "Unités et packs" };
// Actions sensibles : rôles, validations, activations
const SENSIBLES = ["permission"];

function ParametresPage() {
  const [params, setParams] = useState<Params | null>(null);
  const [saving, setSaving] = useState(false);
  const [logs, setLogs] = useState<Audit[]>([]);
  const [auteur, setAuteur] = useState("tous");
  const [debut, setDebut] = useState("");
  const [fin, setFin] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    void supabase.from("parametres").select("*").maybeSingle().then(({ data }) => setParams(data));
  }, []);

  useEffect(() => {
    let q = supabase.from("journal_audit").select("*").in("categorie", SENSIBLES).order("created_at", { ascending: false }).limit(500);
    if (debut) q = q.gte("created_at", new Date(debut).toISOString());
    if (fin) q = q.lte("created_at", new Date(fin + "T23:59:59").toISOString());
    void q.then(({ data }) => setLogs(data ?? []));
  }, [debut, fin]);

  const auteurs = useMemo(() => Array.from(new Set(logs.map((l) => l.auteur_nom ?? "Système"))).sort(), [logs]);
  const filtres = useMemo(() => {
    const t = search.trim().toLowerCase();
    return logs.filter((l) => (auteur === "tous" || (l.auteur_nom ?? "Système") === auteur)
      && (!t || [l.action, l.description, l.cible].some((v) => v?.toLowerCase().includes(t))));
  }, [logs, auteur, search]);

  async function save() {
    if (!params) return;
    if (!Number.isInteger(params.seuil_alerte_defaut) || params.seuil_alerte_defaut < 0 || params.seuil_alerte_defaut > 100000) {
      toast.error("Le seuil doit être un nombre entier positif.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("parametres").update({
      fuseau_horaire: params.fuseau_horaire, format_unites: params.format_unites, seuil_alerte_defaut: params.seuil_alerte_defaut,
    }).eq("id", true);
    setSaving(false);
    if (error) toast.error("Enregistrement impossible."); else toast.success("Paramètres enregistrés.");
  }

  const fmt = (d: string) => new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short", timeZone: params?.fuseau_horaire ?? "Africa/Porto-Novo" }).format(new Date(d));

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-primary">Paramètres</h1>
          <p className="text-sm text-muted-foreground">Configuration générale et traçabilité des actions sensibles.</p>
        </div>

        {!params ? <LoaderCircle className="animate-spin text-primary" /> : (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-primary">Paramètres généraux</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Devise</Label>
                  <div className="relative"><Input value="FCFA" disabled /><LockKeyhole className="absolute right-3 top-3 size-4 text-muted-foreground" /></div>
                  <p className="text-xs text-muted-foreground">Non modifiable.</p>
                </div>
                <div className="space-y-2">
                  <Label>Fuseau horaire</Label>
                  <Select value={params.fuseau_horaire} onValueChange={(v) => setParams({ ...params, fuseau_horaire: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{FUSEAUX.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Format des unités</Label>
                  <Select value={params.format_unites} onValueChange={(v) => setParams({ ...params, format_unites: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(FORMATS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-primary">Seuils d’alerte</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="seuil">Seuil par défaut pour les nouveaux stocks (unités)</Label>
                  <Input id="seuil" type="number" min={0} value={params.seuil_alerte_defaut} onChange={(e) => setParams({ ...params, seuil_alerte_defaut: Number(e.target.value) })} />
                  <p className="text-xs text-muted-foreground">Appliqué aux nouveaux produits mis en stock. Les seuils existants ne changent pas.</p>
                </div>
                <Button className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={save} disabled={saving}>
                  {saving && <LoaderCircle className="animate-spin" />}Enregistrer
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        <Card>
          <CardHeader><CardTitle className="text-primary">Historique des actions sensibles</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-4">
              <div className="relative"><Search className="absolute left-3 top-3 size-4 text-muted-foreground" /><Input className="pl-9" placeholder="Rechercher…" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
              <Select value={auteur} onValueChange={setAuteur}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="tous">Tous les utilisateurs</SelectItem>{auteurs.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
              </Select>
              <Input type="date" value={debut} onChange={(e) => setDebut(e.target.value)} aria-label="Du" />
              <Input type="date" value={fin} onChange={(e) => setFin(e.target.value)} aria-label="Au" />
            </div>
            <div className="divide-y rounded-md border">
              {filtres.length === 0 && <p className="p-4 text-sm text-muted-foreground">Aucune action sensible sur cette période.</p>}
              {filtres.map((l) => (
                <div key={l.id} className="flex flex-wrap items-center gap-3 p-3 text-sm">
                  <span className="w-32 text-muted-foreground">{fmt(l.created_at)}</span>
                  <Badge variant="outline">{l.action}</Badge>
                  <span className="flex-1">{l.description}{l.cible && <span className="text-muted-foreground"> — {l.cible}</span>}</span>
                  <span className="font-medium text-primary">{l.auteur_nom ?? "Système"}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
