# Zoutch Bénévoles

Application locale pour gérer l'inscription de bénévoles à des événements
(missions, créneaux, places disponibles), avec un espace organisateurs
protégé par mot de passe.

## Stack

- **Serveur** : Node.js + Express + SQLite (`better-sqlite3`), authentification
  par JWT pour les organisateurs.
- **Client** : React + Vite + React Router.

Le tout tourne en local, sans dépendance à Netlify pour l'instant.

## Installation

Depuis la racine du projet :

```bash
npm run install-all
```

Cela installe les dépendances du serveur et du client.

Puis, dans `server/`, copie le fichier d'exemple d'environnement :

```bash
cp server/.env.example server/.env
```

Tu peux modifier `server/.env` pour changer l'identifiant/mot de passe de
l'organisateur créé automatiquement au premier lancement (`DEFAULT_ADMIN_USER`
et `DEFAULT_ADMIN_PASSWORD`), ainsi que `JWT_SECRET` (mets une chaîne longue
et aléatoire).

## Lancer l'application

Depuis la racine du projet :

```bash
npm run dev
```

Cela démarre en même temps :
- l'API sur `http://localhost:4000`
- le site sur `http://localhost:5173`

Ouvre `http://localhost:5173` dans ton navigateur.

Au tout premier démarrage du serveur, un organisateur par défaut est créé et
ses identifiants sont affichés dans le terminal (`admin` / `changeme123` par
défaut) — pense à en créer un autre depuis l'espace organisateurs puis à
changer ce mot de passe, ou à modifier `.env` avant le premier lancement.

## Utilisation

- **Page d'accueil (`/`)** : liste des événements actifs, ouverte à tout le
  monde. Un bénévole clique sur un événement, voit les créneaux disponibles
  et s'inscrit avec juste son prénom, son nom et son email (pas de compte).
- **Espace organisateurs (`/admin`)** : après connexion, tu peux créer des
  événements, ajouter des créneaux/missions (avec un nombre de places), voir
  qui s'est inscrit sur chaque créneau, retirer une inscription, archiver un
  événement passé (il disparaît de la page publique mais reste consultable
  et désarchivable côté admin), ou le supprimer définitivement.
- **Organisateurs (`/admin/organisateurs`)** : ajouter d'autres comptes
  organisateurs (tous ont les mêmes droits pour l'instant).

## Structure du projet

```
zoutch-benevoles/
├── server/           API Express + base SQLite (fichier data.sqlite, créé au premier lancement)
│   ├── db.js          connexion + schéma + organisateur par défaut
│   ├── auth.js         middleware JWT
│   ├── index.js        point d'entrée
│   └── routes/          auth, events, missions, signups
└── client/           Application React (Vite)
    └── src/
        ├── api/client.js       appels vers l'API
        ├── context/AuthContext.jsx
        ├── components/RequireAuth.jsx
        └── pages/                pages publiques + admin
```

## Prochaines étapes possibles

- Vraie séparation des rôles entre organisateurs (super-admin / entraîneur
  limité à ses groupes), comme discuté.
- Export CSV des inscrits par créneau.
- Migration de SQLite vers Netlify DB (Postgres) et déploiement sur Netlify
  une fois que tu seras prêt à mettre ça en ligne.
