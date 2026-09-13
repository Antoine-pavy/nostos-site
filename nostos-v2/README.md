# Nostos V2 — préparation production

Version indépendante : aucun fichier du site original n’a été modifié. Aucun déploiement effectué.

## Construire et vérifier

Depuis `nostos-v2`, avec Node 22 et npm :

```sh
npm ci
npm test
npm run build
```

`npm run build` produit `dist/`. Le contexte Netlify `production` active l’indexation ; les autres contextes restent en noindex. Pour une vérification locale du résultat production : `npm run build:production`, puis servir `dist/` avec un serveur HTTP. Un serveur statique local ne fait pas fonctionner les fonctions Netlify.

## Configuration Netlify

Conserver le site actuel pendant les essais. Utiliser une branche séparée et un déploiement de prévisualisation, ou un second projet Netlify. Configurer le dossier de base sur `nostos-v2` et vérifier dans les logs que le fichier `nostos-v2/netlify.toml` est utilisé : commande `npm run build`, publication `dist`, fonctions `netlify/functions`. Le fichier de configuration de l’ancien site reste intact.

Configurer les variables listées dans `.env.example` dans Netlify, sans les committer. `SITE_URL` doit correspondre à l’URL de destination. Les clés de test et de production doivent rester cohérentes avec les prix et le webhook Stripe. Le formulaire `/checkout` exige un prix actif de 19 EUR à paiement unique. Le bouton principal conserve le Payment Link du site original : son prix et sa redirection se règlent séparément dans Stripe.

Documentation : https://docs.netlify.com/build/configure-builds/file-based-configuration/

Sur le second projet de test, ajouter la variable `NOSTOS_PREVIEW=true` pour tous les contextes de build. Son déploiement principal reste ainsi non indexé et sans tracking, même si Netlify le nomme « production ». Ne pas activer cette variable sur le futur site public.

## Avant ouverture au public

Consulter `PRODUCTION-READINESS.md` et `TRACKING-VALIDATION.md`. Les tests automatisés simulent les fournisseurs ; ils ne prouvent pas la livraison réelle d’un email ni la réception d’un événement par Meta.

Ne publier que `dist/` avec les fonctions gérées par Netlify. Le build exclut les sources, rapports, secrets et le PDF du programme. Les images d’aperçu restent des ressources publiques nécessaires à l’affichage.

## Retour à la version précédente

Avant bascule, conserver l’identifiant du déploiement Netlify actuellement publié et marquer son commit Git. En cas de problème, republier ce déploiement depuis Netlify et suspendre les publications automatiques le temps de corriger. Revenir aussi sur le changement Git avant de reprendre les déploiements, sinon un prochain push peut republier la V2. Les réglages externes Stripe/GTM ne sont pas restaurés par un rollback Netlify : noter leurs valeurs avant toute modification.
