import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Mountain } from "lucide-react";

export function AuthShell({ children }: { children: ReactNode }) {
  return <main className="grid min-h-screen bg-background lg:grid-cols-[minmax(280px,0.8fr)_1.2fr]">
    <section className="hidden bg-primary px-12 py-14 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
      <Link to="/" className="flex items-center gap-4" aria-label="Everest Distribution"><span className="relative grid size-14 place-items-center rounded-md bg-accent text-primary"><Mountain className="size-9" /><span className="absolute inset-x-1.5 top-1.5 h-4 rounded-[50%] border-t-2 border-primary" /></span><span><strong className="block font-display text-xl">EVEREST</strong><span className="block text-xs font-semibold text-accent">DISTRIBUTION</span></span></Link>
      <div className="max-w-md"><p className="text-sm font-semibold text-accent">GESTION MULTI-CENTRES</p><h1 className="mt-4 text-4xl font-bold leading-tight">Le contrôle du stock, du sommet jusqu’à chaque centre.</h1><p className="mt-5 text-sm leading-6 text-primary-foreground/75">Un accès sécurisé et adapté à la responsabilité de chaque membre de l’équipe.</p></div>
      <p className="text-xs text-primary-foreground/55">L’EXCELLENCE AU SOMMET DE LA DISTRIBUTION</p>
    </section>
    <section className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-8"><div className="w-full max-w-md"><div className="mb-8 flex items-center gap-3 lg:hidden"><span className="grid size-10 place-items-center rounded-md bg-primary text-accent"><Mountain className="size-6" /></span><span className="font-display font-bold text-primary">EVEREST DISTRIBUTION</span></div>{children}</div></section>
  </main>;
}