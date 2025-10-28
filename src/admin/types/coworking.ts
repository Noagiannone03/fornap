/**
 * Coworking Space Management Types
 * Professional type definitions for coworking spaces
 */

export interface CoworkingSpace {
  id: string;
  name: string;
  description: string;
  type: SpaceType;
  status: SpaceStatus;

  // Capacity
  capacity: number;
  currentOccupancy: number;

  // Amenities
  amenities: Amenity[];
  equipment: Equipment[];

  // Pricing
  pricing: SpacePricing;

  // Location
  floor?: string;
  room: string;
  area?: number; // Square meters

  // Media
  images: string[];
  floorPlan?: string;

  // Availability
  availability: SpaceAvailability;

  // Rules
  rules: string[];
  minBookingDuration: number; // Minutes
  maxBookingDuration: number; // Minutes
  advanceBookingLimit: number; // Days

  // Metadata
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export type SpaceType =
  | 'hot_desk'
  | 'dedicated_desk'
  | 'private_office'
  | 'meeting_room'
  | 'conference_room'
  | 'phone_booth'
  | 'event_space';

export type SpaceStatus =
  | 'available'
  | 'occupied'
  | 'maintenance'
  | 'reserved';

export interface Amenity {
  id: string;
  name: string;
  icon: string;
  available: boolean;
}

export interface Equipment {
  id: string;
  name: string;
  quantity: number;
  condition: 'excellent' | 'good' | 'fair' | 'needs_repair';
}

export interface SpacePricing {
  hourlyRate: number;
  dailyRate: number;
  weeklyRate: number;
  monthlyRate: number;
  currency: string;
  memberDiscount: number; // Percentage
}

export interface SpaceAvailability {
  monday: TimeSlot[];
  tuesday: TimeSlot[];
  wednesday: TimeSlot[];
  thursday: TimeSlot[];
  friday: TimeSlot[];
  saturday: TimeSlot[];
  sunday: TimeSlot[];
}

export interface TimeSlot {
  start: string; // HH:mm format
  end: string; // HH:mm format
  available: boolean;
}

export interface Booking {
  id: string;
  spaceId: string;
  spaceName: string;
  userId: string;
  userName: string;
  userEmail: string;

  // Booking Details
  startTime: string; // ISO datetime
  endTime: string; // ISO datetime
  duration: number; // Minutes

  // Status
  status: BookingStatus;

  // Payment
  totalPrice: number;
  paymentStatus: BookingPaymentStatus;

  // Additional
  purpose?: string;
  notes?: string;
  attendees?: number;

  // Metadata
  createdAt: string;
  updatedAt: string;
  checkedIn: boolean;
  checkedInAt?: string;
  checkedOut: boolean;
  checkedOutAt?: string;
}

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export type BookingPaymentStatus =
  | 'pending'
  | 'completed'
  | 'failed'
  | 'refunded';

export interface BookingFormData {
  spaceId: string;
  userId: string;
  startTime: string;
  endTime: string;
  purpose?: string;
  notes?: string;
  attendees?: number;
}
