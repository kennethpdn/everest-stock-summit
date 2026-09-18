import { useEffect, useMemo, useState } from "react";
import { createFileRoute, redirect, useRouteContext } from "@tanstack/react-router";
import {
  Ban,
  Building2,
  LoaderCircle,
  Pencil,
  Plus,
  RotateLeft,
  Search,
} from "@/components/ui/icons";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type TypeCentre = Database["public"]["Enums"]["type_centre"];

type Centre = {
  id: string;
  nom: string;
  zone: string | null;
  type_centre: TypeCentre;
  contact_nom: string | null;
  contact_telephone: string | null;
  adresse: string | null;
  actif: boolean;
};

const TYPES: { value: TypeCentre; label: string }[] = [
  { value: "bar", label: "Bar" },
  { value: "restaurant", label: "Restaurant" },
  { value: "supermarche", label: "Supermarché" },
  { value: "lounge", label: "Lounge" },
  { value: "depot", label: "Dépôt" },
];

const emptyCentre: Centre = {
  id: "",
  nom: "",
  zone: "",
  type_centre: "bar",
  contact_nom: "",
  contact_telephone: "",
  adresse: "",
  actif: true,
};

export const Route = createFileRoute("/_authenticated/centres")({
  beforeLoad: ({ context }) => {
    const roles = (context as { roles: string[] }).roles ?? [];
    if (!roles.includes("admin") && !roles.includes("gestionnaire_entrepot")) {
      throw redirect({ to: "/dashboard" });
    }
  },
  head: () => ({
    meta: [
      { title: "Centres de vente — Everest Distribution" },
      {
        name: "description",
        content:
          "Gérez les centres de vente Everest Distribution : zones, types, contacts et stock total par centre.",
      },
      { property: "og:title", content: "Centres de vente — Everest Distribution" },
      {
        property: "og:description",
        content: "Liste des bars, restaurants, supermarchés et dépôts approvisionnés.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CentresPage,
});

function CentresPage() {
  const [centres, setCentres] = useState<Centre[]>([]);
  const [totaux, setTotaux] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [afficherInactifs, setAfficherInactifs] = useState(false);
  const [form, setForm] = useState<Centre | null>(null);
  const [saving, setSaving] = useState(false);

  async function loadAll() {
    setLoading(true);
    const [centresRes, stocksRes] = await Promise.all([
      supabase
        .from("centres")
        .select("id, nom, zone, type_centre, contact_nom, contact_telephone, adresse, actif")
        .order("nom"),
      supabase.from("stocks").select("centre_id, quantite_unites"),
    ]);
    if (centresRes.error) {
      setError("Impossible de charger les centres de vente.");
    } else {
      setError("");
      setCentres((centresRes.data ?? []) as Centre[]);
      const map: Record<string, number> = {};
      for (const row of stocksRes.data ?? []) {
        if (!row.centre_id) continue;
        map[row.centre_id] = (map[row.centre_id] ?? 0) + Number(row.quantite_unites);
      }
      setTotaux(map);
    }
    setLoading(false);
  }

  useEffect(() => {
    void loadAll();
  }, []);

  const visibles = useMemo(() => {
    const term = search.trim().toLowerCase();
    return centres.filter((centre) => {
      if (!afficherInactifs && !centre.actif) return false;
      if (!term) return true;
      return (
        centre.nom.toLowerCase().includes(term) ||
        (centre.zone ?? "").toLowerCase().includes(term) ||
        (centre.contact_nom ?? "").toLowerCase().includes(term)
      );
    });
  }, [centres, search, afficherInactifs]);

  async function saveCentre() {
    if (!form) return;
    if (!form.nom.trim()) {
      setError("Le nom du centre est obligatoire.");
      return;
    }
    setSaving(true);
    const payload = {
      nom: form.nom.trim(),
      zone: form.zone?.trim() || null,
      type_centre: form.type_centre,
      contact_nom: form.contact_nom?.trim() || null,
      contact_telephone: form.contact_telephone?.trim() || null,
      adresse: form.adresse?.trim() || null,
      actif: form.actif,
    };
    const { error: saveError } = form.id
      ? await supabase.from("centres").update(payload).eq("id", form.id)
      : await supabase.from("centres").insert(payload);
    setSaving(false);
    if (saveError) {
      setError("Enregistrement impossible. Vérifiez vos droits ou le nom du centre.");
      return;
    }
    setForm(null);
    await loadAll();
  }

  async function toggleActif(centre: Centre) {
    const { error: toggleError } = await supabase
      .from("centres")
      .update({ actif: !centre.actif })
      .eq("id", centre.id);
    if (toggleError) {
      setError("Modification impossible.");
      return;
    }
    await loadAll();
  }

  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-primary sm:text-3xl">
            Centres de vente
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Bars, restaurants, supermarchés, lounges et dépôts approvisionnés par l’entrepôt central.
          </p>
        </div>
        <Button className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => setForm({ ...emptyCentre })}>
          <Plus className="size-4" /> Ajouter un centre
        </Button>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher un centre, une zone…"
            aria-label="Rechercher un centre"
            className="pl-9"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Switch checked={afficherInactifs} onCheckedChange={setAfficherInactifs} />
          Afficher les centres désactivés
        </label>
      </div>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}

      {loading ? (
        <div className="mt-10 flex items-center gap-2 text-muted-foreground">
          <LoaderCircle className="size-4 animate-spin" /> Chargement…
        </div>
      ) : visibles.length === 0 ? (
        <Card className="mt-6">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Aucun centre de vente pour le moment. Ajoutez votre premier point de vente.
          </CardContent>
        </Card>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visibles.map((centre) => (
            <Card key={centre.id} className={centre.actif ? "" : "opacity-70"}>
              <CardContent className="space-y-3 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-display text-lg font-semibold text-primary">
                      {centre.nom}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {centre.zone || "Zone non précisée"} ·{" "}
                      {TYPES.find((type) => type.value === centre.type_centre)?.label}
                    </p>
                  </div>
                  <span className="grid size-10 shrink-0 place-items-center rounded-md bg-secondary text-primary">
                    <Building2 className="size-5" />
                  </span>
                </div>

                <div className="rounded-md bg-secondary px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Stock total
                  </p>
                  <p className="font-display text-xl font-bold text-primary">
                    {new Intl.NumberFormat("fr-FR").format(totaux[centre.id] ?? 0)}{" "}
                    <span className="text-xs font-medium text-muted-foreground">unités</span>
                  </p>
                </div>

                <p className="text-xs text-muted-foreground">
                  {centre.contact_nom || "Contact non renseigné"}
                  {centre.contact_telephone ? ` · ${centre.contact_telephone}` : ""}
                </p>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <Badge
                    className={
                      centre.actif
                        ? "bg-success/12 text-success hover:bg-success/12"
                        : "bg-muted text-muted-foreground hover:bg-muted"
                    }
                  >
                    {centre.actif ? "Actif" : "Désactivé"}
                  </Badge>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setForm({ ...centre })}>
                      <Pencil className="size-4" /> Modifier
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => void toggleActif(centre)}>
                      {centre.actif ? <Ban className="size-4" /> : <RotateLeft className="size-4" />}
                      {centre.actif ? "Désactiver" : "Réactiver"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!form} onOpenChange={(open) => !open && setForm(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-primary">
              {form?.id ? "Modifier le centre" : "Ajouter un centre de vente"}
            </DialogTitle>
            <DialogDescription>
              Renseignez la zone, le type de point de vente et le contact sur place.
            </DialogDescription>
          </DialogHeader>

          {form && (
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="nom">Nom du centre</Label>
                <Input
                  id="nom"
                  value={form.nom}
                  onChange={(event) => setForm({ ...form, nom: event.target.value })}
                  placeholder="Ex. Everest Fidjrossé"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="zone">Zone</Label>
                  <Input
                    id="zone"
                    value={form.zone ?? ""}
                    onChange={(event) => setForm({ ...form, zone: event.target.value })}
                    placeholder="Ex. Fidjrossé"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="type">Type</Label>
                  <Select
                    value={form.type_centre}
                    onValueChange={(value) => setForm({ ...form, type_centre: value as TypeCentre })}
                  >
                    <SelectTrigger id="type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="contact">Nom du contact</Label>
                  <Input
                    id="contact"
                    value={form.contact_nom ?? ""}
                    onChange={(event) => setForm({ ...form, contact_nom: event.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="tel">Téléphone</Label>
                  <Input
                    id="tel"
                    value={form.contact_telephone ?? ""}
                    onChange={(event) => setForm({ ...form, contact_telephone: event.target.value })}
                    placeholder="+229 …"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="adresse">Adresse</Label>
                <Input
                  id="adresse"
                  value={form.adresse ?? ""}
                  onChange={(event) => setForm({ ...form, adresse: event.target.value })}
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={form.actif}
                  onCheckedChange={(checked) => setForm({ ...form, actif: checked })}
                />
                Centre actif
              </label>
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setForm(null)}>
              Annuler
            </Button>
            <Button
              className="bg-accent text-accent-foreground hover:bg-accent/90"
              disabled={saving}
              onClick={() => void saveCentre()}
            >
              {saving && <LoaderCircle className="size-4 animate-spin" />} Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
