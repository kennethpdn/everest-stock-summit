import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { createFileRoute, useRouteContext } from "@tanstack/react-router";
import { Check, LoaderCircle, PackageCheck, Plus, Truck, X } from "@/components/ui/icons";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Statut = Database["public"]["Enums"]["statut_demande"];
type Demande = {
  id: string; statut: Statut; quantite_demandee: number; created_at: string; updated_at: string;
  produits: { nom: string; reference_format: string } | null;
  centres: { nom: string } | null;
};

export const Route = createFileRoute("/_authenticated/reapprovisionnement")({
  head: () => ({
    meta: [
      { title: "Réapprovisionnement — Everest Distribution" },
      { name: "description", content: "Demandes de réapprovisionnement des centres de vente et suivi des livraisons." },
      { property: "og:title", content: "Réapprovisionnement — Everest Distribution" },
      { property: "og:description", content: "Suivi des demandes de réapprovisionnement multi-centres." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReapproPage,
});

const STATUTS: { value: Statut; label: string; ton: string }[] = [
  { value: "en_attente", label: "En attente", ton: "bg-warning/15 text-warning" },
  { value: "validee", label: "Validée", ton: "bg-primary/10 text-primary" },
  { value: "en_livraison", label: "En livraison", ton: "bg-primary text-primary-foreground" },
  { value: "livree", label: "Livrée", ton: "bg-success/15 text-success" },
  { value: "refusee", label: "Refusée", ton: "bg-danger/10 text-danger" },
];
const INFO = Object.fromEntries(STATUTS.map((s) => [s.value, s])) as Record<Statut, (typeof STATUTS)[number]>;

function ReapproPage() {
  const { user, profile, roles } = useRouteContext({ from: "/_authenticated" });
  const isManager = roles.includes("admin") || roles.includes("gestionnaire_entrepot");
  const isResponsable = roles.includes("responsable_centre") && !!profile.centre_id;
  const [demandes, setDemandes] = useState<Demande[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [onglet, setOnglet] = useState<Statut | "tous">("en_attente");
  const [acting, setActing] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const charger = useCallback(async () => {
    const { data, error: e } = await supabase
      .from("demandes_reapprovisionnement")
      .select("id, statut, quantite_demandee, created_at, updated_at, produits(nom, reference_format), centres(nom)")
      .order("created_at", { ascending: false });
    if (e) setError("Impossible de charger les demandes.");
    else setDemandes((data ?? []) as Demande[]);
    setLoading(false);
  }, []);
  useEffect(() => { void charger(); }, [charger]);

  const compte = useMemo(() => {
    const c: Record<string, number> = {};
    demandes.forEach((d) => { c[d.statut] = (c[d.statut] ?? 0) + 1; });
    return c;
  }, [demandes]);
  const visibles = onglet === "tous" ? demandes : demandes.filter((d) => d.statut === onglet);

  async function changer(id: string, statut: Statut) {
    setActing(id); setError("");
    const { error: e } = await supabase.from("demandes_reapprovisionnement").update({ statut }).eq("id", id);
    if (e) setError(e.message || "Action impossible.");
    else await charger();
    setActing(null);
  }

  return (
    <AppShell>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-sm font-medium text-accent">Logistique</p>
          <h1 className="text-3xl font-bold text-primary sm:text-4xl">Réapprovisionnement</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {isManager ? "Validez les demandes des centres et suivez les livraisons." : "Demandez du stock à l’entrepôt central pour votre centre."}
          </p>
        </div>
        {isResponsable && (
          <Button className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => setOpen(true)}>
            <Plus className="size-4" /> Nouvelle demande
          </Button>
        )}
      </div>

      <Tabs value={onglet} onValueChange={(v) => setOnglet(v as Statut | "tous")}>
        <TabsList className="h-auto flex-wrap justify-start">
          {STATUTS.map((s) => (
            <TabsTrigger key={s.value} value={s.value}>{s.label} ({compte[s.value] ?? 0})</TabsTrigger>
          ))}
          <TabsTrigger value="tous">Toutes ({demandes.length})</TabsTrigger>
        </TabsList>
      </Tabs>

      {error && <p role="alert" className="mt-4 border-l-2 border-danger bg-danger/5 px-3 py-2 text-sm text-danger">{error}</p>}

      {loading ? (
        <div className="grid min-h-56 place-items-center"><LoaderCircle className="size-7 animate-spin text-primary" /></div>
      ) : visibles.length === 0 ? (
        <div className="mt-6 grid min-h-56 place-items-center border border-dashed bg-card text-center">
          <div><Truck className="mx-auto size-9 text-primary/25" /><p className="mt-3 text-sm text-muted-foreground">Aucune demande dans cette catégorie.</p></div>
        </div>
      ) : (
        <section className="mt-6 grid gap-3">
          {visibles.map((d) => {
            const s = INFO[d.statut];
            return (
              <Card key={d.id}>
                <CardContent className="grid gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-sans text-base font-semibold text-primary">{d.produits?.nom ?? "Produit"}</h2>
                      <Badge className={`${s.ton} hover:${s.ton}`}>{s.label}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {d.quantite_demandee} unité(s) · {d.centres?.nom ?? "Centre"} · {new Date(d.created_at).toLocaleString("fr-FR")}
                    </p>
                  </div>
                  {isManager && (
                    <div className="flex flex-wrap gap-2">
                      {d.statut === "en_attente" && (
                        <>
                          <Button variant="outline" className="text-danger" disabled={acting === d.id} onClick={() => void changer(d.id, "refusee")}><X /> Refuser</Button>
                          <Button className="bg-accent text-accent-foreground hover:bg-accent/90" disabled={acting === d.id} onClick={() => void changer(d.id, "validee")}><Check /> Valider</Button>
                        </>
                      )}
                      {d.statut === "validee" && (
                        <Button disabled={acting === d.id} onClick={() => void changer(d.id, "en_livraison")}><Truck /> Mettre en livraison</Button>
                      )}
                      {d.statut === "en_livraison" && (
                        <Button className="bg-success text-primary-foreground hover:bg-success/90" disabled={acting === d.id} onClick={() => void changer(d.id, "livree")}><PackageCheck /> Marquer livrée</Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </section>
      )}

      {isResponsable && (
        <NouvelleDemande open={open} onOpenChange={setOpen} centreId={profile.centre_id!} userId={user.id} onSaved={() => { setOnglet("en_attente"); void charger(); }} />
      )}
    </AppShell>
  );
}

function NouvelleDemande({ open, onOpenChange, centreId, userId, onSaved }: { open: boolean; onOpenChange: (v: boolean) => void; centreId: string; userId: string; onSaved: () => void }) {
  const [produits, setProduits] = useState<{ id: string; nom: string; reference_format: string }[]>([]);
  const [produit, setProduit] = useState("");
  const [quantite, setQuantite] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    void supabase.from("produits").select("id, nom, reference_format").eq("actif", true).order("nom").then(({ data }) => setProduits(data ?? []));
  }, [open]);

  async function submit(e: FormEvent) {
    e.preventDefault(); setError("");
    const q = Number(quantite);
    if (!produit || !Number.isInteger(q) || q <= 0) { setError("Choisissez un produit et une quantité entière positive."); return; }
    setSaving(true);
    const { error: err } = await supabase.from("demandes_reapprovisionnement").insert({ centre_id: centreId, produit_id: produit, quantite_demandee: q, demandeur_id: userId });
    setSaving(false);
    if (err) { setError("La demande n’a pas pu être envoyée."); return; }
    setProduit(""); setQuantite(""); onOpenChange(false); onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle className="text-primary">Nouvelle demande</DialogTitle></DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-2">
            <Label>Produit</Label>
            <Select value={produit} onValueChange={setProduit}>
              <SelectTrigger><SelectValue placeholder="Sélectionner un produit" /></SelectTrigger>
              <SelectContent>
                {produits.map((p) => <SelectItem key={p.id} value={p.id}>{p.nom} — {p.reference_format}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="qte">Quantité (unités)</Label>
            <Input id="qte" type="number" min={1} step={1} value={quantite} onChange={(e) => setQuantite(e.target.value)} required />
          </div>
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button type="submit" className="bg-accent text-accent-foreground hover:bg-accent/90" disabled={saving}>
              {saving && <LoaderCircle className="animate-spin" />} Envoyer la demande
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
