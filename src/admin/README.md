# 📊 Panel d'Administration FORNAP - Guide Complet

## 📁 Architecture du Projet

### Structure des Dossiers

```
src/admin/
├── layouts/               # Layouts de l'interface admin
│   └── AdminLayout.tsx    # Layout principal avec sidebar + header
│
├── pages/                 # Pages du panel admin
│   ├── Dashboard/         # Page d'accueil avec statistiques
│   ├── Users/             # Gestion des utilisateurs
│   ├── Memberships/       # Gestion des abonnements
│   ├── Events/            # Gestion des événements
│   ├── Coworking/         # Gestion des espaces coworking
│   └── Settings/          # Paramètres généraux
│
├── components/            # Composants réutilisables
│   ├── stats/             # Composants de statistiques
│   │   ├── StatCard.tsx           # Carte de statistique
│   │   └── TrendIndicator.tsx     # Indicateur de tendance
│   ├── charts/            # Composants de graphiques
│   │   ├── LineChart.tsx          # Graphique en ligne
│   │   ├── BarChart.tsx           # Graphique en barres
│   │   └── PieChart.tsx           # Graphique circulaire
│   ├── tables/            # (À créer) Composants de tables
│   ├── forms/             # (À créer) Composants de formulaires
│   └── AdminProtectedRoute.tsx    # Route protégée admin
│
├── hooks/                 # (À créer) Hooks personnalisés
│   ├── useUsers.ts        # Gestion des utilisateurs
│   ├── useEvents.ts       # Gestion des événements
│   ├── useCoworking.ts    # Gestion du coworking
│   └── useStats.ts        # Récupération des statistiques
│
├── services/              # (À créer) Services Firebase
│   ├── adminFirestore.ts  # Requêtes Firestore admin
│   ├── analytics.ts       # Google Analytics
│   └── exports.ts         # Export CSV/Excel
│
├── types/                 # Types TypeScript
│   ├── admin.ts           # Types généraux admin
│   ├── event.ts           # Types événements
│   ├── coworking.ts       # Types coworking
│   ├── membership.ts      # Types abonnements
│   └── index.ts           # Export central
│
├── routes.tsx             # Configuration des routes admin
└── README.md              # Ce fichier
```

---

## 🎨 Système de Design

### Bibliothèques Utilisées

- **Mantine v8** : Framework UI principal
  - `@mantine/core` - Composants de base
  - `@mantine/charts` - Graphiques (basé sur Recharts)
  - `@mantine/hooks` - Hooks utilitaires
  - `@mantine/notifications` - Système de notifications
  - `@mantine/modals` - Modales
  - `@mantine/spotlight` - Recherche rapide

- **TanStack Table** : Tables de données avancées
- **Tabler Icons** : Icônes
- **Firebase** : Backend (Firestore + Auth)

### Palette de Couleurs

```tsx
// Couleurs principales
primary: 'indigo'    // Couleur principale du panel
success: 'green'     // Succès, revenus positifs
warning: 'orange'    // Alertes
danger: 'red'        // Erreurs, suppressions
info: 'cyan'         // Informations

// États des badges
membershipType: {
  monthly: 'blue',
  annual: 'green',
  honorary: 'grape'
}

membershipStatus: {
  active: 'green',
  inactive: 'gray',
  pending: 'orange',
  expired: 'red'
}
```

---

## 🚀 Comment Ajouter une Nouvelle Section

### Étape 1 : Créer les Types

Créez un fichier dans `admin/types/` pour définir vos types :

```tsx
// admin/types/product.ts
export interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  createdAt: string;
}

export interface ProductFormData extends Omit<Product, 'id' | 'createdAt'> {}
```

**N'oubliez pas** d'exporter dans `admin/types/index.ts` :
```tsx
export * from './product';
```

### Étape 2 : Créer la Page

Créez un dossier dans `admin/pages/` :

```tsx
// admin/pages/Products/ProductsListPage.tsx
import { Container, Title, Button, Paper, Table } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';

export function ProductsListPage() {
  const navigate = useNavigate();

  return (
    <Container size="xl">
      <Group justify="space-between" mb="xl">
        <Title order={1}>Gestion des Produits</Title>
        <Button
          leftSection={<IconPlus size={16} />}
          onClick={() => navigate('/admin/products/new')}
        >
          Nouveau Produit
        </Button>
      </Group>

      {/* Filtres */}
      <Paper withBorder p="md" mb="md" radius="md">
        {/* Vos filtres ici */}
      </Paper>

      {/* Table */}
      <Paper withBorder radius="md" shadow="sm">
        <Table.ScrollContainer minWidth={800}>
          <Table striped highlightOnHover>
            {/* Votre table ici */}
          </Table>
        </Table.ScrollContainer>
      </Paper>
    </Container>
  );
}
```

### Étape 3 : Ajouter la Route

Modifiez `admin/routes.tsx` :

```tsx
import { ProductsListPage } from './pages/Products/ProductsListPage';

export function AdminRoutes() {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="users" element={<UsersListPage />} />
        <Route path="memberships" element={<MembershipsPage />} />
        <Route path="events" element={<EventsListPage />} />
        <Route path="coworking" element={<CoworkingListPage />} />

        {/* ⭐ NOUVELLE ROUTE */}
        <Route path="products" element={<ProductsListPage />} />

        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}
```

### Étape 4 : Ajouter au Menu

Modifiez `admin/layouts/AdminLayout.tsx` :

```tsx
import { IconShoppingCart } from '@tabler/icons-react'; // Importer l'icône

const navigationItems: NavItem[] = [
  { icon: IconDashboard, label: 'Dashboard', path: '/admin/dashboard' },
  { icon: IconUsers, label: 'Utilisateurs', path: '/admin/users' },
  { icon: IconTicket, label: 'Abonnements', path: '/admin/memberships' },
  { icon: IconCalendar, label: 'Événements', path: '/admin/events' },
  { icon: IconBuildingCommunity, label: 'Coworking', path: '/admin/coworking' },

  // ⭐ NOUVELLE ENTRÉE
  { icon: IconShoppingCart, label: 'Produits', path: '/admin/products' },

  { icon: IconSettings, label: 'Paramètres', path: '/admin/settings' },
];
```

### Étape 5 : (Optionnel) Créer un Hook Personnalisé

Créez un hook dans `admin/hooks/` :

```tsx
// admin/hooks/useProducts.ts
import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../shared/config/firebase';
import type { Product } from '../types';

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Récupérer tous les produits
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const querySnapshot = await getDocs(collection(db, 'products'));
      const productsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Product[];
      setProducts(productsData);
      setError(null);
    } catch (err) {
      setError('Erreur lors de la récupération des produits');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Ajouter un produit
  const addProduct = async (data: Omit<Product, 'id' | 'createdAt'>) => {
    try {
      const docRef = await addDoc(collection(db, 'products'), {
        ...data,
        createdAt: new Date().toISOString(),
      });
      await fetchProducts(); // Rafraîchir
      return docRef.id;
    } catch (err) {
      console.error('Erreur ajout produit:', err);
      throw err;
    }
  };

  // Mettre à jour un produit
  const updateProduct = async (id: string, data: Partial<Product>) => {
    try {
      await updateDoc(doc(db, 'products', id), data);
      await fetchProducts(); // Rafraîchir
    } catch (err) {
      console.error('Erreur mise à jour produit:', err);
      throw err;
    }
  };

  // Supprimer un produit
  const deleteProduct = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'products', id));
      await fetchProducts(); // Rafraîchir
    } catch (err) {
      console.error('Erreur suppression produit:', err);
      throw err;
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  return {
    products,
    loading,
    error,
    fetchProducts,
    addProduct,
    updateProduct,
    deleteProduct,
  };
}
```

Utilisez-le dans votre page :

```tsx
export function ProductsListPage() {
  const { products, loading, deleteProduct } = useProducts();

  // ... votre code
}
```

---

## 📄 Anatomie d'une Page Admin

### Structure Type

```tsx
import { Container, Title, Paper, Group, Button } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';

export function MyPage() {
  const navigate = useNavigate();

  return (
    <Container size="xl">
      {/* 1. Header avec titre et actions */}
      <Group justify="space-between" mb="xl">
        <Title order={1}>Mon Titre</Title>
        <Group>
          <Button variant="light">Action Secondaire</Button>
          <Button leftSection={<IconPlus size={16} />}>
            Action Principale
          </Button>
        </Group>
      </Group>

      {/* 2. Section de filtres (optionnel) */}
      <Paper withBorder p="md" mb="md" radius="md">
        {/* Vos filtres */}
      </Paper>

      {/* 3. Contenu principal */}
      <Paper withBorder radius="md" shadow="sm">
        {/* Votre contenu */}
      </Paper>
    </Container>
  );
}
```

### Patterns Communs

#### Pattern 1 : Page avec Stats + Table

```tsx
<Container size="xl">
  {/* Stats Grid */}
  <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md" mb="xl">
    <StatCard title="..." value="..." icon={<Icon />} />
  </SimpleGrid>

  {/* Filtres */}
  <Paper withBorder p="md" mb="md">...</Paper>

  {/* Table */}
  <Paper withBorder>
    <Table>...</Table>
  </Paper>
</Container>
```

#### Pattern 2 : Page avec Graphiques

```tsx
<Container size="xl">
  {/* Stats */}
  <SimpleGrid cols={3}>...</SimpleGrid>

  {/* Graphiques */}
  <Grid mb="xl">
    <Grid.Col span={{ base: 12, md: 8 }}>
      <LineChart {...props} />
    </Grid.Col>
    <Grid.Col span={{ base: 12, md: 4 }}>
      <PieChart {...props} />
    </Grid.Col>
  </Grid>
</Container>
```

#### Pattern 3 : Page avec Cards

```tsx
<Container size="xl">
  <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }}>
    {items.map(item => (
      <Card withBorder key={item.id}>
        {/* Contenu card */}
      </Card>
    ))}
  </SimpleGrid>
</Container>
```

---

## 🎯 Composants Réutilisables

### StatCard

Affiche une statistique avec icône et évolution.

```tsx
import { StatCard } from '../../components/stats/StatCard';
import { IconUsers } from '@tabler/icons-react';

<StatCard
  title="Membres Actifs"
  value="1,234"
  icon={<IconUsers size={22} />}
  change={12.5}  // Pourcentage d'évolution (positif = hausse)
  color="indigo"
  description="Total inscrit"
/>
```

### TrendIndicator

Affiche juste un indicateur de tendance.

```tsx
import { TrendIndicator } from '../../components/stats/TrendIndicator';

<TrendIndicator value={8.5} suffix="%" />
```

### LineChart

Graphique en ligne avec plusieurs séries.

```tsx
import { LineChart } from '../../components/charts/LineChart';

const data = [
  { month: 'Jan', value1: 100, value2: 80 },
  { month: 'Fév', value1: 120, value2: 90 },
];

<LineChart
  title="Évolution"
  data={data}
  dataKey="month"
  series={[
    { name: 'value1', color: 'indigo.6' },
    { name: 'value2', color: 'cyan.6' },
  ]}
  height={300}
/>
```

### PieChart

Graphique circulaire.

```tsx
import { PieChart } from '../../components/charts/PieChart';

const data = [
  { name: 'Catégorie A', value: 45, color: 'indigo.6' },
  { name: 'Catégorie B', value: 35, color: 'cyan.6' },
];

<PieChart title="Répartition" data={data} height={300} />
```

### BarChart

Graphique en barres.

```tsx
import { BarChart } from '../../components/charts/BarChart';

<BarChart
  title="Statistiques"
  data={data}
  dataKey="month"
  series={[
    { name: 'value', color: 'blue.6' },
  ]}
  height={300}
/>
```

---

## 🔐 Sécurité et Permissions

### Protéger une Route Admin

Toutes les routes `/admin/*` sont automatiquement protégées par `AdminProtectedRoute`.

**À faire** : Ajouter un champ `isAdmin` dans `UserProfile` :

```tsx
// shared/types/user.ts
export interface UserProfile {
  uid: string;
  email: string;
  // ... autres champs

  // ⭐ AJOUTER
  isAdmin?: boolean;
  adminPermissions?: AdminPermission[];
}
```

Ensuite, modifier `admin/components/AdminProtectedRoute.tsx` :

```tsx
export function AdminProtectedRoute({ children }: AdminProtectedRouteProps) {
  const { currentUser, userProfile, loading } = useAuth();

  // ⭐ VÉRIFICATION AMÉLIORÉE
  const isAdmin = currentUser !== null && userProfile?.isAdmin === true;

  if (loading) {
    return <div>Chargement...</div>;
  }

  if (!isAdmin) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
```

### Permissions Granulaires

Utiliser le type `AdminPermission` défini dans `admin/types/admin.ts` :

```tsx
export type AdminPermission =
  | 'users:read'
  | 'users:write'
  | 'users:delete'
  | 'events:read'
  | 'events:write'
  // etc.
```

Créer un hook pour vérifier les permissions :

```tsx
// admin/hooks/useAdminPermissions.ts
export function useAdminPermissions() {
  const { userProfile } = useAuth();

  const hasPermission = (permission: AdminPermission) => {
    return userProfile?.adminPermissions?.includes(permission) || false;
  };

  return { hasPermission };
}
```

---

## 🔥 Requêtes Firebase

### Pattern CRUD Standard

```tsx
import { collection, getDocs, doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../shared/config/firebase';

// Lire tous les documents
const querySnapshot = await getDocs(collection(db, 'collectionName'));
const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

// Lire un document
const docSnap = await getDoc(doc(db, 'collectionName', id));
if (docSnap.exists()) {
  const data = docSnap.data();
}

// Créer/Mettre à jour
await setDoc(doc(db, 'collectionName', id), data);

// Mettre à jour partiellement
await updateDoc(doc(db, 'collectionName', id), { field: value });

// Supprimer
await deleteDoc(doc(db, 'collectionName', id));
```

### Requêtes avec Filtres

```tsx
import { query, where, orderBy, limit } from 'firebase/firestore';

const q = query(
  collection(db, 'users'),
  where('membership.status', '==', 'active'),
  orderBy('createdAt', 'desc'),
  limit(10)
);

const querySnapshot = await getDocs(q);
```

---

## 🎨 Meilleures Pratiques

### 1. Nomenclature

- **Pages** : `NomPage.tsx` (PascalCase)
- **Composants** : `NomComposant.tsx` (PascalCase)
- **Hooks** : `useNomHook.ts` (camelCase avec `use`)
- **Types** : `nomType.ts` (camelCase)

### 2. Organisation des Imports

```tsx
// 1. React et hooks
import { useState, useEffect } from 'react';

// 2. Bibliothèques externes
import { Container, Title } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';

// 3. Router
import { useNavigate } from 'react-router-dom';

// 4. Composants locaux
import { StatCard } from '../../components/stats/StatCard';

// 5. Hooks personnalisés
import { useUsers } from '../../hooks/useUsers';

// 6. Types
import type { User } from '../../types';
```

### 3. Gestion des États

```tsx
// ❌ Mauvais
const [data, setData] = useState();
const [loading, setLoading] = useState();

// ✅ Bon
const [data, setData] = useState<User[]>([]);
const [loading, setLoading] = useState<boolean>(false);
const [error, setError] = useState<string | null>(null);
```

### 4. Gestion des Erreurs

```tsx
try {
  setLoading(true);
  await operation();
  notifications.show({
    title: 'Succès',
    message: 'Opération réussie',
    color: 'green',
  });
} catch (error) {
  notifications.show({
    title: 'Erreur',
    message: 'Une erreur est survenue',
    color: 'red',
  });
  console.error(error);
} finally {
  setLoading(false);
}
```

### 5. Responsive Design

Toujours utiliser les props responsive de Mantine :

```tsx
<SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }}>
  {/* ... */}
</SimpleGrid>

<Grid.Col span={{ base: 12, md: 6, lg: 4 }}>
  {/* ... */}
</Grid.Col>
```

---

## 🛠️ Commandes Utiles

```bash
# Lancer en dev
npm run dev

# Build
npm run build

# Lint
npm run lint

# Accéder au panel admin (une fois connecté)
http://localhost:5173/admin
```

---

## 📚 Ressources

- [Documentation Mantine](https://mantine.dev/)
- [Tabler Icons](https://tabler-icons.io/)
- [Firebase Docs](https://firebase.google.com/docs)
- [React Router](https://reactrouter.com/)
- [TanStack Table](https://tanstack.com/table)

---

## ✅ Checklist pour Nouvelle Section

- [ ] Créer les types dans `admin/types/`
- [ ] Exporter les types dans `admin/types/index.ts`
- [ ] Créer le dossier de page dans `admin/pages/`
- [ ] Créer la page principale (ex: `ListPage.tsx`)
- [ ] Ajouter la route dans `admin/routes.tsx`
- [ ] Ajouter l'entrée de menu dans `admin/layouts/AdminLayout.tsx`
- [ ] (Optionnel) Créer un hook dans `admin/hooks/`
- [ ] (Optionnel) Créer un service dans `admin/services/`
- [ ] Tester la navigation
- [ ] Tester les permissions

---

**Créé avec ❤️ pour FORNAP**
*Panel Admin Professionnel - Version 1.0*
