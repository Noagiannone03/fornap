import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../config/firebase';
import type {
  EventAnalyticsKPIs,
  EventRevenueData,
  EventTypeDistribution,
  TopEvent,
  AttendeeProfile,
  EventDetailStats,
  Event,
  EventPurchase,
} from '../../types/event';
import type { User, MembershipType } from '../../types/user';

// ========================
// CONSTANTS
// ========================

const EVENTS_COLLECTION = 'events';
const PURCHASES_SUBCOLLECTION = 'purchases';
const USERS_COLLECTION = 'users';

// ========================
// HELPER FUNCTIONS
// ========================

/**
 * Convert Firestore Timestamp to Date
 */
function toDate(value: any): Date | null {
  if (!value) return null;

  // Handle Firestore Timestamp
  if (value.toDate && typeof value.toDate === 'function') {
    return value.toDate();
  }

  // Handle Timestamp with seconds
  if (value.seconds !== undefined) {
    return new Date(value.seconds * 1000);
  }

  // Handle string/number
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  }

  return null;
}

/**
 * Calculate age from birth date
 */
function calculateAge(birthDate: any): number {
  const date = toDate(birthDate);
  if (!date) return 0;

  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  const monthDiff = today.getMonth() - date.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
    age--;
  }

  return age;
}

/**
 * Group data by age range
 */
function groupByAgeRange(ages: number[]): Record<string, number> {
  const ranges: Record<string, number> = {
    '18-25': 0,
    '26-35': 0,
    '36-45': 0,
    '46-55': 0,
    '56-65': 0,
    '66+': 0,
  };

  ages.forEach((age) => {
    if (age >= 18 && age <= 25) ranges['18-25']++;
    else if (age >= 26 && age <= 35) ranges['26-35']++;
    else if (age >= 36 && age <= 45) ranges['36-45']++;
    else if (age >= 46 && age <= 55) ranges['46-55']++;
    else if (age >= 56 && age <= 65) ranges['56-65']++;
    else if (age >= 66) ranges['66+']++;
  });

  return ranges;
}

/**
 * Get date range for period comparison
 */
function getDateRange(period: 'week' | 'month' | 'year'): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();

  switch (period) {
    case 'week':
      start.setDate(start.getDate() - 7);
      break;
    case 'month':
      start.setMonth(start.getMonth() - 1);
      break;
    case 'year':
      start.setFullYear(start.getFullYear() - 1);
      break;
  }

  return { start, end };
}

// ========================
// OVERVIEW KPIs
// ========================

/**
 * Get event analytics overview KPIs
 */
export async function getEventAnalyticsKPIs(): Promise<EventAnalyticsKPIs> {
  try {
    // Get all events
    const eventsRef = collection(db, EVENTS_COLLECTION);
    const eventsSnapshot = await getDocs(eventsRef);

    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let totalEvents = 0;
    let activeEvents = 0;
    let upcomingEvents = 0;
    let completedEvents = 0;
    let totalRevenue = 0;
    let monthlyRevenue = 0;
    let totalTicketsSold = 0;
    let monthlyTicketsSold = 0;
    let totalAttendees = 0;
    let totalCapacity = 0;
    let totalOccupiedCapacity = 0;
    let totalAttendanceRate = 0;
    let eventsWithAttendance = 0;

    // Previous period data for trends
    let prevMonthRevenue = 0;
    let prevMonthTicketsSold = 0;
    let prevMonthEvents = 0;

    eventsSnapshot.forEach((doc) => {
      const event = doc.data() as Event;
      const startDate = toDate(event.startDate);

      if (!startDate) return;

      totalEvents++;

      // Status counts
      if (event.status === 'published' && event.isActive) {
        activeEvents++;
      }

      if (event.status === 'published' && startDate > now) {
        upcomingEvents++;
      }

      if (event.status === 'completed') {
        completedEvents++;
        eventsWithAttendance++;
        totalCapacity += event.totalCapacity;
        totalOccupiedCapacity += event.totalSold;

        if (event.totalSold > 0) {
          const attendanceRate = (event.totalCheckedIn / event.totalSold) * 100;
          totalAttendanceRate += attendanceRate;
        }
      }

      // Revenue
      totalRevenue += event.totalRevenue || 0;

      // Monthly revenue
      if (startDate >= thisMonth) {
        monthlyRevenue += event.totalRevenue || 0;
        monthlyTicketsSold += event.totalSold || 0;
      }

      // Previous month (for trend)
      const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      if (startDate >= twoMonthsAgo && startDate < thisMonth) {
        prevMonthRevenue += event.totalRevenue || 0;
        prevMonthTicketsSold += event.totalSold || 0;
        prevMonthEvents++;
      }

      // Tickets
      totalTicketsSold += event.totalSold || 0;

      // Attendees
      totalAttendees += event.totalCheckedIn || 0;
    });

    // Calculate averages
    const averageRevenuePerEvent = totalEvents > 0 ? totalRevenue / totalEvents : 0;
    const averageTicketPrice = totalTicketsSold > 0 ? totalRevenue / totalTicketsSold : 0;
    const averageAttendanceRate =
      eventsWithAttendance > 0 ? totalAttendanceRate / eventsWithAttendance : 0;
    const averageOccupancyRate =
      totalCapacity > 0 ? (totalOccupiedCapacity / totalCapacity) * 100 : 0;

    // OPTIMIZATION: Skip heavy nested queries for repeat rate and avg tickets
    // These functions iterate over ALL events and fetch ALL their purchases subcollections
    // which causes "Too many outstanding requests" Firebase errors
    // Use placeholder values - these can be calculated on-demand if needed
    const repeatAttendeeRate = 0;
    const averageTicketsPerUser = 0;

    // Calculate trends
    const revenueTrend =
      prevMonthRevenue > 0
        ? ((monthlyRevenue - prevMonthRevenue) / prevMonthRevenue) * 100
        : monthlyRevenue > 0
          ? 100
          : 0;

    const ticketsSoldTrend =
      prevMonthTicketsSold > 0
        ? ((monthlyTicketsSold - prevMonthTicketsSold) / prevMonthTicketsSold) * 100
        : monthlyTicketsSold > 0
          ? 100
          : 0;

    const eventsTrend =
      prevMonthEvents > 0
        ? ((activeEvents - prevMonthEvents) / prevMonthEvents) * 100
        : activeEvents > 0
          ? 100
          : 0;

    return {
      totalEvents,
      activeEvents,
      upcomingEvents,
      completedEvents,

      totalRevenue,
      monthlyRevenue,
      averageRevenuePerEvent,

      totalTicketsSold,
      monthlyTicketsSold,
      averageTicketPrice,

      totalAttendees,
      averageAttendanceRate,
      averageOccupancyRate,

      repeatAttendeeRate,
      averageTicketsPerUser,

      trends: {
        revenue: revenueTrend,
        ticketsSold: ticketsSoldTrend,
        attendanceRate: 0, // Would need historical data
        events: eventsTrend,
      },
    };
  } catch (error) {
    console.error('Error getting event analytics KPIs:', error);
    throw new Error('Failed to calculate event analytics KPIs');
  }
}

// ========================
// REVENUE ANALYTICS
// ========================

/**
 * Get revenue evolution over time
 */
export async function getRevenueEvolution(
  startDate: Date,
  endDate: Date,
  granularity: 'day' | 'week' | 'month' = 'month'
): Promise<EventRevenueData[]> {
  try {
    const eventsRef = collection(db, EVENTS_COLLECTION);
    const eventsSnapshot = await getDocs(eventsRef);

    // Group data by time period
    const dataByPeriod = new Map<string, { revenue: number; ticketsSold: number; events: number }>();

    eventsSnapshot.forEach((doc) => {
      const event = doc.data() as Event;
      const eventDate = toDate(event.startDate);

      if (!eventDate || eventDate < startDate || eventDate > endDate) return;

      // Determine period key based on granularity
      let periodKey: string;
      if (granularity === 'day') {
        periodKey = eventDate.toISOString().split('T')[0];
      } else if (granularity === 'week') {
        const weekStart = new Date(eventDate);
        weekStart.setDate(eventDate.getDate() - eventDate.getDay());
        periodKey = weekStart.toISOString().split('T')[0];
      } else {
        periodKey = `${eventDate.getFullYear()}-${String(eventDate.getMonth() + 1).padStart(2, '0')}`;
      }

      // Aggregate data
      const current = dataByPeriod.get(periodKey) || { revenue: 0, ticketsSold: 0, events: 0 };
      current.revenue += event.totalRevenue || 0;
      current.ticketsSold += event.totalSold || 0;
      current.events += 1;
      dataByPeriod.set(periodKey, current);
    });

    // Convert to array and sort
    const result: EventRevenueData[] = Array.from(dataByPeriod.entries())
      .map(([date, data]) => ({
        date,
        revenue: data.revenue,
        ticketsSold: data.ticketsSold,
        events: data.events,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return result;
  } catch (error) {
    console.error('Error getting revenue evolution:', error);
    throw new Error('Failed to calculate revenue evolution');
  }
}

// ========================
// EVENT TYPE ANALYTICS
// ========================

/**
 * Get event type distribution and performance
 */
export async function getEventTypeDistribution(): Promise<EventTypeDistribution[]> {
  try {
    const eventsRef = collection(db, EVENTS_COLLECTION);
    const eventsSnapshot = await getDocs(eventsRef);

    const typeData = new Map<
      string,
      { count: number; revenue: number; ticketsSold: number; totalCapacity: number; totalSold: number }
    >();

    eventsSnapshot.forEach((doc) => {
      const event = doc.data() as Event;

      const current = typeData.get(event.type) || {
        count: 0,
        revenue: 0,
        ticketsSold: 0,
        totalCapacity: 0,
        totalSold: 0,
      };

      current.count += 1;
      current.revenue += event.totalRevenue || 0;
      current.ticketsSold += event.totalSold || 0;
      current.totalCapacity += event.totalCapacity;
      current.totalSold += event.totalSold;

      typeData.set(event.type, current);
    });

    const result: EventTypeDistribution[] = Array.from(typeData.entries()).map(([type, data]) => ({
      type: type as any,
      count: data.count,
      revenue: data.revenue,
      ticketsSold: data.ticketsSold,
      averageOccupancy: data.totalCapacity > 0 ? (data.totalSold / data.totalCapacity) * 100 : 0,
    }));

    return result.sort((a, b) => b.revenue - a.revenue);
  } catch (error) {
    console.error('Error getting event type distribution:', error);
    throw new Error('Failed to calculate event type distribution');
  }
}

// ========================
// TOP EVENTS
// ========================

/**
 * Get top performing events
 */
export async function getTopEvents(limit: number = 10): Promise<TopEvent[]> {
  try {
    const eventsRef = collection(db, EVENTS_COLLECTION);
    const eventsSnapshot = await getDocs(eventsRef);

    const events: TopEvent[] = [];

    eventsSnapshot.forEach((doc) => {
      const event = doc.data() as Event;

      // Skip events without a valid startDate
      if (!event.startDate) return;

      const occupancyRate = event.totalCapacity > 0 ? (event.totalSold / event.totalCapacity) * 100 : 0;
      const attendanceRate = event.totalSold > 0 ? (event.totalCheckedIn / event.totalSold) * 100 : 0;

      events.push({
        id: doc.id,
        title: event.title,
        type: event.type,
        startDate: event.startDate,
        ticketsSold: event.totalSold,
        revenue: event.totalRevenue,
        occupancyRate,
        attendanceRate,
      });
    });

    // Sort by revenue and limit
    return events.sort((a, b) => b.revenue - a.revenue).slice(0, limit);
  } catch (error) {
    console.error('Error getting top events:', error);
    throw new Error('Failed to get top events');
  }
}

// ========================
// ATTENDEE ANALYTICS
// ========================

/**
 * Get attendee profile analytics
 */
export async function getAttendeeProfile(): Promise<AttendeeProfile> {
  try {
    // Get all events
    const eventsRef = collection(db, EVENTS_COLLECTION);
    const eventsSnapshot = await getDocs(eventsRef);

    // Collect all unique user IDs from purchases
    const userIds = new Set<string>();
    const userEventCounts = new Map<string, number>();

    for (const eventDoc of eventsSnapshot.docs) {
      const purchasesRef = collection(
        db,
        EVENTS_COLLECTION,
        eventDoc.id,
        PURCHASES_SUBCOLLECTION
      );
      const purchasesSnapshot = await getDocs(purchasesRef);

      purchasesSnapshot.forEach((purchaseDoc) => {
        const purchase = purchaseDoc.data() as EventPurchase;
        userIds.add(purchase.userId);

        const currentCount = userEventCounts.get(purchase.userId) || 0;
        userEventCounts.set(purchase.userId, currentCount + 1);
      });
    }

    // Get user details
    const usersRef = collection(db, USERS_COLLECTION);
    const usersSnapshot = await getDocs(usersRef);

    const ages: number[] = [];
    const membershipCounts: Record<MembershipType, number> = {
      monthly: 0,
      annual: 0,
      lifetime: 0,
    };
    const cityCounts = new Map<string, number>();

    usersSnapshot.forEach((userDoc) => {
      const user = userDoc.data() as User;

      // Only count users who have purchased tickets
      if (!userIds.has(userDoc.id)) return;

      // Age
      if (user.birthDate) {
        const age = calculateAge(user.birthDate);
        if (age > 0) ages.push(age);
      }

      // Membership
      if (user.currentMembership && user.currentMembership.planType) {
        membershipCounts[user.currentMembership.planType]++;
      }

      // City
      if (user.postalCode) {
        const count = cityCounts.get(user.postalCode) || 0;
        cityCounts.set(user.postalCode, count + 1);
      }
    });

    // Calculate age statistics
    const averageAge = ages.length > 0 ? ages.reduce((a, b) => a + b, 0) / ages.length : 0;
    const ageDistribution = groupByAgeRange(ages);

    // Get top cities
    const topCities = Array.from(cityCounts.entries())
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Calculate repeat attendee rate
    let repeatAttendees = 0;
    userEventCounts.forEach((count) => {
      if (count > 1) repeatAttendees++;
    });
    const repeatAttendeeRate =
      userIds.size > 0 ? (repeatAttendees / userIds.size) * 100 : 0;

    // Calculate average events per user
    const totalEventCount = Array.from(userEventCounts.values()).reduce((a, b) => a + b, 0);
    const averageEventsPerUser = userIds.size > 0 ? totalEventCount / userIds.size : 0;

    return {
      averageAge,
      ageDistribution,
      membershipDistribution: membershipCounts,
      topCities,
      repeatAttendeeRate,
      averageEventsPerUser,
    };
  } catch (error) {
    console.error('Error getting attendee profile:', error);
    throw new Error('Failed to calculate attendee profile');
  }
}

// ========================
// EVENT DETAIL STATS
// ========================

/**
 * Get detailed statistics for a specific event
 */
export async function getEventDetailStats(eventId: string): Promise<EventDetailStats> {
  try {
    // Get event
    const eventsRef = collection(db, EVENTS_COLLECTION);
    const eventDoc = await getDocs(query(eventsRef, where('__name__', '==', eventId)));

    if (eventDoc.empty) {
      throw new Error('Event not found');
    }

    const event = eventDoc.docs[0].data() as Event;

    // Get all purchases
    const purchasesRef = collection(db, EVENTS_COLLECTION, eventId, PURCHASES_SUBCOLLECTION);
    const purchasesSnapshot = await getDocs(purchasesRef);

    const purchases: EventPurchase[] = purchasesSnapshot.docs.map((doc) => doc.data() as EventPurchase);

    // Sales by category
    const salesByCategory = new Map<
      string,
      { categoryName: string; sold: number; revenue: number; capacity: number }
    >();

    event.ticketCategories.forEach((cat) => {
      salesByCategory.set(cat.id, {
        categoryName: cat.name,
        sold: 0,
        revenue: 0,
        capacity: cat.capacity,
      });
    });

    purchases.forEach((purchase) => {
      const catData = salesByCategory.get(purchase.ticketCategoryId);
      if (catData) {
        catData.sold += purchase.quantity;
        catData.revenue += purchase.totalPrice;
      }
    });

    const salesByCategoryArray = Array.from(salesByCategory.entries()).map(([id, data]) => ({
      categoryId: id,
      categoryName: data.categoryName,
      sold: data.sold,
      revenue: data.revenue,
      occupancyRate: data.capacity > 0 ? (data.sold / data.capacity) * 100 : 0,
    }));

    // Sales timeline
    const salesTimeline = new Map<string, { sales: number; revenue: number }>();
    purchases.forEach((purchase) => {
      const date = toDate(purchase.createdAt);
      if (!date) return;

      const dateKey = date.toISOString().split('T')[0];
      const current = salesTimeline.get(dateKey) || { sales: 0, revenue: 0 };
      current.sales += purchase.quantity;
      current.revenue += purchase.totalPrice;
      salesTimeline.set(dateKey, current);
    });

    const salesTimelineArray = Array.from(salesTimeline.entries())
      .map(([date, data]) => ({
        date,
        sales: data.sales,
        revenue: data.revenue,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Demographics
    const userIds = purchases.map((p) => p.userId);
    const usersRef = collection(db, USERS_COLLECTION);
    const usersSnapshot = await getDocs(usersRef);

    const ages: number[] = [];
    const membershipCounts: Record<MembershipType, number> = { monthly: 0, annual: 0, lifetime: 0 };
    const cityCounts = new Map<string, number>();

    usersSnapshot.forEach((userDoc) => {
      if (!userIds.includes(userDoc.id)) return;

      const user = userDoc.data() as User;

      if (user.birthDate) {
        const age = calculateAge(user.birthDate);
        if (age > 0) ages.push(age);
      }

      if (user.currentMembership && user.currentMembership.planType) {
        membershipCounts[user.currentMembership.planType]++;
      }

      if (user.postalCode) {
        const count = cityCounts.get(user.postalCode) || 0;
        cityCounts.set(user.postalCode, count + 1);
      }
    });

    const averageAge = ages.length > 0 ? ages.reduce((a, b) => a + b, 0) / ages.length : 0;
    const ageDistribution = groupByAgeRange(ages);
    const topCities = Array.from(cityCounts.entries())
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Revenue breakdown
    const revenueByPaymentMethod: Record<string, number> = {};
    let refundedAmount = 0;

    purchases.forEach((purchase) => {
      if (purchase.paymentMethod) {
        revenueByPaymentMethod[purchase.paymentMethod] =
          (revenueByPaymentMethod[purchase.paymentMethod] || 0) + purchase.totalPrice;
      }

      if (purchase.status === 'refunded' && purchase.refundAmount) {
        refundedAmount += purchase.refundAmount;
      }
    });

    const netRevenue = event.totalRevenue - refundedAmount;

    // Attendance
    const totalCheckedIn = purchases.filter((p) => p.checkedIn).reduce((sum, p) => sum + p.quantity, 0);
    const checkInRate = event.totalSold > 0 ? (totalCheckedIn / event.totalSold) * 100 : 0;

    return {
      eventId,
      totalSold: event.totalSold,
      totalRevenue: event.totalRevenue,
      occupancyRate: event.totalCapacity > 0 ? (event.totalSold / event.totalCapacity) * 100 : 0,
      salesByCategory: salesByCategoryArray,
      salesTimeline: salesTimelineArray,
      demographics: {
        averageAge,
        ageDistribution,
        membershipDistribution: membershipCounts,
        topCities,
      },
      totalCheckedIn,
      checkInRate,
      revenueByPaymentMethod,
      refundedAmount,
      netRevenue,
    };
  } catch (error) {
    console.error('Error getting event detail stats:', error);
    throw new Error('Failed to calculate event detail stats');
  }
}

// ========================
// HELPER ANALYTICS
// ========================
// NOTE: These functions are commented out because they cause Firebase
// "Too many outstanding requests" errors by iterating over ALL events
// and fetching ALL their purchases subcollections.
// Keep for reference - can be used on-demand if needed.

/*
async function calculateRepeatAttendeeRate(): Promise<number> {
  try {
    const eventsRef = collection(db, EVENTS_COLLECTION);
    const eventsSnapshot = await getDocs(eventsRef);

    const userEventCounts = new Map<string, number>();

    for (const eventDoc of eventsSnapshot.docs) {
      const purchasesRef = collection(
        db,
        EVENTS_COLLECTION,
        eventDoc.id,
        PURCHASES_SUBCOLLECTION
      );
      const purchasesSnapshot = await getDocs(purchasesRef);

      purchasesSnapshot.forEach((purchaseDoc) => {
        const purchase = purchaseDoc.data() as EventPurchase;
        const currentCount = userEventCounts.get(purchase.userId) || 0;
        userEventCounts.set(purchase.userId, currentCount + 1);
      });
    }

    let repeatAttendees = 0;
    userEventCounts.forEach((count) => {
      if (count > 1) repeatAttendees++;
    });

    const totalUsers = userEventCounts.size;
    return totalUsers > 0 ? (repeatAttendees / totalUsers) * 100 : 0;
  } catch (error) {
    console.error('Error calculating repeat attendee rate:', error);
    return 0;
  }
}

async function calculateAverageTicketsPerUser(): Promise<number> {
  try {
    const eventsRef = collection(db, EVENTS_COLLECTION);
    const eventsSnapshot = await getDocs(eventsRef);

    const userTicketCounts = new Map<string, number>();

    for (const eventDoc of eventsSnapshot.docs) {
      const purchasesRef = collection(
        db,
        EVENTS_COLLECTION,
        eventDoc.id,
        PURCHASES_SUBCOLLECTION
      );
      const purchasesSnapshot = await getDocs(purchasesRef);

      purchasesSnapshot.forEach((purchaseDoc) => {
        const purchase = purchaseDoc.data() as EventPurchase;
        const currentCount = userTicketCounts.get(purchase.userId) || 0;
        userTicketCounts.set(purchase.userId, currentCount + purchase.quantity);
      });
    }

    const totalTickets = Array.from(userTicketCounts.values()).reduce((a, b) => a + b, 0);
    const totalUsers = userTicketCounts.size;

    return totalUsers > 0 ? totalTickets / totalUsers : 0;
  } catch (error) {
    console.error('Error calculating average tickets per user:', error);
    return 0;
  }
}
*/


// ========================
// EXPORT
// ========================

export {
  toDate,
  calculateAge,
  groupByAgeRange,
  getDateRange,
};
