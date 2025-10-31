# Documentation Fornap

Documentation technique complète du projet Fornap.

## Structure

La documentation est organisée par système/mécanique pour faciliter la navigation et l'utilisation avec des LLMs :

### `/systems` - Systèmes fonctionnels

Chaque système contient sa documentation complète avec types, services, et architecture.

- **[users/](./systems/users/)** - Système de gestion des utilisateurs, profils, adhésions et points de fidélité
- **[events/](./systems/events/)** - Système d'événements, billetterie et gestion des capacités
- **[analytics/](./systems/analytics/)** - Système d'analytics, métriques et tableaux de bord
- **[qr-code/](./systems/qr-code/)** - Système de génération et validation de QR codes

### `/design` - Design System

Documentation du design system, composants UI et guidelines.

### `/database` - Base de données

Architecture et structure de la base de données Firestore.

## Usage

Pour fournir du contexte à un LLM sur un système spécifique, il suffit de partager le dossier correspondant. Par exemple :
- Pour travailler sur les événements : partager `docs/systems/events/`
- Pour travailler sur les analytics : partager `docs/systems/analytics/`
- Pour travailler sur les utilisateurs : partager `docs/systems/users/`

Chaque dossier système contient un README.md qui explique son organisation et liste les fichiers disponibles.
