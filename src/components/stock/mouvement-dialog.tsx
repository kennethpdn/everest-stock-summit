import { useEffect, useMemo, useState } from "react";
import { LoaderCircle } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

export const ENTREPOT = "entrepot";

export type TypeMouvement =
  | "entree"
  | "sortie_vers_centre"
  | "vente"
  | "retour"
  | "casse_invendu";

export const LIBELLES_TYPES: Record<TypeMouvement, string> = {
  entree: "Entrée en entrepôt",
  sortie_vers_centre: "Sortie vers un centre",
  vente: "Vente",
  retour: "Retour",
  casse_invendu: "Casse / invendu",
};

type Produit = { id: string; nom: string; reference_format: string };
type Centre = { id: string; nom: string; zone: string | null };

export function MouvementDialog({
  open,
  onOpenChange,
  isManager,
  centreDuProfil,
  utilisateurId,
  typesAutorises,
  onSaved,
  titre = "Nouveau mouvement",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isManager: boolean;
  centreDuProfil: string | null;
  utilisateurId: string;
  typesAutorises: TypeMouvement[];
  onSaved?: () => void;
  titre?: string;
}) {
  const [produits, setProduits] = useState<Produit[]>([]);
  const [centres, setCentres] = useState<Centre[]>([]);
  const [type, setType] = useState<TypeMouvement>(typesAutorises[0]!);
  const [produitId, setProduitId] = useState("");
  const [quantite, setQuantite] = useState("1");
  const [source, setSource] = useState<string>(isManager ? ENTREPOT : (centreDuProfil ?? ENTREPOT));
  const [destination, setDestination] = useState<string>(ENTREPOT);
  const [motif, setMotif] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
    void (async () => {
      const [produitsRes, centresRes] = await Promise.all([
        supabase
          .from("produits")
          .select("id, nom, reference_format")
          .eq("actif", true)
          .order("nom"),
        supabase.from("centres").select("id, nom, zone").eq("actif", true).order("nom"),
      ]);
      setProduits((produitsRes.data ?? []) as Produit[]);
      setCentres((centresRes.data ?? []) as Centre[]);
    })();
  }, [open]);

  const besoinSource = type !== "entree";
  const besoinDestination = type === "entree" || type === "sortie_vers_centre" || type === "retour";
  const motifRequis = type === "retour" || type === "casse_invendu";

  const produitsOptions = useMemo(() => produits, [produits]);

  function reset() {
    setProduitId("");
    setQuantite("1");
    setMotif("");
    setDestination(ENTREPOT);
    setSource(isManager ? ENTREPOT : (centreDuProfil ?? ENTREPOT));
    setType(typesAutorises[0]!);
  }

  async function submit() {
    setError("");
    const qte = Number(quantite);
    if (!produitId) return setError("Sélectionnez un produit.");
    if (!Number.isFinite(qte) || qte <= 0) return setError("La quantité doit être supérieure à 0.");
    if (motifRequis && !motif.trim()) return setError("Le motif est obligatoire pour ce type de mouvement.");
    if (type === "sortie_vers_centre" && destination === ENTREPOT) {
      return setError("Choisissez le centre destinataire.");
    }

    setSaving(true);
    const { error: insertError } = await supabase.from("mouvements_stock").insert({
      produit_id: produitId,
      type_mouvement: type,
      quantite_unites: Math.round(qte),
      centre_source_id: besoinSource ? (source === ENTREPOT ? null : source) : null,
      centre_destination_id: besoinDestination ? (destination === ENTREPOT ? null : destination) : null,
      motif: motif.trim() || null,
      utilisateur_id: utilisateurId,
    });
    setSaving(false);

    if (insertError) {
      setError(
        insertError.message.includes("row-level security")
          ? "Vous n’êtes pas autorisé à enregistrer ce mouvement."
          : insertError.message,
      );
      return;
    }
    reset();
    onOpenChange(false);
    onSaved?.();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-primary">{titre}</DialogTitle>
          <DialogDescription>
            Le stock est mis à jour automatiquement et ne peut jamais devenir négatif.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          {typesAutorises.length > 1 && (
            <div className="grid gap-2">
              <Label htmlFor="type-mouvement">Type de mouvement</Label>
              <Select value={type} onValueChange={(value) => setType(value as TypeMouvement)}>
                <SelectTrigger id="type-mouvement">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {typesAutorises.map((valeur) => (
                    <SelectItem key={valeur} value={valeur}>
                      {LIBELLES_TYPES[valeur]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="produit">Produit</Label>
            <Select value={produitId} onValueChange={setProduitId}>
              <SelectTrigger id="produit">
                <SelectValue placeholder="Sélectionner un produit" />
              </SelectTrigger>
              <SelectContent>
                {produitsOptions.map((produit) => (
                  <SelectItem key={produit.id} value={produit.id}>
                    {produit.nom} — {produit.reference_format}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="quantite-mvt">Quantité (unités)</Label>
            <Input
              id="quantite-mvt"
              type="number"
              min={1}
              value={quantite}
              onChange={(event) => setQuantite(event.target.value)}
            />
          </div>

          {besoinSource && isManager && (
            <div className="grid gap-2">
              <Label htmlFor="source">Emplacement d’origine</Label>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger id="source">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
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

          {besoinDestination && (
            <div className="grid gap-2">
              <Label htmlFor="destination">Emplacement de destination</Label>
              <Select value={destination} onValueChange={setDestination}>
                <SelectTrigger id="destination">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
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
            <Label htmlFor="motif">Motif{motifRequis ? "" : " (facultatif)"}</Label>
            <Textarea
              id="motif"
              rows={2}
              value={motif}
              onChange={(event) => setMotif(event.target.value)}
              placeholder={motifRequis ? "Ex. bouteilles cassées à la livraison" : "Commentaire"}
            />
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            className="bg-accent text-accent-foreground hover:bg-accent/90"
            disabled={saving}
            onClick={() => void submit()}
          >
            {saving && <LoaderCircle className="size-4 animate-spin" />} Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
