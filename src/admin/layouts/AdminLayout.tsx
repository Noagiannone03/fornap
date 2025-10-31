import { AppShell, Burger, Group, Text, Avatar, Menu, ActionIcon, Indicator, ScrollArea, UnstyledButton, rem, Collapse } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconDashboard,
  IconUsers,
  IconTicket,
  IconCalendar,
  IconBuildingCommunity,
  IconSettings,
  IconLogout,
  IconBell,
  IconSearch,
  IconChartBar,
  IconChevronDown,
  IconChevronRight,
  IconCurrencyEuro,
  IconMapPin,
  IconHeart,
} from '@tabler/icons-react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';

interface SubMenuItem {
  icon: React.ComponentType<any>;
  label: string;
  path: string;
}

interface NavItem {
  icon: React.ComponentType<any>;
  label: string;
  path: string;
  badge?: number;
  submenu?: SubMenuItem[];
}

const navigationItems: NavItem[] = [
  { icon: IconDashboard, label: 'Dashboard', path: '/admin/dashboard' },
  { icon: IconUsers, label: 'Utilisateurs', path: '/admin/users' },
  { icon: IconTicket, label: 'Abonnements', path: '/admin/memberships' },
  { icon: IconCalendar, label: 'Événements', path: '/admin/events' },
  { icon: IconBuildingCommunity, label: 'Coworking', path: '/admin/coworking' },
  {
    icon: IconChartBar,
    label: 'Analytics',
    path: '/admin/analytics',
    submenu: [
      { icon: IconDashboard, label: 'Vue d\'ensemble', path: '/admin/analytics/overview' },
      { icon: IconCurrencyEuro, label: 'Comptabilité', path: '/admin/analytics/financial' },
      { icon: IconMapPin, label: 'Démographie', path: '/admin/analytics/demographics' },
      { icon: IconHeart, label: 'Engagement', path: '/admin/analytics/engagement' },
      { icon: IconCalendar, label: 'Événements', path: '/admin/analytics/events' },
    ],
  },
  { icon: IconSettings, label: 'Paramètres', path: '/admin/settings' },
];

export function AdminLayout() {
  const [mobileOpened, { toggle: toggleMobile }] = useDisclosure();
  const [desktopOpened, { toggle: toggleDesktop }] = useDisclosure(true);
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigation = (path: string) => {
    navigate(path);
    if (mobileOpened) toggleMobile();
  };

  const toggleSubmenu = (label: string) => {
    setOpenSubmenu(openSubmenu === label ? null : label);
  };

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 280,
        breakpoint: 'sm',
        collapsed: { mobile: !mobileOpened, desktop: !desktopOpened },
      }}
      padding="md"
    >
      {/* Header */}
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={mobileOpened} onClick={toggleMobile} hiddenFrom="sm" size="sm" />
            <Burger opened={desktopOpened} onClick={toggleDesktop} visibleFrom="sm" size="sm" />
            <Text size="xl" fw={700} c="indigo">
              FORNAP Admin
            </Text>
          </Group>

          <Group>
            {/* Search */}
            <ActionIcon variant="subtle" size="lg" aria-label="Search">
              <IconSearch style={{ width: rem(20) }} />
            </ActionIcon>

            {/* Notifications */}
            <Indicator inline processing color="red" size={8}>
              <ActionIcon variant="subtle" size="lg" aria-label="Notifications">
                <IconBell style={{ width: rem(20) }} />
              </ActionIcon>
            </Indicator>

            {/* User Menu */}
            <Menu shadow="md" width={200}>
              <Menu.Target>
                <UnstyledButton>
                  <Group gap="xs">
                    <Avatar color="indigo" radius="xl" size="sm">
                      A
                    </Avatar>
                    <Text size="sm" fw={500}>
                      Admin
                    </Text>
                  </Group>
                </UnstyledButton>
              </Menu.Target>

              <Menu.Dropdown>
                <Menu.Label>Administration</Menu.Label>
                <Menu.Item leftSection={<IconSettings style={{ width: rem(14) }} />}>
                  Paramètres
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item
                  color="red"
                  leftSection={<IconLogout style={{ width: rem(14) }} />}
                  onClick={() => navigate('/admin/logout')}
                >
                  Déconnexion
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      </AppShell.Header>

      {/* Navbar */}
      <AppShell.Navbar p="md">
        <AppShell.Section grow component={ScrollArea}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              const isSubmenuOpen = openSubmenu === item.label;
              const isInSubmenuPath = item.submenu?.some(sub => location.pathname === sub.path);

              if (item.submenu) {
                // Menu avec sous-menu
                return (
                  <div key={item.path}>
                    <UnstyledButton
                      onClick={() => toggleSubmenu(item.label)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        backgroundColor: isInSubmenuPath ? 'var(--mantine-color-indigo-light)' : 'transparent',
                        color: isInSubmenuPath ? 'var(--mantine-color-indigo-filled)' : 'var(--mantine-color-text)',
                        fontWeight: isInSubmenuPath ? 600 : 400,
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        if (!isInSubmenuPath) {
                          e.currentTarget.style.backgroundColor = 'var(--mantine-color-gray-light)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isInSubmenuPath) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }
                      }}
                    >
                      <Group justify="space-between" style={{ width: '100%' }}>
                        <Group gap="sm">
                          <Icon size={20} stroke={1.5} />
                          <Text size="sm">{item.label}</Text>
                        </Group>
                        {isSubmenuOpen ? (
                          <IconChevronDown size={16} />
                        ) : (
                          <IconChevronRight size={16} />
                        )}
                      </Group>
                    </UnstyledButton>

                    <Collapse in={isSubmenuOpen}>
                      <div style={{ paddingLeft: '20px', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {item.submenu.map((subItem) => {
                          const SubIcon = subItem.icon;
                          const isSubActive = location.pathname === subItem.path;

                          return (
                            <UnstyledButton
                              key={subItem.path}
                              onClick={() => handleNavigation(subItem.path)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                width: '100%',
                                padding: '8px 12px',
                                borderRadius: '6px',
                                backgroundColor: isSubActive ? 'var(--mantine-color-indigo-light)' : 'transparent',
                                color: isSubActive ? 'var(--mantine-color-indigo-filled)' : 'var(--mantine-color-text)',
                                fontWeight: isSubActive ? 600 : 400,
                                transition: 'all 0.2s',
                              }}
                              onMouseEnter={(e) => {
                                if (!isSubActive) {
                                  e.currentTarget.style.backgroundColor = 'var(--mantine-color-gray-light)';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isSubActive) {
                                  e.currentTarget.style.backgroundColor = 'transparent';
                                }
                              }}
                            >
                              <Group gap="sm">
                                <SubIcon size={18} stroke={1.5} />
                                <Text size="sm">{subItem.label}</Text>
                              </Group>
                            </UnstyledButton>
                          );
                        })}
                      </div>
                    </Collapse>
                  </div>
                );
              }

              // Menu sans sous-menu
              return (
                <UnstyledButton
                  key={item.path}
                  onClick={() => handleNavigation(item.path)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    backgroundColor: isActive ? 'var(--mantine-color-indigo-light)' : 'transparent',
                    color: isActive ? 'var(--mantine-color-indigo-filled)' : 'var(--mantine-color-text)',
                    fontWeight: isActive ? 600 : 400,
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'var(--mantine-color-gray-light)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <Group justify="space-between" style={{ width: '100%' }}>
                    <Group gap="sm">
                      <Icon size={20} stroke={1.5} />
                      <Text size="sm">{item.label}</Text>
                    </Group>
                    {item.badge && (
                      <div
                        style={{
                          backgroundColor: 'var(--mantine-color-red-filled)',
                          color: 'white',
                          borderRadius: '12px',
                          padding: '2px 8px',
                          fontSize: '12px',
                          fontWeight: 600,
                        }}
                      >
                        {item.badge}
                      </div>
                    )}
                  </Group>
                </UnstyledButton>
              );
            })}
          </div>
        </AppShell.Section>

        <AppShell.Section>
          <div
            style={{
              padding: '12px',
              borderTop: '1px solid var(--mantine-color-gray-3)',
              marginTop: '12px',
            }}
          >
            <Text size="xs" c="dimmed" ta="center">
              Version 1.0.0
            </Text>
          </div>
        </AppShell.Section>
      </AppShell.Navbar>

      {/* Main Content */}
      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
