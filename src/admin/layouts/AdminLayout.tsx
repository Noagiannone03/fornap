import { AppShell, Burger, Group, Text, Avatar, Menu, ActionIcon, Indicator, ScrollArea, UnstyledButton, rem, Collapse, Badge, Box, NavLink, TextInput, Tooltip, ThemeIcon } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useMediaQuery } from '@mantine/hooks';
import {
  IconSearch,
  IconBell,
  IconChevronDown,
  IconChevronRight,
  IconUser,
  IconSettings,
  IconLogout,
  IconCommand,
  IconLayoutDashboard
} from '@tabler/icons-react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAdminAuth } from '../../shared/contexts/AdminAuthContext';
import { notifications } from '@mantine/notifications';
import { ADMIN_ROLES_CONFIG, AdminRole } from '../../shared/types/admin';
import { AIAssistantDrawer } from '../components/AIAssistant';
import { GlobalSearch } from '../components/GlobalSearch';
import { navigationItems } from '../config/navigation';
import { spotlight } from '@mantine/spotlight';
import { MaintenanceScreen } from '../components/MaintenanceScreen';
import type { MaintenanceConfig } from '../../shared/services/maintenanceService';
import { subscribeToMaintenanceStatus } from '../../shared/services/maintenanceService';

export function AdminLayout() {
  const [mobileOpened, { toggle: toggleMobile, close: closeMobile }] = useDisclosure();
  const [desktopOpened, { toggle: toggleDesktop, close: closeDesktop }] = useDisclosure(true);
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);
  const [aiSidebarOpened, setAiSidebarOpened] = useState(false);
  const [maintenanceConfig, setMaintenanceConfig] = useState<MaintenanceConfig | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { adminProfile, logout, checkPermission } = useAdminAuth();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isTablet = useMediaQuery('(max-width: 1024px)');

  // S'abonner aux changements de mode maintenance
  useEffect(() => {
    const unsubscribe = subscribeToMaintenanceStatus((config) => {
      setMaintenanceConfig(config);
    });
    return () => unsubscribe();
  }, []);

  // Vérifier si l'utilisateur doit voir l'écran de maintenance
  const shouldShowMaintenanceScreen =
    maintenanceConfig?.enabled &&
    adminProfile &&
    adminProfile.role !== AdminRole.DEVELOPPEUR;

  // Gérer l'ouverture de la sidebar gauche - ferme le panel IA
  const handleToggleDesktop = () => {
    if (!desktopOpened && aiSidebarOpened) {
      setAiSidebarOpened(false);
    }
    toggleDesktop();
  };

  const handleToggleMobile = () => {
    if (!mobileOpened && aiSidebarOpened) {
      setAiSidebarOpened(false);
    }
    toggleMobile();
  };

  // Gérer l'ouverture du panel IA - ferme la sidebar gauche si besoin
  const handleAiSidebarChange = (opened: boolean) => {
    if (opened) {
      if (desktopOpened) closeDesktop();
      if (mobileOpened) closeMobile();
    }
    setAiSidebarOpened(opened);
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    if (mobileOpened) toggleMobile();
  };

  const toggleSubmenu = (label: string) => {
    setOpenSubmenu(openSubmenu === label ? null : label);
  };

  const handleLogout = async () => {
    try {
      await logout();
      notifications.show({
        title: 'Déconnexion réussie',
        message: 'À bientôt !',
        color: 'green',
      });
      navigate('/admin/login', { replace: true });
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur lors de la déconnexion',
        color: 'red',
      });
    }
  };

  const getInitials = () => {
    if (!adminProfile) return 'A';
    return `${adminProfile.firstName.charAt(0)}${adminProfile.lastName.charAt(0)}`.toUpperCase();
  };

  const getFullName = () => {
    if (!adminProfile) return 'Admin';
    return `${adminProfile.firstName} ${adminProfile.lastName}`;
  };

  const getRoleInfo = () => {
    if (!adminProfile) return null;
    return ADMIN_ROLES_CONFIG[adminProfile.role];
  };

  const roleInfo = getRoleInfo();

  const filteredNavigationItems = navigationItems.filter((item) => {
    if (item.excludeRoles && adminProfile && item.excludeRoles.includes(adminProfile.role)) {
      return false;
    }
    if (!item.requiredPermission) {
      return true;
    }
    return checkPermission(item.requiredPermission);
  }).map((item) => {
    if (item.submenu) {
      return {
        ...item,
        submenu: item.submenu.filter((subItem) => {
          if (!subItem.requiredPermission) {
            return true;
          }
          return checkPermission(subItem.requiredPermission);
        }),
      };
    }
    return item;
  }).filter((item) => {
    if (item.submenu && item.submenu.length === 0) {
      return false;
    }
    return true;
  });

  if (shouldShowMaintenanceScreen && maintenanceConfig) {
    return <MaintenanceScreen config={maintenanceConfig} />;
  }

  const isDevWithMaintenanceActive =
    maintenanceConfig?.enabled &&
    adminProfile?.role === AdminRole.DEVELOPPEUR;

  return (
    <>
      <GlobalSearch />
      <AppShell
        header={{ height: 68 }}
        navbar={{
          width: 280,
          breakpoint: 'sm',
          collapsed: { mobile: !mobileOpened, desktop: !desktopOpened },
        }}
        padding={isMobile ? "md" : "xl"}
        bg="gray.0"
      >
        {/* Header */}
        <AppShell.Header
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid var(--mantine-color-gray-1)',
          }}
        >
          <Group h="100%" px="lg" justify="space-between" wrap="nowrap">
            <Group gap="lg">
              <Burger opened={mobileOpened} onClick={handleToggleMobile} hiddenFrom="sm" size="sm" />
              <Burger opened={desktopOpened} onClick={handleToggleDesktop} visibleFrom="sm" size="sm" />
              
              <Group gap="xs" align="center" style={{ userSelect: 'none' }}>
                <ThemeIcon size="lg" radius="md" variant="gradient" gradient={{ from: 'indigo', to: 'cyan' }}>
                    <IconLayoutDashboard size={20} />
                </ThemeIcon>
                <Text
                  size="xl"
                  fw={800}
                  variant="gradient"
                  gradient={{ from: 'indigo.9', to: 'indigo.6', deg: 45 }}
                  style={{ letterSpacing: '-0.5px' }}
                >
                  FORNAP
                </Text>
              </Group>

              {isDevWithMaintenanceActive && (
                <Badge
                  color="orange"
                  variant="light"
                  size="sm"
                  leftSection="🔧"
                >
                  Maintenance Mode
                </Badge>
              )}
            </Group>

            <Group gap="sm">
              {!isMobile ? (
                <UnstyledButton
                  onClick={() => spotlight.open()}
                  style={{
                    backgroundColor: 'var(--mantine-color-gray-0)',
                    border: '1px solid transparent',
                    borderRadius: 'var(--mantine-radius-md)',
                    padding: '8px 16px',
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    width: isTablet ? '200px' : '280px',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'white';
                    e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--mantine-color-gray-0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <IconSearch size={16} color="var(--mantine-color-dimmed)" />
                  <Text size="sm" c="dimmed" style={{ flex: 1 }}>Rechercher...</Text>
                  <Group gap={4}>
                     <IconCommand size={12} color="var(--mantine-color-dimmed)" />
                     <Text size="xs" c="dimmed" lh={1}>K</Text>
                  </Group>
                </UnstyledButton>
              ) : (
                <ActionIcon variant="light" size="lg" radius="md" onClick={() => spotlight.open()}>
                  <IconSearch size={20} />
                </ActionIcon>
              )}

              <Tooltip label="Notifications">
                <Indicator inline processing color="red" size={8} offset={4} withBorder>
                  <ActionIcon variant="transparent" c="gray.6" size="xl" radius="md" 
                    style={{ transition: 'color 0.2s' }}
                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--mantine-color-indigo-6)'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--mantine-color-gray-6)'}
                  >
                    <IconBell size={22} />
                  </ActionIcon>
                </Indicator>
              </Tooltip>

              <Menu shadow="xl" width={240} position="bottom-end" transitionProps={{ transition: 'pop-top-right' }}>
                <Menu.Target>
                  <UnstyledButton
                    style={{
                      padding: '2px',
                      borderRadius: '999px',
                      border: '2px solid white',
                      boxShadow: '0 0 0 2px var(--mantine-color-indigo-1)',
                      transition: 'box-shadow 0.2s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 0 0 2px var(--mantine-color-indigo-3)'}
                    onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 0 0 2px var(--mantine-color-indigo-1)'}
                  >
                    <Avatar src={null} color="indigo" radius="xl" size="md">
                      {getInitials()}
                    </Avatar>
                  </UnstyledButton>
                </Menu.Target>

                <Menu.Dropdown p="xs">
                  <Box px="sm" py="xs" mb="xs" style={{ backgroundColor: 'var(--mantine-color-gray-0)', borderRadius: '8px' }}>
                    <Text size="sm" fw={700} c="dark.9">{getFullName()}</Text>
                    <Text size="xs" c="indigo.6" fw={600}>{roleInfo?.label}</Text>
                  </Box>
                  <Menu.Item leftSection={<IconUser size={16} />} onClick={() => handleNavigation('/admin/settings')} style={{ borderRadius: '6px' }}>
                    Profil
                  </Menu.Item>
                  <Menu.Item leftSection={<IconSettings size={16} />} onClick={() => handleNavigation('/admin/settings')} style={{ borderRadius: '6px' }}>
                    Paramètres
                  </Menu.Item>
                  <Menu.Divider />
                  <Menu.Item color="red" leftSection={<IconLogout size={16} />} onClick={handleLogout} style={{ borderRadius: '6px' }}>
                    Déconnexion
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            </Group>
          </Group>
        </AppShell.Header>

        {/* Sidebar */}
        <AppShell.Navbar p="md" style={{ backgroundColor: 'white', borderRight: '1px solid var(--mantine-color-gray-1)' }}>
          <ScrollArea style={{ flex: 1 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {filteredNavigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path || (item.submenu && item.submenu.some(s => location.pathname === s.path));
                const hasSubmenu = !!item.submenu;

                if (hasSubmenu) {
                  return (
                    <NavLink
                      key={item.label}
                      label={
                        <Text size="sm" fw={isActive ? 600 : 500}>
                          {item.label}
                        </Text>
                      }
                      leftSection={
                        <ThemeIcon variant={isActive ? 'light' : 'transparent'} color={isActive ? 'indigo' : 'gray'} size="md">
                           <Icon size={18} stroke={1.5} />
                        </ThemeIcon>
                      }
                      childrenOffset={32}
                      active={isActive}
                      defaultOpened={isActive}
                      opened={openSubmenu === item.label || isActive}
                      onChange={(opened) => toggleSubmenu(opened ? item.label : '')}
                      color="indigo"
                      variant="light"
                      style={{ 
                        borderRadius: 'var(--mantine-radius-md)',
                        color: isActive ? 'var(--mantine-color-indigo-9)' : 'var(--mantine-color-gray-7)',
                      }}
                    >
                      {item.submenu?.map(sub => (
                        <NavLink
                          key={sub.label}
                          label={sub.label}
                          component="button"
                          onClick={() => handleNavigation(sub.path)}
                          active={location.pathname === sub.path}
                          style={{ 
                            borderRadius: 'var(--mantine-radius-md)', 
                            marginTop: 4,
                            fontSize: '0.9rem',
                            fontWeight: 500,
                            color: location.pathname === sub.path ? 'var(--mantine-color-indigo-7)' : 'var(--mantine-color-gray-6)'
                          }}
                        />
                      ))}
                    </NavLink>
                  );
                }

                return (
                  <NavLink
                    key={item.label}
                    label={
                      <Text size="sm" fw={isActive ? 600 : 500}>
                        {item.label}
                      </Text>
                    }
                    leftSection={
                        <ThemeIcon variant={isActive ? 'light' : 'transparent'} color={isActive ? 'indigo' : 'gray'} size="md">
                           <Icon size={18} stroke={1.5} />
                        </ThemeIcon>
                    }
                    active={isActive}
                    onClick={() => handleNavigation(item.path)}
                    color="indigo"
                    variant="light"
                    style={{ 
                      borderRadius: 'var(--mantine-radius-md)',
                      color: isActive ? 'var(--mantine-color-indigo-9)' : 'var(--mantine-color-gray-7)',
                    }}
                    rightSection={item.badge && (
                      <Badge size="xs" color="red" variant="filled" circle style={{ boxShadow: '0 2px 4px rgba(250, 82, 82, 0.4)' }}>
                        {item.badge}
                      </Badge>
                    )}
                  />
                );
              })}
            </div>
          </ScrollArea>

          <Box pt="md" mt="md" style={{ borderTop: '1px solid var(--mantine-color-gray-1)' }}>
            <Group justify="center">
               <Text size="xs" c="dimmed" fw={500} style={{ letterSpacing: '1px' }}>FORNAP ADMIN</Text>
            </Group>
          </Box>
        </AppShell.Navbar>

        {/* Main Content */}
        <AppShell.Main
          style={{
            transition: 'margin-right 0.3s ease',
            marginRight: aiSidebarOpened ? (isMobile ? '0' : '400px') : '0',
            backgroundColor: 'var(--mantine-color-gray-0)',
            backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(79, 70, 229, 0.03) 0%, transparent 40%)'
          }}
        >
          <Outlet />
        </AppShell.Main>

        <AIAssistantDrawer
          opened={aiSidebarOpened}
          onOpenChange={handleAiSidebarChange}
        />
      </AppShell>
    </>
  );
}