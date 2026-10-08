import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useRouteContext } from "@tanstack/react-router";
import { Boxes, LoaderCircle, Pencil, Search } from "@/components/ui/icons";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";

const ENTREPOT = "entrepot";

type Produit = { id: string; nom: string; reference_format: string; unites_par_pack: number };
type Centre = { id: string; nom: string; zone: string | null };
type Stock = {
  id: string;
  produit_id: string;
  centre_id: string | null;
  quantite_unites: number;
  seuil_alerte: number;
  derniere_maj: string;
};

type Ligne = {
  produit: Produit;
  stock: Stock | null;
  quantite: number;
  seuil: number;
};

export const Route = createFileRoute("/_authenticated/stocks")({
  head: () => ({
    meta: [
      { title: "Stocks — Everest Distribution" },
      {
        name: "description",
        content:
          "Suivi du stock par produit et par emplacement : entrepôt central et centres de vente Everest Distribution.",
      },
      { property: "og:title", content: "Stocks — Everest Distribution" },
      {
        property: "og:description",
        content: "Niveaux de stock, seuils d’alerte et ruptures par emplacement.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StocksPage,
});

function statut(quantite: number, seuil: number) {
  if (quantite <= 0) {
    return { label: "Rupture de stock", className: "bg-danger/12 text-danger hover:bg-danger/12" };
  }
  if (quantite <= seuil) {
    return { label: "Stock faible", className: "bg-warning/15 text-warning hover:bg-warning/15" };
  }
  return { label: "Disponible", className: "bg-success/12 text-success hover:bg-success/12" };
}

function StocksPage() {
  const { profile, roles } = useRouteContext({ from: "/_authenticated" });
  const isManager = roles.includes("admin") || roles.includes("gestionnaire_entrepot");
  const centreDuProfil = profile.centre_id ?? null;

  const [emplacement, setEmplacement] = useState<string>(
    isManager ? ENTREPOT : (centreDuProfil ?? ENTREPOT),
  );
  const [centres, setCentres] = useState<Centre[]>([]);
  const [produits, setProduits] = useState<Produit[]>([]);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [edition, setEdition] = useState<Ligne | null>(null);
  const [seuilDefaut, setSeuilDefaut] = useState(10);
  const [saving, setSaving] = useState(false);

  const centreId = emplacement === ENTREPOT ? null : emplacement;

  async function loadAll() {
    setLoading(true);
    const [centresRes, produitsRes, stocksRes] = await Promise.all([
      supabase.from("centres").select("id, nom, zone").eq("actif", true).order("nom"),
      supabase
        .from("produits")
        .select("id, nom, reference_format, unites_par_pack")
        .eq("actif", true)
        .order("nom"),
      supabase
        .from("stocks")
        .select("id, produit_id, centre_id, quantite_unites, seuil_alerte, derniere_maj"),
    ]);
    const { data: params } = await supabase.from("parametres").select("seuil_alerte_defaut").maybeSingle();
    if (params) setSeuilDefaut(params.seuil_alerte_defaut);
    if (produitsRes.error || stocksRes.error) {
      setError("Impossible de charger les stocks.");
    } else {
      setError("");
      setCentres((centresRes.data ?? []) as Centre[]);
      setProduits((produitsRes.data ?? []) as Produit[]);
      setStocks((stocksRes.data ?? []) as Stock[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    void loadAll();
  }, []);

  const lignes = useMemo<Ligne[]>(() => {
    const term = search.trim().toLowerCase();
    const parEmplacement = new Map(
      stocks.filter((row) => (row.centre_id ?? null) === centreId).map((row) => [row.produit_id, row]),
    );
    const base = isManager
      ? produits
      : produits.filter((produit) => parEmplacement.has(produit.id));
    return base
      .filter((produit) => !term || produit.nom.toLowerCase().includes(term))
      .map((produit) => {
        const stock = parEmplacement.get(produit.id) ?? null;
        return {
          produit,
          stock,
          quantite: stock?.quantite_unites ?? 0,
          seuil: stock?.seuil_alerte ?? seuilDefaut,
        };
      });
  }, [produits, stocks, centreId, search, isManager, seuilDefaut]);

  const resume = useMemo(() => {
    let total = 0;
    let faibles = 0;
    let ruptures = 0;
    for (const ligne of lignes) {
      total += ligne.quantite;
      if (ligne.quantite <= 0) ruptures += 1;
      else if (ligne.quantite <= ligne.seuil) faibles += 1;
    }
    return { total, faibles, ruptures };
  }, [lignes]);

  async function saveLigne() {
    if (!edition) return;
    setSaving(true);
    const { error: saveError } = edition.stock
      ? await supabase
          .from("stocks")
          .update({ quantite_unites: edition.quantite, seuil_alerte: edition.seuil })
          .eq("id", edition.stock.id)
      : await supabase.from("stocks").insert({
          produit_id: edition.produit.id,
          centre_id: centreId,
          quantite_unites: edition.quantite,
          seuil_alerte: edition.seuil,
        });
    setSaving(false);
    if (saveError) {
      setError("Mise à jour impossible. Vérifiez vos droits sur cet emplacement.");
      return;
    }
    setEdition(null);
    await loadAll();
  }

  const nomEmplacement =
    centreId === null
      ? "Entrepôt central"
      : (centres.find((centre) => centre.id === centreId)?.nom ?? "Mon centre");

  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-primary sm:text-3xl">Stocks</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isManager
              ? "Niveaux de stock par produit pour l’entrepôt central et chaque centre de vente."
              : `Stock disponible pour ${nomEmplacement}.`}
          </p>
        </div>
        {isManager && (
          <div className="grid gap-2">
            <Label htmlFor="emplacement" className="text-xs text-muted-foreground">
              Emplacement
            </Label>
            <Select value={emplacement} onValueChange={setEmplacement}>
              <SelectTrigger id="emplacement" className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ENTREPOT}>Entrepôt central</SelectItem>
                {centres.map((centre) => (
                  <SelectItem key={centre.id} value={centre.id}>
                    {centre.nom}
                    {centre.zone ? ` — ${centre.zone}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Unités en stock</p>
            <p className="font-display text-2xl font-bold text-primary">
              {new Intl.NumberFormat("fr-FR").format(resume.total)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Stocks faibles</p>
            <p className="font-display text-2xl font-bold text-warning">{resume.faibles}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Ruptures</p>
            <p className="font-display text-2xl font-bold text-danger">{resume.ruptures}</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Rechercher un produit…"
          aria-label="Rechercher un produit"
          className="pl-9"
        />
      </div>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}

      <Card className="mt-6">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center gap-2 p-8 text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" /> Chargement…
            </div>
          ) : lignes.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              <Boxes className="mx-auto mb-3 size-6 text-primary" />
              Aucun stock enregistré pour {nomEmplacement}.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produit</TableHead>
                  <TableHead>Format</TableHead>
                  <TableHead className="text-right">Unités</TableHead>
                  <TableHead className="text-right">Seuil</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lignes.map((ligne) => {
                  const badge = statut(ligne.quantite, ligne.seuil);
                  const editable = isManager || !!ligne.stock;
                  return (
                    <TableRow key={ligne.produit.id}>
                      <TableCell className="font-medium text-foreground">{ligne.produit.nom}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {ligne.produit.reference_format}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {new Intl.NumberFormat("fr-FR").format(ligne.quantite)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">{ligne.seuil}</TableCell>
                      <TableCell>
                        <Badge className={badge.className}>{badge.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {editable && (
                          <Button variant="ghost" size="sm" onClick={() => setEdition({ ...ligne })}>
                            <Pencil className="size-4" /> Ajuster
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!edition} onOpenChange={(open) => !open && setEdition(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-primary">
              Ajuster le stock — {edition?.produit.nom}
            </DialogTitle>
            <DialogDescription>Emplacement : {nomEmplacement}</DialogDescription>
          </DialogHeader>
          {edition && (
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="quantite">Quantité (unités)</Label>
                <Input
                  id="quantite"
                  type="number"
                  min={0}
                  value={edition.quantite}
                  onChange={(event) =>
                    setEdition({ ...edition, quantite: Math.max(0, Number(event.target.value)) })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="seuil">Seuil d’alerte</Label>
                <Input
                  id="seuil"
                  type="number"
                  min={0}
                  value={edition.seuil}
                  disabled={!isManager}
                  onChange={(event) =>
                    setEdition({ ...edition, seuil: Math.max(0, Number(event.target.value)) })
                  }
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEdition(null)}>
              Annuler
            </Button>
            <Button
              className="bg-accent text-accent-foreground hover:bg-accent/90"
              disabled={saving}
              onClick={() => void saveLigne()}
            >
              {saving && <LoaderCircle className="size-4 animate-spin" />} Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
