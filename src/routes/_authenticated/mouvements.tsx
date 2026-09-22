import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useRouteContext } from "@tanstack/react-router";
import { ArrowDownUp, LoaderCircle, Plus, Search } from "@/components/ui/icons";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  ENTREPOT,
  LIBELLES_TYPES,
  MouvementDialog,
  type TypeMouvement,
} from "@/components/stock/mouvement-dialog";
import { supabase } from "@/integrations/supabase/client";

type Mouvement = {
  id: string;
  produit_id: string;
  type_mouvement: TypeMouvement;
  quantite_unites: number;
  centre_source_id: string | null;
  centre_destination_id: string | null;
  motif: string | null;
  utilisateur_nom: string | null;
  created_at: string;
};

type Produit = { id: string; nom: string };
type Centre = { id: string; nom: string };

export const Route = createFileRoute("/_authenticated/mouvements")({
  head: () => ({
    meta: [
      { title: "Mouvements de stock — Everest Distribution" },
      {
        name: "description",
        content:
          "Journal horodaté des entrées, sorties, ventes, retours et casses de stock d’Everest Distribution.",
      },
      { property: "og:title", content: "Mouvements de stock — Everest Distribution" },
      {
        property: "og:description",
        content: "Historique complet des mouvements de stock par produit, centre et utilisateur.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MouvementsPage,
});

const TON_TYPE: Record<TypeMouvement, string> = {
  entree: "bg-success/12 text-success hover:bg-success/12",
  sortie_vers_centre: "bg-brand-soft text-primary hover:bg-brand-soft",
  vente: "bg-accent/15 text-accent hover:bg-accent/15",
  retour: "bg-warning/15 text-warning hover:bg-warning/15",
  casse_invendu: "bg-danger/12 text-danger hover:bg-danger/12",
};

const TOUS = "tous";

function MouvementsPage() {
  const { user, profile, roles } = useRouteContext({ from: "/_authenticated" });
  const isManager = roles.includes("admin") || roles.includes("gestionnaire_entrepot");

  const [mouvements, setMouvements] = useState<Mouvement[]>([]);
  const [produits, setProduits] = useState<Produit[]>([]);
  const [centres, setCentres] = useState<Centre[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const [filtreType, setFiltreType] = useState<string>(TOUS);
  const [filtreProduit, setFiltreProduit] = useState<string>(TOUS);
  const [filtreCentre, setFiltreCentre] = useState<string>(TOUS);
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [recherche, setRecherche] = useState("");

  async function loadAll() {
    setLoading(true);
    const [mouvementsRes, produitsRes, centresRes] = await Promise.all([
      supabase
        .from("mouvements_stock")
        .select(
          "id, produit_id, type_mouvement, quantite_unites, centre_source_id, centre_destination_id, motif, utilisateur_nom, created_at",
        )
        .order("created_at", { ascending: false })
        .limit(500),
      supabase.from("produits").select("id, nom").order("nom"),
      supabase.from("centres").select("id, nom").order("nom"),
    ]);
    if (mouvementsRes.error) {
      setError("Impossible de charger le journal des mouvements.");
    } else {
      setError("");
      setMouvements((mouvementsRes.data ?? []) as Mouvement[]);
      setProduits((produitsRes.data ?? []) as Produit[]);
      setCentres((centresRes.data ?? []) as Centre[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    void loadAll();
  }, []);

  const nomProduit = useMemo(
    () => new Map(produits.map((produit) => [produit.id, produit.nom])),
    [produits],
  );
  const nomCentre = useMemo(() => new Map(centres.map((centre) => [centre.id, centre.nom])), [centres]);

  const lignes = useMemo(() => {
    const terme = recherche.trim().toLowerCase();
    const debut = dateDebut ? new Date(`${dateDebut}T00:00:00`) : null;
    const fin = dateFin ? new Date(`${dateFin}T23:59:59`) : null;
    return mouvements.filter((mouvement) => {
      if (filtreType !== TOUS && mouvement.type_mouvement !== filtreType) return false;
      if (filtreProduit !== TOUS && mouvement.produit_id !== filtreProduit) return false;
      if (filtreCentre !== TOUS) {
        const cible = filtreCentre === ENTREPOT ? null : filtreCentre;
        if (mouvement.centre_source_id !== cible && mouvement.centre_destination_id !== cible) {
          return false;
        }
      }
      const date = new Date(mouvement.created_at);
      if (debut && date < debut) return false;
      if (fin && date > fin) return false;
      if (terme) {
        const texte = `${nomProduit.get(mouvement.produit_id) ?? ""} ${mouvement.utilisateur_nom ?? ""} ${mouvement.motif ?? ""}`;
        if (!texte.toLowerCase().includes(terme)) return false;
      }
      return true;
    });
  }, [mouvements, filtreType, filtreProduit, filtreCentre, dateDebut, dateFin, recherche, nomProduit]);

  const typesAutorises: TypeMouvement[] = isManager
    ? ["entree", "sortie_vers_centre", "vente", "retour", "casse_invendu"]
    : ["vente", "retour", "casse_invendu"];

  const peutCreer = isManager || !!profile.centre_id;

  function emplacement(id: string | null) {
    if (id === null) return "Entrepôt central";
    return nomCentre.get(id) ?? "Centre";
  }

  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-primary sm:text-3xl">Mouvements</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isManager
              ? "Journal horodaté de tous les mouvements de stock."
              : "Historique des mouvements de votre centre de vente."}
          </p>
        </div>
        {peutCreer && (
          <Button
            className="bg-accent text-accent-foreground hover:bg-accent/90"
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="size-4" /> {isManager ? "Nouveau mouvement" : "Enregistrer une vente"}
          </Button>
        )}
      </div>

      <Card className="mt-6">
        <CardContent className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-5">
          <div className="grid gap-2">
            <Label htmlFor="f-type" className="text-xs text-muted-foreground">
              Type
            </Label>
            <Select value={filtreType} onValueChange={setFiltreType}>
              <SelectTrigger id="f-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TOUS}>Tous les types</SelectItem>
                {(Object.keys(LIBELLES_TYPES) as TypeMouvement[]).map((valeur) => (
                  <SelectItem key={valeur} value={valeur}>
                    {LIBELLES_TYPES[valeur]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="f-produit" className="text-xs text-muted-foreground">
              Produit
            </Label>
            <Select value={filtreProduit} onValueChange={setFiltreProduit}>
              <SelectTrigger id="f-produit">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TOUS}>Tous les produits</SelectItem>
                {produits.map((produit) => (
                  <SelectItem key={produit.id} value={produit.id}>
                    {produit.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isManager && (
            <div className="grid gap-2">
              <Label htmlFor="f-centre" className="text-xs text-muted-foreground">
                Emplacement
              </Label>
              <Select value={filtreCentre} onValueChange={setFiltreCentre}>
                <SelectTrigger id="f-centre">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={TOUS}>Tous les emplacements</SelectItem>
                  <SelectItem value={ENTREPOT}>Entrepôt central</SelectItem>
                  {centres.map((centre) => (
                    <SelectItem key={centre.id} value={centre.id}>
                      {centre.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="f-debut" className="text-xs text-muted-foreground">
              Du
            </Label>
            <Input
              id="f-debut"
              type="date"
              value={dateDebut}
              onChange={(event) => setDateDebut(event.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="f-fin" className="text-xs text-muted-foreground">
              Au
            </Label>
            <Input
              id="f-fin"
              type="date"
              value={dateFin}
              onChange={(event) => setDateFin(event.target.value)}
            />
          </div>

          <div className="relative md:col-span-2 xl:col-span-5">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={recherche}
              onChange={(event) => setRecherche(event.target.value)}
              placeholder="Rechercher un produit, un utilisateur, un motif…"
              aria-label="Rechercher dans le journal"
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}

      <Card className="mt-6">
        <CardContent className="overflow-x-auto p-0">
          {loading ? (
            <div className="flex items-center gap-2 p-8 text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" /> Chargement…
            </div>
          ) : lignes.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              <ArrowDownUp className="mx-auto mb-3 size-6 text-primary" />
              Aucun mouvement enregistré pour ces filtres.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Produit</TableHead>
                  <TableHead className="text-right">Unités</TableHead>
                  <TableHead>Origine</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead>Motif</TableHead>
                  <TableHead>Utilisateur</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lignes.map((mouvement) => (
                  <TableRow key={mouvement.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {new Intl.DateTimeFormat("fr-FR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      }).format(new Date(mouvement.created_at))}
                    </TableCell>
                    <TableCell>
                      <Badge className={TON_TYPE[mouvement.type_mouvement]}>
                        {LIBELLES_TYPES[mouvement.type_mouvement]}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      {nomProduit.get(mouvement.produit_id) ?? "Produit"}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {new Intl.NumberFormat("fr-FR").format(mouvement.quantite_unites)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {mouvement.type_mouvement === "entree" ? "—" : emplacement(mouvement.centre_source_id)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {mouvement.type_mouvement === "vente" || mouvement.type_mouvement === "casse_invendu"
                        ? "—"
                        : emplacement(mouvement.centre_destination_id)}
                    </TableCell>
                    <TableCell className="max-w-56 truncate text-muted-foreground">
                      {mouvement.motif ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {mouvement.utilisateur_nom ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <MouvementDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        isManager={isManager}
        centreDuProfil={profile.centre_id ?? null}
        utilisateurId={user.id}
        typesAutorises={typesAutorises}
        titre={isManager ? "Nouveau mouvement" : "Enregistrer un mouvement"}
        onSaved={() => void loadAll()}
      />
    </AppShell>
  );
}
