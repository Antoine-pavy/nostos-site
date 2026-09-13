# Tracking — contrôle du 13 septembre 2026

Identifiants repris du site original : Meta `1837727546891540`, GTM `GTM-TX27DHHX`, Clarity `w8xvas3f1l`, GA4 `G-KRLJ69613G`.

Les scripts ne sont chargés qu’après consentement, après affichage initial. Refus, retrait et expiration du consentement sont gérés. Les aperçus et localhost n’envoient pas de tracking : il faut un build production sur nostosprogram.com ou www.nostosprogram.com pour activer les tags.

- Meta PageView unique ; InitiateCheckout au clic du lien d’achat, valeur 19 EUR.
- DataLayer : cta_click et initiate_checkout.
- Purchase seulement après vérification serveur d’une session Stripe payée. Montant et devise du serveur, identifiant de session stable, déduplication dans le navigateur et transaction_id GA4. Aucun achat inféré à partir d’une simple visite de merci.html.
- Consentement tardif : l’achat vérifié est envoyé après acceptation sur la page.

## Constat dans le conteneur GTM public

Le conteneur consulté contient GA4 et cta_click, sans second pixel Meta identifié. Son tag déclenché sur purchase envoie actuellement un événement mal orthographié : `purshase`, sans transaction_id. La V2 envoie directement le bon événement GA4 purchase avec transaction_id, comme mesure de continuité. Le conteneur distant n’a pas été modifié. Si le tag GTM est corrigé, coordonner la suppression de l’envoi direct ou sa déduplication pour éviter deux envois purchase.

## Vérification réelle requise à la bascule

Vérifier que le Payment Link redirige vers `https://nostosprogram.com/merci.html?session_id={CHECKOUT_SESSION_ID}`. Confirmer les variables serveur, le secret et l’URL du webhook Stripe ; vérifier un parcours autorisé de bout en bout jusqu’à l’inscription Kit et la réception du premier email. Contrôler PageView, InitiateCheckout et Purchase dans Meta Events Manager, Tag Assistant et GA4. Tester aussi refus et retrait du consentement. Aucun paiement réel ni envoi Kit n’a été réalisé pendant cet audit.

Les événements sont côté navigateur et soumis au consentement et aux bloqueurs. Une couverture serveur via Meta Conversions API n’a pas été ajoutée et n’est pas présumée existante.
