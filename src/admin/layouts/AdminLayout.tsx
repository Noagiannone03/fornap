import { AppShell, Burger, Group, Text, Avatar, Menu, ActionIcon, Indicator, ScrollArea, UnstyledButton, rem, Collapse, Badge, Box } from '@mantine/core';
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
} from '@tabler/icons-react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useAdminAuth } from '../../shared/contexts/AdminAuthContext';
import { notifications } from '@mantine/notifications';
import { ADMIN_ROLES_CONFIG } from '../../shared/types/admin';
import { AIAssistantDrawer } from '../components/AIAssistant';
import { GlobalSearch } from '../components/GlobalSearch';
import { navigationItems } from '../config/navigation';
import { spotlight } from '@mantine/spotlight';

export function AdminLayout() {
  const [mobileOpened, { toggle: toggleMobile, close: closeMobile }] = useDisclosure();
  const [desktopOpened, { toggle: toggleDesktop, close: closeDesktop }] = useDisclosure(true);
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);
  const [aiSidebarOpened, setAiSidebarOpened] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { adminProfile, logout, checkPermission } = useAdminAuth();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isTablet = useMediaQuery('(max-width: 1024px)');

  // Gérer l'ouverture de la sidebar gauche - ferme le panel IA
  const handleToggleDesktop = () => {
    if (!desktopOpened && aiSidebarOpened) {
      // Si on ouvre la sidebar et que l'IA est ouverte, fermer l'IA
      setAiSidebarOpened(false);
    }
    toggleDesktop();
  };

  const handleToggleMobile = () => {
    if (!mobileOpened && aiSidebarOpened) {
      // Si on ouvre la sidebar mobile et que l'IA est ouverte, fermer l'IA
      setAiSidebarOpened(false);
    }
    toggleMobile();
  };

  // Gérer l'ouverture du panel IA - ferme la sidebar gauche si besoin
  const handleAiSidebarChange = (opened: boolean) => {
    if (opened) {
      // Si on ouvre l'IA, fermer les sidebars gauche
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

  // Récupérer les initiales de l'admin
  const getInitials = () => {
    if (!adminProfile) return 'A';
    return `${adminProfile.firstName.charAt(0)}${adminProfile.lastName.charAt(0)}`.toUpperCase();
  };

  // Récupérer le nom complet
  const getFullName = () => {
    if (!adminProfile) return 'Admin';
    return `${adminProfile.firstName} ${adminProfile.lastName}`;
  };

  // Récupérer la config du rôle
  const getRoleInfo = () => {
    if (!adminProfile) return null;
    return ADMIN_ROLES_CONFIG[adminProfile.role];
  };

  const roleInfo = getRoleInfo();

  // Filtrer les éléments de navigation selon les permissions et exclusions de rôle
  const filteredNavigationItems = navigationItems.filter((item) => {
    // Si l'item exclut le rôle actuel, ne pas l'afficher
    if (item.excludeRoles && adminProfile && item.excludeRoles.includes(adminProfile.role)) {
      return false;
    }
    // Si l'item n'a pas de permission requise, il est accessible à tous
    if (!item.requiredPermission) {
      return true;
    }
    // Sinon, vérifier que l'utilisateur a la permission
    return checkPermission(item.requiredPermission);
  }).map((item) => {
    // Filtrer aussi les sous-menus si présents
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
    // Retirer les menus avec sous-menus vides
    if (item.submenu && item.submenu.length === 0) {
      return false;
    }
    return true;
  });

  return (
    <>
      <GlobalSearch />
      <AppShell
        header={{ height: isMobile ? 56 : 60 }}
        navbar={{
          width: isMobile ? 260 : 280,
          breakpoint: 'sm',
          collapsed: { mobile: !mobileOpened, desktop: !desktopOpened },
        }}
        padding={isMobile ? "xs" : "md"}
      >
        {/* Header */}
        <AppShell.Header>
          <Group h="100%" px={isMobile ? "xs" : "md"} justify="space-between" wrap="nowrap" gap={isMobile ? "xs" : "md"}>
            <Group gap={isMobile ? "xs" : "sm"} wrap="nowrap">
              <Burger opened={mobileOpened} onClick={handleToggleMobile} hiddenFrom="sm" size="sm" />
              <Burger opened={desktopOpened} onClick={handleToggleDesktop} visibleFrom="sm" size="sm" />
              <Text
                size={isMobile ? "md" : "xl"}
                fw={700}
                c="indigo"
                style={{ whiteSpace: 'nowrap' }}
              >
                {isMobile ? 'FORNAP' : 'FORNAP Admin'}
              </Text>
            </Group>

            <Group gap={isMobile ? "xs" : "sm"} wrap="nowrap">
              {/* Search Bar - Cachée sur mobile très petit, icône seulement sur tablette */}
              {!isMobile ? (
                <UnstyledButton
                  onClick={() => spotlight.open()}
                  style={{
                    backgroundColor: 'var(--mantine-color-gray-0)',
                    border: '1px solid var(--mantine-color-gray-3)',
                    borderRadius: '10px',
                    padding: '6px 16px',
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    width: isTablet ? '200px' : '320px',
                    transition: 'all 0.2s ease',
                    cursor: 'pointer',
                    minWidth: isTablet ? '150px' : 'auto',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--mantine-color-indigo-3)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)';
                    e.currentTarget.style.backgroundColor = 'var(--mantine-color-white)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--mantine-color-gray-3)';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.backgroundColor = 'var(--mantine-color-gray-0)';
                  }}
                >
                  <IconSearch size={18} stroke={2} color="var(--mantine-color-indigo-5)" />
                  {!isTablet && (
                    <>
                      <Text size="sm" c="dimmed" fw={500} style={{ flex: 1, userSelect: 'none', whiteSpace: 'nowrap' }}>
                        Rechercher partout...
                      </Text>
                      <Badge
                        variant="light"
                        color="gray"
                        size="sm"
                        radius="sm"
                        styles={{ root: { textTransform: 'none', fontSize: '10px', fontWeight: 700 } }}
                      >
                        ⌘ K
                      </Badge>
                    </>
                  )}
                </UnstyledButton>
              ) : (
                <ActionIcon
                  variant="subtle"
                  size="lg"
                  onClick={() => spotlight.open()}
                  aria-label="Rechercher"
                >
                  <IconSearch size={20} />
                </ActionIcon>
              )}

              {/* Notifications */}
              <Indicator inline processing color="red" size={8}>
                <ActionIcon variant="subtle" size={isMobile ? "md" : "lg"} aria-label="Notifications">
                  <IconBell style={{ width: rem(isMobile ? 18 : 20) }} />
                </ActionIcon>
              </Indicator>

              {/* User Menu */}
              <Menu shadow="md" width={260} position={isMobile ? "bottom-end" : "bottom"}>
                <Menu.Target>
                  <UnstyledButton style={{ cursor: 'pointer' }}>
                    <Group gap="xs" wrap="nowrap">
                      <Avatar color={roleInfo?.color || 'indigo'} radius="xl" size={isMobile ? "xs" : "sm"}>
                        {getInitials()}
                      </Avatar>
                      {!isMobile && (
                        <Box style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 0 }}>
                          <Text size="sm" fw={500} style={{ lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '120px' }}>
                            {getFullName()}
                          </Text>
                          {roleInfo && (
                            <Badge size="xs" color={roleInfo.color} variant="light">
                              {roleInfo.label}
                            </Badge>
                          )}
                        </Box>
                      )}
                    </Group>
                  </UnstyledButton>
                </Menu.Target>

                <Menu.Dropdown>
                  <Menu.Label>
                    <Group gap="xs">
                      <Text size="xs" fw={700}>
                        {adminProfile?.email}
                      </Text>
                    </Group>
                  </Menu.Label>
                  <Menu.Divider />
                  <Menu.Item
                    leftSection={<IconUser style={{ width: rem(14) }} />}
                    onClick={() => handleNavigation('/admin/settings')}
                  >
                    Mon profil
                  </Menu.Item>
                  <Menu.Item
                    leftSection={<IconSettings style={{ width: rem(14) }} />}
                    onClick={() => handleNavigation('/admin/settings')}
                  >
                    Paramètres
                  </Menu.Item>
                  <Menu.Divider />
                  <Menu.Item
                    color="red"
                    leftSection={<IconLogout style={{ width: rem(14) }} />}
                    onClick={handleLogout}
                  >
                    Déconnexion
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            </Group>
          </Group>
        </AppShell.Header>

        {/* Navbar */}
        <AppShell.Navbar p={isMobile ? "xs" : "md"}>
          <AppShell.Section grow component={ScrollArea}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '2px' : '4px' }}>
              {filteredNavigationItems.map((item) => {
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
                          padding: isMobile ? '12px 10px' : '10px 12px',
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
                        <Group justify="space-between" style={{ width: '100%' }} wrap="nowrap">
                          <Group gap={isMobile ? "xs" : "sm"} wrap="nowrap" style={{ minWidth: 0, flex: 1 }}>
                            <Icon size={isMobile ? 18 : 20} stroke={1.5} style={{ flexShrink: 0 }} />
                            <Text size={isMobile ? "xs" : "sm"} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {item.label}
                            </Text>
                          </Group>
                          {isSubmenuOpen ? (
                            <IconChevronDown size={isMobile ? 14 : 16} style={{ flexShrink: 0 }} />
                          ) : (
                            <IconChevronRight size={isMobile ? 14 : 16} style={{ flexShrink: 0 }} />
                          )}
                        </Group>
                      </UnstyledButton>

                      <Collapse in={isSubmenuOpen}>
                        <div style={{
                          paddingLeft: isMobile ? '16px' : '20px',
                          marginTop: '4px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '2px'
                        }}>
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
                                  padding: isMobile ? '10px 10px' : '8px 12px',
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
                                <Group gap={isMobile ? "xs" : "sm"} wrap="nowrap" style={{ minWidth: 0 }}>
                                  <SubIcon size={isMobile ? 16 : 18} stroke={1.5} style={{ flexShrink: 0 }} />
                                  <Text size={isMobile ? "xs" : "sm"} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {subItem.label}
                                  </Text>
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
                      padding: isMobile ? '12px 10px' : '10px 12px',
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
                    <Group justify="space-between" style={{ width: '100%' }} wrap="nowrap">
                      <Group gap={isMobile ? "xs" : "sm"} wrap="nowrap" style={{ minWidth: 0, flex: 1 }}>
                        <Icon size={isMobile ? 18 : 20} stroke={1.5} style={{ flexShrink: 0 }} />
                        <Text size={isMobile ? "xs" : "sm"} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.label}
                        </Text>
                      </Group>
                      {item.badge && (
                        <div
                          style={{
                            backgroundColor: 'var(--mantine-color-red-filled)',
                            color: 'white',
                            borderRadius: '12px',
                            padding: '2px 8px',
                            fontSize: isMobile ? '10px' : '12px',
                            fontWeight: 600,
                            flexShrink: 0,
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
                padding: isMobile ? '8px' : '12px',
                borderTop: '1px solid var(--mantine-color-gray-3)',
                marginTop: isMobile ? '8px' : '12px',
              }}
            >
              <Text size="xs" c="dimmed" ta="center">
                Version 1.0.0
              </Text>
            </div>
          </AppShell.Section>
        </AppShell.Navbar>

        {/* Main Content */}
        <AppShell.Main
          style={{
            transition: 'margin-right 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            marginRight: aiSidebarOpened ? (isMobile ? '0' : isTablet ? '350px' : '450px') : '0',
          }}
        >
          <Outlet />
        </AppShell.Main>

        {/* Assistant IA - Bouton flottant + Sidebar custom */}
        <AIAssistantDrawer
          opened={aiSidebarOpened}
          onOpenChange={handleAiSidebarChange}
        />
      </AppShell>
    </>
  );
}
