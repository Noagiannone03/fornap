# 📁 Fornap - Structure de Projet

## Vue d'ensemble

Ce document décrit l'organisation optimale du projet Fornap pour maintenir un code propre, scalable et maintenable.

---

## 🗂️ Structure des Dossiers

```
fornap/
├── public/                    # Assets statiques
│   ├── images/
│   │   ├── logo/
│   │   ├── qr-codes/
│   │   └── backgrounds/
│   └── fonts/                 # Polices personnalisées si nécessaire
│
├── src/
│   ├── components/            # Composants réutilisables
│   │   ├── common/            # Composants génériques
│   │   │   ├── Button/
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Button.styles.ts
│   │   │   │   └── index.ts
│   │   │   ├── Card/
│   │   │   ├── Input/
│   │   │   ├── Modal/
│   │   │   ├── Badge/
│   │   │   ├── ProgressBar/
│   │   │   └── QRCodeScanner/
│   │   │
│   │   ├── layout/            # Composants de mise en page
│   │   │   ├── Navbar/
│   │   │   ├── Footer/
│   │   │   ├── Layout/
│   │   │   └── Sidebar/
│   │   │
│   │   ├── forms/             # Composants de formulaire
│   │   │   ├── SignupForm/
│   │   │   ├── LoginForm/
│   │   │   ├── ProfileForm/
│   │   │   └── QRImportForm/
│   │   │
│   │   └── features/          # Composants spécifiques aux fonctionnalités
│   │       ├── dashboard/
│   │       │   ├── SubscriptionCard/
│   │       │   ├── StatsCard/
│   │       │   └── QRCodeDisplay/
│   │       ├── membership/
│   │       │   └── MembershipPlanCard/
│   │       └── onboarding/
│   │           ├── WelcomeScreen/
│   │           ├── StepIndicator/
│   │           └── PersonalityQuiz/
│   │
│   ├── pages/                 # Pages/Routes principales
│   │   ├── Home.tsx
│   │   ├── Login.tsx
│   │   ├── Signup/            # Complexe = dossier
│   │   │   ├── Signup.tsx
│   │   │   ├── steps/
│   │   │   │   ├── WelcomeStep.tsx
│   │   │   │   ├── CredentialsStep.tsx
│   │   │   │   ├── PersonalInfoStep.tsx
│   │   │   │   ├── InterestsStep.tsx
│   │   │   │   └── ConfirmationStep.tsx
│   │   │   └── Signup.types.ts
│   │   ├── Dashboard.tsx
│   │   ├── Profile.tsx
│   │   ├── Membership.tsx
│   │   ├── QRLogin.tsx
│   │   └── NotFound.tsx
│   │
│   ├── contexts/              # Contexts React
│   │   ├── AuthContext.tsx
│   │   ├── ThemeContext.tsx
│   │   └── NotificationContext.tsx
│   │
│   ├── hooks/                 # Custom React hooks
│   │   ├── useAuth.ts
│   │   ├── useForm.ts
│   │   ├── useQRScanner.ts
│   │   ├── useSubscription.ts
│   │   └── useLocalStorage.ts
│   │
│   ├── services/              # Services externes (API, Firebase, etc.)
│   │   ├── firebase/
│   │   │   ├── config.ts
│   │   │   ├── auth.ts
│   │   │   ├── firestore.ts
│   │   │   └── storage.ts
│   │   ├── api/
│   │   │   ├── users.ts
│   │   │   ├── subscriptions.ts
│   │   │   └── qrcode.ts
│   │   └── payment/
│   │       └── stripe.ts
│   │
│   ├── utils/                 # Fonctions utilitaires
│   │   ├── validation.ts      # Validations de formulaire
│   │   ├── formatters.ts      # Formatage de données
│   │   ├── dateHelpers.ts     # Manipulation de dates
│   │   ├── qrHelpers.ts       # Utilitaires QR code
│   │   └── constants.ts       # Constantes globales
│   │
│   ├── types/                 # Types TypeScript globaux
│   │   ├── user.ts
│   │   ├── subscription.ts
│   │   ├── membership.ts
│   │   └── index.ts
│   │
│   ├── styles/                # Styles globaux et thème
│   │   ├── theme.ts           # Configuration Mantine theme
│   │   ├── globals.css        # Styles CSS globaux
│   │   ├── animations.css     # Animations réutilisables
│   │   └── authStyles.ts      # Styles spécifiques auth
│   │
│   ├── constants/             # Constantes de l'application
│   │   ├── membershipPlans.ts
│   │   ├── routes.ts
│   │   └── config.ts
│   │
│   ├── guards/                # Route guards
│   │   ├── ProtectedRoute.tsx
│   │   └── PublicRoute.tsx
│   │
│   ├── App.tsx
│   ├── main.tsx
│   └── vite-env.d.ts
│
├── docs/                      # Documentation
│   ├── DESIGN_SYSTEM.md
│   ├── PROJECT_STRUCTURE.md
│   ├── API_DOCUMENTATION.md
│   ├── DEPLOYMENT.md
│   └── CONTRIBUTING.md
│
├── .env                       # Variables d'environnement (ne pas commit)
├── .env.example               # Exemple de variables d'env
├── .gitignore
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## 📋 Conventions de Nommage

### Fichiers et Dossiers

```typescript
// Composants React: PascalCase
Button.tsx
SignupForm.tsx
UserProfile.tsx

// Utilitaires, services, hooks: camelCase
validation.ts
formatDate.ts
useAuth.ts

// Styles: correspond au nom du composant
Button.styles.ts
SignupForm.styles.ts

// Types: correspond au domaine
user.ts
subscription.ts
```

### Variables et Fonctions

```typescript
// Variables: camelCase
const userName = 'John';
const isAuthenticated = true;

// Constantes: UPPERCASE_SNAKE_CASE
const API_BASE_URL = 'https://api.fornap.com';
const MAX_FILE_SIZE = 5242880;

// Fonctions: camelCase avec verbe
function getUserProfile() {}
function validateEmail() {}
function handleSubmit() {}

// Composants: PascalCase
const UserProfile = () => {};
const SignupForm = () => {};

// Types/Interfaces: PascalCase
interface UserProfile {}
type SubscriptionStatus = 'active' | 'inactive';
```

---

## 🎯 Principes d'Organisation

### 1. Séparation des Préoccupations

Chaque fichier/dossier a une responsabilité unique et claire:
- **Components**: UI uniquement, logique minimale
- **Services**: Appels API, interaction avec Firebase
- **Utils**: Fonctions pures, réutilisables
- **Hooks**: Logique réutilisable avec state
- **Types**: Définitions de types partagées

### 2. Colocation

Garder les fichiers liés ensemble:

```
Button/
  ├── Button.tsx           # Composant
  ├── Button.styles.ts     # Styles spécifiques
  ├── Button.types.ts      # Types si complexes
  ├── Button.test.tsx      # Tests
  └── index.ts             # Export barrel
```

### 3. Index Files (Barrel Exports)

Simplifier les imports avec des fichiers `index.ts`:

```typescript
// components/common/index.ts
export { Button } from './Button/Button';
export { Card } from './Card/Card';
export { Input } from './Input/Input';

// Permet:
import { Button, Card, Input } from '@/components/common';
// Au lieu de:
import { Button } from '@/components/common/Button/Button';
import { Card } from '@/components/common/Card/Card';
```

### 4. Absolute Imports

Configurer les imports absolus dans `tsconfig.json`:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@components/*": ["src/components/*"],
      "@pages/*": ["src/pages/*"],
      "@hooks/*": ["src/hooks/*"],
      "@services/*": ["src/services/*"],
      "@utils/*": ["src/utils/*"],
      "@types/*": ["src/types/*"]
    }
  }
}
```

Usage:
```typescript
// ❌ Éviter
import { Button } from '../../../components/common/Button';

// ✅ Préférer
import { Button } from '@components/common';
import { useAuth } from '@hooks/useAuth';
import { formatDate } from '@utils/dateHelpers';
```

---

## 🔧 Organisation des Composants

### Composant Simple

```tsx
// src/components/common/Button/Button.tsx
import { ButtonHTMLAttributes } from 'react';
import styles from './Button.styles';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  isLoading?: boolean;
}

export const Button = ({
  children,
  variant = 'primary',
  isLoading,
  ...props
}: ButtonProps) => {
  return (
    <button
      style={styles[variant]}
      disabled={isLoading}
      {...props}
    >
      {isLoading ? 'Chargement...' : children}
    </button>
  );
};
```

### Composant Complexe (avec sous-composants)

```
SignupForm/
  ├── SignupForm.tsx              # Composant principal
  ├── SignupForm.styles.ts        # Styles
  ├── SignupForm.types.ts         # Types
  ├── components/                 # Sous-composants privés
  │   ├── StepIndicator.tsx
  │   └── FormSection.tsx
  ├── hooks/                      # Hooks privés
  │   └── useSignupForm.ts
  └── index.ts                    # Export
```

---

## 📦 Gestion des Styles

### 1. Styles Globaux

```
src/styles/
  ├── theme.ts              # Mantine theme configuration
  ├── globals.css           # Reset CSS, styles body
  ├── animations.css        # @keyframes animations
  └── variables.css         # CSS custom properties
```

### 2. Styles de Composants

**Option A**: CSS Modules (recommandé pour des styles complexes)
```typescript
// Button.module.css
.button {
  padding: 12px 24px;
  border-radius: 12px;
}

// Button.tsx
import styles from './Button.module.css';

export const Button = () => <button className={styles.button}>Click</button>;
```

**Option B**: Inline Styles avec objets (pour Mantine)
```typescript
// Button.styles.ts
export const buttonStyles = {
  primary: {
    background: '#000',
    color: '#fff',
    borderRadius: '12px',
    padding: '12px 24px',
  }
};

// Button.tsx
import { buttonStyles } from './Button.styles';

export const Button = () => <button style={buttonStyles.primary}>Click</button>;
```

### 3. Mantine Theme

```typescript
// src/styles/theme.ts
import { MantineThemeOverride } from '@mantine/core';

export const theme: MantineThemeOverride = {
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  primaryColor: 'dark',
  defaultRadius: 'md',

  colors: {
    dark: [
      '#F8F9FA',
      '#F1F3F5',
      '#E9ECEF',
      '#DEE2E6',
      '#CED4DA',
      '#ADB5BD',
      '#868E96',
      '#495057',
      '#343A40',
      '#212529',
    ],
  },

  components: {
    Button: {
      defaultProps: {
        size: 'md',
      },
      styles: {
        root: {
          borderRadius: '12px',
          fontWeight: 700,
        },
      },
    },
    TextInput: {
      styles: {
        input: {
          borderRadius: '12px',
          borderWidth: '2px',
        },
      },
    },
  },
};
```

---

## 🔐 Gestion de l'État

### 1. Context API (État Global)

```typescript
// src/contexts/AuthContext.tsx
interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  // ... logique

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook personnalisé
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
```

### 2. Local State (useState)

Pour l'état local du composant:
```typescript
const [isOpen, setIsOpen] = useState(false);
const [formData, setFormData] = useState({ name: '', email: '' });
```

### 3. Form State (useForm de Mantine)

Pour les formulaires:
```typescript
const form = useForm({
  initialValues: { email: '', password: '' },
  validate: {
    email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Invalid email'),
  },
});
```

---

## 🛣️ Routing

### Structure des Routes

```typescript
// src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from '@/guards/ProtectedRoute';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/qr-login" element={<QRLogin />} />

        {/* Protected routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
```

### Constantes de Routes

```typescript
// src/constants/routes.ts
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  SIGNUP: '/signup',
  QR_LOGIN: '/qr-login',
  DASHBOARD: '/dashboard',
  PROFILE: '/profile',
  MEMBERSHIP: '/membership',
} as const;
```

---

## 🔥 Firebase Structure

### Collections Firestore

```
fornap-db/
├── users/                          # Collection des utilisateurs
│   └── {uid}/                      # Document par utilisateur (uid auto-généré)
│       ├── email: string
│       ├── firstName: string
│       ├── lastName: string
│       ├── phone: string
│       ├── dateOfBirth: Timestamp
│       ├── postalCode: string
│       ├── createdAt: Timestamp
│       ├── updatedAt: Timestamp
│       ├── interests: string[]
│       ├── howDidYouHearAboutUs: string
│       ├── preferredAmbiance: string
│       │
│       ├── subscription/           # Sous-collection
│       │   └── {subscriptionId}/
│       │       ├── type: string (monthly, yearly, etc.)
│       │       ├── status: string (active, inactive, expired)
│       │       ├── startDate: Timestamp
│       │       ├── endDate: Timestamp
│       │       └── autoRenew: boolean
│       │
│       └── qrCode/
│           └── {qrCodeId}/
│               ├── imageUrl: string
│               ├── data: string
│               └── generatedAt: Timestamp
│
└── pre-members/                    # Membres ajoutés manuellement sans compte
    └── {uid}/
        ├── firstName: string
        ├── lastName: string
        ├── email: string
        ├── phone: string
        ├── birthDate: string
        ├── postalCode: string
        ├── ticketType: string
        ├── memberType: string
        ├── endMember: Timestamp
        ├── qrCodeUrl: string
        ├── hasAccount: boolean        # false par défaut
        └── linkedUserId: string | null # uid du user une fois compte créé
```

### Services Firebase

```typescript
// src/services/firebase/firestore.ts
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from './config';

export const userService = {
  async getUser(uid: string) {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() : null;
  },

  async createUser(uid: string, data: UserData) {
    const docRef = doc(db, 'users', uid);
    await setDoc(docRef, {
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  },

  async updateUser(uid: string, data: Partial<UserData>) {
    const docRef = doc(db, 'users', uid);
    await updateDoc(docRef, {
      ...data,
      updatedAt: new Date(),
    });
  },
};
```

---

## 📝 Documentation du Code

### JSDoc pour les fonctions complexes

```typescript
/**
 * Valide et formate un numéro de téléphone français
 * @param phone - Le numéro de téléphone à valider (avec ou sans espaces)
 * @returns Le numéro formaté ou null si invalide
 * @example
 * formatPhoneNumber('0612345678') // '06 12 34 56 78'
 * formatPhoneNumber('06 12 34 56 78') // '06 12 34 56 78'
 */
export function formatPhoneNumber(phone: string): string | null {
  // Implementation
}
```

### README pour les modules complexes

Chaque module important devrait avoir un README:

```markdown
# SignupForm Component

## Description
Formulaire d'inscription multi-étapes avec validation et intégration Firebase.

## Usage
\`\`\`tsx
import { SignupForm } from '@components/forms/SignupForm';

<SignupForm onSuccess={() => navigate('/dashboard')} />
\`\`\`

## Props
- `onSuccess`: Callback appelé après inscription réussie
- `initialStep`: Étape initiale (défaut: 0)

## Steps
1. Welcome - Message de bienvenue
2. Credentials - Email et mot de passe
3. Personal Info - Informations personnelles
4. Interests - Centres d'intérêt
5. Confirmation - Résumé et confirmation
```

---

## ✅ Checklist Avant Commit

- [ ] Code formaté (Prettier/ESLint)
- [ ] Pas de `console.log` ou code debug
- [ ] Types TypeScript corrects
- [ ] Imports organisés (absolus quand possible)
- [ ] Pas de code commenté non nécessaire
- [ ] Noms de variables/fonctions descriptifs
- [ ] Gestion d'erreurs appropriée
- [ ] Loading states pour async operations
- [ ] Responsive design vérifié
- [ ] Accessibilité vérifiée (labels, contraste, etc.)

---

## 🚀 Performance

### Code Splitting

```typescript
// Lazy loading des pages
const Dashboard = lazy(() => import('@pages/Dashboard'));
const Profile = lazy(() => import('@pages/Profile'));

// Dans App.tsx
<Suspense fallback={<LoadingSpinner />}>
  <Routes>
    <Route path="/dashboard" element={<Dashboard />} />
  </Routes>
</Suspense>
```

### Optimisation des Images

```typescript
// Utiliser des formats modernes (WebP)
<img src="image.webp" alt="Description" loading="lazy" />

// Responsive images
<picture>
  <source media="(min-width: 768px)" srcset="large.webp" />
  <source media="(min-width: 480px)" srcset="medium.webp" />
  <img src="small.webp" alt="Description" />
</picture>
```

---

**Version**: 1.0.0
**Dernière mise à jour**: 2025-10-20
