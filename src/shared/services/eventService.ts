import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type {
  Event,
  EventFormData,
  EventListItem,
  EventFilters,
  TicketCategory,
  EventStatus,
} from '../types/event';

// ========================
// CONSTANTS
// ========================

const EVENTS_COLLECTION = 'events';
const PURCHASES_SUBCOLLECTION = 'purchases';

// ========================
// HELPER FUNCTIONS
// ========================

/**
 * Generate URL-friendly slug from title
 */
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
    .substring(0, 100); // Limit length
}

/**
 * Generate unique ticket number
 */
function generateTicketNumber(eventId: string, purchaseCount: number): string {
  const eventPrefix = eventId.substring(0, 6).toUpperCase();
  const ticketNum = String(purchaseCount + 1).padStart(5, '0');
  return `TKT-${eventPrefix}-${ticketNum}`;
}

/**
 * Generate unique QR code for ticket
 */
function generateTicketQRCode(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 15);
  return `${timestamp}-${random}`.toUpperCase();
}

/**
 * Clean undefined fields from object recursively
 */
function cleanUndefinedFields<T extends Record<string, any>>(obj: T): Partial<T> {
  const cleaned: any = {};

  for (const key in obj) {
    const value = obj[key];

    // Skip undefined values
    if (value === undefined) {
      continue;
    }

    // Handle null explicitly
    if (value === null) {
      cleaned[key] = null;
      continue;
    }

    // Handle arrays
    if (Array.isArray(value)) {
      cleaned[key] = value.map((item: any) => {
        // If array item is an object, clean it recursively
        if (item !== null && typeof item === 'object' && !(item instanceof Timestamp)) {
          return cleanUndefinedFields(item);
        }
        return item;
      });
      continue;
    }

    // Recursively clean nested objects (but not Timestamps)
    if (typeof value === 'object' && !(value as any instanceof Timestamp)) {
      // Check if it's a plain object
      if (value.constructor === Object) {
        cleaned[key] = cleanUndefinedFields(value);
      } else {
        cleaned[key] = value;
      }
    } else {
      cleaned[key] = value;
    }
  }

  return cleaned;
}

/**
 * Convert form data to Firestore event document
 */
function formDataToEvent(
  formData: EventFormData,
  createdBy?: string
): Omit<Event, 'id'> {
  const now = Timestamp.now();

  // Convert ticket categories
  const ticketCategories: TicketCategory[] = formData.ticketCategories.map((cat) => ({
    id: cat.id,
    name: cat.name,
    description: cat.description,
    price: cat.price,
    capacity: cat.capacity,
    sold: 0, // Initial sold count
    reserved: 0,
    available: cat.capacity,
    isActive: cat.isActive,
    requiresMembership: cat.requiresMembership,
    allowedMembershipTypes: cat.allowedMembershipTypes,
    salesStartDate: cat.salesStartDate ? Timestamp.fromDate(new Date(cat.salesStartDate)) : null,
    salesEndDate: cat.salesEndDate ? Timestamp.fromDate(new Date(cat.salesEndDate)) : null,
    benefits: cat.benefits || [],
    order: cat.order,
  }));

  // Calculate total capacity
  const totalCapacity = ticketCategories.reduce((sum, cat) => sum + cat.capacity, 0);

  return {
    title: formData.title,
    slug: generateSlug(formData.title),
    description: formData.description,
    shortDescription: formData.shortDescription,

    startDate: Timestamp.fromDate(new Date(formData.startDate)),
    endDate: Timestamp.fromDate(new Date(formData.endDate)),
    timezone: formData.timezone || 'Europe/Paris',
    doorsOpenTime: formData.doorsOpenTime
      ? Timestamp.fromDate(new Date(formData.doorsOpenTime))
      : null,

    location: formData.location,
    artists: formData.artists || [],

    type: formData.type,
    categories: formData.categories || [],
    tags: formData.tags || [],

    coverImage: formData.coverImage,
    images: formData.images || [],
    videoUrl: formData.videoUrl,

    ticketCategories,
    totalCapacity,
    totalSold: 0,
    totalCheckedIn: 0,
    totalRevenue: 0,

    status: formData.status || 'draft',
    isActive: formData.isActive ?? true,
    isFeatured: formData.isFeatured ?? false,

    registrationOpen: formData.registrationOpen ?? true,
    registrationStartDate: formData.registrationStartDate
      ? Timestamp.fromDate(new Date(formData.registrationStartDate))
      : null,
    registrationEndDate: formData.registrationEndDate
      ? Timestamp.fromDate(new Date(formData.registrationEndDate))
      : null,
    requiresApproval: formData.requiresApproval ?? false,

    allowWaitlist: formData.allowWaitlist ?? false,
    maxTicketsPerUser: formData.maxTicketsPerUser || 10,
    minAge: formData.minAge,

    termsAndConditions: formData.termsAndConditions,
    refundPolicy: formData.refundPolicy,
    contactEmail: formData.contactEmail,
    contactPhone: formData.contactPhone,

    websiteUrl: formData.websiteUrl,
    facebookEventUrl: formData.facebookEventUrl,

    createdAt: now,
    updatedAt: now,
    createdBy: createdBy || 'system',
    publishedAt: formData.status === 'published' ? now : null,
    cancelledAt: null,

    metaTitle: formData.metaTitle,
    metaDescription: formData.metaDescription,
  };
}

/**
 * Convert Event to EventListItem
 */
function eventToListItem(event: Event): EventListItem {
  return {
    id: event.id,
    title: event.title,
    type: event.type,
    status: event.status,
    startDate: event.startDate,
    endDate: event.endDate,
    location: {
      type: event.location.type,
      city: event.location.city,
    },
    totalCapacity: event.totalCapacity,
    totalSold: event.totalSold,
    totalRevenue: event.totalRevenue,
    isActive: event.isActive,
    isFeatured: event.isFeatured,
    coverImage: event.coverImage,
  };
}

// ========================
// EVENT CRUD OPERATIONS
// ========================

/**
 * Get all events
 */
export async function getAllEvents(): Promise<Event[]> {
  try {
    const eventsRef = collection(db, EVENTS_COLLECTION);
    const q = query(eventsRef, orderBy('startDate', 'desc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      ...doc.data(),
      id: doc.id,
    })) as Event[];
  } catch (error) {
    console.error('Error getting all events:', error);
    throw new Error('Failed to fetch events');
  }
}

/**
 * Get all events as list items (optimized for lists/tables)
 */
export async function getAllEventsForList(): Promise<EventListItem[]> {
  try {
    const events = await getAllEvents();
    return events.map(eventToListItem);
  } catch (error) {
    console.error('Error getting events for list:', error);
    throw new Error('Failed to fetch events list');
  }
}

/**
 * Recherche efficace d'événements (Server-side)
 */
export async function searchEvents(searchQuery: string): Promise<EventListItem[]> {
  if (!searchQuery || searchQuery.length < 2) return [];

  try {
    const eventsRef = collection(db, EVENTS_COLLECTION);
    // Recherche par titre (sensible à la casse, on essaie l'exact tel quel)
    // Note: Idéalement il faudrait un champ titre en minuscule pour la recherche
    const qTitle = query(
      eventsRef,
      where('title', '>=', searchQuery),
      where('title', '<=', searchQuery + '\uf8ff'),
      limit(5)
    );

    const snapshot = await getDocs(qTitle);
    return snapshot.docs.map(doc => eventToListItem({ ...doc.data(), id: doc.id } as Event));
  } catch (error) {
    console.error('Error searching events:', error);
    return [];
  }
}

/**
 * Get event by ID
 */
export async function getEventById(eventId: string): Promise<Event | null> {
  try {
    const eventRef = doc(db, EVENTS_COLLECTION, eventId);
    const eventDoc = await getDoc(eventRef);

    if (!eventDoc.exists()) {
      return null;
    }

    return {
      ...eventDoc.data(),
      id: eventDoc.id,
    } as Event;
  } catch (error) {
    console.error('Error getting event by ID:', error);
    throw new Error('Failed to fetch event');
  }
}

/**
 * Get event by slug
 */
export async function getEventBySlug(slug: string): Promise<Event | null> {
  try {
    const eventsRef = collection(db, EVENTS_COLLECTION);
    const q = query(eventsRef, where('slug', '==', slug), limit(1));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return {
      ...doc.data(),
      id: doc.id,
    } as Event;
  } catch (error) {
    console.error('Error getting event by slug:', error);
    throw new Error('Failed to fetch event');
  }
}

/**
 * Get upcoming events (published and active)
 */
export async function getUpcomingEvents(limitCount: number = 10): Promise<Event[]> {
  try {
    const now = Timestamp.now();
    const eventsRef = collection(db, EVENTS_COLLECTION);
    const q = query(
      eventsRef,
      where('status', '==', 'published'),
      where('isActive', '==', true),
      where('startDate', '>=', now),
      orderBy('startDate', 'asc'),
      limit(limitCount)
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      ...doc.data(),
      id: doc.id,
    })) as Event[];
  } catch (error) {
    console.error('Error getting upcoming events:', error);
    throw new Error('Failed to fetch upcoming events');
  }
}

/**
 * Get featured events
 */
export async function getFeaturedEvents(limitCount: number = 5): Promise<Event[]> {
  try {
    const eventsRef = collection(db, EVENTS_COLLECTION);
    const q = query(
      eventsRef,
      where('isFeatured', '==', true),
      where('isActive', '==', true),
      orderBy('startDate', 'desc'),
      limit(limitCount)
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      ...doc.data(),
      id: doc.id,
    })) as Event[];
  } catch (error) {
    console.error('Error getting featured events:', error);
    throw new Error('Failed to fetch featured events');
  }
}

/**
 * Get events by type
 */
export async function getEventsByType(eventType: string): Promise<Event[]> {
  try {
    const eventsRef = collection(db, EVENTS_COLLECTION);
    const q = query(
      eventsRef,
      where('type', '==', eventType),
      where('isActive', '==', true),
      orderBy('startDate', 'desc')
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      ...doc.data(),
      id: doc.id,
    })) as Event[];
  } catch (error) {
    console.error('Error getting events by type:', error);
    throw new Error('Failed to fetch events by type');
  }
}

/**
 * Get events by status
 */
export async function getEventsByStatus(status: EventStatus): Promise<Event[]> {
  try {
    const eventsRef = collection(db, EVENTS_COLLECTION);
    const q = query(eventsRef, where('status', '==', status), orderBy('startDate', 'desc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      ...doc.data(),
      id: doc.id,
    })) as Event[];
  } catch (error) {
    console.error('Error getting events by status:', error);
    throw new Error('Failed to fetch events by status');
  }
}

/**
 * Filter events (client-side filtering for complex queries)
 */
export function filterEvents(events: Event[], filters: EventFilters): Event[] {
  let filtered = [...events];

  // Search filter
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    filtered = filtered.filter(
      (event) =>
        event.title.toLowerCase().includes(searchLower) ||
        event.description.toLowerCase().includes(searchLower) ||
        event.artists.some((artist) => artist.name.toLowerCase().includes(searchLower))
    );
  }

  // Type filter
  if (filters.type) {
    filtered = filtered.filter((event) => event.type === filters.type);
  }

  // Status filter
  if (filters.status) {
    filtered = filtered.filter((event) => event.status === filters.status);
  }

  // Active filter
  if (filters.isActive !== undefined) {
    filtered = filtered.filter((event) => event.isActive === filters.isActive);
  }

  // Featured filter
  if (filters.isFeatured !== undefined) {
    filtered = filtered.filter((event) => event.isFeatured === filters.isFeatured);
  }

  // Date range filter
  if (filters.startDateFrom) {
    const fromTimestamp = Timestamp.fromDate(filters.startDateFrom);
    filtered = filtered.filter((event) => event.startDate >= fromTimestamp);
  }

  if (filters.startDateTo) {
    const toTimestamp = Timestamp.fromDate(filters.startDateTo);
    filtered = filtered.filter((event) => event.startDate <= toTimestamp);
  }

  // City filter
  if (filters.city) {
    const cityLower = filters.city.toLowerCase();
    filtered = filtered.filter(
      (event) => event.location.city?.toLowerCase().includes(cityLower)
    );
  }

  // Tags filter
  if (filters.tags && filters.tags.length > 0) {
    filtered = filtered.filter((event) =>
      filters.tags!.some((tag) => event.tags.includes(tag))
    );
  }

  return filtered;
}

/**
 * Create a new event
 */
export async function createEvent(
  formData: EventFormData,
  createdBy: string
): Promise<string> {
  try {
    const eventsRef = collection(db, EVENTS_COLLECTION);
    const eventData = formDataToEvent(formData, createdBy);

    const docRef = await addDoc(eventsRef, cleanUndefinedFields(eventData));

    console.log('Event created successfully:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error creating event:', error);
    throw new Error('Failed to create event');
  }
}

/**
 * Update an event
 */
export async function updateEvent(
  eventId: string,
  updates: Partial<EventFormData>
): Promise<void> {
  try {
    const eventRef = doc(db, EVENTS_COLLECTION, eventId);

    // Get current event to preserve some fields
    const currentEvent = await getEventById(eventId);
    if (!currentEvent) {
      throw new Error('Event not found');
    }

    // Convert updates to Firestore format
    const updateData: Partial<Event> = {
      updatedAt: Timestamp.now(),
    };

    if (updates.title !== undefined) {
      updateData.title = updates.title;
      updateData.slug = generateSlug(updates.title);
    }
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.shortDescription !== undefined)
      updateData.shortDescription = updates.shortDescription;

    if (updates.startDate !== undefined)
      updateData.startDate = Timestamp.fromDate(new Date(updates.startDate));
    if (updates.endDate !== undefined)
      updateData.endDate = Timestamp.fromDate(new Date(updates.endDate));
    if (updates.timezone !== undefined) updateData.timezone = updates.timezone;
    if (updates.doorsOpenTime !== undefined)
      updateData.doorsOpenTime = updates.doorsOpenTime
        ? Timestamp.fromDate(new Date(updates.doorsOpenTime))
        : null;

    if (updates.location !== undefined) updateData.location = updates.location;
    if (updates.artists !== undefined) updateData.artists = updates.artists;

    if (updates.type !== undefined) updateData.type = updates.type;
    if (updates.categories !== undefined) updateData.categories = updates.categories;
    if (updates.tags !== undefined) updateData.tags = updates.tags;

    if (updates.coverImage !== undefined) updateData.coverImage = updates.coverImage;
    if (updates.images !== undefined) updateData.images = updates.images;
    if (updates.videoUrl !== undefined) updateData.videoUrl = updates.videoUrl;

    // Update ticket categories and recalculate capacity
    if (updates.ticketCategories !== undefined) {
      const ticketCategories: TicketCategory[] = updates.ticketCategories.map((cat) => {
        // Preserve sold count from existing category if it exists
        const existingCat = currentEvent.ticketCategories.find((c) => c.id === cat.id);
        const sold = existingCat?.sold || 0;
        const reserved = existingCat?.reserved || 0;

        return {
          id: cat.id,
          name: cat.name,
          description: cat.description,
          price: cat.price,
          capacity: cat.capacity,
          sold,
          reserved,
          available: cat.capacity - sold - reserved,
          isActive: cat.isActive,
          requiresMembership: cat.requiresMembership,
          allowedMembershipTypes: cat.allowedMembershipTypes,
          salesStartDate: cat.salesStartDate
            ? Timestamp.fromDate(new Date(cat.salesStartDate))
            : null,
          salesEndDate: cat.salesEndDate
            ? Timestamp.fromDate(new Date(cat.salesEndDate))
            : null,
          benefits: cat.benefits || [],
          order: cat.order,
        };
      });

      updateData.ticketCategories = ticketCategories;
      updateData.totalCapacity = ticketCategories.reduce((sum, cat) => sum + cat.capacity, 0);
    }

    if (updates.status !== undefined) {
      updateData.status = updates.status;
      // Set publishedAt if status changes to published
      if (updates.status === 'published' && !currentEvent.publishedAt) {
        updateData.publishedAt = Timestamp.now();
      }
    }

    if (updates.isActive !== undefined) updateData.isActive = updates.isActive;
    if (updates.isFeatured !== undefined) updateData.isFeatured = updates.isFeatured;

    if (updates.registrationOpen !== undefined)
      updateData.registrationOpen = updates.registrationOpen;
    if (updates.registrationStartDate !== undefined)
      updateData.registrationStartDate = updates.registrationStartDate
        ? Timestamp.fromDate(new Date(updates.registrationStartDate))
        : null;
    if (updates.registrationEndDate !== undefined)
      updateData.registrationEndDate = updates.registrationEndDate
        ? Timestamp.fromDate(new Date(updates.registrationEndDate))
        : null;
    if (updates.requiresApproval !== undefined)
      updateData.requiresApproval = updates.requiresApproval;

    if (updates.allowWaitlist !== undefined) updateData.allowWaitlist = updates.allowWaitlist;
    if (updates.maxTicketsPerUser !== undefined)
      updateData.maxTicketsPerUser = updates.maxTicketsPerUser;
    if (updates.minAge !== undefined) updateData.minAge = updates.minAge;

    if (updates.termsAndConditions !== undefined)
      updateData.termsAndConditions = updates.termsAndConditions;
    if (updates.refundPolicy !== undefined) updateData.refundPolicy = updates.refundPolicy;
    if (updates.contactEmail !== undefined) updateData.contactEmail = updates.contactEmail;
    if (updates.contactPhone !== undefined) updateData.contactPhone = updates.contactPhone;

    if (updates.websiteUrl !== undefined) updateData.websiteUrl = updates.websiteUrl;
    if (updates.facebookEventUrl !== undefined)
      updateData.facebookEventUrl = updates.facebookEventUrl;

    if (updates.metaTitle !== undefined) updateData.metaTitle = updates.metaTitle;
    if (updates.metaDescription !== undefined)
      updateData.metaDescription = updates.metaDescription;

    await updateDoc(eventRef, cleanUndefinedFields(updateData));

    console.log('Event updated successfully:', eventId);
  } catch (error) {
    console.error('Error updating event:', error);
    throw new Error('Failed to update event');
  }
}

/**
 * Delete an event
 */
export async function deleteEvent(eventId: string): Promise<void> {
  try {
    // Check if event has purchases
    const event = await getEventById(eventId);
    if (event && event.totalSold > 0) {
      throw new Error(
        'Cannot delete event with existing ticket purchases. Cancel the event instead.'
      );
    }

    const eventRef = doc(db, EVENTS_COLLECTION, eventId);
    await deleteDoc(eventRef);

    console.log('Event deleted successfully:', eventId);
  } catch (error) {
    console.error('Error deleting event:', error);
    throw error;
  }
}

/**
 * Cancel an event
 */
export async function cancelEvent(
  eventId: string,
  cancellationReason: string,
  _cancelledBy: string
): Promise<void> {
  try {
    const eventRef = doc(db, EVENTS_COLLECTION, eventId);

    await updateDoc(eventRef, {
      status: 'cancelled',
      isActive: false,
      cancelledAt: Timestamp.now(),
      cancellationReason,
      updatedAt: Timestamp.now(),
    });

    console.log('Event cancelled successfully:', eventId);
  } catch (error) {
    console.error('Error cancelling event:', error);
    throw new Error('Failed to cancel event');
  }
}

/**
 * Toggle event active status
 */
export async function toggleEventActive(eventId: string, isActive: boolean): Promise<void> {
  try {
    const eventRef = doc(db, EVENTS_COLLECTION, eventId);

    await updateDoc(eventRef, {
      isActive,
      updatedAt: Timestamp.now(),
    });

    console.log(`Event ${isActive ? 'activated' : 'deactivated'} successfully:`, eventId);
  } catch (error) {
    console.error('Error toggling event active status:', error);
    throw new Error('Failed to toggle event status');
  }
}

/**
 * Toggle event featured status
 */
export async function toggleEventFeatured(
  eventId: string,
  isFeatured: boolean
): Promise<void> {
  try {
    const eventRef = doc(db, EVENTS_COLLECTION, eventId);

    await updateDoc(eventRef, {
      isFeatured,
      updatedAt: Timestamp.now(),
    });

    console.log(`Event ${isFeatured ? 'featured' : 'unfeatured'} successfully:`, eventId);
  } catch (error) {
    console.error('Error toggling event featured status:', error);
    throw new Error('Failed to toggle event featured status');
  }
}

/**
 * Update event status
 */
export async function updateEventStatus(
  eventId: string,
  status: EventStatus
): Promise<void> {
  try {
    const eventRef = doc(db, EVENTS_COLLECTION, eventId);
    const updateData: any = {
      status,
      updatedAt: Timestamp.now(),
    };

    // Set publishedAt when publishing
    if (status === 'published') {
      const event = await getEventById(eventId);
      if (event && !event.publishedAt) {
        updateData.publishedAt = Timestamp.now();
      }
    }

    await updateDoc(eventRef, updateData);

    console.log('Event status updated successfully:', eventId, status);
  } catch (error) {
    console.error('Error updating event status:', error);
    throw new Error('Failed to update event status');
  }
}

/**
 * Duplicate an event
 */
export async function duplicateEvent(
  eventId: string,
  createdBy: string,
  titleSuffix: string = ' (Copie)'
): Promise<string> {
  try {
    const originalEvent = await getEventById(eventId);
    if (!originalEvent) {
      throw new Error('Original event not found');
    }

    // Create form data from original event
    const formData: EventFormData = {
      title: originalEvent.title + titleSuffix,
      description: originalEvent.description,
      shortDescription: originalEvent.shortDescription,
      startDate: originalEvent.startDate.toDate().toISOString(),
      endDate: originalEvent.endDate.toDate().toISOString(),
      timezone: originalEvent.timezone,
      doorsOpenTime: originalEvent.doorsOpenTime?.toDate().toISOString() || null,
      location: { ...originalEvent.location },
      artists: originalEvent.artists.map((artist) => ({ ...artist })),
      type: originalEvent.type,
      categories: [...originalEvent.categories],
      tags: [...originalEvent.tags],
      coverImage: originalEvent.coverImage,
      images: [...originalEvent.images],
      videoUrl: originalEvent.videoUrl,
      ticketCategories: originalEvent.ticketCategories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        description: cat.description,
        price: cat.price,
        capacity: cat.capacity,
        isActive: cat.isActive,
        requiresMembership: cat.requiresMembership,
        allowedMembershipTypes: cat.allowedMembershipTypes,
        salesStartDate: cat.salesStartDate?.toDate().toISOString() || null,
        salesEndDate: cat.salesEndDate?.toDate().toISOString() || null,
        benefits: [...cat.benefits],
        order: cat.order,
      })),
      status: 'draft', // Always create duplicate as draft
      isActive: false, // Inactive by default
      isFeatured: false,
      registrationOpen: originalEvent.registrationOpen,
      registrationStartDate: originalEvent.registrationStartDate?.toDate().toISOString() || null,
      registrationEndDate: originalEvent.registrationEndDate?.toDate().toISOString() || null,
      requiresApproval: originalEvent.requiresApproval,
      allowWaitlist: originalEvent.allowWaitlist,
      maxTicketsPerUser: originalEvent.maxTicketsPerUser,
      minAge: originalEvent.minAge,
      termsAndConditions: originalEvent.termsAndConditions,
      refundPolicy: originalEvent.refundPolicy,
      contactEmail: originalEvent.contactEmail,
      contactPhone: originalEvent.contactPhone,
      websiteUrl: originalEvent.websiteUrl,
      facebookEventUrl: originalEvent.facebookEventUrl,
      metaTitle: originalEvent.metaTitle,
      metaDescription: originalEvent.metaDescription,
    };

    const newEventId = await createEvent(formData, createdBy);

    console.log('Event duplicated successfully:', newEventId);
    return newEventId;
  } catch (error) {
    console.error('Error duplicating event:', error);
    throw new Error('Failed to duplicate event');
  }
}

// ========================
// EXPORT
// ========================

export {
  generateSlug,
  generateTicketNumber,
  generateTicketQRCode,
  cleanUndefinedFields,
  EVENTS_COLLECTION,
  PURCHASES_SUBCOLLECTION,
};
