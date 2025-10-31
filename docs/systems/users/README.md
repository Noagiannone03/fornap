# Système Utilisateur

Documentation complète du système de gestion des utilisateurs.

## Fichiers

- **USER_SYSTEM_ARCHITECTURE.md** - Architecture complète du système utilisateur (types, services, structure de données)
- **MEMBERSHIP_STRUCTURE.md** - Détails sur le système d'adhésion et abonnements

## Vue d'ensemble

Le système utilisateur gère :
- Profils utilisateurs (BasicProfile, ExtendedProfile, AdminProfile)
- Abonnements et adhésions (silver/gold/platinum)
- Points de fidélité
- Statuts de compte (pending, active, suspended, cancelled)
- Rôles et permissions (admin, moderator, user)

## Services principaux

- `userService.ts` - CRUD et gestion des utilisateurs
- `userAnalytics.ts` - Analytics et métriques utilisateurs
