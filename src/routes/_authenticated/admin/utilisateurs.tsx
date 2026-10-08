import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute, redirect, useRouteContext } from "@tanstack/react-router";
import { Ban, Check, LoaderCircle, Pencil, RotateLeft, Search, Trash, UserCheck, X } from "@/components/ui/icons";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { deleteUser } from "@/lib/users.functions";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import type { Database } from "@/integrations/supabase/types";

type Role = Database["public"]["Enums"]["app_role"];
type Profil = {
  id: string; nom_complet: string; email: string; role_souhaite: Role; centre_id: string | null;
  statut: Database["public"]["Enums"]["account_status"]; actif: boolean; created_at: string;
};

const ROLES: Record<Role, string> = {
  admin: "Administrateur",
  gestionnaire_entrepot: "Gestionnaire d’entrepôt",
  responsable_centre: "Responsable de centre",
};

export const Route = createFileRoute("/_authenticated/admin/utilisateurs")({
  beforeLoad: ({ context }) => {
    if (!context.roles.includes("admin")) throw redirect({ to: "/dashboard" });
  },
  head: () => ({
    meta: [
      { title: "Utilisateurs — Everest Distribution" },
      { name: "description", content: "Gestion des comptes, rôles et accès d’Everest Distribution." },
      { property: "og:title", content: "Utilisateurs — Everest Distribution" },
      { property: "og:description", content: "Administration sécurisée des utilisateurs." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: UsersPage,
});

function UsersPage() {
  const { user } = useRouteContext({ from: "/_authenticated" });
  const [profils, setProfils] = useState<Profil[]>([]);
  const [roles, setRoles] = useState<Record<string, Role>>({});
  const [centres, setCentres] = useState<{ id: string; nom: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [recherche, setRecherche] = useState("");
  const [edition, setEdition] = useState<Profil | null>(null);
  const [aSupprimer, setASupprimer] = useState<Profil | null>(null);
  const supprimerFn = useServerFn(deleteUser);

  const charger = useCallback(async () => {
    const [p, r, c] = await Promise.all([
      supabase.from("profiles").select("id, nom_complet, email, role_souhaite, centre_id, statut, actif, created_at").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role"),
      supabase.from("centres").select("id, nom").order("nom"),
    ]);
    if (p.error) setError("Impossible de charger les utilisateurs.");
    setProfils((p.data ?? []) as Profil[]);
    setRoles(Object.fromEntries((r.data ?? []).map((x) => [x.user_id, x.role])));
    setCentres(c.data ?? []);
    setLoading(false);
  }, []);
  useEffect(() => { void charger(); }, [charger]);

  const nomCentre = (id: string | null) => (id ? centres.find((c) => c.id === id)?.nom ?? "—" : "—");
  const enAttente = profils.filter((p) => p.statut === "pending");
  const tous = useMemo(() => {
    const s = recherche.trim().toLowerCase();
    return profils.filter((p) => !s || p.nom_complet.toLowerCase().includes(s) || p.email.includes(s));
  }, [profils, recherche]);

  async function review(id: string, approve: boolean) {
    setActing(id); setError("");
    const { error: e } = await supabase.rpc("review_registration", { _user_id: id, _approve: approve });
    if (e) setError("La demande n’a pas pu être traitée."); else await charger();
    setActing(null);
  }

  async function maj(p: Profil, role: Role, centre: string | null, actif: boolean) {
    setActing(p.id); setError("");
    const { error: e } = await supabase.rpc("admin_update_user", { _user_id: p.id, _role: role, _centre: centre as string, _actif: actif });
    if (e) setError(e.message || "Modification impossible."); else { setEdition(null); await charger(); }
    setActing(null);
  }

  async function supprimer(p: Profil) {
    setActing(p.id);
    try {
      const r = await supprimerFn({ data: { userId: p.id } });
      if (r.ok) { toast.success(`${p.nom_complet} a été supprimé.`); setProfils((l) => l.filter((x) => x.id !== p.id)); }
      else toast.error(r.error);
    } catch { toast.error("La suppression a échoué."); }
    setActing(null); setASupprimer(null);
  }
  const boutonSupprimer = (p: Profil) => p.id === user.id ? null : (
    <Button size="sm" variant="outline" className="text-danger" disabled={acting === p.id} onClick={() => setASupprimer(p)}><Trash /> Supprimer</Button>
  );

  return (
    <AppShell>
      <div className="mb-6">
        <p className="mb-1 text-sm font-medium text-accent">Administration</p>
        <h1 className="text-3xl font-bold text-primary sm:text-4xl">Utilisateurs</h1>
        <p className="mt-2 text-sm text-muted-foreground">Validez les inscriptions et gérez les rôles et accès.</p>
      </div>
      {error && <p role="alert" className="mb-4 border-l-2 border-danger bg-danger/5 px-3 py-2 text-sm text-danger">{error}</p>}
      {loading ? (
        <div className="grid min-h-56 place-items-center"><LoaderCircle className="size-7 animate-spin text-primary" /></div>
      ) : (
        <Tabs defaultValue={enAttente.length ? "attente" : "tous"}>
          <TabsList>
            <TabsTrigger value="attente">En attente de validation ({enAttente.length})</TabsTrigger>
            <TabsTrigger value="tous">Tous les utilisateurs ({profils.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="attente" className="mt-5">
            {enAttente.length === 0 ? (
              <div className="grid min-h-56 place-items-center border border-dashed bg-card text-center">
                <div><UserCheck className="mx-auto size-10 text-success" /><p className="mt-3 text-sm text-muted-foreground">Aucune demande en attente.</p></div>
              </div>
            ) : (
              <div className="grid gap-3">
                {enAttente.map((p) => (
                  <Card key={p.id}><CardContent className="grid gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                    <div>
                      <div className="flex flex-wrap items-center gap-2"><h2 className="font-sans text-base font-semibold text-primary">{p.nom_complet}</h2><Badge variant="secondary">{ROLES[p.role_souhaite]}</Badge></div>
                      <p className="mt-1 text-sm text-muted-foreground">{p.email}{p.centre_id ? ` · ${nomCentre(p.centre_id)}` : ""} · {new Date(p.created_at).toLocaleDateString("fr-FR")}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" className="text-danger" disabled={acting === p.id} onClick={() => void review(p.id, false)}><X /> Refuser</Button>
                      <Button className="bg-success text-primary-foreground hover:bg-success/90" disabled={acting === p.id} onClick={() => void review(p.id, true)}>{acting === p.id ? <LoaderCircle className="animate-spin" /> : <Check />} Approuver</Button>
                      {boutonSupprimer(p)}
                    </div>
                  </CardContent></Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="tous" className="mt-5 space-y-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Rechercher par nom ou email…" value={recherche} onChange={(e) => setRecherche(e.target.value)} />
            </div>
            <div className="overflow-x-auto border bg-card">
              <table className="w-full text-sm">
                <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
                  <tr><th className="p-3">Nom</th><th className="p-3">Email</th><th className="p-3">Rôle</th><th className="p-3">Centre</th><th className="p-3">Statut</th><th className="p-3 text-right">Actions</th></tr>
                </thead>
                <tbody>
                  {tous.map((p) => {
                    const role = roles[p.id] ?? p.role_souhaite;
                    const moi = p.id === user.id;
                    const approuve = p.statut === "approved";
                    return (
                      <tr key={p.id} className="border-t">
                        <td className="p-3 font-medium text-primary">{p.nom_complet}{moi && <span className="ml-1 text-xs text-muted-foreground">(vous)</span>}</td>
                        <td className="p-3">{p.email}</td>
                        <td className="p-3">{approuve ? ROLES[role] : <span className="text-muted-foreground">{ROLES[p.role_souhaite]} (demandé)</span>}</td>
                        <td className="p-3">{nomCentre(p.centre_id)}</td>
                        <td className="p-3"><StatutBadge p={p} /></td>
                        <td className="p-3">
                          <div className="flex justify-end gap-2">
                          {approuve && (
                            <>
                              <Button size="sm" variant="outline" onClick={() => setEdition(p)}><Pencil /> Modifier</Button>
                              {!moi && (p.actif
                                ? <Button size="sm" variant="outline" className="text-danger" disabled={acting === p.id} onClick={() => void maj(p, role, p.centre_id, false)}><Ban /> Désactiver</Button>
                                : <Button size="sm" variant="outline" className="text-success" disabled={acting === p.id} onClick={() => void maj(p, role, p.centre_id, true)}><RotateLeft /> Réactiver</Button>)}
                            </>
                          )}
                          {boutonSupprimer(p)}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
      )}

      <AlertDialog open={!!aSupprimer} onOpenChange={(o) => !o && setASupprimer(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer définitivement {aSupprimer?.nom_complet} ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible. L’historique (mouvements, demandes, journal) est conservé.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction className="bg-danger text-primary-foreground hover:bg-danger/90" disabled={!!acting} onClick={(e) => { e.preventDefault(); if (aSupprimer) void supprimer(aSupprimer); }}>
              {acting && <LoaderCircle className="animate-spin" />} Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {edition && (
        <EditDialog p={edition} moi={edition.id === user.id} roleActuel={roles[edition.id] ?? edition.role_souhaite} centres={centres}
          saving={acting === edition.id} onClose={() => setEdition(null)} onSave={(r, c) => void maj(edition, r, c, edition.actif)} />
      )}
    </AppShell>
  );
}

function StatutBadge({ p }: { p: Profil }) {
  if (p.statut === "pending") return <Badge className="bg-warning/15 text-warning hover:bg-warning/15">En attente</Badge>;
  if (p.statut === "rejected") return <Badge className="bg-danger/10 text-danger hover:bg-danger/10">Refusé</Badge>;
  if (!p.actif) return <Badge className="bg-muted text-muted-foreground hover:bg-muted">Désactivé</Badge>;
  return <Badge className="bg-success/15 text-success hover:bg-success/15">Actif</Badge>;
}

function EditDialog({ p, moi, roleActuel, centres, saving, onClose, onSave }: {
  p: Profil; moi: boolean; roleActuel: Role; centres: { id: string; nom: string }[]; saving: boolean;
  onClose: () => void; onSave: (r: Role, c: string | null) => void;
}) {
  const [role, setRole] = useState<Role>(roleActuel);
  const [centre, setCentre] = useState(p.centre_id ?? "");
  const invalide = role === "responsable_centre" && !centre;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle className="text-primary">Modifier {p.nom_complet}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Rôle</Label>
            <Select value={role} onValueChange={(v) => setRole(v as Role)} disabled={moi}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{(Object.keys(ROLES) as Role[]).map((r) => <SelectItem key={r} value={r}>{ROLES[r]}</SelectItem>)}</SelectContent>
            </Select>
            {moi && <p className="text-xs text-muted-foreground">Vous ne pouvez pas retirer votre propre rôle administrateur.</p>}
          </div>
          {role === "responsable_centre" && (
            <div className="space-y-2">
              <Label>Centre assigné</Label>
              <Select value={centre} onValueChange={setCentre}>
                <SelectTrigger><SelectValue placeholder="Choisir un centre" /></SelectTrigger>
                <SelectContent>{centres.map((c) => <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button className="bg-accent text-accent-foreground hover:bg-accent/90" disabled={saving || invalide} onClick={() => onSave(role, role === "responsable_centre" ? centre : null)}>
            {saving && <LoaderCircle className="animate-spin" />} Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
