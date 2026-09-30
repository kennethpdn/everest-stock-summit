# Everest Inventory Manager

Crée une application web de gestion de stock multi-centres pour "Everest Distribution".

IDENTITÉ VISUELLE (à respecter strictement) :

- Couleur principale (texte, en-têtes, éléments clés) : Bleu Marine #0B2D5B

- Couleur d'accent (boutons, icônes, éléments importants) : Or/Jaune #F0A500

- Arrière-plans / cartes / sections secondaires : Gris Clair #F5F7FA

- Textes secondaires / bordures : Gris Foncé #1F2937

- Couleurs fonctionnelles : Succès #16A34A (disponible), Attention #F59E0B (en attente), Erreur #DC2626 (rupture de stock)

- Typographie des titres : Playfair Display (bold/semibold)

- Typographie du texte et de l'interface : Inter (regular/medium/semibold)

- Logo : montagne stylisée bleu marine avec un arc doré, texte "EVEREST DISTRIBUTION", tagline "L'EXCELLENCE AU SOMMET DE LA DISTRIBUTION" — je fournirai le fichier logo à intégrer dans l'en-tête et le menu latéral.

STRUCTURE GÉNÉRALE :

- Menu latéral fixe (sidebar) avec icônes + libellés : Tableau de bord, Produits, Stocks, Mouvements, Centres de vente, Réapprovisionnement, Rapports, Utilisateurs, Paramètres

- Le menu latéral doit se transformer en menu mobile (hamburger) sous 768px — l'application doit être parfaitement utilisable aussi bien sur mobile (responsables de centre sur le terrain) que sur desktop (tableau de bord admin)

- En-tête avec recherche globale, icône de notifications, avatar utilisateur avec menu (profil / déconnexion)

- Pour l'instant, crée uniquement le layout, la navigation et une page "Tableau de bord" avec des cartes vides en placeholder (Stock total, Produits, Ventes du mois, Produits en rupture) — le contenu réel viendra dans les prompts suivants.

Ne connecte pas encore Supabase à ce stade, on le fera au prompt suivant.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://everest-stock-summit.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/ef4ae343-0be7-4841-8560-f5c27301ee71).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
