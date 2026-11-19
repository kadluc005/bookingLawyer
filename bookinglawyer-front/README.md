# BookingLawyer — application Angular
Depuis ce dossier, exécuter `npm install`, puis `npm start`. Ouvrir http://localhost:4200. Compiler avec `npm run build`.

## Structure du front

- `src/main.ts` démarre Angular avec les routes de `src/app/app.routes.ts`.
- `src/app/pages/` contient un dossier par écran.
- `src/app/components/` contient l’en-tête et la carte avocat.
- `src/app/services/` regroupe la recherche, l’état du dossier et la lecture des CV.
- `src/app/models/` définit les types et `src/app/data/` contient les profils de démonstration.
- `src/styles.css` définit la palette, la typographie et les styles communs.

Le parcours avocat commence par la création d’un compte de démonstration sur `/inscription`. L’adresse e-mail reste en mémoire dans l’onglet et le mot de passe est effacé à la validation. L’accès à `/inscription/profil` dépend de cette inscription locale.

L’annuaire et les fiches utilisent des exemples fictifs. Le dossier suit les champs et les valeurs de spécialité et de paiement du schéma Drizzle. Les données saisies et les pièces jointes restent en mémoire dans l’onglet et disparaissent à l’actualisation.

Le formulaire accepte jusqu’à cinq fichiers de 5 Mo chacun. Le premier CV TXT ou DOCX est lu localement. Les champs reconnus (coordonnées, nom, prénom, ville, pays, spécialité et expérience) restent modifiables. Pour un PDF, utiliser la saisie manuelle. Une seconde importation préserve les champs déjà renseignés.

L’accueil ouvre l’annuaire public. La recherche et les fiches sont accessibles sans compte. Les parcours de démonstration client, avocat et administrateur sont disponibles sur `/connexion`. L’affichage des coordonnées fictives et la modification du profil client sont réservés aux clients. L’administration peut consulter les clients inscrits, traiter les dossiers et lire les journaux de contact et de validation.

Le front fonctionne sans appeler l’API NestJS. Les sessions, les profils et les événements restent en mémoire dans l’onglet. La cotisation de 100 € reste en attente dans la simulation. L’annuaire utilise des profils fictifs préqualifiés et tient compte des décisions de l’administration.
