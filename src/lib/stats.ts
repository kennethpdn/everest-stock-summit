import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type TypeMvt = Database["public"]["Enums"]["type_mouvement"];

export type Mvt = {
  id: string;
  type_mouvement: TypeMvt;
  quantite_unites: number;
  created_at: string;
  produit_id: string;
  centre_source_id: string | null;
  centre_destination_id: string | null;
  produits: { nom: string; prix_unitaire: number } | null;
};

export const fcfa = (n: number) =>
  `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n)} FCFA`;
export const nombre = (n: number) => new Intl.NumberFormat("fr-FR").format(n);

/** Les règles de la base limitent automatiquement les lignes au centre d'un responsable. */
export async function fetchMouvements(opts: { depuis: Date; jusqua?: Date; types?: TypeMvt[]; centreId?: string | undefined; produitId?: string | undefined }) {
  let q = supabase
    .from("mouvements_stock")
    .select("id, type_mouvement, quantite_unites, created_at, produit_id, centre_source_id, centre_destination_id, produits(nom, prix_unitaire)")
    .gte("created_at", opts.depuis.toISOString())
    .order("created_at", { ascending: false })
    .limit(5000);
  if (opts.jusqua) q = q.lte("created_at", opts.jusqua.toISOString());
  if (opts.types) q = q.in("type_mouvement", opts.types);
  if (opts.centreId) q = q.eq("centre_source_id", opts.centreId);
  if (opts.produitId) q = q.eq("produit_id", opts.produitId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Mvt[];
}

export const valeurVente = (m: Mvt) => m.quantite_unites * Number(m.produits?.prix_unitaire ?? 0);
