import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const deleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) return { ok: false as const, error: "Accès administrateur requis." };
    if (data.userId === userId) return { ok: false as const, error: "Vous ne pouvez pas supprimer votre propre compte." };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: cible } = await supabaseAdmin.from("profiles").select("nom_complet, email").eq("id", data.userId).maybeSingle();
    const { data: roleCible } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", data.userId);
    if ((roleCible ?? []).some((r) => r.role === "admin")) {
      const { count } = await supabaseAdmin.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "admin");
      if ((count ?? 0) <= 1) return { ok: false as const, error: "Impossible de supprimer le dernier administrateur." };
    }

    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) {
      console.error("deleteUser", error);
      return { ok: false as const, error: "La suppression a échoué." };
    }
    const { data: auteur } = await supabaseAdmin.from("profiles").select("nom_complet").eq("id", userId).maybeSingle();
    await supabaseAdmin.from("journal_audit").insert({
      categorie: "permission",
      action: "Utilisateur supprimé",
      description: `${cible?.nom_complet ?? "Inconnu"} (${cible?.email ?? "—"}) supprimé définitivement`,
      cible: cible?.email ?? data.userId,
      auteur_id: userId,
      auteur_nom: auteur?.nom_complet ?? null,
      details: { user_id: data.userId, nom: cible?.nom_complet, email: cible?.email },
    });
    return { ok: true as const };
  });
