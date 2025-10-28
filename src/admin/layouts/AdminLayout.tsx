import { AppShell, Burger, Group, Text, Avatar, Menu, ActionIcon, Indicator, ScrollArea, UnstyledButton, rem } from '@mantine/core';
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
  IconSearch
} from '@tabler/icons-react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';

interface NavItem {
  icon: React.ComponentType<any>;
  label: string;
  path: string;
  badge?: number;
}

const navigationItems: NavItem[] = [
  { icon: IconDashboard, label: 'Dashboard', path: '/admin/dashboard' },
  { icon: IconUsers, label: 'Utilisateurs', path: '/admin/users' },
  { icon: IconTicket, label: 'Abonnements', path: '/admin/memberships' },
  { icon: IconCalendar, label: 'Événements', path: '/admin/events' },
  { icon: IconBuildingCommunity, label: 'Coworking', path: '/admin/coworking' },
  { icon: IconSettings, label: 'Paramètres', path: '/admin/settings' },
];

export function AdminLayout() {
  const [mobileOpened, { toggle: toggleMobile }] = useDisclosure();
  const [desktopOpened, { toggle: toggleDesktop }] = useDisclosure(true);
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigation = (path: string) => {
    navigate(path);
    if (mobileOpened) toggleMobile();
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
