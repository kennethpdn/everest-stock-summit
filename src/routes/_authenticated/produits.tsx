import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useRouteContext } from "@tanstack/react-router";
import {
  Ban,
  CloudUpload,
  ImageIcon,
  LoaderCircle,
  Package,
  Pencil,
  Plus,
  RotateLeft,
  Search,
  Tags,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

type Categorie = {
  id: string;
  nom: string;
  description: string | null;
  actif: boolean;
};

type Produit = {
  id: string;
  nom: string;
  categorie_id: string | null;
  reference_format: string;
  unites_par_pack: number;
  prix_unitaire: number;
  prix_pack: number;
  sku_code_barres: string | null;
  photo_url: string | null;
  actif: boolean;
};

const BUCKET = "produits-photos";

export const Route = createFileRoute("/_authenticated/produits")({
  head: () => ({
    meta: [
      { title: "Produits — Everest Distribution" },
      {
        name: "description",
        content:
          "Catalogue des produits Everest Distribution : formats, prix en FCFA, catégories et photos.",
      },
      { property: "og:title", content: "Produits — Everest Distribution" },
      {
        property: "og:description",
        content: "Gérez le catalogue produits et les catégories de votre distribution.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProduitsPage,
});

function formatFcfa(value: number) {
  return `${new Intl.NumberFormat("fr-FR").format(value)} FCFA`;
}

function ProduitsPage() {
  const { roles } = useRouteContext({ from: "/_authenticated" });
  const canWrite = roles.includes("admin") || roles.includes("gestionnaire_entrepot");

  const [categories, setCategories] = useState<Categorie[]>([]);
  const [produits, setProduits] = useState<Produit[]>([]);
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [categorieFiltre, setCategorieFiltre] = useState("toutes");
  const [afficherInactifs, setAfficherInactifs] = useState(false);

  const [produitForm, setProduitForm] = useState<Produit | null>(null);
  const [categorieForm, setCategorieForm] = useState<Categorie | null>(null);

  async function loadAll() {
    setLoading(true);
    const [cat, prod] = await Promise.all([
      supabase.from("categories").select("id, nom, description, actif").order("nom"),
      supabase
        .from("produits")
        .select(
          "id, nom, categorie_id, reference_format, unites_par_pack, prix_unitaire, prix_pack, sku_code_barres, photo_url, actif",
        )
        .order("nom"),
    ]);
    if (cat.error || prod.error) {
      setError("Impossible de charger le catalogue.");
    } else {
      setCategories(cat.data ?? []);
      const rows = (prod.data ?? []).map((row) => ({
        ...row,
        prix_unitaire: Number(row.prix_unitaire),
        prix_pack: Number(row.prix_pack),
      })) as Produit[];
      setProduits(rows);
      const paths = rows.map((row) => row.photo_url).filter((path): path is string => !!path);
      if (paths.length > 0) {
        const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 3600);
        const map: Record<string, string> = {};
        for (const item of signed ?? []) {
          if (item.path && item.signedUrl) map[item.path] = item.signedUrl;
        }
        setPhotos(map);
      }
    }
    setLoading(false);
  }

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const categoriesParId = useMemo(
    () => Object.fromEntries(categories.map((item) => [item.id, item.nom])),
    [categories],
  );

  const produitsAffiches = useMemo(() => {
    const terme = search.trim().toLowerCase();
    return produits.filter((produit) => {
      if (!afficherInactifs && !produit.actif) return false;
      if (categorieFiltre !== "toutes" && produit.categorie_id !== categorieFiltre) return false;
      if (terme && !produit.nom.toLowerCase().includes(terme)) return false;
      return true;
    });
  }, [produits, search, categorieFiltre, afficherInactifs]);

  const categoriesAffichees = useMemo(
    () => categories.filter((item) => afficherInactifs || item.actif),
    [categories, afficherInactifs],
  );

  async function toggleProduit(produit: Produit) {
    const { error: updateError } = await supabase
      .from("produits")
      .update({ actif: !produit.actif })
      .eq("id", produit.id);
    if (updateError) setError("Modification impossible.");
    else setProduits((rows) => rows.map((row) => (row.id === produit.id ? { ...row, actif: !row.actif } : row)));
  }

  async function toggleCategorie(categorie: Categorie) {
    const { error: updateError } = await supabase
      .from("categories")
      .update({ actif: !categorie.actif })
      .eq("id", categorie.id);
    if (updateError) setError("Modification impossible.");
    else
      setCategories((rows) =>
        rows.map((row) => (row.id === categorie.id ? { ...row, actif: !row.actif } : row)),
      );
  }

  return (
    <AppShell>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-sm font-medium text-accent">Catalogue</p>
          <h1 className="text-3xl font-bold text-primary sm:text-4xl">Produits</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Formats, conditionnements et tarifs en FCFA de tous vos articles.
          </p>
        </div>
      </div>

      {error && (
        <p role="alert" className="mb-5 border-l-2 border-danger bg-danger/5 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <Tabs defaultValue="produits">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="produits">
              <Package className="mr-2 size-4" /> Produits
            </TabsTrigger>
            <TabsTrigger value="categories">
              <Tags className="mr-2 size-4" /> Catégories
            </TabsTrigger>
          </TabsList>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Switch checked={afficherInactifs} onCheckedChange={setAfficherInactifs} />
            Afficher les éléments désactivés
          </label>
        </div>

        <TabsContent value="produits" className="mt-6">
          <div className="mb-6 grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher un produit…"
                aria-label="Rechercher un produit par nom"
                className="pl-10"
              />
            </div>
            <Select value={categorieFiltre} onValueChange={setCategorieFiltre}>
              <SelectTrigger aria-label="Filtrer par catégorie">
                <SelectValue placeholder="Toutes les catégories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="toutes">Toutes les catégories</SelectItem>
                {categories.map((categorie) => (
                  <SelectItem key={categorie.id} value={categorie.id}>
                    {categorie.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {canWrite && (
              <Button
                className="bg-accent text-accent-foreground hover:bg-accent/90"
                onClick={() =>
                  setProduitForm({
                    id: "",
                    nom: "",
                    categorie_id: null,
                    reference_format: "",
                    unites_par_pack: 1,
                    prix_unitaire: 0,
                    prix_pack: 0,
                    sku_code_barres: null,
                    photo_url: null,
                    actif: true,
                  })
                }
              >
                <Plus /> Ajouter un produit
              </Button>
            )}
          </div>

          {loading ? (
            <div className="grid min-h-56 place-items-center">
              <LoaderCircle className="size-7 animate-spin text-primary" />
            </div>
          ) : produitsAffiches.length === 0 ? (
            <div className="grid min-h-64 place-items-center rounded-lg border border-dashed bg-card text-center">
              <div className="px-6">
                <Package className="mx-auto size-9 text-primary/25" aria-hidden="true" />
                <h2 className="mt-3 text-lg font-semibold text-primary">Aucun produit</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Ajoutez vos premiers articles pour constituer le catalogue.
                </p>
              </div>
            </div>
          ) : (
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {produitsAffiches.map((produit) => (
                <Card key={produit.id} className="overflow-hidden border-border/80 py-0 shadow-sm">
                  <div className="grid h-40 place-items-center bg-secondary">
                    {produit.photo_url && photos[produit.photo_url] ? (
                      <img
                        src={photos[produit.photo_url]}
                        alt={produit.nom}
                        className="h-40 w-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="size-8 text-muted-foreground/50" aria-hidden="true" />
                    )}
                  </div>
                  <CardContent className="p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display text-lg font-semibold text-primary">{produit.nom}</h2>
                      {produit.actif ? (
                        <Badge className="bg-success/10 text-success">Actif</Badge>
                      ) : (
                        <Badge variant="secondary">Désactivé</Badge>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {produit.categorie_id ? categoriesParId[produit.categorie_id] : "Sans catégorie"} ·{" "}
                      {produit.reference_format}
                    </p>
                    <dl className="mt-4 grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <dt className="text-xs text-muted-foreground">Unité</dt>
                        <dd className="font-semibold text-foreground">{formatFcfa(produit.prix_unitaire)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">Pack</dt>
                        <dd className="font-semibold text-foreground">{formatFcfa(produit.prix_pack)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">Unités/pack</dt>
                        <dd className="font-semibold text-foreground">{produit.unites_par_pack}</dd>
                      </div>
                    </dl>
                    {produit.sku_code_barres && (
                      <p className="mt-3 text-xs text-muted-foreground">SKU : {produit.sku_code_barres}</p>
                    )}
                    {canWrite && (
                      <div className="mt-5 flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setProduitForm(produit)}>
                          <Pencil /> Modifier
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className={produit.actif ? "text-danger" : "text-success"}
                          onClick={() => void toggleProduit(produit)}
                        >
                          {produit.actif ? <Ban /> : <RotateLeft />}
                          {produit.actif ? "Désactiver" : "Réactiver"}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </section>
          )}
        </TabsContent>

        <TabsContent value="categories" className="mt-6">
          {canWrite && (
            <Button
              className="mb-5 bg-accent text-accent-foreground hover:bg-accent/90"
              onClick={() => setCategorieForm({ id: "", nom: "", description: null, actif: true })}
            >
              <Plus /> Ajouter une catégorie
            </Button>
          )}
          {categoriesAffichees.length === 0 ? (
            <div className="grid min-h-48 place-items-center rounded-lg border border-dashed bg-card text-center">
              <div className="px-6">
                <Tags className="mx-auto size-9 text-primary/25" aria-hidden="true" />
                <h2 className="mt-3 text-lg font-semibold text-primary">Aucune catégorie</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Créez par exemple « Vins pétillants » ou « Boissons sans alcool ».
                </p>
              </div>
            </div>
          ) : (
            <section className="grid gap-3">
              {categoriesAffichees.map((categorie) => (
                <Card key={categorie.id}>
                  <CardContent className="grid gap-4 p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-sans text-base font-semibold text-primary">{categorie.nom}</h2>
                        {categorie.actif ? (
                          <Badge className="bg-success/10 text-success">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Désactivée</Badge>
                        )}
                      </div>
                      {categorie.description && (
                        <p className="mt-1 text-sm text-muted-foreground">{categorie.description}</p>
                      )}
                    </div>
                    {canWrite && (
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setCategorieForm(categorie)}>
                          <Pencil /> Modifier
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className={categorie.actif ? "text-danger" : "text-success"}
                          onClick={() => void toggleCategorie(categorie)}
                        >
                          {categorie.actif ? <Ban /> : <RotateLeft />}
                          {categorie.actif ? "Désactiver" : "Réactiver"}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </section>
          )}
        </TabsContent>
      </Tabs>

      {produitForm && (
        <ProduitDialog
          produit={produitForm}
          categories={categories}
          onClose={() => setProduitForm(null)}
          onSaved={() => {
            setProduitForm(null);
            void loadAll();
          }}
        />
      )}

      {categorieForm && (
        <CategorieDialog
          categorie={categorieForm}
          onClose={() => setCategorieForm(null)}
          onSaved={() => {
            setCategorieForm(null);
            void loadAll();
          }}
        />
      )}
    </AppShell>
  );
}

function ProduitDialog({
  produit,
  categories,
  onClose,
  onSaved,
}: {
  produit: Produit;
  categories: Categorie[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState(produit);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.nom.trim()) {
      setMessage("Le nom du produit est obligatoire.");
      return;
    }
    setSaving(true);
    setMessage("");

    let photoPath = form.photo_url;
    if (file) {
      const extension = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: false, contentType: file.type });
      if (uploadError) {
        setMessage("L’envoi de la photo a échoué.");
        setSaving(false);
        return;
      }
      photoPath = path;
    }

    const payload = {
      nom: form.nom.trim(),
      categorie_id: form.categorie_id,
      reference_format: form.reference_format.trim() || "Unité",
      unites_par_pack: Number(form.unites_par_pack) || 1,
      prix_unitaire: Number(form.prix_unitaire) || 0,
      prix_pack: Number(form.prix_pack) || 0,
      sku_code_barres: form.sku_code_barres?.trim() || null,
      photo_url: photoPath,
      actif: form.actif,
    };

    const { error: saveError } = form.id
      ? await supabase.from("produits").update(payload).eq("id", form.id)
      : await supabase.from("produits").insert(payload);

    setSaving(false);
    if (saveError) setMessage("Enregistrement impossible. Vérifiez vos droits et les champs saisis.");
    else onSaved();
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-primary">
            {form.id ? "Modifier le produit" : "Ajouter un produit"}
          </DialogTitle>
          <DialogDescription>Renseignez le format et les tarifs en FCFA.</DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="nom">Nom du produit</Label>
            <Input
              id="nom"
              value={form.nom}
              maxLength={120}
              onChange={(event) => setForm({ ...form, nom: event.target.value })}
              placeholder="Rojito"
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="categorie">Catégorie</Label>
            <Select
              value={form.categorie_id ?? "aucune"}
              onValueChange={(value) => setForm({ ...form, categorie_id: value === "aucune" ? null : value })}
            >
              <SelectTrigger id="categorie">
                <SelectValue placeholder="Choisir une catégorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="aucune">Sans catégorie</SelectItem>
                {categories.map((categorie) => (
                  <SelectItem key={categorie.id} value={categorie.id}>
                    {categorie.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="format">Format de référence</Label>
              <Input
                id="format"
                value={form.reference_format}
                maxLength={60}
                onChange={(event) => setForm({ ...form, reference_format: event.target.value })}
                placeholder="Canette 33cl"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="unites">Unités par pack</Label>
              <Input
                id="unites"
                type="number"
                min={1}
                value={form.unites_par_pack}
                onChange={(event) => setForm({ ...form, unites_par_pack: Number(event.target.value) })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="prix-unitaire">Prix unitaire (FCFA)</Label>
              <Input
                id="prix-unitaire"
                type="number"
                min={0}
                step={1}
                value={form.prix_unitaire}
                onChange={(event) => setForm({ ...form, prix_unitaire: Number(event.target.value) })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="prix-pack">Prix du pack (FCFA)</Label>
              <Input
                id="prix-pack"
                type="number"
                min={0}
                step={1}
                value={form.prix_pack}
                onChange={(event) => setForm({ ...form, prix_pack: Number(event.target.value) })}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="sku">SKU / code-barres (optionnel)</Label>
            <Input
              id="sku"
              value={form.sku_code_barres ?? ""}
              maxLength={60}
              onChange={(event) => setForm({ ...form, sku_code_barres: event.target.value })}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="photo">Photo du produit</Label>
            <Input
              id="photo"
              type="file"
              accept="image/*"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <CloudUpload className="size-3.5" aria-hidden="true" /> JPEG ou PNG, 10 Mo maximum.
            </p>
          </div>

          <label className="flex items-center gap-3 text-sm">
            <Switch
              checked={form.actif}
              onCheckedChange={(checked) => setForm({ ...form, actif: checked })}
            />
            Produit actif
          </label>

          {message && (
            <p role="alert" className="border-l-2 border-danger bg-danger/5 px-3 py-2 text-sm text-danger">
              {message}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={saving} className="bg-accent text-accent-foreground hover:bg-accent/90">
              {saving && <LoaderCircle className="animate-spin" />} Enregistrer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CategorieDialog({
  categorie,
  onClose,
  onSaved,
}: {
  categorie: Categorie;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState(categorie);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.nom.trim()) {
      setMessage("Le nom de la catégorie est obligatoire.");
      return;
    }
    setSaving(true);
    setMessage("");
    const payload = {
      nom: form.nom.trim(),
      description: form.description?.trim() || null,
      actif: form.actif,
    };
    const { error: saveError } = form.id
      ? await supabase.from("categories").update(payload).eq("id", form.id)
      : await supabase.from("categories").insert(payload);
    setSaving(false);
    if (saveError) setMessage("Enregistrement impossible. Ce nom existe peut-être déjà.");
    else onSaved();
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-primary">
            {form.id ? "Modifier la catégorie" : "Ajouter une catégorie"}
          </DialogTitle>
          <DialogDescription>Organisez vos produits par famille.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="categorie-nom">Nom</Label>
            <Input
              id="categorie-nom"
              value={form.nom}
              maxLength={80}
              onChange={(event) => setForm({ ...form, nom: event.target.value })}
              placeholder="Vins pétillants"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="categorie-description">Description (optionnel)</Label>
            <Textarea
              id="categorie-description"
              value={form.description ?? ""}
              maxLength={300}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
            />
          </div>
          <label className="flex items-center gap-3 text-sm">
            <Switch
              checked={form.actif}
              onCheckedChange={(checked) => setForm({ ...form, actif: checked })}
            />
            Catégorie active
          </label>
          {message && (
            <p role="alert" className="border-l-2 border-danger bg-danger/5 px-3 py-2 text-sm text-danger">
              {message}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={saving} className="bg-accent text-accent-foreground hover:bg-accent/90">
              {saving && <LoaderCircle className="animate-spin" />} Enregistrer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
