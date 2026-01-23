import { useState, useEffect, useMemo } from 'react';
import { Title, Text, Group, Box } from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import { useAdminAuth } from '../../../shared/contexts/AdminAuthContext';
import {
  getAllTickets,
  getTicketStats,
} from '../../../shared/services/ticketService';
import type { Ticket, TicketStats } from '../../../shared/types/ticket';
import {
  TicketStatus,
  TicketType,
  TicketPriority,
} from '../../../shared/types/ticket';

// Components
import { TicketsSidebar } from './components/TicketsSidebar';
import { TicketsList } from './components/TicketsList';

export function TicketsListPage() {
  const navigate = useNavigate();
  const { adminProfile } = useAdminAuth();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<TicketStats | null>(null);
  const [loading, setLoading] = useState(true);

  // View State
  const [activeView, setActiveView] = useState<string>('active');
  const [searchQuery, setSearchQuery] = useState('');

  // Sidebar Filters
  const [selectedPriorities, setSelectedPriorities] = useState<TicketPriority[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<TicketType[]>([]);

  // Load Data
  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [ticketsData, statsData] = await Promise.all([
        getAllTickets({}),
        getTicketStats(),
      ]);

      setTickets(ticketsData);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading tickets:', error);
      notifications.show({ title: 'Erreur', message: 'Impossible de charger les tickets', color: 'red' });
    } finally {
      setLoading(false);
    }
  }

  // Filter Logic
  const filteredTickets = useMemo(() => {
    return tickets.filter(ticket => {
      // 1. View Filter
      if (activeView === 'active') {
        if (ticket.status !== TicketStatus.OPEN && ticket.status !== TicketStatus.IN_PROGRESS) return false;
      } else if (activeView === 'waiting') {
        if (ticket.status !== TicketStatus.WAITING_FOR_USER) return false;
      } else if (activeView === 'processed') {
        if (ticket.status !== TicketStatus.RESOLVED && ticket.status !== TicketStatus.CLOSED) return false;
      }

      // 2. Sidebar Filters
      if (selectedPriorities.length > 0 && !selectedPriorities.includes(ticket.priority)) return false;
      if (selectedTypes.length > 0 && !selectedTypes.includes(ticket.type)) return false;

      // 3. Search
      if (searchQuery) {
        const search = searchQuery.toLowerCase();
        return (
          ticket.ticketNumber.toLowerCase().includes(search) ||
          ticket.subject.toLowerCase().includes(search) ||
          ticket.userName.toLowerCase().includes(search) ||
          ticket.userEmail.toLowerCase().includes(search)
        );
      }

      return true;
    }).sort((a, b) => {
      const dateA = a.updatedAt?.toDate ? a.updatedAt.toDate() : (a.updatedAt ? new Date(a.updatedAt as unknown as string) : new Date(0));
      const dateB = b.updatedAt?.toDate ? b.updatedAt.toDate() : (b.updatedAt ? new Date(b.updatedAt as unknown as string) : new Date(0));
      return dateB.getTime() - dateA.getTime();
    });
  }, [tickets, activeView, selectedPriorities, selectedTypes, searchQuery]);

  // Dynamic counts for sidebar badges
  const viewCounts = useMemo(() => ({
    active: tickets.filter(t => t.status === TicketStatus.OPEN || t.status === TicketStatus.IN_PROGRESS).length,
    waiting: tickets.filter(t => t.status === TicketStatus.WAITING_FOR_USER).length,
    processed: tickets.filter(t => t.status === TicketStatus.RESOLVED || t.status === TicketStatus.CLOSED).length,
    unread: stats?.unreadCount || 0
  }), [tickets, stats]);

  // Suppress unused var warning
  void adminProfile;

  return (
    <Box
      style={{
        height: 'calc(100vh - 60px)',
        display: 'flex',
        flexDirection: 'column',
        padding: 'var(--mantine-spacing-md)',
        paddingTop: 'var(--mantine-spacing-lg)',
      }}
    >
      <Group justify="space-between" mb="md">
        <div>
          <Title order={2}>Support</Title>
          <Text c="dimmed" size="sm">Inbox centralisee</Text>
        </div>
      </Group>

      {/* Main Grid takes remaining height */}
      <Box style={{ flex: 1, display: 'flex', gap: 'var(--mantine-spacing-md)', minHeight: 0 }}>

        {/* Sidebar Navigation - Fixed width */}
        <Box style={{ width: 280, flexShrink: 0 }}>
          <TicketsSidebar
            activeView={activeView}
            onViewChange={setActiveView}
            counts={viewCounts}
            selectedPriorities={selectedPriorities}
            onPriorityChange={setSelectedPriorities}
            selectedTypes={selectedTypes}
            onTypeChange={setSelectedTypes}
          />
        </Box>

        {/* Main Inbox List - Takes remaining space */}
        <Box style={{ flex: 1, minWidth: 0, minHeight: 0 }}>
          <TicketsList
            tickets={filteredTickets}
            loading={loading}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onRefresh={loadData}
            onViewTicket={(id) => navigate(`/admin/tickets/${id}`)}
          />
        </Box>
      </Box>
    </Box>
  );
}
