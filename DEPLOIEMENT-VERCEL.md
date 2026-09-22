# Déploiement sur Vercel — Everest Distribution

## 1. Mettre le code sur GitHub

Dans Lovable : menu **+** (en bas à gauche du chat) → **GitHub** → **Connecter le projet**, puis créer le dépôt.

## 2. Importer le projet dans Vercel

1. vercel.com → **Add New… → Project** → importer le dépôt GitHub.
2. Framework Preset : **Other** (le fichier `vercel.json` du projet fixe déjà tous les réglages).
3. Ne rien changer aux commandes : `npm install` / `npm run build`, dossier de sortie `.vercel/output`.

## 3. Variables d'environnement

Dans **Settings → Environment Variables**, ajouter ces six variables pour
**Production**, **Preview** et **Development** (valeurs visibles dans le fichier `.env` du projet) :

| Nom | Rôle |
| --- | --- |
| `VITE_SUPABASE_URL` | adresse de la base (navigateur) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | clé publiable (navigateur) |
| `VITE_SUPABASE_PROJECT_ID` | identifiant du projet (navigateur) |
| `SUPABASE_URL` | adresse de la base (serveur) |
| `SUPABASE_PUBLISHABLE_KEY` | clé publiable (serveur) |
| `SUPABASE_PROJECT_ID` | identifiant du projet (serveur) |

⚠️ N'ajoutez jamais la clé `service_role` : elle contournerait toutes les règles de sécurité.
Les clés publiables sont sans danger, la protection des données repose sur les règles RLS de la base.

`NITRO_PRESET=vercel` est déjà fixé dans `vercel.json` : rien à ajouter.

## 4. Autoriser le nouveau domaine côté authentification

Après le premier déploiement, dans les réglages d'authentification du backend
(**Authentication → URL Configuration**) :

- **Site URL** : `https://<votre-domaine>.vercel.app` (ou votre domaine personnalisé)
- **Redirect URLs** : ajouter
  - `https://<votre-domaine>.vercel.app/**`
  - `https://*.vercel.app/**` (pour les déploiements de prévisualisation)

Sans cette étape, la connexion et la création de compte échouent sur le nouveau domaine.

## 5. Base de données

La base, l'authentification et les photos restent hébergées sur Supabase : rien à migrer.
Le déploiement Vercel ne change que l'hébergement du site.

## 6. Vérifications après mise en ligne

- Connexion avec le compte administrateur.
- Accès aux pages Produits, Stocks, Centres de vente, Mouvements.
- Test d'un compte « responsable de centre » : il ne doit voir que son centre.
