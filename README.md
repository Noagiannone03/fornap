# FORNAP - Plateforme de Coworking & Événementiel

Une plateforme web moderne pour gérer un espace de coworking et événementiel, avec inscription, authentification et dashboard utilisateur.

## Technologies

- **React 19** avec TypeScript
- **Vite** - Build tool ultra-rapide
- **Mantine UI** - Librairie de composants moderne et personnalisable
- **Firebase** - Authentification et base de données (Firestore)
- **React Router DOM** - Navigation

## Design

- Thème noir et blanc minimaliste
- Composants carrés et épurés
- Interface professionnelle et moderne
- Totalement responsive

## Fonctionnalités

### Actuellement implémentées

- Page d'accueil / vitrine du lieu
- Système d'inscription avec questionnaire modulable en 3 étapes :
  1. Informations de compte (email, mot de passe)
  2. Informations personnelles (nom, prénom, date de naissance, téléphone)
  3. Centres d'intérêt (sélection multiple)
- Connexion utilisateur
- Dashboard utilisateur avec :
  - Informations personnelles
  - Centres d'intérêt
  - Placeholder pour abonnement
  - Placeholder pour points fidélité
  - Placeholder pour QR code d'accès
- Gestion du profil utilisateur

### Prêt pour l'expansion

Le code est structuré pour facilement ajouter :
- Système d'abonnements
- Points de fidélité
- Génération de QR codes
- Réservations d'espaces
- Calendrier d'événements
- Et bien plus...

## Installation

### 1. Cloner le projet

```bash
cd fornap
```

### 2. Installer les dépendances

Les dépendances sont déjà installées. Si besoin :

```bash
npm install
```

### 3. Configuration Firebase

1. Créez un projet Firebase sur [console.firebase.google.com](https://console.firebase.google.com)
2. Activez l'authentification par email/mot de passe
3. Créez une base de données Firestore
4. Copiez `.env.example` en `.env`
5. Remplissez les variables d'environnement avec vos identifiants Firebase :

```env
VITE_FIREBASE_API_KEY=votre_api_key
VITE_FIREBASE_AUTH_DOMAIN=votre_auth_domain
VITE_FIREBASE_PROJECT_ID=votre_project_id
VITE_FIREBASE_STORAGE_BUCKET=votre_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=votre_messaging_sender_id
VITE_FIREBASE_APP_ID=votre_app_id
```

### 4. Lancer le serveur de développement

```bash
npm run dev
```

Le site sera accessible sur `http://localhost:5173`

## Structure du projet

```
fornap/
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Layout.tsx          # Layout principal
│   │   │   └── Navbar.tsx          # Barre de navigation
│   │   └── ProtectedRoute.tsx      # Protection des routes privées
│   ├── config/
│   │   └── firebase.ts             # Configuration Firebase
│   ├── contexts/
│   │   └── AuthContext.tsx         # Contexte d'authentification
│   ├── pages/
│   │   ├── Home.tsx                # Page d'accueil
│   │   ├── Signup.tsx              # Page d'inscription
│   │   ├── Login.tsx               # Page de connexion
│   │   ├── Dashboard.tsx           # Dashboard utilisateur
│   │   └── Profile.tsx             # Gestion du profil
│   ├── theme/
│   │   └── mantineTheme.ts         # Thème Mantine personnalisé
│   ├── types/
│   │   └── user.ts                 # Types TypeScript
│   ├── App.tsx                     # Composant principal avec routing
│   ├── main.tsx                    # Point d'entrée
│   └── index.css                   # Styles globaux
├── .env.example                    # Exemple de configuration
└── package.json                    # Dépendances
```

## Composants réutilisables

### Navbar
Barre de navigation adaptative avec boutons de connexion/inscription ou dashboard/déconnexion selon l'état d'authentification.

### Layout
Wrapper pour toutes les pages incluant la navbar.

### ProtectedRoute
Composant pour protéger les routes nécessitant une authentification.

## Ajouter des champs au questionnaire d'inscription

Le système est modulaire. Pour ajouter des champs :

1. Modifier le type `SignupFormData` dans `src/types/user.ts`
2. Ajouter le champ dans `UserProfile`
3. Ajouter l'input dans `src/pages/Signup.tsx`
4. Le champ sera automatiquement sauvegardé dans Firestore

Exemple :

```typescript
// Dans src/types/user.ts
export interface SignupFormData {
  // ... champs existants
  entreprise?: string;  // Nouveau champ
}

// Dans src/pages/Signup.tsx (dans le Stepper.Step approprié)
<TextInput
  label="Entreprise"
  placeholder="Nom de votre entreprise"
  {...form.getInputProps('entreprise')}
/>
```

## Personnalisation du thème

Le thème est entièrement personnalisable dans `src/theme/mantineTheme.ts`. Vous pouvez modifier :
- Les couleurs
- Les bordures (radius)
- Les styles de composants
- Les polices

## Scripts disponibles

```bash
npm run dev      # Lancer le serveur de développement
npm run build    # Build de production
npm run preview  # Prévisualiser le build
npm run lint     # Linter le code
```

## Prochaines étapes suggérées

1. Implémenter le système d'abonnements
2. Ajouter la génération de QR codes
3. Créer un système de réservation d'espaces
4. Ajouter un calendrier d'événements
5. Implémenter le système de points fidélité
6. Ajouter une page admin
7. Créer un système de paiement

## Support

Pour toute question ou suggestion, consultez la documentation de :
- [Mantine UI](https://mantine.dev/)
- [Firebase](https://firebase.google.com/docs)
- [React Router](https://reactrouter.com/)
