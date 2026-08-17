# Observable Odyssey

**Langue : Français | [English](README.md)**

Observable Odyssey est un jeu tactique multijoueur au tour par tour. L'application réunit un client Angular, une API Express et une couche de communication Socket.IO afin d'offrir une expérience complète : création de cartes, préparation d'une partie, affrontements en temps réel et consultation des statistiques finales.

Le projet a été réalisé par une équipe de six personnes avec une attention particulière portée à la séparation des responsabilités, à la synchronisation de l'état du jeu et à la qualité du code.

## Aperçu visuel

### Page d'accueil

![Page d'accueil d'Observable Odyssey](home-page.png)

### Création du personnage

![Page de création du personnage d'Observable Odyssey](form-page.png)

### Éditeur de cartes

![Éditeur de cartes d'Observable Odyssey](edit-page.png)

### Partie en cours

![Interface de jeu d'Observable Odyssey](play-page.png)

## Aperçu du projet

Les joueurs choisissent leur personnage, configurent ses attributs et rejoignent une salle à l'aide d'un code de partie. Une fois la session lancée, ils explorent une carte quadrillée, se déplacent selon le coût des terrains, interagissent avec les portes et les sanctuaires, puis affrontent leurs adversaires dans un système de combat au tour par tour.

Deux modes de jeu sont proposés :

- **Classique** : remporter le nombre de combats requis pour gagner la partie.
- **Capture du drapeau (CTF)** : collaborer avec son équipe pour récupérer le drapeau adverse et le rapporter à son camp.

## Ce qui rend le projet intéressant

- Une application web complète, séparée en un client Angular moderne et un serveur TypeScript.
- Un état multijoueur synchronisé en temps réel avec Socket.IO : déplacements, tours, combats, clavardage et événements de partie.
- Un éditeur visuel permettant de concevoir et de valider des cartes jouables de différentes dimensions.
- Une logique métier riche : calcul des déplacements, validation des actions, gestion des combats, objectifs CTF et fin de partie.
- Des joueurs virtuels aux profils agressif et défensif capables de participer aux parties.
- Une architecture testée et outillée avec linting, couverture de code, documentation OpenAPI et intégration continue.

## Fonctionnalités principales

### Administration et création de cartes

- Création, modification, suppression et gestion de la visibilité des cartes.
- Choix du mode de jeu et des dimensions de la grille.
- Placement de terrains, murs, portes, positions de départ, drapeau et sanctuaires.
- Validation de la carte avant sauvegarde : accessibilité, objets requis et cohérence du mode de jeu.

### Salles et préparation des parties

- Création et jointure d'une session multijoueur à l'aide d'un code unique.
- Création de personnage avec avatar, statistiques et dés bonus.
- Salle d'attente synchronisée et clavardage en temps réel.
- Verrouillage de la salle et ajout de joueurs virtuels par l'organisateur.
- Attribution d'équipes pour les parties Capture du drapeau.

### Expérience de jeu

- Déplacements calculés selon les points disponibles et le coût du terrain.
- Mise en évidence des cases atteignables et inspection des tuiles et des joueurs.
- Interactions avec les portes, les sanctuaires et le drapeau.
- Combats au tour par tour avec postures offensive et défensive.
- Journal des événements, clavardage, compte à rebours et transitions de tour synchronisées.
- Gestion de l'abandon, des déconnexions et de la fin de partie.
- Écran final présentant les résultats et les statistiques des joueurs.

## Architecture

```text
.
├── client/   Application monopage Angular et interface du jeu
├── server/   API Express, serveur Socket.IO et logique métier
├── common/   Interfaces, événements et constantes partagés
└── static/   Ressources associées à la documentation et au déploiement
```

Le dossier `common` constitue le contrat entre les deux applications. Il centralise les modèles de jeu et les événements temps réel afin de maintenir un typage cohérent du navigateur jusqu'au serveur.

Le serveur sépare notamment la gestion des parties, le déroulement du jeu, le temps réel, la validation des cartes et le comportement des joueurs virtuels. Le client organise les responsabilités entre pages, composants d'interface, services métier, services Socket.IO et utilitaires de calcul de chemin.

## Pile technologique

| Domaine | Technologies |
| --- | --- |
| Frontend | Angular 21, TypeScript, RxJS, Tailwind CSS |
| Backend | Node.js, Express 5, TypeScript, TypeDI |
| Temps réel | Socket.IO |
| Données | MongoDB, Mongoose |
| API | REST, Swagger / OpenAPI |
| Tests client | Jasmine, Karma |
| Tests serveur | Mocha, Chai, Sinon, Supertest, MongoDB Memory Server |
| Qualité et livraison | ESLint, Prettier, NYC, GitLab CI |

## Mise en route

### Prérequis

- Node.js et npm
- Une instance MongoDB accessible, ou MongoDB Memory Server pour la base temporaire

### Installation

Les deux applications possèdent leurs propres dépendances :

```bash
cd client
npm ci

cd ../server
npm ci
```

### Configuration du serveur

Avant de démarrer le serveur, définir les variables d'environnement suivantes :

```env
DATABASE_CONNECTION_STRING=mongodb://localhost:27017/observable-odyssey
IN_MEMORY_DATABASE_CONNECTION_STRING=mongodb://localhost:27017/observable-odyssey-active
```

Pour utiliser une base MongoDB temporaire générée automatiquement à la place de la seconde connexion :

```env
DATABASE_CONNECTION_STRING=mongodb://localhost:27017/observable-odyssey
USE_MONGO_MEMORY_SERVER=true
```

### Démarrage local

Dans deux terminaux distincts :

```bash
cd server
npm start
```

```bash
cd client
npm start
```

Le client est accessible sur `http://localhost:4200` et le serveur écoute sur `http://localhost:3000`. La documentation interactive de l'API est disponible sur `http://localhost:3000/api/docs`.

## Qualité et tests

Les commandes suivantes doivent être lancées depuis le sous-projet concerné :

```bash
# Client
cd client
npm run lint
npm test
npm run coverage

# Serveur
cd ../server
npm run lint
npm test
npm run coverage
```

Le dépôt comprend des tests unitaires côté client et serveur, des tests des routes HTTP et des scénarios couvrant la logique temps réel. Le pipeline GitLab automatise l'installation, le linting et l'exécution des tests.

## Documentation complémentaire

- [CONTRIBUTING.md](CONTRIBUTING.md) — conventions de contribution et pratiques Git.
- [DEPLOYMENT.md](DEPLOYMENT.md) — procédure de déploiement et configuration de l'infrastructure.
- [TESTS.md](TESTS.md) — utilisation des tests et génération des rapports de couverture.

## Pourquoi ce projet est pertinent

Observable Odyssey illustre la conception d'un produit web qui dépasse une simple interface CRUD. Le projet combine une expérience utilisateur interactive, une logique de jeu non triviale et un backend événementiel qui doit conserver un état partagé cohérent malgré les actions concurrentes, les changements de tour et les déconnexions.

Pour un recruteur, il met notamment en évidence des compétences en architecture frontend et backend, en programmation temps réel, en modélisation de domaine, en algorithmique de déplacement, en tests automatisés et en collaboration sur une base de code commune.