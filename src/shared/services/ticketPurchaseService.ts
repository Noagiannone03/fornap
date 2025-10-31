import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp,
  writeBatch,
  increment,
  runTransaction,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type {
  EventPurchase,
  PurchaseStatus,
  PaymentStatus,
  EventPurchaseListItem,
  PurchaseFilters,
} from '../types/event';
import type { Event } from '../types/event';
import { getEventById } from './eventService';
import { getUserById, addActionHistory } from './userService';
import {
  generateTicketNumber,
  generateTicketQRCode,
  EVENTS_COLLECTION,
  PURCHASES_SUBCOLLECTION,
} from './eventService';

// ========================
// CONSTANTS
// ========================

const USERS_COLLECTION = 'users';

// ========================
// HELPER FUNCTIONS
// ========================

/**
 * Convert EventPurchase to EventPurchaseListItem
 */
function purchaseToListItem(purchase: EventPurchase): EventPurchaseListItem {
  return {
    id: purchase.id,
    eventTitle: purchase.eventTitle,
    eventStartDate: purchase.eventStartDate,
    userName: purchase.userName,
    userEmail: purchase.userEmail,
    ticketCategoryName: purchase.ticketCategoryName,
    quantity: purchase.quantity,
    totalPrice: purchase.totalPrice,
    paymentStatus: purchase.paymentStatus,
    status: purchase.status,
    checkedIn: purchase.checkedIn,
    ticketNumber: purchase.ticketNumber,
    createdAt: purchase.createdAt,
  };
}

// ========================
// PURCHASE CRUD OPERATIONS
// ========================

/**
 * Get all purchases for an event
 */
export async function getEventPurchases(eventId: string): Promise<EventPurchase[]> {
  try {
    const purchasesRef = collection(db, EVENTS_COLLECTION, eventId, PURCHASES_SUBCOLLECTION);
    const q = query(purchasesRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      ...doc.data(),
      id: doc.id,
    })) as EventPurchase[];
  } catch (error) {
    console.error('Error getting event purchases:', error);
    throw new Error('Failed to fetch event purchases');
  }
}

/**
 * Get all purchases for an event as list items
 */
export async function getEventPurchasesForList(
  eventId: string
): Promise<EventPurchaseListItem[]> {
  try {
    const purchases = await getEventPurchases(eventId);
    return purchases.map(purchaseToListItem);
  } catch (error) {
    console.error('Error getting event purchases for list:', error);
    throw new Error('Failed to fetch event purchases list');
  }
}

/**
 * Get purchase by ID
 */
export async function getPurchaseById(
  eventId: string,
  purchaseId: string
): Promise<EventPurchase | null> {
  try {
    const purchaseRef = doc(
      db,
      EVENTS_COLLECTION,
      eventId,
      PURCHASES_SUBCOLLECTION,
      purchaseId
    );
    const purchaseDoc = await getDoc(purchaseRef);

    if (!purchaseDoc.exists()) {
      return null;
    }

    return {
      ...purchaseDoc.data(),
      id: purchaseDoc.id,
    } as EventPurchase;
  } catch (error) {
    console.error('Error getting purchase by ID:', error);
    throw new Error('Failed to fetch purchase');
  }
}

/**
 * Get all purchases for a user across all events
 */
export async function getUserPurchases(userId: string): Promise<EventPurchase[]> {
  try {
    const purchases: EventPurchase[] = [];

    // Get all events
    const eventsRef = collection(db, EVENTS_COLLECTION);
    const eventsSnapshot = await getDocs(eventsRef);

    // For each event, get user's purchases
    for (const eventDoc of eventsSnapshot.docs) {
      const purchasesRef = collection(
        db,
        EVENTS_COLLECTION,
        eventDoc.id,
        PURCHASES_SUBCOLLECTION
      );
      const q = query(purchasesRef, where('userId', '==', userId), orderBy('createdAt', 'desc'));
      const purchasesSnapshot = await getDocs(q);

      purchasesSnapshot.docs.forEach((doc) => {
        purchases.push({
          ...doc.data(),
          id: doc.id,
        } as EventPurchase);
      });
    }

    return purchases;
  } catch (error) {
    console.error('Error getting user purchases:', error);
    throw new Error('Failed to fetch user purchases');
  }
}

/**
 * Get user's purchase for a specific event
 */
export async function getUserEventPurchase(
  userId: string,
  eventId: string
): Promise<EventPurchase[]> {
  try {
    const purchasesRef = collection(db, EVENTS_COLLECTION, eventId, PURCHASES_SUBCOLLECTION);
    const q = query(purchasesRef, where('userId', '==', userId), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      ...doc.data(),
      id: doc.id,
    })) as EventPurchase[];
  } catch (error) {
    console.error('Error getting user event purchase:', error);
    throw new Error('Failed to fetch user event purchase');
  }
}

/**
 * Get purchase by ticket QR code
 */
export async function getPurchaseByQRCode(
  eventId: string,
  qrCode: string
): Promise<EventPurchase | null> {
  try {
    const purchasesRef = collection(db, EVENTS_COLLECTION, eventId, PURCHASES_SUBCOLLECTION);
    const q = query(purchasesRef, where('ticketQRCode', '==', qrCode));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return {
      ...doc.data(),
      id: doc.id,
    } as EventPurchase;
  } catch (error) {
    console.error('Error getting purchase by QR code:', error);
    throw new Error('Failed to fetch purchase by QR code');
  }
}

/**
 * Filter purchases (client-side filtering)
 */
export function filterPurchases(
  purchases: EventPurchase[],
  filters: PurchaseFilters
): EventPurchase[] {
  let filtered = [...purchases];

  // Search filter
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    filtered = filtered.filter(
      (purchase) =>
        purchase.userName.toLowerCase().includes(searchLower) ||
        purchase.userEmail.toLowerCase().includes(searchLower) ||
        purchase.ticketNumber.toLowerCase().includes(searchLower) ||
        purchase.eventTitle.toLowerCase().includes(searchLower)
    );
  }

  // Event filter
  if (filters.eventId) {
    filtered = filtered.filter((purchase) => purchase.eventId === filters.eventId);
  }

  // Payment status filter
  if (filters.paymentStatus) {
    filtered = filtered.filter((purchase) => purchase.paymentStatus === filters.paymentStatus);
  }

  // Purchase status filter
  if (filters.status) {
    filtered = filtered.filter((purchase) => purchase.status === filters.status);
  }

  // Checked in filter
  if (filters.checkedIn !== undefined) {
    filtered = filtered.filter((purchase) => purchase.checkedIn === filters.checkedIn);
  }

  // Date range filter
  if (filters.purchasedFrom) {
    const fromTimestamp = Timestamp.fromDate(filters.purchasedFrom);
    filtered = filtered.filter((purchase) => purchase.createdAt >= fromTimestamp);
  }

  if (filters.purchasedTo) {
    const toTimestamp = Timestamp.fromDate(filters.purchasedTo);
    filtered = filtered.filter((purchase) => purchase.createdAt <= toTimestamp);
  }

  return filtered;
}

// ========================
// PURCHASE CREATION
// ========================

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
 * Create a ticket purchase (with transaction)
 * This function handles:
 * - Creating the purchase record
 * - Updating event ticket category sold count
 * - Updating event total sold and revenue
 * - Adding action to user history
 * - Awarding loyalty points
 */
export async function createTicketPurchase(
  purchaseData: CreatePurchaseData
): Promise<string> {
  try {
    return await runTransaction(db, async (transaction) => {
      const { eventId, userId, ticketCategoryId, quantity, loyaltyPointsUsed = 0 } = purchaseData;

      // 1. Get event
      const eventRef = doc(db, EVENTS_COLLECTION, eventId);
      const eventDoc = await transaction.get(eventRef);
      if (!eventDoc.exists()) {
        throw new Error('Event not found');
      }
      const event = { ...eventDoc.data(), id: eventDoc.id } as Event;

      // 2. Get user
      const userRef = doc(db, USERS_COLLECTION, userId);
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists()) {
        throw new Error('User not found');
      }
      const user = userDoc.data();

      // 3. Find ticket category
      const ticketCategory = event.ticketCategories.find((cat) => cat.id === ticketCategoryId);
      if (!ticketCategory) {
        throw new Error('Ticket category not found');
      }

      // 4. Validate availability
      if (!ticketCategory.isActive) {
        throw new Error('This ticket category is not available for purchase');
      }
      if (ticketCategory.available < quantity) {
        throw new Error(`Only ${ticketCategory.available} ticket(s) available`);
      }

      // 5. Check if sales period is valid
      const now = Timestamp.now();
      if (ticketCategory.salesStartDate && now < ticketCategory.salesStartDate) {
        throw new Error('Sales have not started yet for this ticket category');
      }
      if (ticketCategory.salesEndDate && now > ticketCategory.salesEndDate) {
        throw new Error('Sales have ended for this ticket category');
      }

      // 6. Check event registration settings
      if (!event.registrationOpen) {
        throw new Error('Registration is closed for this event');
      }
      if (event.registrationStartDate && now < event.registrationStartDate) {
        throw new Error('Registration has not started yet');
      }
      if (event.registrationEndDate && now > event.registrationEndDate) {
        throw new Error('Registration has ended');
      }

      // 7. Check max tickets per user
      const existingPurchases = await getUserEventPurchase(userId, eventId);
      const totalQuantity = existingPurchases.reduce((sum, p) => sum + p.quantity, 0);
      if (totalQuantity + quantity > event.maxTicketsPerUser) {
        throw new Error(
          `Maximum ${event.maxTicketsPerUser} ticket(s) per user. You already have ${totalQuantity}.`
        );
      }

      // 8. Check membership requirements
      if (ticketCategory.requiresMembership) {
        const userMembership = user.currentMembership;
        if (!userMembership || userMembership.status !== 'active') {
          throw new Error('Active membership required to purchase this ticket');
        }
        if (
          ticketCategory.allowedMembershipTypes &&
          !ticketCategory.allowedMembershipTypes.includes(userMembership.planType)
        ) {
          throw new Error(
            `This ticket is only available for ${ticketCategory.allowedMembershipTypes.join(', ')} members`
          );
        }
      }

      // 9. Calculate price
      const pricePerTicket = ticketCategory.price;
      const totalPrice = pricePerTicket * quantity - (loyaltyPointsUsed || 0);

      // 10. Calculate loyalty points to earn (1 point per euro spent, rounded)
      const loyaltyPointsEarned = Math.floor(totalPrice);

      // 11. Generate ticket details
      const ticketQRCode = generateTicketQRCode();
      const purchasesRef = collection(db, EVENTS_COLLECTION, eventId, PURCHASES_SUBCOLLECTION);
      const purchasesSnapshot = await getDocs(purchasesRef);
      const ticketNumber = generateTicketNumber(eventId, purchasesSnapshot.size);

      // 12. Create purchase document
      const purchaseRef = doc(purchasesRef);
      const purchase: Omit<EventPurchase, 'id'> = {
        eventId,
        eventTitle: event.title,
        eventStartDate: event.startDate,
        userId,
        userEmail: user.email,
        userName: `${user.firstName} ${user.lastName}`,

        ticketCategoryId,
        ticketCategoryName: ticketCategory.name,
        quantity,
        pricePerTicket,
        totalPrice,

        paymentStatus: purchaseData.paymentStatus || 'pending',
        paymentMethod: purchaseData.paymentMethod,
        transactionId: purchaseData.transactionId,
        paidAt: purchaseData.paymentStatus === 'paid' ? now : null,

        status: event.requiresApproval ? 'pending' : 'confirmed',

        checkedIn: false,
        checkedInAt: null,
        checkedInBy: undefined,

        ticketQRCode,
        ticketNumber,

        approvalRequired: event.requiresApproval,
        approved: !event.requiresApproval,
        approvedAt: event.requiresApproval ? null : now,
        approvedBy: undefined,
        rejectionReason: undefined,

        loyaltyPointsEarned,
        loyaltyPointsUsed: loyaltyPointsUsed || 0,

        cancelledAt: null,
        cancellationReason: undefined,
        cancelledBy: undefined,
        refundedAt: null,
        refundAmount: undefined,
        refundTransactionId: undefined,

        notes: purchaseData.notes,
        specialRequirements: purchaseData.specialRequirements,

        createdAt: now,
        updatedAt: now,
      };

      transaction.set(purchaseRef, purchase);

      // 13. Update ticket category sold count
      const updatedCategories = event.ticketCategories.map((cat) => {
        if (cat.id === ticketCategoryId) {
          return {
            ...cat,
            sold: cat.sold + quantity,
            available: cat.capacity - cat.sold - quantity - cat.reserved,
          };
        }
        return cat;
      });

      transaction.update(eventRef, {
        ticketCategories: updatedCategories,
        totalSold: increment(quantity),
        totalRevenue: increment(totalPrice),
        updatedAt: now,
      });

      // 14. Update user loyalty points and action history
      transaction.update(userRef, {
        loyaltyPoints: increment(loyaltyPointsEarned - loyaltyPointsUsed),
        updatedAt: now,
      });

      // 15. Add to user's action history (will be done outside transaction)
      // We'll return the purchase ID and handle this after

      console.log('Ticket purchase created successfully:', purchaseRef.id);
      return purchaseRef.id;
    });
  } catch (error) {
    console.error('Error creating ticket purchase:', error);
    throw error;
  }
}

/**
 * Add purchase to user action history
 * Call this after createTicketPurchase
 */
export async function addPurchaseToUserHistory(
  userId: string,
  eventId: string,
  purchaseId: string
): Promise<void> {
  try {
    const purchase = await getPurchaseById(eventId, purchaseId);
    if (!purchase) {
      throw new Error('Purchase not found');
    }

    await addActionHistory(userId, {
      actionType: 'event_registration',
      details: {
        eventId: purchase.eventId,
        eventTitle: purchase.eventTitle,
        ticketCategoryName: purchase.ticketCategoryName,
        quantity: purchase.quantity,
        totalPrice: purchase.totalPrice,
        ticketNumber: purchase.ticketNumber,
        purchaseId,
      },
      timestamp: purchase.createdAt,
    });

    console.log('Purchase added to user action history');
  } catch (error) {
    console.error('Error adding purchase to user history:', error);
    // Don't throw - this is not critical
  }
}

// ========================
// PURCHASE UPDATES
// ========================

/**
 * Update purchase payment status
 */
export async function updatePurchasePaymentStatus(
  eventId: string,
  purchaseId: string,
  paymentStatus: PaymentStatus,
  transactionId?: string
): Promise<void> {
  try {
    const purchaseRef = doc(
      db,
      EVENTS_COLLECTION,
      eventId,
      PURCHASES_SUBCOLLECTION,
      purchaseId
    );

    const updateData: any = {
      paymentStatus,
      updatedAt: Timestamp.now(),
    };

    if (transactionId) {
      updateData.transactionId = transactionId;
    }

    if (paymentStatus === 'paid') {
      updateData.paidAt = Timestamp.now();
    }

    await updateDoc(purchaseRef, updateData);

    console.log('Purchase payment status updated:', purchaseId, paymentStatus);
  } catch (error) {
    console.error('Error updating purchase payment status:', error);
    throw new Error('Failed to update payment status');
  }
}

/**
 * Approve purchase (for events requiring approval)
 */
export async function approvePurchase(
  eventId: string,
  purchaseId: string,
  approvedBy: string
): Promise<void> {
  try {
    const purchaseRef = doc(
      db,
      EVENTS_COLLECTION,
      eventId,
      PURCHASES_SUBCOLLECTION,
      purchaseId
    );

    await updateDoc(purchaseRef, {
      approved: true,
      approvedAt: Timestamp.now(),
      approvedBy,
      status: 'confirmed',
      updatedAt: Timestamp.now(),
    });

    console.log('Purchase approved:', purchaseId);
  } catch (error) {
    console.error('Error approving purchase:', error);
    throw new Error('Failed to approve purchase');
  }
}

/**
 * Reject purchase
 */
export async function rejectPurchase(
  eventId: string,
  purchaseId: string,
  rejectionReason: string,
  rejectedBy: string
): Promise<void> {
  try {
    await runTransaction(db, async (transaction) => {
      const purchaseRef = doc(
        db,
        EVENTS_COLLECTION,
        eventId,
        PURCHASES_SUBCOLLECTION,
        purchaseId
      );
      const purchaseDoc = await transaction.get(purchaseRef);
      if (!purchaseDoc.exists()) {
        throw new Error('Purchase not found');
      }

      const purchase = purchaseDoc.data() as EventPurchase;

      // Update purchase
      transaction.update(purchaseRef, {
        approved: false,
        status: 'cancelled',
        rejectionReason,
        cancelledAt: Timestamp.now(),
        cancelledBy: rejectedBy,
        updatedAt: Timestamp.now(),
      });

      // Return ticket to available pool
      const eventRef = doc(db, EVENTS_COLLECTION, eventId);
      const eventDoc = await transaction.get(eventRef);
      if (eventDoc.exists()) {
        const event = eventDoc.data() as Event;
        const updatedCategories = event.ticketCategories.map((cat) => {
          if (cat.id === purchase.ticketCategoryId) {
            return {
              ...cat,
              sold: Math.max(0, cat.sold - purchase.quantity),
              available: cat.capacity - Math.max(0, cat.sold - purchase.quantity) - cat.reserved,
            };
          }
          return cat;
        });

        transaction.update(eventRef, {
          ticketCategories: updatedCategories,
          totalSold: increment(-purchase.quantity),
          totalRevenue: increment(-purchase.totalPrice),
          updatedAt: Timestamp.now(),
        });
      }

      // Refund loyalty points
      const userRef = doc(db, USERS_COLLECTION, purchase.userId);
      transaction.update(userRef, {
        loyaltyPoints: increment(-purchase.loyaltyPointsEarned + purchase.loyaltyPointsUsed),
        updatedAt: Timestamp.now(),
      });
    });

    console.log('Purchase rejected:', purchaseId);
  } catch (error) {
    console.error('Error rejecting purchase:', error);
    throw new Error('Failed to reject purchase');
  }
}

/**
 * Check in attendee
 */
export async function checkInAttendee(
  eventId: string,
  purchaseId: string,
  checkedInBy: string
): Promise<void> {
  try {
    await runTransaction(db, async (transaction) => {
      const purchaseRef = doc(
        db,
        EVENTS_COLLECTION,
        eventId,
        PURCHASES_SUBCOLLECTION,
        purchaseId
      );
      const purchaseDoc = await transaction.get(purchaseRef);

      if (!purchaseDoc.exists()) {
        throw new Error('Purchase not found');
      }

      const purchase = purchaseDoc.data() as EventPurchase;

      if (purchase.checkedIn) {
        throw new Error('Already checked in');
      }

      if (purchase.status !== 'confirmed') {
        throw new Error('Purchase must be confirmed before check-in');
      }

      // Update purchase
      transaction.update(purchaseRef, {
        checkedIn: true,
        checkedInAt: Timestamp.now(),
        checkedInBy,
        updatedAt: Timestamp.now(),
      });

      // Update event total checked in
      const eventRef = doc(db, EVENTS_COLLECTION, eventId);
      transaction.update(eventRef, {
        totalCheckedIn: increment(purchase.quantity),
        updatedAt: Timestamp.now(),
      });

      // Add to user action history
      const userRef = doc(db, USERS_COLLECTION, purchase.userId);
      // This will be handled separately after transaction
    });

    // Add to user action history
    const purchase = await getPurchaseById(eventId, purchaseId);
    if (purchase) {
      await addActionHistory(purchase.userId, {
        actionType: 'event_checkin',
        details: {
          eventId: purchase.eventId,
          eventTitle: purchase.eventTitle,
          ticketNumber: purchase.ticketNumber,
          checkedInBy,
        },
        timestamp: Timestamp.now(),
      });
    }

    console.log('Attendee checked in:', purchaseId);
  } catch (error) {
    console.error('Error checking in attendee:', error);
    throw error;
  }
}

/**
 * Check in by QR code
 */
export async function checkInByQRCode(
  eventId: string,
  qrCode: string,
  checkedInBy: string
): Promise<EventPurchase> {
  try {
    const purchase = await getPurchaseByQRCode(eventId, qrCode);
    if (!purchase) {
      throw new Error('Invalid QR code or ticket not found');
    }

    await checkInAttendee(eventId, purchase.id, checkedInBy);

    // Return updated purchase
    const updatedPurchase = await getPurchaseById(eventId, purchase.id);
    if (!updatedPurchase) {
      throw new Error('Failed to retrieve updated purchase');
    }

    return updatedPurchase;
  } catch (error) {
    console.error('Error checking in by QR code:', error);
    throw error;
  }
}

/**
 * Cancel purchase (by user or admin)
 */
export async function cancelPurchase(
  eventId: string,
  purchaseId: string,
  cancellationReason: string,
  cancelledBy: string
): Promise<void> {
  try {
    await runTransaction(db, async (transaction) => {
      const purchaseRef = doc(
        db,
        EVENTS_COLLECTION,
        eventId,
        PURCHASES_SUBCOLLECTION,
        purchaseId
      );
      const purchaseDoc = await transaction.get(purchaseRef);

      if (!purchaseDoc.exists()) {
        throw new Error('Purchase not found');
      }

      const purchase = purchaseDoc.data() as EventPurchase;

      if (purchase.status === 'cancelled' || purchase.status === 'refunded') {
        throw new Error('Purchase already cancelled');
      }

      if (purchase.checkedIn) {
        throw new Error('Cannot cancel a purchase after check-in');
      }

      // Update purchase
      transaction.update(purchaseRef, {
        status: 'cancelled',
        cancelledAt: Timestamp.now(),
        cancellationReason,
        cancelledBy,
        updatedAt: Timestamp.now(),
      });

      // Return ticket to available pool
      const eventRef = doc(db, EVENTS_COLLECTION, eventId);
      const eventDoc = await transaction.get(eventRef);
      if (eventDoc.exists()) {
        const event = eventDoc.data() as Event;
        const updatedCategories = event.ticketCategories.map((cat) => {
          if (cat.id === purchase.ticketCategoryId) {
            return {
              ...cat,
              sold: Math.max(0, cat.sold - purchase.quantity),
              available: cat.capacity - Math.max(0, cat.sold - purchase.quantity) - cat.reserved,
            };
          }
          return cat;
        });

        transaction.update(eventRef, {
          ticketCategories: updatedCategories,
          totalSold: increment(-purchase.quantity),
          totalRevenue: increment(-purchase.totalPrice),
          updatedAt: Timestamp.now(),
        });
      }

      // Refund loyalty points
      const userRef = doc(db, USERS_COLLECTION, purchase.userId);
      transaction.update(userRef, {
        loyaltyPoints: increment(-purchase.loyaltyPointsEarned + purchase.loyaltyPointsUsed),
        updatedAt: Timestamp.now(),
      });
    });

    console.log('Purchase cancelled:', purchaseId);
  } catch (error) {
    console.error('Error cancelling purchase:', error);
    throw error;
  }
}

/**
 * Process refund
 */
export async function refundPurchase(
  eventId: string,
  purchaseId: string,
  refundAmount: number,
  refundTransactionId: string
): Promise<void> {
  try {
    const purchaseRef = doc(
      db,
      EVENTS_COLLECTION,
      eventId,
      PURCHASES_SUBCOLLECTION,
      purchaseId
    );

    await updateDoc(purchaseRef, {
      status: 'refunded',
      paymentStatus: 'refunded',
      refundedAt: Timestamp.now(),
      refundAmount,
      refundTransactionId,
      updatedAt: Timestamp.now(),
    });

    console.log('Purchase refunded:', purchaseId, refundAmount);
  } catch (error) {
    console.error('Error processing refund:', error);
    throw new Error('Failed to process refund');
  }
}

// ========================
// EXPORT
// ========================

export { purchaseToListItem };
