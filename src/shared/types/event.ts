import { Timestamp } from 'firebase/firestore';
import type { MembershipType } from './user';

// ========================
// EVENT TYPES & ENUMS
// ========================

export type EventType =
  | 'concert'
  | 'exhibition'
  | 'workshop'
  | 'conference'
  | 'networking'
  | 'projection'
  | 'performance'
  | 'guided_tour'
  | 'family_activity'
  | 'market'
  | 'festival'
  | 'other';

export type EventStatus = 'draft' | 'published' | 'ongoing' | 'completed' | 'cancelled';

export type PaymentStatus = 'paid' | 'pending' | 'failed' | 'refunded';

export type PurchaseStatus = 'confirmed' | 'pending' | 'cancelled' | 'refunded';

export type LocationType = 'physical' | 'online' | 'hybrid';

// ========================
// EVENT LOCATION
// ========================

export interface EventLocation {
  type: LocationType;

  // Physical location
  venueName?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };

  // Online location
  onlineLink?: string;
  onlinePlatform?: string; // Zoom, Teams, etc.

  // Additional info
  accessInstructions?: string;
  parkingInfo?: string;
}

// ========================
// ARTIST/PERFORMER
// ========================

export interface EventArtist {
  id: string;
  name: string;
  role?: string; // "Main Act", "DJ", "Speaker", etc.
  bio?: string;
  photo?: string; // URL
  websiteUrl?: string;
  socialMedia?: {
    instagram?: string;
    facebook?: string;
    twitter?: string;
    youtube?: string;
  };
  order: number; // Display order
}

// ========================
// TICKET CATEGORY
// ========================

export interface TicketCategory {
  id: string; // Unique within event
  name: string; // "VIP", "Standard", "Early Bird", "Student"
  description?: string;
  price: number;

  // Capacity management
  capacity: number;
  sold: number;
  reserved: number; // Temporarily held during checkout
  available: number; // Computed: capacity - sold - reserved

  // Status
  isActive: boolean;

  // Access restrictions
  requiresMembership: boolean;
  allowedMembershipTypes?: MembershipType[]; // Restrict to specific membership types

  // Sales period
  salesStartDate?: Timestamp | null;
  salesEndDate?: Timestamp | null;

  // Features & benefits
  benefits: string[]; // ["Meet & Greet", "Front Row Seats", "Free Drink"]

  // Display order
  order: number;
}

// ========================
// MAIN EVENT ENTITY
// ========================

export interface Event {
  id: string;

  // Basic info
  title: string;
  slug: string; // URL-friendly version of title
  description: string;
  shortDescription?: string; // For cards/previews

  // Scheduling
  startDate: Timestamp;
  endDate: Timestamp;
  timezone: string; // e.g., "Europe/Paris"
  doorsOpenTime?: Timestamp | null; // When doors open (can be before startDate)

  // Location
  location: EventLocation;

  // Artists & Performers
  artists: EventArtist[];

  // Categorization
  type: EventType;
  categories: string[]; // Additional category tags
  tags: string[];

  // Media
  coverImage?: string; // Main image URL
  images: string[]; // Additional images
  videoUrl?: string; // Trailer/promo video

  // Ticket Categories
  ticketCategories: TicketCategory[];

  // Capacity & Stats
  totalCapacity: number; // Sum of all ticket categories
  totalSold: number;
  totalCheckedIn: number;
  totalRevenue: number;

  // Status & Visibility
  status: EventStatus;
  isActive: boolean; // Can be deactivated without cancelling
  isFeatured: boolean; // Highlighted on homepage

  // Registration settings
  registrationOpen: boolean;
  registrationStartDate?: Timestamp | null;
  registrationEndDate?: Timestamp | null;
  requiresApproval: boolean; // Manual approval needed

  // Purchase limits
  allowWaitlist: boolean;
  maxTicketsPerUser: number;
  minAge?: number;

  // Additional settings
  termsAndConditions?: string;
  refundPolicy?: string;
  contactEmail?: string;
  contactPhone?: string;

  // External links
  websiteUrl?: string;
  facebookEventUrl?: string;

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string; // Admin UID
  publishedAt?: Timestamp | null;
  cancelledAt?: Timestamp | null;
  cancellationReason?: string;

  // SEO
  metaTitle?: string;
  metaDescription?: string;
}

// ========================
// EVENT PURCHASE
// ========================

export interface EventPurchase {
  id: string;

  // References
  eventId: string;
  eventTitle: string; // Denormalized for easy display
  eventStartDate: Timestamp; // Denormalized
  userId: string;
  userEmail: string; // Denormalized
  userName: string; // Denormalized

  // Ticket details
  ticketCategoryId: string;
  ticketCategoryName: string;
  quantity: number; // Usually 1, but can be multiple
  pricePerTicket: number;
  totalPrice: number;

  // Payment
  paymentStatus: PaymentStatus;
  paymentMethod?: string; // "card", "cash", "bank_transfer", "free"
  transactionId?: string;
  paidAt?: Timestamp | null;

  // Purchase status
  status: PurchaseStatus;

  // Check-in tracking
  checkedIn: boolean;
  checkedInAt?: Timestamp | null;
  checkedInBy?: string; // Admin UID who checked them in

  // Ticket verification
  ticketQRCode: string; // Unique QR code for each purchase
  ticketNumber: string; // Human-readable ticket number (e.g., "EVT-001-0042")

  // Approval (if required)
  approvalRequired: boolean;
  approved: boolean;
  approvedAt?: Timestamp | null;
  approvedBy?: string; // Admin UID
  rejectionReason?: string;

  // Loyalty points
  loyaltyPointsEarned: number;
  loyaltyPointsUsed: number;

  // Cancellation & Refund
  cancelledAt?: Timestamp | null;
  cancellationReason?: string;
  cancelledBy?: string; // User or admin UID
  refundedAt?: Timestamp | null;
  refundAmount?: number;
  refundTransactionId?: string;

  // Additional info
  notes?: string; // Admin notes
  specialRequirements?: string; // User-provided (accessibility, dietary, etc.)

  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ========================
// FORM DATA TYPES
// ========================

export interface EventFormData {
  title: string;
  description: string;
  shortDescription?: string;
  startDate: string; // ISO string for forms
  endDate: string;
  timezone: string;
  doorsOpenTime?: string | null;
  location: EventLocation;
  artists: EventArtist[];
  type: EventType;
  categories: string[];
  tags: string[];
  coverImage?: string;
  images: string[];
  videoUrl?: string;
  ticketCategories: TicketCategoryFormData[];
  status: EventStatus;
  isActive: boolean;
  isFeatured: boolean;
  registrationOpen: boolean;
  registrationStartDate?: string | null;
  registrationEndDate?: string | null;
  requiresApproval: boolean;
  allowWaitlist: boolean;
  maxTicketsPerUser: number;
  minAge?: number;
  termsAndConditions?: string;
  refundPolicy?: string;
  contactEmail?: string;
  contactPhone?: string;
  websiteUrl?: string;
  facebookEventUrl?: string;
  metaTitle?: string;
  metaDescription?: string;
}

export interface TicketCategoryFormData {
  id: string;
  name: string;
  description?: string;
  price: number;
  capacity: number;
  isActive: boolean;
  requiresMembership: boolean;
  allowedMembershipTypes?: MembershipType[];
  salesStartDate?: string | null;
  salesEndDate?: string | null;
  benefits: string[];
  order: number;
}

// ========================
// LIST ITEM (for tables/lists)
// ========================

export interface EventListItem {
  id: string;
  title: string;
  type: EventType;
  status: EventStatus;
  startDate: Timestamp;
  endDate: Timestamp;
  location: {
    type: LocationType;
    city?: string;
  };
  totalCapacity: number;
  totalSold: number;
  totalRevenue: number;
  isActive: boolean;
  isFeatured: boolean;
  coverImage?: string;
}

export interface EventPurchaseListItem {
  id: string;
  eventTitle: string;
  eventStartDate: Timestamp;
  userName: string;
  userEmail: string;
  ticketCategoryName: string;
  quantity: number;
  totalPrice: number;
  paymentStatus: PaymentStatus;
  status: PurchaseStatus;
  checkedIn: boolean;
  ticketNumber: string;
  createdAt: Timestamp;
}

// ========================
// FILTERS
// ========================

export interface EventFilters {
  search?: string;
  type?: EventType;
  status?: EventStatus;
  isActive?: boolean;
  isFeatured?: boolean;
  startDateFrom?: Date;
  startDateTo?: Date;
  city?: string;
  tags?: string[];
}

export interface PurchaseFilters {
  search?: string;
  eventId?: string;
  paymentStatus?: PaymentStatus;
  status?: PurchaseStatus;
  checkedIn?: boolean;
  purchasedFrom?: Date;
  purchasedTo?: Date;
}

// ========================
// STATISTICS
// ========================

export interface EventStats {
  totalEvents: number;
  activeEvents: number;
  upcomingEvents: number;
  completedEvents: number;
  cancelledEvents: number;
  draftEvents: number;

  totalCapacity: number;
  totalSold: number;
  totalRevenue: number;
  averageOccupancyRate: number;

  totalPurchases: number;
  totalAttendees: number; // Checked in
  averageTicketPrice: number;
}

export interface EventDetailStats {
  eventId: string;

  // Sales
  totalSold: number;
  totalRevenue: number;
  occupancyRate: number;

  // By ticket category
  salesByCategory: Array<{
    categoryId: string;
    categoryName: string;
    sold: number;
    revenue: number;
    occupancyRate: number;
  }>;

  // Timeline
  salesTimeline: Array<{
    date: string;
    sales: number;
    revenue: number;
  }>;

  // Demographics
  demographics: {
    averageAge: number;
    ageDistribution: Record<string, number>;
    genderDistribution?: Record<string, number>;
    membershipDistribution: Record<MembershipType, number>;
    topCities: Array<{ city: string; count: number }>;
  };

  // Attendance
  totalCheckedIn: number;
  checkInRate: number;

  // Revenue breakdown
  revenueByPaymentMethod: Record<string, number>;
  refundedAmount: number;
  netRevenue: number;
}

// ========================
// ANALYTICS INTERFACES
// ========================

export interface EventAnalyticsKPIs {
  // Overview
  totalEvents: number;
  activeEvents: number;
  upcomingEvents: number;
  completedEvents: number;

  // Revenue
  totalRevenue: number;
  monthlyRevenue: number;
  averageRevenuePerEvent: number;

  // Tickets
  totalTicketsSold: number;
  monthlyTicketsSold: number;
  averageTicketPrice: number;

  // Attendance
  totalAttendees: number;
  averageAttendanceRate: number;
  averageOccupancyRate: number;

  // Engagement
  repeatAttendeeRate: number; // % of users who attended multiple events
  averageTicketsPerUser: number;

  // Trends (vs previous period)
  trends: {
    revenue: number; // % change
    ticketsSold: number;
    attendanceRate: number;
    events: number;
  };
}

export interface EventRevenueData {
  date: string;
  revenue: number;
  ticketsSold: number;
  events: number;
}

export interface EventTypeDistribution {
  type: EventType;
  count: number;
  revenue: number;
  ticketsSold: number;
  averageOccupancy: number;
}

export interface TopEvent {
  id: string;
  title: string;
  type: EventType;
  startDate: Timestamp;
  ticketsSold: number;
  revenue: number;
  occupancyRate: number;
  attendanceRate: number;
}

export interface AttendeeProfile {
  averageAge: number;
  ageDistribution: Record<string, number>;
  membershipDistribution: Record<MembershipType, number>;
  topCities: Array<{ city: string; count: number }>;
  repeatAttendeeRate: number;
  averageEventsPerUser: number;
}

// ========================
// CONSTANTS
// ========================

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  concert: 'Concert',
  exhibition: 'Exhibition',
  workshop: 'Atelier',
  conference: 'Conférence',
  networking: 'Networking',
  projection: 'Projection',
  performance: 'Spectacle',
  guided_tour: 'Visite Guidée',
  family_activity: 'Activité Famille',
  market: 'Marché',
  festival: 'Festival',
  other: 'Autre',
};

export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  draft: 'Brouillon',
  published: 'Publié',
  ongoing: 'En Cours',
  completed: 'Terminé',
  cancelled: 'Annulé',
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  paid: 'Payé',
  pending: 'En Attente',
  failed: 'Échoué',
  refunded: 'Remboursé',
};

export const PURCHASE_STATUS_LABELS: Record<PurchaseStatus, string> = {
  confirmed: 'Confirmé',
  pending: 'En Attente',
  cancelled: 'Annulé',
  refunded: 'Remboursé',
};

export const LOCATION_TYPE_LABELS: Record<LocationType, string> = {
  physical: 'Présentiel',
  online: 'En Ligne',
  hybrid: 'Hybride',
};

// Default timezones
export const TIMEZONES = [
  'Europe/Paris',
  'Europe/London',
  'America/New_York',
  'America/Los_Angeles',
  'Asia/Tokyo',
];

// Default event categories
export const EVENT_CATEGORIES = [
  'Musique',
  'Arts Visuels',
  'Littérature',
  'Théâtre',
  'Danse',
  'Histoire Locale',
  'Sciences',
  'Environnement',
  'Cinéma',
  'Photographie',
  'Architecture',
  'Design',
  'Gastronomie',
  'Bien-être',
  'Sport',
];

// Default event tags
export const EVENT_TAGS = [
  'familial',
  'accessible_pmr',
  'gratuit',
  'membres_seulement',
  'en_exterieur',
  'tout_public',
  'adultes',
  'enfants',
  'ados',
  'seniors',
  'professionnel',
  'debutant',
  'intermediaire',
  'avance',
];
