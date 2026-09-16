# Préparation à la production — 13 septembre 2026

## Conclusion

La V2 est préparée pour un déploiement de validation Netlify. Les contrôles locaux passent ; la validation du paiement, de la livraison et du tracking avec les services réels reste nécessaire avant lancement publicitaire. Aucun fichier original ni réglage du site en ligne n’a été modifié.

## Corrections et préparation effectuées

- Build autonome avec liste explicite des ressources publiées, configuration Netlify, routes de paiement, page 404, sitemap et règles d’indexation distinctes entre production et aperçu.
- Pages légales autonomes, logos renvoyant à la V2, prix indicatif 39 EUR.
- Polices locales WOFF2 et licences, sans appel Google Fonts ; images optimisées, dimensions réservées, contenus secondaires différés. Aperçu animé issu de Vsl_IA_short en vidéo muette en boucle ; YouTube chargé au clic. Aucun téléchargement vidéo observé au premier écran mobile.
- Maintien du parcours de conversion : lien Stripe existant, offre 39 EUR, témoignages et emails originaux, FAQ, accès à l’achat pendant la lecture. Aucune hausse de conversion ne peut être garantie sans mesure après lancement.
- Tracking original repris avec consentement, aperçus silencieux, validation serveur des achats et déduplication.
- Copie des fonctions serveur durcie : refus des sessions non payées, réponse sans email client, validation du prix du formulaire, signature webhook, paiements différés réussis pris en charge. Une erreur Kit retourne désormais une erreur réessayable à Stripe au lieu de valider faussement la livraison.
- Aucun PDF du programme dans le dossier publié.

## Vérifications réalisées

Sept tests automatisés passent : sessions Stripe valides/invalides, prix du checkout, signature/paiement/échec Kit du webhook, consentement et tags, silence en aperçu, déduplication achat et confirmation de paiement. Fournisseurs simulés, sans transaction ni email réel.

Résultat construit inspecté à 320, 390 et 1440 px : aucun débordement horizontal détecté, sélection des emails et accordéons fonctionnels, CGV à 39 EUR, page merci sans session ne confirmant aucun achat, console sans erreur lors des contrôles. Le HTML/CSS/JS du build représente environ 16,5 Ko gzip, hors images, polices et vidéos. Ce chiffre n’est pas le poids total de la page ni un score Lighthouse.

## Conditions avant mise en production

1. Déployer une prévisualisation Netlify et confirmer que les fonctions sont présentes. Les polices et ressources doivent fonctionner à la racine du domaine.
2. Vérifier les variables Stripe/Kit, le prix du Payment Link et son retour avec session_id. Valider le parcours jusqu’au premier email ; surveiller les logs du webhook et les tentatives Stripe.
3. Vérifier la réception effective des conversions et traiter le tag GTM `purshase` décrit dans TRACKING-VALIDATION.md.
4. Mesurer la page publiée sur réseau mobile avec PageSpeed/Lighthouse et vérifier le navigateur intégré Facebook. Les tests locaux ne mesurent pas les Core Web Vitals réels.
5. Conserver le déploiement et le commit de l’ancien site pour rollback. La promesse de remboursement de l’ancienne landing et ses CGV n’étant pas alignées, la V2 renvoie aux CGV ; toute promesse commerciale plus précise doit être harmonisée avant publicité.

Procédure de build, déploiement isolé et retour arrière : README.md.
