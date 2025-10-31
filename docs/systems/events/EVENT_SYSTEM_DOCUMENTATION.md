# 📅 Système de Gestion d'Événements et Billetterie - Documentation Complète

## 📋 Table des Matières

1. [Vue d'ensemble](#vue-densemble)
2. [Architecture](#architecture)
3. [Schéma de Base de Données](#schéma-de-base-de-données)
4. [Services Backend](#services-backend)
5. [Analytics](#analytics)
6. [Intégration Frontend](#intégration-frontend)
7. [Exemples d'Utilisation](#exemples-dutilisation)
8. [Workflows](#workflows)

---

## 🎯 Vue d'ensemble

Le système de gestion d'événements est une solution complète pour:
- ✅ Créer et gérer des événements avec plusieurs catégories de billets
- ✅ Gérer les ventes de billets et les inscriptions
- ✅ Suivre les présences (check-in)
- ✅ Analyser les performances avec des métriques avancées
- ✅ Profiler les participants (âge, abonnements, fidélité)
- ✅ Gérer les artistes, lieux, et paramètres d'événements

### Fonctionnalités Principales

#### 🎭 Gestion des Événements
- Création/édition/suppression d'événements
- Plusieurs types: concerts, expositions, ateliers, conférences, etc.
- Statuts: brouillon, publié, en cours, terminé, annulé
- Activation/désactivation sans suppression
- Mise en avant d'événements (featured)
- Duplication d'événements
- Lieux physiques, en ligne, ou hybrides

#### 🎫 Système de Billetterie
- Catégories de billets illimitées (VIP, Standard, Early Bird, etc.)
- Prix personnalisés par catégorie
- Capacité et gestion du stock par catégorie
- Restrictions d'accès (membres uniquement, types d'abonnement spécifiques)
- Périodes de vente configurables
- Limites d'achat par utilisateur
- QR codes uniques pour chaque billet
- Numéros de billets lisibles (ex: TKT-ABC123-00042)

#### 👥 Gestion des Participants
- Liste des acheteurs par événement
- Check-in via QR code
- Historique d'achat des utilisateurs
- Points de fidélité sur les achats
- Approbation manuelle optionnelle
- Remboursements et annulations

#### 📊 Analytics Avancés
- KPIs globaux (revenus, billets vendus, taux d'occupation)
- Performance par type d'événement
- Top événements par revenus
- Profil des participants (âge, abonnements, villes)
- Taux de fidélité et repeat attendees
- Évolution temporelle des ventes

---

## 🏗️ Architecture

### Structure des Fichiers

```
src/
├── shared/
│   ├── types/
│   │   └── event.ts                    # Types TypeScript
│   └── services/
│       ├── eventService.ts             # CRUD événements
│       ├── ticketPurchaseService.ts    # Gestion des achats
│       └── analytics/
│           └── eventAnalytics.ts       # Métriques et stats
├── admin/
│   └── pages/
│       ├── Events/
│       │   ├── EventsListPage.tsx      # Liste des événements
│       │   ├── EventCreatePage.tsx     # Création (à créer)
│       │   ├── EventEditPage.tsx       # Édition (à créer)
│       │   └── EventDetailPage.tsx     # Détails + participants (à créer)
│       └── Analytics/
│           └── EventAnalyticsPage.tsx  # Dashboard analytics
```

### Stack Technique

- **Backend**: Firebase Firestore
- **Frontend**: React 19 + TypeScript
- **UI**: Mantine v8
- **Routing**: React Router v6
- **State**: React Hooks (useState, useEffect)
- **Notifications**: @mantine/notifications
- **Modals**: @mantine/modals

---

## 💾 Schéma de Base de Données

### Collection: `events`

```typescript
{
  id: string,

  // Informations de base
  title: string,
  slug: string,                    // URL-friendly (auto-généré)
  description: string,
  shortDescription?: string,       // Pour cards/aperçus

  // Dates
  startDate: Timestamp,
  endDate: Timestamp,
  timezone: string,                // "Europe/Paris"
  doorsOpenTime?: Timestamp,       // Ouverture des portes

  // Lieu
  location: {
    type: 'physical' | 'online' | 'hybrid',
    venueName?: string,
    address?: string,
    city?: string,
    postalCode?: string,
    country?: string,
    coordinates?: { latitude: number, longitude: number },
    onlineLink?: string,
    onlinePlatform?: string,
    accessInstructions?: string,
    parkingInfo?: string
  },

  // Artistes
  artists: [
    {
      id: string,
      name: string,
      role?: string,               // "Main Act", "DJ", etc.
      bio?: string,
      photo?: string,
      websiteUrl?: string,
      socialMedia?: {
        instagram?: string,
        facebook?: string,
        twitter?: string,
        youtube?: string
      },
      order: number
    }
  ],

  // Catégorisation
  type: EventType,                 // concert, exhibition, workshop, etc.
  categories: string[],            // Tags supplémentaires
  tags: string[],                  // familial, gratuit, accessible_pmr, etc.

  // Médias
  coverImage?: string,
  images: string[],
  videoUrl?: string,

  // Catégories de billets
  ticketCategories: [
    {
      id: string,
      name: string,                // "VIP", "Standard", "Early Bird"
      description?: string,
      price: number,
      capacity: number,
      sold: number,                // Nombre vendus
      reserved: number,            // Temporairement réservés (checkout)
      available: number,           // Computed: capacity - sold - reserved
      isActive: boolean,

      // Restrictions
      requiresMembership: boolean,
      allowedMembershipTypes?: ('monthly' | 'annual' | 'lifetime')[],

      // Période de vente
      salesStartDate?: Timestamp,
      salesEndDate?: Timestamp,

      // Avantages
      benefits: string[],          // ["Meet & Greet", "Front Row"]
      order: number
    }
  ],

  // Statistiques
  totalCapacity: number,           // Somme des capacités
  totalSold: number,               // Total billets vendus
  totalCheckedIn: number,          // Total participants présents
  totalRevenue: number,            // Revenus totaux

  // Statut & Visibilité
  status: 'draft' | 'published' | 'ongoing' | 'completed' | 'cancelled',
  isActive: boolean,               // Peut être désactivé sans annuler
  isFeatured: boolean,             // Mis en avant

  // Paramètres d'inscription
  registrationOpen: boolean,
  registrationStartDate?: Timestamp,
  registrationEndDate?: Timestamp,
  requiresApproval: boolean,       // Approbation manuelle

  // Limites
  allowWaitlist: boolean,
  maxTicketsPerUser: number,
  minAge?: number,

  // Informations supplémentaires
  termsAndConditions?: string,
  refundPolicy?: string,
  contactEmail?: string,
  contactPhone?: string,
  websiteUrl?: string,
  facebookEventUrl?: string,

  // Métadonnées
  createdAt: Timestamp,
  updatedAt: Timestamp,
  createdBy: string,               // Admin UID
  publishedAt?: Timestamp,
  cancelledAt?: Timestamp,
  cancellationReason?: string,

  // SEO
  metaTitle?: string,
  metaDescription?: string
}
```

### Subcollection: `events/{eventId}/purchases`

```typescript
{
  id: string,

  // Références
  eventId: string,
  eventTitle: string,              // Dénormalisé pour affichage
  eventStartDate: Timestamp,
  userId: string,
  userEmail: string,
  userName: string,

  // Détails du billet
  ticketCategoryId: string,
  ticketCategoryName: string,
  quantity: number,
  pricePerTicket: number,
  totalPrice: number,

  // Paiement
  paymentStatus: 'paid' | 'pending' | 'failed' | 'refunded',
  paymentMethod?: string,          // "card", "cash", "bank_transfer"
  transactionId?: string,
  paidAt?: Timestamp,

  // Statut de l'achat
  status: 'confirmed' | 'pending' | 'cancelled' | 'refunded',

  // Check-in
  checkedIn: boolean,
  checkedInAt?: Timestamp,
  checkedInBy?: string,            // Admin UID

  // Vérification du billet
  ticketQRCode: string,            // Code unique pour scan
  ticketNumber: string,            // Numéro lisible (TKT-XXX-00042)

  // Approbation (si requiresApproval = true)
  approvalRequired: boolean,
  approved: boolean,
  approvedAt?: Timestamp,
  approvedBy?: string,
  rejectionReason?: string,

  // Points de fidélité
  loyaltyPointsEarned: number,
  loyaltyPointsUsed: number,

  // Annulation & Remboursement
  cancelledAt?: Timestamp,
  cancellationReason?: string,
  cancelledBy?: string,
  refundedAt?: Timestamp,
  refundAmount?: number,
  refundTransactionId?: string,

  // Informations supplémentaires
  notes?: string,                  // Notes admin
  specialRequirements?: string,    // Besoins spéciaux utilisateur

  // Timestamps
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### Intégration avec `users`

Chaque achat ajoute une entrée dans `users/{userId}/actionHistory`:

```typescript
{
  actionType: 'event_registration' | 'event_checkin',
  details: {
    eventId: string,
    eventTitle: string,
    ticketCategoryName: string,
    quantity: number,
    totalPrice: number,
    ticketNumber: string,
    purchaseId: string
  },
  timestamp: Timestamp
}
```

---

## 🔧 Services Backend

### 1. eventService.ts

Gère toutes les opérations CRUD sur les événements.

#### Fonctions Principales

```typescript
// ============= LECTURE =============

/**
 * Récupère tous les événements
 */
getAllEvents(): Promise<Event[]>

/**
 * Récupère tous les événements (format liste optimisé)
 */
getAllEventsForList(): Promise<EventListItem[]>

/**
 * Récupère un événement par ID
 */
getEventById(eventId: string): Promise<Event | null>

/**
 * Récupère un événement par slug
 */
getEventBySlug(slug: string): Promise<Event | null>

/**
 * Récupère les événements à venir (publiés et actifs)
 */
getUpcomingEvents(limit?: number): Promise<Event[]>

/**
 * Récupère les événements mis en avant
 */
getFeaturedEvents(limit?: number): Promise<Event[]>

/**
 * Récupère les événements par type
 */
getEventsByType(eventType: string): Promise<Event[]>

/**
 * Récupère les événements par statut
 */
getEventsByStatus(status: EventStatus): Promise<Event[]>

/**
 * Filtre les événements (côté client)
 */
filterEvents(events: Event[], filters: EventFilters): Event[]

// ============= CRÉATION =============

/**
 * Crée un nouvel événement
 * @param formData - Données du formulaire
 * @param createdBy - UID de l'admin créateur
 * @returns ID du nouvel événement
 */
createEvent(formData: EventFormData, createdBy: string): Promise<string>

// ============= MODIFICATION =============

/**
 * Met à jour un événement
 * @param eventId - ID de l'événement
 * @param updates - Champs à mettre à jour (partial)
 */
updateEvent(eventId: string, updates: Partial<EventFormData>): Promise<void>

/**
 * Active/Désactive un événement
 */
toggleEventActive(eventId: string, isActive: boolean): Promise<void>

/**
 * Met en avant/Retire de la mise en avant
 */
toggleEventFeatured(eventId: string, isFeatured: boolean): Promise<void>

/**
 * Change le statut d'un événement
 */
updateEventStatus(eventId: string, status: EventStatus): Promise<void>

// ============= SUPPRESSION =============

/**
 * Supprime un événement
 * ⚠️ Échoue si des billets ont été vendus
 */
deleteEvent(eventId: string): Promise<void>

/**
 * Annule un événement
 * @param eventId - ID de l'événement
 * @param cancellationReason - Raison de l'annulation
 * @param cancelledBy - UID de l'admin
 */
cancelEvent(
  eventId: string,
  cancellationReason: string,
  cancelledBy: string
): Promise<void>

// ============= DUPLICATION =============

/**
 * Duplique un événement
 * @param eventId - ID de l'événement à dupliquer
 * @param createdBy - UID de l'admin
 * @param titleSuffix - Suffixe du titre (défaut: " (Copie)")
 * @returns ID du nouvel événement
 */
duplicateEvent(
  eventId: string,
  createdBy: string,
  titleSuffix?: string
): Promise<string>
```

#### Exemple d'Utilisation

```typescript
import {
  createEvent,
  getUpcomingEvents,
  updateEvent
} from '@/shared/services/eventService';

// Créer un événement
const eventData: EventFormData = {
  title: "Concert Jazz",
  description: "Soirée jazz exceptionnelle...",
  startDate: "2024-07-15T20:00:00",
  endDate: "2024-07-15T23:00:00",
  timezone: "Europe/Paris",
  location: {
    type: "physical",
    venueName: "Le Blue Note",
    address: "123 rue de la Musique",
    city: "Paris",
    postalCode: "75001"
  },
  type: "concert",
  ticketCategories: [
    {
      id: "standard",
      name: "Standard",
      price: 25,
      capacity: 100,
      isActive: true,
      requiresMembership: false,
      benefits: [],
      order: 1
    }
  ],
  status: "published",
  isActive: true
  // ... autres champs
};

const eventId = await createEvent(eventData, "admin-uid");

// Récupérer les événements à venir
const upcoming = await getUpcomingEvents(10);

// Mettre à jour
await updateEvent(eventId, {
  isFeatured: true,
  maxTicketsPerUser: 5
});
```

---

### 2. ticketPurchaseService.ts

Gère les achats de billets, check-ins, et annulations.

#### Fonctions Principales

```typescript
// ============= LECTURE =============

/**
 * Récupère tous les achats pour un événement
 */
getEventPurchases(eventId: string): Promise<EventPurchase[]>

/**
 * Récupère tous les achats pour un événement (format liste)
 */
getEventPurchasesForList(eventId: string): Promise<EventPurchaseListItem[]>

/**
 * Récupère un achat par ID
 */
getPurchaseById(eventId: string, purchaseId: string): Promise<EventPurchase | null>

/**
 * Récupère tous les achats d'un utilisateur (tous événements)
 */
getUserPurchases(userId: string): Promise<EventPurchase[]>

/**
 * Récupère les achats d'un utilisateur pour un événement spécifique
 */
getUserEventPurchase(userId: string, eventId: string): Promise<EventPurchase[]>

/**
 * Récupère un achat par QR code
 */
getPurchaseByQRCode(eventId: string, qrCode: string): Promise<EventPurchase | null>

/**
 * Filtre les achats (côté client)
 */
filterPurchases(purchases: EventPurchase[], filters: PurchaseFilters): EventPurchase[]

// ============= CRÉATION =============

/**
 * Crée un achat de billet
 * ⚠️ Utilise une transaction Firebase pour garantir la cohérence
 *
 * Effectue automatiquement:
 * - Validation de disponibilité
 * - Vérification des restrictions (membres, périodes de vente)
 * - Génération du QR code et numéro de billet
 * - Mise à jour des compteurs de l'événement
 * - Attribution de points de fidélité
 * - Création de l'historique utilisateur
 *
 * @param purchaseData - Données de l'achat
 * @returns ID de l'achat créé
 */
createTicketPurchase(purchaseData: CreatePurchaseData): Promise<string>

interface CreatePurchaseData {
  eventId: string;
  userId: string;
  ticketCategoryId: string;
  quantity: number;
  paymentMethod?: string;
  paymentStatus?: PaymentStatus;
  transactionId?: string;
  loyaltyPointsUsed?: number;
  specialRequirements?: string;
  notes?: string;
}

/**
 * Ajoute l'achat à l'historique utilisateur
 * À appeler après createTicketPurchase
 */
addPurchaseToUserHistory(
  userId: string,
  eventId: string,
  purchaseId: string
): Promise<void>

// ============= MODIFICATION =============

/**
 * Met à jour le statut de paiement
 */
updatePurchasePaymentStatus(
  eventId: string,
  purchaseId: string,
  paymentStatus: PaymentStatus,
  transactionId?: string
): Promise<void>

/**
 * Approuve un achat (pour événements nécessitant approbation)
 */
approvePurchase(
  eventId: string,
  purchaseId: string,
  approvedBy: string
): Promise<void>

/**
 * Rejette un achat
 * ⚠️ Remet les billets dans le stock disponible
 * ⚠️ Rembourse les points de fidélité
 */
rejectPurchase(
  eventId: string,
  purchaseId: string,
  rejectionReason: string,
  rejectedBy: string
): Promise<void>

// ============= CHECK-IN =============

/**
 * Enregistre la présence d'un participant
 */
checkInAttendee(
  eventId: string,
  purchaseId: string,
  checkedInBy: string
): Promise<void>

/**
 * Enregistre la présence via QR code
 * @returns L'achat mis à jour avec checkedIn = true
 */
checkInByQRCode(
  eventId: string,
  qrCode: string,
  checkedInBy: string
): Promise<EventPurchase>

// ============= ANNULATION =============

/**
 * Annule un achat
 * ⚠️ Ne peut pas annuler après check-in
 * ⚠️ Remet les billets dans le stock disponible
 * ⚠️ Rembourse les points de fidélité
 */
cancelPurchase(
  eventId: string,
  purchaseId: string,
  cancellationReason: string,
  cancelledBy: string
): Promise<void>

/**
 * Traite un remboursement
 */
refundPurchase(
  eventId: string,
  purchaseId: string,
  refundAmount: number,
  refundTransactionId: string
): Promise<void>
```

#### Exemple d'Utilisation

```typescript
import {
  createTicketPurchase,
  addPurchaseToUserHistory,
  checkInByQRCode
} from '@/shared/services/ticketPurchaseService';

// Acheter un billet
try {
  const purchaseId = await createTicketPurchase({
    eventId: "event-123",
    userId: "user-456",
    ticketCategoryId: "vip",
    quantity: 2,
    paymentMethod: "card",
    paymentStatus: "paid",
    transactionId: "txn_abc123"
  });

  // Ajouter à l'historique utilisateur
  await addPurchaseToUserHistory("user-456", "event-123", purchaseId);

  console.log("Billet acheté:", purchaseId);
} catch (error) {
  console.error(error.message);
  // Ex: "Only 1 ticket(s) available"
  //     "Active membership required to purchase this ticket"
}

// Check-in via QR code
try {
  const purchase = await checkInByQRCode(
    "event-123",
    "1234567-ABCDEF",
    "admin-uid"
  );

  console.log(`Check-in réussi pour ${purchase.userName}`);
} catch (error) {
  console.error(error.message);
  // Ex: "Invalid QR code or ticket not found"
  //     "Already checked in"
}
```

---

### 3. eventAnalytics.ts

Fournit des métriques et statistiques avancées.

#### Fonctions Principales

```typescript
/**
 * Récupère les KPIs globaux des événements
 *
 * Retourne:
 * - totalEvents, activeEvents, upcomingEvents, completedEvents
 * - totalRevenue, monthlyRevenue, averageRevenuePerEvent
 * - totalTicketsSold, monthlyTicketsSold, averageTicketPrice
 * - totalAttendees, averageAttendanceRate, averageOccupancyRate
 * - repeatAttendeeRate, averageTicketsPerUser
 * - trends (vs mois précédent)
 */
getEventAnalyticsKPIs(): Promise<EventAnalyticsKPIs>

/**
 * Récupère l'évolution des revenus sur une période
 * @param startDate - Date de début
 * @param endDate - Date de fin
 * @param granularity - 'day' | 'week' | 'month'
 * @returns Tableau de données temporelles
 */
getRevenueEvolution(
  startDate: Date,
  endDate: Date,
  granularity: 'day' | 'week' | 'month'
): Promise<EventRevenueData[]>

/**
 * Récupère la distribution et performance par type d'événement
 *
 * Pour chaque type:
 * - count: nombre d'événements
 * - revenue: revenus totaux
 * - ticketsSold: billets vendus
 * - averageOccupancy: taux d'occupation moyen
 */
getEventTypeDistribution(): Promise<EventTypeDistribution[]>

/**
 * Récupère les événements les plus performants
 * @param limit - Nombre d'événements à retourner (défaut: 10)
 * @returns Événements triés par revenus décroissants
 */
getTopEvents(limit?: number): Promise<TopEvent[]>

/**
 * Récupère le profil démographique des participants
 *
 * Retourne:
 * - averageAge: âge moyen
 * - ageDistribution: répartition par tranches d'âge
 * - membershipDistribution: répartition par type d'abonnement
 * - topCities: villes les plus représentées
 * - repeatAttendeeRate: taux de participants récurrents
 * - averageEventsPerUser: nombre moyen d'événements par utilisateur
 */
getAttendeeProfile(): Promise<AttendeeProfile>

/**
 * Récupère les statistiques détaillées pour un événement
 *
 * Retourne:
 * - totalSold, totalRevenue, occupancyRate
 * - salesByCategory: ventes par catégorie de billet
 * - salesTimeline: évolution des ventes dans le temps
 * - demographics: profil des participants
 * - totalCheckedIn, checkInRate
 * - revenueByPaymentMethod
 * - refundedAmount, netRevenue
 */
getEventDetailStats(eventId: string): Promise<EventDetailStats>
```

#### Exemple d'Utilisation

```typescript
import {
  getEventAnalyticsKPIs,
  getTopEvents,
  getAttendeeProfile
} from '@/shared/services/analytics/eventAnalytics';

// Charger les KPIs
const kpis = await getEventAnalyticsKPIs();
console.log(`Revenus totaux: ${kpis.totalRevenue}€`);
console.log(`Taux de fidélité: ${kpis.repeatAttendeeRate}%`);

// Top événements
const topEvents = await getTopEvents(5);
topEvents.forEach((event, index) => {
  console.log(`${index + 1}. ${event.title} - ${event.revenue}€`);
});

// Profil des participants
const profile = await getAttendeeProfile();
console.log(`Âge moyen: ${profile.averageAge} ans`);
console.log(`Taux de fidélité: ${profile.repeatAttendeeRate}%`);
```

---

## 📊 Analytics

### Métriques Disponibles

#### KPIs Globaux
- **Événements**: Total, actifs, à venir, terminés, brouillons
- **Billets**: Vendus (total + mensuel), prix moyen
- **Revenus**: Total, mensuel, par événement
- **Participants**: Total, taux de présence, taux d'occupation
- **Fidélité**: Taux de repeat attendees, billets moyens par user

#### Par Type d'Événement
- Nombre d'événements
- Billets vendus
- Revenus
- Taux d'occupation moyen

#### Top Événements
- Classement par revenus
- Taux d'occupation
- Taux de présence
- Billets vendus

#### Profil Démographique
- Âge moyen et distribution par tranches
- Répartition par type d'abonnement
- Top villes
- Taux de fidélité
- Nombre moyen d'événements par utilisateur

#### Statistiques Détaillées (par événement)
- Ventes par catégorie de billet
- Timeline des ventes
- Démographie des participants
- Check-in rate
- Revenus par méthode de paiement
- Montants remboursés

---

## 🖥️ Intégration Frontend

### Page Liste des Événements (✅ Créée)

**Fichier**: `src/admin/pages/Events/EventsListPage.tsx`

**Fonctionnalités**:
- Affichage en tableau avec toutes les infos clés
- Filtres: recherche, type, statut, actif/inactif
- Pagination
- Cards de stats en haut (total, billets vendus, revenus)
- Actions:
  - Voir détails
  - Éditer
  - Dupliquer
  - Activer/Désactiver
  - Mettre en avant
  - Annuler
  - Supprimer

**Usage**:
```tsx
import { EventsListPage } from '@/admin/pages/Events/EventsListPage';

<Route path="/admin/events" element={<EventsListPage />} />
```

### Page Analytics Événements (✅ Créée)

**Fichier**: `src/admin/pages/Analytics/EventAnalyticsPage.tsx`

**Fonctionnalités**:
- KPI cards avec trends
- Filtres de période (1 mois, 3 mois, 6 mois, 1 an)
- Stats secondaires (prix moyen, revenu moyen, fidélité)
- Tableau performance par type
- Top 10 événements
- Profil démographique des participants
- Répartition par abonnement
- Top villes

**Usage**:
```tsx
import { EventAnalyticsPage } from '@/admin/pages/Analytics/EventAnalyticsPage';

<Route path="/admin/analytics/events" element={<EventAnalyticsPage />} />
```

### Pages à Créer

#### 1. EventCreatePage / EventEditPage

**Fonctionnalités à implémenter**:

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TextInput,
  Textarea,
  Select,
  NumberInput,
  Switch,
  Button,
  Accordion,
  Group,
  Stack
} from '@mantine/core';
import { createEvent } from '@/shared/services/eventService';

export function EventCreatePage() {
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [type, setType] = useState<EventType>('concert');
  const [location, setLocation] = useState({ type: 'physical', city: '' });
  const [artists, setArtists] = useState<EventArtist[]>([]);
  const [ticketCategories, setTicketCategories] = useState<TicketCategoryFormData[]>([
    {
      id: 'standard',
      name: 'Standard',
      price: 0,
      capacity: 100,
      isActive: true,
      requiresMembership: false,
      benefits: [],
      order: 1
    }
  ]);

  const handleSubmit = async () => {
    try {
      const eventId = await createEvent(
        {
          title,
          description,
          startDate,
          endDate,
          type,
          location,
          artists,
          ticketCategories,
          // ... autres champs
        },
        'admin-uid'
      );

      navigate(`/admin/events/${eventId}`);
    } catch (error) {
      // Afficher notification d'erreur
    }
  };

  return (
    <Container>
      <Accordion>
        <Accordion.Item value="basic">
          <Accordion.Control>Informations de base</Accordion.Control>
          <Accordion.Panel>
            <TextInput label="Titre" value={title} onChange={(e) => setTitle(e.target.value)} />
            <Textarea label="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
            <Select label="Type" data={EVENT_TYPE_OPTIONS} value={type} onChange={setType} />
            {/* ... */}
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="dates">
          <Accordion.Control>Dates et horaires</Accordion.Control>
          <Accordion.Panel>
            <TextInput type="datetime-local" label="Début" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            <TextInput type="datetime-local" label="Fin" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            {/* ... */}
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="location">
          <Accordion.Control>Lieu</Accordion.Control>
          <Accordion.Panel>
            <Select label="Type de lieu" data={LOCATION_TYPE_OPTIONS} />
            <TextInput label="Nom du lieu" />
            <TextInput label="Adresse" />
            {/* ... */}
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="tickets">
          <Accordion.Control>Catégories de billets</Accordion.Control>
          <Accordion.Panel>
            {ticketCategories.map((category, index) => (
              <Card key={category.id} mb="md">
                <TextInput label="Nom" value={category.name} onChange={(e) => {
                  const updated = [...ticketCategories];
                  updated[index].name = e.target.value;
                  setTicketCategories(updated);
                }} />
                <NumberInput label="Prix (€)" value={category.price} onChange={(value) => {
                  const updated = [...ticketCategories];
                  updated[index].price = value;
                  setTicketCategories(updated);
                }} />
                <NumberInput label="Capacité" value={category.capacity} onChange={(value) => {
                  const updated = [...ticketCategories];
                  updated[index].capacity = value;
                  setTicketCategories(updated);
                }} />
                <Switch label="Réservé aux membres" checked={category.requiresMembership} onChange={(e) => {
                  const updated = [...ticketCategories];
                  updated[index].requiresMembership = e.currentTarget.checked;
                  setTicketCategories(updated);
                }} />
                {/* ... */}
              </Card>
            ))}
            <Button onClick={() => {
              setTicketCategories([...ticketCategories, {
                id: `cat-${Date.now()}`,
                name: '',
                price: 0,
                capacity: 50,
                isActive: true,
                requiresMembership: false,
                benefits: [],
                order: ticketCategories.length + 1
              }]);
            }}>
              Ajouter une catégorie
            </Button>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="artists">
          <Accordion.Control>Artistes</Accordion.Control>
          <Accordion.Panel>
            {/* Gestion des artistes */}
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="settings">
          <Accordion.Control>Paramètres</Accordion.Control>
          <Accordion.Panel>
            <NumberInput label="Billets max par utilisateur" />
            <Switch label="Autoriser liste d'attente" />
            <Switch label="Approbation manuelle requise" />
            <Switch label="Activer l'événement" />
            {/* ... */}
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>

      <Group mt="xl">
        <Button onClick={handleSubmit}>Créer l'événement</Button>
        <Button variant="outline" onClick={() => navigate('/admin/events')}>Annuler</Button>
      </Group>
    </Container>
  );
}
```

#### 2. EventDetailPage

**Fonctionnalités à implémenter**:

```tsx
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Tabs, Table, Badge, Button } from '@mantine/core';
import { getEventById } from '@/shared/services/eventService';
import { getEventPurchasesForList, checkInByQRCode } from '@/shared/services/ticketPurchaseService';
import { getEventDetailStats } from '@/shared/services/analytics/eventAnalytics';

export function EventDetailPage() {
  const { eventId } = useParams();
  const [event, setEvent] = useState<Event | null>(null);
  const [purchases, setPurchases] = useState<EventPurchaseListItem[]>([]);
  const [stats, setStats] = useState<EventDetailStats | null>(null);

  useEffect(() => {
    loadData();
  }, [eventId]);

  const loadData = async () => {
    const [eventData, purchasesData, statsData] = await Promise.all([
      getEventById(eventId!),
      getEventPurchasesForList(eventId!),
      getEventDetailStats(eventId!)
    ]);

    setEvent(eventData);
    setPurchases(purchasesData);
    setStats(statsData);
  };

  const handleCheckIn = async (qrCode: string) => {
    try {
      await checkInByQRCode(eventId!, qrCode, 'admin-uid');
      loadData(); // Refresh
    } catch (error) {
      // Notification d'erreur
    }
  };

  return (
    <Container>
      {/* Détails de l'événement */}
      <Title>{event?.title}</Title>
      <Text>{event?.description}</Text>

      <Tabs defaultValue="attendees">
        <Tabs.List>
          <Tabs.Tab value="attendees">Participants ({purchases.length})</Tabs.Tab>
          <Tabs.Tab value="stats">Statistiques</Tabs.Tab>
          <Tabs.Tab value="checkin">Check-in</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="attendees">
          <Table>
            <thead>
              <tr>
                <th>Nom</th>
                <th>Email</th>
                <th>Billet</th>
                <th>Quantité</th>
                <th>Prix</th>
                <th>Statut</th>
                <th>Check-in</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((purchase) => (
                <tr key={purchase.id}>
                  <td>{purchase.userName}</td>
                  <td>{purchase.userEmail}</td>
                  <td>{purchase.ticketCategoryName}</td>
                  <td>{purchase.quantity}</td>
                  <td>{purchase.totalPrice}€</td>
                  <td><Badge>{purchase.status}</Badge></td>
                  <td>
                    {purchase.checkedIn ? (
                      <Badge color="green">✓ Présent</Badge>
                    ) : (
                      <Badge color="gray">Absent</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Tabs.Panel>

        <Tabs.Panel value="stats">
          {/* Afficher les statistiques détaillées */}
          {stats && (
            <>
              <Grid>
                <Grid.Col span={3}>
                  <Card>
                    <Text>Billets vendus</Text>
                    <Text size="xl" fw={700}>{stats.totalSold}</Text>
                  </Card>
                </Grid.Col>
                <Grid.Col span={3}>
                  <Card>
                    <Text>Revenus</Text>
                    <Text size="xl" fw={700}>{stats.totalRevenue}€</Text>
                  </Card>
                </Grid.Col>
                <Grid.Col span={3}>
                  <Card>
                    <Text>Taux d'occupation</Text>
                    <Text size="xl" fw={700}>{stats.occupancyRate.toFixed(1)}%</Text>
                  </Card>
                </Grid.Col>
                <Grid.Col span={3}>
                  <Card>
                    <Text>Taux de présence</Text>
                    <Text size="xl" fw={700}>{stats.checkInRate.toFixed(1)}%</Text>
                  </Card>
                </Grid.Col>
              </Grid>

              {/* Ventes par catégorie */}
              <Title order={4} mt="xl">Ventes par catégorie</Title>
              <Table>
                {/* ... */}
              </Table>

              {/* Timeline des ventes */}
              <Title order={4} mt="xl">Timeline des ventes</Title>
              {/* Chart avec recharts ou autre */}

              {/* Démographie */}
              <Title order={4} mt="xl">Démographie</Title>
              <Text>Âge moyen: {stats.demographics.averageAge.toFixed(1)} ans</Text>
              {/* ... */}
            </>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="checkin">
          {/* Scanner QR code ou saisie manuelle */}
          <TextInput
            placeholder="Scanner ou saisir le QR code"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleCheckIn(e.currentTarget.value);
                e.currentTarget.value = '';
              }
            }}
          />
        </Tabs.Panel>
      </Tabs>
    </Container>
  );
}
```

### Frontend Utilisateur (Public)

Pour afficher les événements côté utilisateur et permettre l'achat de billets:

```tsx
// Page liste des événements publics
import { getUpcomingEvents } from '@/shared/services/eventService';

export function PublicEventsPage() {
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    getUpcomingEvents().then(setEvents);
  }, []);

  return (
    <Container>
      <Title>Événements à venir</Title>
      <Grid>
        {events.map((event) => (
          <Grid.Col key={event.id} span={4}>
            <Card>
              <Image src={event.coverImage} />
              <Title order={4}>{event.title}</Title>
              <Text>{event.shortDescription}</Text>
              <Text>
                {event.startDate.toDate().toLocaleDateString('fr-FR')}
              </Text>
              <Button onClick={() => navigate(`/events/${event.slug}`)}>
                Voir détails
              </Button>
            </Card>
          </Grid.Col>
        ))}
      </Grid>
    </Container>
  );
}

// Page détail événement + achat
import { getEventBySlug } from '@/shared/services/eventService';
import { createTicketPurchase } from '@/shared/services/ticketPurchaseService';

export function PublicEventDetailPage() {
  const { slug } = useParams();
  const [event, setEvent] = useState<Event | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    getEventBySlug(slug!).then(setEvent);
  }, [slug]);

  const handlePurchase = async () => {
    try {
      await createTicketPurchase({
        eventId: event!.id,
        userId: currentUser.uid,
        ticketCategoryId: selectedCategory,
        quantity,
        paymentMethod: 'card',
        paymentStatus: 'paid',
        // transactionId obtenu après paiement
      });

      // Rediriger vers confirmation
    } catch (error) {
      // Afficher erreur
    }
  };

  return (
    <Container>
      <Title>{event?.title}</Title>
      <Text>{event?.description}</Text>

      <Title order={3}>Billetterie</Title>
      {event?.ticketCategories.filter(cat => cat.isActive).map((category) => (
        <Card key={category.id}>
          <Group justify="space-between">
            <div>
              <Text fw={500}>{category.name}</Text>
              <Text size="sm" c="dimmed">{category.description}</Text>
              <Text fw={700}>{category.price}€</Text>
            </div>
            <div>
              <Text size="sm" c="dimmed">
                {category.available} places disponibles
              </Text>
              <Button
                onClick={() => setSelectedCategory(category.id)}
                disabled={category.available === 0}
              >
                Sélectionner
              </Button>
            </div>
          </Group>
        </Card>
      ))}

      {selectedCategory && (
        <Card mt="xl">
          <NumberInput
            label="Nombre de billets"
            value={quantity}
            onChange={setQuantity}
            min={1}
            max={event?.maxTicketsPerUser}
          />
          <Button onClick={handlePurchase}>
            Acheter ({quantity * (event?.ticketCategories.find(c => c.id === selectedCategory)?.price || 0)}€)
          </Button>
        </Card>
      )}
    </Container>
  );
}
```

---

## 🔄 Workflows

### 1. Création d'un Événement

```
Admin → EventCreatePage
  → Remplit formulaire (infos de base, dates, lieu, artistes, catégories de billets)
  → createEvent(formData, adminUid)
    → Génère slug automatiquement
    → Initialise compteurs (totalSold = 0, etc.)
    → Crée document dans Firestore
  → Redirection vers EventDetailPage
```

### 2. Achat de Billet

```
User → PublicEventDetailPage
  → Sélectionne catégorie de billet
  → Choisit quantité
  → createTicketPurchase({ eventId, userId, ticketCategoryId, quantity })
    → Transaction Firestore:
      1. Vérifie disponibilité
      2. Vérifie restrictions (membre, période)
      3. Génère QR code + numéro de billet
      4. Crée purchase document
      5. Met à jour event.ticketCategories[].sold
      6. Met à jour event.totalSold et totalRevenue
      7. Ajoute points de fidélité à user
    → Commit transaction
  → addPurchaseToUserHistory(userId, eventId, purchaseId)
    → Ajoute entrée dans users/{userId}/actionHistory
  → Redirection vers confirmation
```

### 3. Check-in à l'Événement

```
Admin → EventDetailPage → Tab Check-in
  → Scanner QR code du billet
  → checkInByQRCode(eventId, qrCode, adminUid)
    → Transaction Firestore:
      1. Trouve purchase par QR code
      2. Vérifie statut (confirmed, pas déjà checkedIn)
      3. Met à jour purchase.checkedIn = true
      4. Met à jour event.totalCheckedIn
      5. Ajoute entrée dans user action history
    → Commit transaction
  → Affiche confirmation visuelle
```

### 4. Annulation d'un Événement

```
Admin → EventsListPage → Menu → Annuler
  → Modal avec raison d'annulation
  → cancelEvent(eventId, reason, adminUid)
    → Met à jour event.status = 'cancelled'
    → Met à jour event.isActive = false
    → Enregistre reason et timestamp
  → Notification aux participants (TODO: à implémenter)
```

---

## 🚀 Prochaines Étapes

### Fonctionnalités à Implémenter

1. **Pages Manquantes**
   - ✅ EventsListPage (créée)
   - ✅ EventAnalyticsPage (créée)
   - ⏳ EventCreatePage
   - ⏳ EventEditPage
   - ⏳ EventDetailPage

2. **Frontend Public**
   - Page liste événements publics
   - Page détail événement avec achat
   - Page "Mes billets" utilisateur
   - Intégration paiement (Stripe, PayPal)

3. **Notifications**
   - Email confirmation d'achat
   - Email rappel événement
   - Email annulation événement
   - Notifications push (optionnel)

4. **Exports**
   - Export CSV liste participants
   - Export PDF billets
   - Export analytics

5. **Améliorations**
   - Upload images (couverture, galerie)
   - Gestion des artistes réutilisables
   - Templates d'événements
   - Liste d'attente automatique
   - Codes promo / réductions
   - Ventes groupées

---

## 📝 Notes Importantes

### Transactions Firebase

Les fonctions `createTicketPurchase`, `checkInAttendee`, `cancelPurchase`, et `rejectPurchase` utilisent des **transactions Firestore** pour garantir:
- Cohérence des données (pas de double vente)
- Atomicité (tout ou rien)
- Isolation (pas d'interférence entre utilisateurs)

### Points de Fidélité

- **Gain**: 1 point par euro dépensé (arrondi à l'entier inférieur)
- **Utilisation**: Peut être déduit du total lors de l'achat
- **Remboursement**: Points restitués en cas d'annulation/rejet

### Validation des Données

Toutes les fonctions de création/mise à jour incluent des validations:
- Disponibilité des billets
- Restrictions d'accès (membres, types d'abonnement)
- Périodes de vente
- Limites par utilisateur
- Statuts cohérents (pas de check-in sur cancelled)

### Performance

Pour optimiser les performances:
- Utiliser `getAllEventsForList()` au lieu de `getAllEvents()` pour les listes
- Utiliser `getEventPurchasesForList()` au lieu de `getEventPurchases()` pour les listes
- Implémenter pagination côté serveur pour grandes quantités de données
- Mettre en cache les analytics (considérer Cloud Functions)

### Sécurité Firebase

**Règles Firestore à configurer**:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Events: lecture publique, écriture admin uniquement
    match /events/{eventId} {
      allow read: if true;
      allow write: if request.auth != null &&
                     get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;

      // Purchases: lecture utilisateur + admin, écriture utilisateur
      match /purchases/{purchaseId} {
        allow read: if request.auth != null &&
                      (resource.data.userId == request.auth.uid ||
                       get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true);
        allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
        allow update, delete: if request.auth != null &&
                                 get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
      }
    }
  }
}
```

---

## 🆘 Support & Questions

Pour toute question ou problème:
1. Consultez d'abord cette documentation
2. Vérifiez les types TypeScript dans `src/shared/types/event.ts`
3. Regardez les exemples d'implémentation dans `EventsListPage.tsx` et `EventAnalyticsPage.tsx`
4. Testez avec des données de développement d'abord

---

**Documentation générée le**: 2024
**Version**: 1.0.0
**Auteur**: Claude Code AI Assistant
