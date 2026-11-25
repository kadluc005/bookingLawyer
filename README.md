# BookingLawyer

BookingLawyer est une plateforme de mise en relation entre clients et avocats. Un avocat crée son compte, complète son profil et enregistre une cotisation valable un an. Il devient visible dans l’annuaire client après validation administrative, tant que son compte et sa cotisation sont actifs.

- **Avocat** — gère son profil, consulte l’échéance de sa cotisation et voit dans son tableau de bord les clients qui ont demandé ses coordonnées.
- **Client** — crée un compte, recherche un avocat et peut afficher son e-mail ou son téléphone.
- **Administrateur** — consulte les dossiers, approuve ou rejette les profils et accède à l’activité de contact et au journal d’audit.

L’enregistrement de la cotisation active l’abonnement localement, sans prélèvement. Les nouveaux comptes avocats doivent confirmer leur e-mail avant de se connecter. Le téléversement privé des CV avec extraction côté serveur reste à raccorder.

## Structure du dépôt

| Dossier ou fichier | Rôle |
| --- | --- |
| [`bookinglawyer-front/`](bookinglawyer-front/) | Interface Angular. Le serveur de développement redirige les appels `/api` vers NestJS. |
| [`bookinglawyer-back/`](bookinglawyer-back/) | API NestJS, authentification JWT, accès à PostgreSQL via Drizzle ORM et migrations SQL. |
| [`compose.yaml`](compose.yaml) | PostgreSQL 15, exposé sur `127.0.0.1:5432`, avec un volume persistant. |

## Lancer le projet en local

Prérequis — Docker en cours d’exécution avec la commande `docker compose`, Node.js 22.12+ sur la branche 22 ou Node.js 24+, et npm. Docker lance PostgreSQL. L’API et l’interface tournent sur la machine de développement avec npm.

### 1. Configurer le backend

Depuis la racine du dépôt, crée `bookinglawyer-back/.env` avec ces variables. Remplace les deux valeurs d’exemple par des secrets distincts. Le mot de passe PostgreSQL doit être identique dans les deux premières lignes.

```dotenv
POSTGRES_PASSWORD=mot_de_passe_postgres
DATABASE_URL=postgresql://root:mot_de_passe_postgres@127.0.0.1:5432/lawyer_booking
JWT_SECRET=secret_jwt_local
```

Tu peux lancer deux fois la commande suivante pour obtenir deux valeurs hexadécimales aléatoires. Le secret JWT doit contenir au moins 32 octets.

```sh
node -p "require('node:crypto').randomBytes(32).toString('hex')"
```

Le fichier `.env` est ignoré par Git.

### 2. Démarrer PostgreSQL

Depuis la racine du dépôt :

```sh
docker compose --env-file bookinglawyer-back/.env up -d
docker compose --env-file bookinglawyer-back/.env exec postgres pg_isready -U root -d lawyer_booking
```

Poursuis lorsque PostgreSQL indique qu’il accepte les connexions.

### 3. Installer et démarrer l’API

Depuis la racine, dans un terminal :

```sh
cd bookinglawyer-back
npm ci
npm run db:migrate
npm run start:dev
```

L’API est disponible sur <http://localhost:3000>. Relance `npm run db:migrate` après avoir récupéré de nouvelles migrations.

### 4. Installer et démarrer le frontend

Dans un second terminal, depuis la racine :

```sh
cd bookinglawyer-front
npm ci
npm start
```

Ouvre <http://localhost:4200>. Pour tester le parcours complet, inscris un avocat et un client avec deux adresses différentes. Confirme l’e-mail de l’avocat, enregistre sa cotisation, valide son profil depuis un compte admin, puis retrouve-le dans l’annuaire avec le compte client.

## Tester l’e-mail de confirmation

Inscris un avocat depuis le frontend. Par défaut, NestJS écrit le message dans `bookinglawyer-back/emails/` sous forme de fichier `.eml`. Ouvre le fichier `.eml` dans un client de messagerie, clique sur **Confirmer mon adresse e-mail**, puis confirme sur le site et connecte-toi. Si tu consultes la source brute du fichier, le lien peut s’étendre sur deux lignes. Retire le `=` de fin de ligne ajouté par l’encodage et réunis les deux parties avant d’ouvrir le lien. Le lien est valable 24 heures et ne peut être utilisé qu’une fois. Un nouveau lien peut être demandé depuis la page de connexion.

Pour utiliser un relais SMTP, renseigne `SMTP_URL` (URL `smtp://…` ou `smtps://…`), `MAIL_FROM` (expéditeur autorisé par le relais) et `FRONTEND_URL` (origine du frontend accessible aux destinataires) dans `bookinglawyer-back/.env`, puis redémarre NestJS. En local, l’origine du frontend est `http://localhost:4200` par défaut.

## Consulter la base et arrêter les services

Depuis la racine, ouvre PostgreSQL avec :

```sh
docker compose --env-file bookinglawyer-back/.env exec postgres psql -U root -d lawyer_booking
```

Dans `psql`, utilise `\dt` pour lister les tables et `\q` pour quitter. Voici une requête pour vérifier les comptes inscrits et leur statut :

```sql
SELECT id, email, role, status
FROM users
ORDER BY created_at DESC
LIMIT 20;
```

Pour accéder à l’administration en développement, crée un compte client dédié, puis attribue-lui le rôle `admin` dans la base locale. Remplace l’adresse ci-dessous par celle du compte de test.

```sql
UPDATE users
SET role = 'admin', updated_at = now()
WHERE email = 'admin.test@example.com' AND role = 'client' AND status = 'active'
RETURNING id, email, role;
```

Reconnecte-toi avec ce compte puis ouvre <http://localhost:4200/administration>.

Arrête les deux processus npm avec `Ctrl+C`. Depuis la racine, arrête PostgreSQL avec la commande suivante. Le volume de données est conservé.

```sh
docker compose --env-file bookinglawyer-back/.env down
```

