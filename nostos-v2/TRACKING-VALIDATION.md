# Tracking — contrôle du 13 septembre 2026

Identifiants repris du site original : Meta `1837727546891540`, GTM `GTM-TX27DHHX`, Clarity `w8xvas3f1l`, GA4 `G-KRLJ69613G`.

Analytics et Clarity sont chargés après l’affichage initial comme outils de mesure d’audience obligatoires. Le pixel Meta est chargé uniquement après acceptation des cookies marketing. Le choix, son retrait et son expiration sont gérés. Les aperçus et localhost n’envoient pas de tracking : il faut un build production sur nostosprogram.com ou www.nostosprogram.com pour activer les tags.

- Meta PageView unique ; InitiateCheckout au clic du lien d’achat, valeur 39 EUR.
- DataLayer : cta_click et initiate_checkout.
- Purchase seulement après vérification serveur d’une session Stripe payée. Montant et devise du serveur, identifiant de session stable, déduplication dans le navigateur et transaction_id GA4. Aucun achat inféré à partir d’une simple visite de merci.html.
- Consentement tardif : l’achat vérifié est envoyé après acceptation sur la page.

## Constat dans le conteneur GTM public

Le conteneur consulté contient GA4 et cta_click, sans second pixel Meta identifié. Son tag déclenché sur purchase envoie actuellement un événement mal orthographié : `purshase`, sans transaction_id. La V2 envoie directement le bon événement GA4 purchase avec transaction_id, comme mesure de continuité. Le conteneur distant n’a pas été modifié. Si le tag GTM est corrigé, coordonner la suppression de l’envoi direct ou sa déduplication pour éviter deux envois purchase.

## Vérification réelle requise à la bascule

Vérifier que le Payment Link redirige vers `https://nostosprogram.com/merci.html?session_id={CHECKOUT_SESSION_ID}`. Confirmer les variables serveur, le secret et l’URL du webhook Stripe ; vérifier un parcours autorisé de bout en bout jusqu’à l’inscription Kit et la réception du premier email. Contrôler PageView, InitiateCheckout et Purchase dans Meta Events Manager, Tag Assistant et GA4. Tester aussi l’enregistrement sans marketing et le retrait du consentement marketing. Aucun paiement réel ni envoi Kit n’a été réalisé pendant cet audit.

Les événements Meta restent soumis au consentement marketing. Lorsqu’il est accepté avant le paiement, le checkout conserve cet état avec les identifiants `_fbp` et `_fbc` autorisés dans la session Stripe. Le webhook envoie alors un `Purchase` à Meta Conversions API avec l’identifiant stable de session Stripe ; il est dédupliqué avec le pixel navigateur par `event_id`. Sans consentement marketing, aucun événement CAPI n’est envoyé.

Configurer dans Netlify `META_CONVERSIONS_API_TOKEN`, `META_PIXEL_ID` et `META_GRAPH_API_VERSION` avant mise en production. Le token ne doit jamais être présent dans le code ou les fichiers publics. Stripe et Analytics restent les sources de référence pour les ventes lorsqu’un visiteur refuse le marketing ou utilise un bloqueur.

Pour un test dans Meta Events Manager, ajouter temporairement `META_TEST_EVENT_CODE` avec le code affiché dans « Événements de test », réaliser un paiement de test avec consentement marketing, puis supprimer cette variable. Ne pas la laisser activée pour les achats réels.

## Correction publiée le 14 septembre 2026

GTM-TX27DHHX, version 3 « Nostos V2 — achat GA4 sans doublon », publiée à 09:31 : nom purshase corrigé en purchase et balise GA4 - purchase mise en veille. Le script tracking.js servi sur le domaine officiel a été vérifié : il envoie déjà purchase directement à GA4 après vérification Stripe, avec transaction_id. Cette mise en veille supprime l’envoi redondant ; ne pas réactiver sans coordonner le code de la V2. Aucune autre balise modifiée. La version 2 reste disponible dans GTM pour retour arrière. La réception Meta reste à tester dans Events Manager.
