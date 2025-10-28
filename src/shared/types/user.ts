// Types d'abonnement disponibles
export type MembershipType = 'monthly' | 'annual' | 'honorary';

// Statut de l'abonnement
export type MembershipStatus = 'active' | 'inactive' | 'pending' | 'expired';

// Étiquettes personnalisables pour catégoriser les membres
export type MemberTag =
  | 'actif'
  | 'inactif'
  | 'vip'
  | 'atelier_couture'
  | 'billetterie'
  | 'exposant'
  | string; // Permet des étiquettes personnalisées

// Détails de l'abonnement
export interface Membership {
  type: MembershipType;
  status: MembershipStatus;
  startDate: string; // ISO date
  endDate?: string; // ISO date, undefined pour honorary
  validUntil?: string; // Date de validité
  autoRenew?: boolean;
}

// Historique d'activité
export interface ActivityHistory {
  id: string;
  type: 'event' | 'purchase' | 'workshop' | 'subscription' | 'other';
  title: string;
  description?: string;
  date: string; // ISO date
  points?: number; // Points gagnés lors de cette activité
}

// Profil utilisateur complet
export interface UserProfile {
  uid: string;
  email: string;
  createdAt: string; // Date de création du compte

  // Informations personnelles
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  phone?: string;
  postalCode?: string; // Code postal

  // Abonnement et adhésion
  membership?: Membership;
  subscription?: {
    type: string;
    status: 'active' | 'inactive';
    startDate: string;
    endDate: string;
    autoRenew?: boolean;
  };

  // Programme de fidélité
  loyaltyPoints: number; // Points de fidélité cumulés

  // Historique d'engagement et activités
  activityHistory: ActivityHistory[];

  // Étiquettes personnalisables
  tags: MemberTag[];

  // Centres d'intérêt (optionnel)
  interests?: string[];

  // Questions de personnalité
  howDidYouHearAboutUs?: string;
  preferredAmbiance?: string;

  // QR Code pour identification
  qrCode?: string;
}

// Formulaire d'inscription
export interface SignupFormData {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string; // Requis
  phone: string; // Requis
  postalCode: string; // Requis
  membershipType: MembershipType; // Type d'abonnement choisi

  // Questions de personnalité
  interests?: string[];
  howDidYouHearAboutUs?: string;
  preferredAmbiance?: string;
}

// Détails des formules d'abonnement
export interface MembershipPlan {
  id: MembershipType;
  name: string;
  price: number;
  period: 'month' | 'year' | 'lifetime';
  features: string[];
  highlighted?: boolean;
}
