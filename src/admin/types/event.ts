/**
 * Event Management Types
 * Professional type definitions for event system
 */

export interface Event {
  id: string;
  title: string;
  description: string;
  type: EventType;
  status: EventStatus;

  // Date & Time
  startDate: string; // ISO date string
  endDate: string; // ISO date string
  duration?: number; // Minutes

  // Location
  location: EventLocation;

  // Capacity
  capacity: number;
  registeredCount: number;
  waitlistCount: number;

  // Pricing
  pricing: EventPricing;

  // Media
  imageUrl?: string;
  gallery?: string[];

  // Organizer
  organizerId: string;
  organizerName: string;

  // Settings
  isPublished: boolean;
  requiresApproval: boolean;
  allowWaitlist: boolean;
  tags: string[];

  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export type EventType =
  | 'workshop'
  | 'conference'
  | 'networking'
  | 'exhibition'
  | 'concert'
  | 'other';

export type EventStatus =
  | 'draft'
  | 'published'
  | 'ongoing'
  | 'completed'
  | 'cancelled';

export interface EventLocation {
  type: 'physical' | 'online' | 'hybrid';
  address?: string;
  city?: string;
  postalCode?: string;
  room?: string;
  onlineLink?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface EventPricing {
  isFree: boolean;
  price?: number;
  currency: string;
  memberDiscount?: number; // Percentage
  earlyBirdPrice?: number;
  earlyBirdDeadline?: string;
}

export interface EventRegistration {
  id: string;
  eventId: string;
  userId: string;
  userName: string;
  userEmail: string;
  status: RegistrationStatus;
  registeredAt: string;
  checkedIn: boolean;
  checkedInAt?: string;
  paymentStatus?: PaymentStatus;
  amountPaid?: number;
  notes?: string;
}

export type RegistrationStatus =
  | 'confirmed'
  | 'pending'
  | 'waitlist'
  | 'cancelled'
  | 'rejected';

export type PaymentStatus =
  | 'pending'
  | 'completed'
  | 'failed'
  | 'refunded';

export interface EventFormData extends Omit<Event, 'id' | 'createdAt' | 'updatedAt' | 'registeredCount' | 'waitlistCount'> {}
