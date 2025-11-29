import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spotlight } from '@mantine/spotlight';
import type { SpotlightActionData } from '@mantine/spotlight';
import { 
  IconSearch, 
  IconUser, 
  IconCalendar, 
  IconArrowRight, 
  IconDashboard, 
  IconSettings, 
  IconChartBar, 
  IconPlus,
  IconCreditCard,
  IconScan
} from '@tabler/icons-react';
import { useDebouncedValue } from '@mantine/hooks';
import { Badge, Avatar, Loader, Center, Group, Text } from '@mantine/core';
import { navigationItems } from '../../config/navigation';
import type { NavItem } from '../../config/navigation';
import { searchUsers } from '../../../shared/services/userService';
import { searchEvents } from '../../../shared/services/eventService';
import classes from './GlobalSearch.module.css';

// Helper to wrap icon
const ActionIconWrapper = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <div className={`${classes.actionIcon} ${className}`}>
    {children}
  </div>
);

export function GlobalSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [debouncedQuery] = useDebouncedValue(query, 300);
  
  const [asyncActions, setAsyncActions] = useState<SpotlightActionData[]>([]);
  const [loading, setLoading] = useState(false);

  // 1. Navigation Actions (Static)
  const navActions = useMemo(() => {
    const actions: SpotlightActionData[] = [];
    
    const processItem = (item: NavItem) => {
      const ItemIcon = item.icon || IconArrowRight;
      actions.push({
        id: `nav-${item.path}`,
        label: item.label,
        description: `Aller à ${item.label}`,
        onClick: () => navigate(item.path),
        leftSection: (
          <ActionIconWrapper className={classes.iconNav}>
            <ItemIcon size={20} stroke={1.5} />
          </ActionIconWrapper>
        ),
        group: 'Navigation',
        keywords: [item.label, 'page', 'menu', 'admin']
      });

      if (item.submenu) {
        item.submenu.forEach((sub) => {
          const SubIcon = sub.icon || IconArrowRight;
          actions.push({
            id: `nav-${sub.path}`,
            label: sub.label,
            description: `Aller à ${sub.label}`,
            onClick: () => navigate(sub.path),
            leftSection: (
              <ActionIconWrapper className={classes.iconNav}>
                <SubIcon size={20} stroke={1.5} />
              </ActionIconWrapper>
            ),
            group: 'Navigation',
            keywords: [sub.label, item.label, 'page']
          });
        });
      }
    };
    navigationItems.forEach(processItem);
    return actions;
  }, [navigate]);

  // 2. Quick Commands (Static)
  const quickActions: SpotlightActionData[] = useMemo(() => [
    {
      id: 'cmd-scan',
      label: 'Scanner un QR Code',
      description: 'Ouvrir l\'interface de scan',
      onClick: () => navigate('/admin/scanner'),
      leftSection: <ActionIconWrapper className={classes.iconAction}><IconScan size={20} /></ActionIconWrapper>,
      group: 'Commandes Rapides',
    },
    {
        id: 'cmd-create-user',
        label: 'Nouvel Utilisateur',
        description: 'Créer un membre manuellement',
        onClick: () => navigate('/admin/users?create=true'),
        leftSection: <ActionIconWrapper className={classes.iconAction}><IconPlus size={20} /></ActionIconWrapper>,
        group: 'Commandes Rapides',
    },
    {
      id: 'cmd-stats',
      label: 'Vue d\'ensemble Analytics',
      description: 'Voir les statistiques globales',
      onClick: () => navigate('/admin/analytics'),
      leftSection: <ActionIconWrapper className={classes.iconAction}><IconChartBar size={20} /></ActionIconWrapper>,
      group: 'Commandes Rapides',
    }
  ], [navigate]);

  // 3. Fetch Async Data (Users & Events)
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.trim().length < 2) {
      setAsyncActions([]);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const [users, events] = await Promise.all([
          searchUsers(debouncedQuery),
          searchEvents(debouncedQuery)
        ]);

        const newActions: SpotlightActionData[] = [];

        // Users
        users.forEach(user => {
          newActions.push({
            id: `user-${user.uid}`,
            label: `${user.firstName} ${user.lastName}`,
            description: user.email,
            onClick: () => navigate(`/admin/users/${user.uid}`),
            leftSection: (
              <Avatar 
                color="blue" 
                radius="md" 
                size={40}
                className={classes.actionAvatar}
              >
                {user.firstName?.[0]}{user.lastName?.[0]}
              </Avatar>
            ),
            rightSection: (
              <Badge 
                size="xs" 
                variant="light" 
                color="blue"
                className={classes.actionBadge}
              >
                User
              </Badge>
            ),
            group: 'Utilisateurs',
          });
        });

        // Events
        events.forEach(event => {
          newActions.push({
            id: `event-${event.id}`,
            label: event.title,
            description: new Date(event.startDate.seconds * 1000).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }),
            onClick: () => navigate(`/admin/events/${event.id}`),
            leftSection: (
              <ActionIconWrapper className={classes.iconEvent}>
                <IconCalendar size={20} stroke={1.5} />
              </ActionIconWrapper>
            ),
            rightSection: (
              <Badge 
                size="xs" 
                variant="light" 
                color="orange"
                className={classes.actionBadge}
              >
                Event
              </Badge>
            ),
            group: 'Événements',
          });
        });

        setAsyncActions(newActions);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [debouncedQuery, navigate]);

  // 4. Combine Actions
  const actions = useMemo(() => {
    // Filter static actions locally
    const q = query.toLowerCase().trim();
    let staticFiltered = [...navActions, ...quickActions];
    
    if (q) {
      staticFiltered = staticFiltered.filter(a => 
        (a.label as string).toLowerCase().includes(q) || 
        (a.description as string).toLowerCase().includes(q) ||
        (a.keywords as string[])?.some(k => k.toLowerCase().includes(q))
      );
    }

    // Return combined list. 
    // If query is short (<2), we only show static. 
    // If query is long (>=2), we show filtered static + async results.
    if (q.length < 2) {
      return staticFiltered; 
    }
    
    return [...asyncActions, ...staticFiltered];
  }, [query, navActions, quickActions, asyncActions]);

  return (
    <Spotlight
      actions={actions}
      nothingFound="Aucun résultat trouvé dans la base de données"
      highlightQuery
      classNames={{
        content: classes.content,
        search: classes.search,
        action: classes.action,
        actionLabel: classes.actionLabel,
        actionDescription: classes.actionDescription,
        actionsGroup: classes.actionsGroup,
        actionSection: classes.actionSection,
        actionBody: classes.actionBody,
      }}
      searchProps={{
        placeholder: "Rechercher (ex: nom, email, événement, page...)",
        leftSection: <IconSearch size={22} stroke={1.5} />,
        rightSection: loading ? <Loader size={20} color="blue" /> : null,
        variant: 'unstyled',
        className: classes.searchInput,
      }}
      filter={(query, actions) => actions} // Disable internal filtering since we handle it
      query={query}
      onQueryChange={setQuery}
      scrollable
      limit={50}
      maxHeight={600}
    />
  );
}
