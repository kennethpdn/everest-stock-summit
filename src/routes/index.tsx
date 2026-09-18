import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({ head: () => ({ meta: [
  { title: "Everest Distribution — Gestion de stock" }, { name: "description", content: "Accédez à la plateforme sécurisée de gestion de stock multi-centres Everest Distribution." },
  { property: "og:title", content: "Everest Distribution — Gestion de stock" }, { property: "og:description", content: "Plateforme sécurisée de gestion de stock multi-centres." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
] }), component: HomePage });
function HomePage() { return <AuthShell><div className="border-t-4 border-accent bg-card px-6 py-8 shadow-sm sm:px-8"><span className="grid size-11 place-items-center rounded-md bg-brand-soft text-primary"><ShieldCheck className="size-6" /></span><h2 className="mt-6 text-3xl font-bold text-primary">Bienvenue</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">Connectez-vous pour accéder à votre espace de gestion, ou demandez la création d’un compte.</p><div className="mt-8 grid gap-3"><Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90"><Link to="/auth">Se connecter <ArrowRight /></Link></Button><Button asChild size="lg" variant="outline"><Link to="/inscription">Créer un compte</Link></Button></div></div></AuthShell>; }