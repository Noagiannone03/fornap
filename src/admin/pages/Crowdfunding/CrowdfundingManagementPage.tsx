import { useState, useEffect } from 'react';
import {
  Container,
  Title,
  Paper,
  Text,
  Group,
  LoadingOverlay,
  Alert,
  ActionIcon,
  Tooltip,
  Table,
  Badge,
  SimpleGrid,
  NumberInput,
  Button,
  Stack,
  Card,
  Progress,
} from '@mantine/core';
import {
  IconRefresh,
  IconAlertCircle,
  IconCurrencyEuro,
  IconShoppingCart,
  IconCheck,
  IconChartBar,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { db } from '../../../shared/config/firebase';
import { collection, getDocs, query, where, doc, getDoc, setDoc } from 'firebase/firestore';

// Configuration des stocks limités (identique à useStockTracking.ts)
const LIMITED_STOCK_CONFIG = {
  'PACK PARTY HARDER': 444,
  'PACK AMBASSADEUR': 333,
  'MEETING PASS': 20,
  'COWORK PASS': 14,
  'MANUFACTURE PASS': 8,
  'PRIVATE PASS': 7
};

interface StockInfo {
  itemName: string;
  totalStock: number;
  soldCount: number;
  remainingStock: number;
  percentage: number;
}

interface CrowdfundingData {
  stockInfo: StockInfo[];
  totalFirestore: number; // Total depuis Firestore (toutes les contributions)
  totalSquare: number; // Total Square (3 derniers mois)
  artificialAmount: number;
  grandTotal: number; // Total affiché (Square + Artificiel)
}

export function CrowdfundingManagementPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CrowdfundingData>({
    stockInfo: [],
    totalFirestore: 0,
    totalSquare: 0,
    artificialAmount: 0,
    grandTotal: 0
  });
  const [newArtificialAmount, setNewArtificialAmount] = useState<number>(0);

  useEffect(() => {
    loadData();
  }, []);

  /**
   * Récupère le nombre de contributions pour un article donné
   */
  const getItemSoldCount = async (itemName: string): Promise<number> => {
    try {
      const contributionsRef = collection(db, 'contributions');
      const q = query(contributionsRef, where('itemName', '==', itemName));
      const snapshot = await getDocs(q);
      return snapshot.size;
    } catch (error) {
      console.error(`Erreur lors de la récupération du stock pour ${itemName}:`, error);
      return 0;
    }
  };

  /**
   * Récupère le total de toutes les contributions depuis Firestore
   * C'est le montant RÉEL depuis le début du crowdfunding
   */
  const getFirestoreTotal = async (): Promise<number> => {
    try {
      const contributionsRef = collection(db, 'contributions');
      const snapshot = await getDocs(contributionsRef);

      let total = 0;
      snapshot.forEach((doc) => {
        const contribution = doc.data();
        if (contribution.amount && typeof contribution.amount === 'number') {
          total += contribution.amount;
        }
      });

      return total;
    } catch (error) {
      console.error('Erreur lors de la récupération du total Firestore:', error);
      return 0;
    }
  };

  /**
   * Récupère le total des transactions Square (3 derniers mois)
   * Via l'API Square - ceci est limité à 90 jours
   */
  const getSquareTotal = async (): Promise<number> => {
    try {
      // Appeler l'API Square pour obtenir les transactions des 90 derniers jours
      const beginTime = new Date();
      beginTime.setDate(beginTime.getDate() - 90);

      const response = await fetch(`/api/square/transactions?beginTime=${beginTime.toISOString()}&limit=100`);

      if (!response.ok) {
        console.warn('⚠️ Impossible de récupérer les transactions Square');
        return 0;
      }

      const data = await response.json();

      if (data.success && data.transactions) {
        const total = data.transactions
          .filter((t: any) => t.status === 'COMPLETED')
          .reduce((sum: number, t: any) => sum + t.amount, 0);

        return total;
      }

      return 0;
    } catch (error) {
      console.error('Erreur lors de la récupération du total Square:', error);
      return 0;
    }
  };

  /**
   * Récupère la mise de départ artificielle depuis Firebase
   */
  const getArtificialAmount = async (): Promise<number> => {
    try {
      const configRef = doc(db, 'crowdfunding_config', 'settings');
      const configDoc = await getDoc(configRef);

      if (configDoc.exists()) {
        return configDoc.data()?.artificialAmount || 0;
      }
      return 0;
    } catch (error) {
      console.error('Erreur lors de la récupération de la mise artificielle:', error);
      return 0;
    }
  };

  /**
   * Sauvegarde la mise de départ artificielle dans Firebase
   */
  const saveArtificialAmount = async (amount: number): Promise<void> => {
    try {
      const configRef = doc(db, 'crowdfunding_config', 'settings');
      await setDoc(configRef, {
        artificialAmount: amount,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la mise artificielle:', error);
      throw error;
    }
  };

  /**
   * Charge toutes les données
   */
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Charger le stock pour chaque catégorie
      const stockPromises = Object.entries(LIMITED_STOCK_CONFIG).map(async ([itemName, totalStock]) => {
        const soldCount = await getItemSoldCount(itemName);
        const remainingStock = Math.max(0, totalStock - soldCount);
        const percentage = (soldCount / totalStock) * 100;

        return {
          itemName,
          totalStock,
          soldCount,
          remainingStock,
          percentage
        } as StockInfo;
      });

      const stockInfo = await Promise.all(stockPromises);

      // Charger les totaux Firestore, Square et la mise artificielle
      const [totalFirestore, totalSquare, artificialAmount] = await Promise.all([
        getFirestoreTotal(),
        getSquareTotal(),
        getArtificialAmount()
      ]);

      // Le total affiché au public = Square + Artificiel
      const grandTotal = totalSquare + artificialAmount;

      setData({
        stockInfo,
        totalFirestore,
        totalSquare,
        artificialAmount,
        grandTotal
      });

      setNewArtificialAmount(artificialAmount);

    } catch (err) {
      console.error('Erreur lors du chargement des données:', err);
      setError('Erreur lors du chargement des données du crowdfunding');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Sauvegarde le nouveau montant artificiel
   */
  const handleSaveArtificialAmount = async () => {
    try {
      setSaving(true);
      await saveArtificialAmount(newArtificialAmount);

      notifications.show({
        title: 'Succès',
        message: 'La mise de départ artificielle a été mise à jour',
        color: 'green',
        icon: <IconCheck size={16} />,
      });

      // Recharger les données
      await loadData();
    } catch (err) {
      notifications.show({
        title: 'Erreur',
        message: 'Erreur lors de la sauvegarde',
        color: 'red',
        icon: <IconAlertCircle size={16} />,
      });
    } finally {
      setSaving(false);
    }
  };

  /**
   * Obtient la couleur du badge selon le stock restant
   */
  const getStockBadgeColor = (percentage: number): string => {
    if (percentage >= 100) return 'red';
    if (percentage >= 90) return 'orange';
    if (percentage >= 70) return 'yellow';
    return 'green';
  };

  /**
   * Obtient le statut du stock
   */
  const getStockStatus = (remainingStock: number, totalStock: number): string => {
    if (remainingStock === 0) return 'RUPTURE';
    const percentage = (remainingStock / totalStock) * 100;
    if (percentage <= 10) return 'TRÈS FAIBLE';
    if (percentage <= 30) return 'FAIBLE';
    return 'DISPONIBLE';
  };

  return (
    <Container size="xl" pos="relative">
      <LoadingOverlay visible={loading} />

      <Group justify="space-between" mb="xl">
        <Title order={1}>Gestion Crowdfunding</Title>
        <Tooltip label="Actualiser les données">
          <ActionIcon
            variant="light"
            size="lg"
            onClick={loadData}
            loading={loading}
          >
            <IconRefresh size={18} />
          </ActionIcon>
        </Tooltip>
      </Group>

      {error && (
        <Alert icon={<IconAlertCircle size={16} />} color="red" mb="xl">
          {error}
        </Alert>
      )}

      {/* Totaux - KPIs */}
      <SimpleGrid cols={{ base: 1, xs: 2, lg: 4 }} spacing="lg" mb="xl">
        <Card withBorder p="md" radius="md" shadow="sm">
          <Group gap="sm" mb="xs">
            <IconShoppingCart size={22} color="var(--mantine-color-blue-6)" />
            <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Total Firestore (Réel)</Text>
          </Group>
          <Text size="xl" fw={700} c="blue">{data.totalFirestore.toFixed(2)} €</Text>
          <Text size="xs" c="dimmed" mt="xs">Toutes les contributions depuis le début</Text>
        </Card>

        <Card withBorder p="md" radius="md" shadow="sm">
          <Group gap="sm" mb="xs">
            <IconShoppingCart size={22} color="var(--mantine-color-cyan-6)" />
            <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Total Square (3 mois)</Text>
          </Group>
          <Text size="xl" fw={700} c="cyan">{data.totalSquare.toFixed(2)} €</Text>
          <Text size="xs" c="dimmed" mt="xs">Montant Square (90 derniers jours)</Text>
        </Card>

        <Card withBorder p="md" radius="md" shadow="sm">
          <Group gap="sm" mb="xs">
            <IconCurrencyEuro size={22} color="var(--mantine-color-orange-6)" />
            <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Mise Artificielle</Text>
          </Group>
          <Text size="xl" fw={700} c="orange">{data.artificialAmount.toFixed(2)} €</Text>
          <Text size="xs" c="dimmed" mt="xs">Montant de départ ajouté</Text>
        </Card>

        <Card withBorder p="md" radius="md" shadow="sm">
          <Group gap="sm" mb="xs">
            <IconChartBar size={22} color="var(--mantine-color-green-6)" />
            <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Total Affiché Public</Text>
          </Group>
          <Text size="xl" fw={700} c="green">{data.grandTotal.toFixed(2)} €</Text>
          <Text size="xs" c="dimmed" mt="xs">Square + Artificiel (visible)</Text>
        </Card>
      </SimpleGrid>

      {/* Formulaire de mise artificielle */}
      <Paper withBorder p="md" radius="md" mb="xl" shadow="sm">
        <Title order={3} mb="md">Modifier la Mise de Départ Artificielle</Title>
        <Text size="sm" c="dimmed" mb="md">
          Ce montant s'ajoute au total réel des transactions Square pour afficher un montant de départ plus élevé.
        </Text>

        <Stack gap="md">
          <NumberInput
            label="Montant artificiel (€)"
            description="Montant qui sera ajouté au total réel"
            value={newArtificialAmount}
            onChange={(val) => setNewArtificialAmount(Number(val) || 0)}
            min={0}
            step={100}
            size="md"
            leftSection={<IconCurrencyEuro size={18} />}
            decimalScale={2}
            fixedDecimalScale
          />

          <Group justify="flex-end">
            <Button
              onClick={handleSaveArtificialAmount}
              loading={saving}
              leftSection={<IconCheck size={18} />}
              color="indigo"
            >
              Enregistrer
            </Button>
          </Group>
        </Stack>
      </Paper>

      {/* Tableau du stock par catégorie */}
      <Paper withBorder p="md" radius="md" shadow="sm">
        <Title order={3} mb="md">Stock par Catégorie</Title>

        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Catégorie</Table.Th>
              <Table.Th style={{ textAlign: 'center' }}>Vendus</Table.Th>
              <Table.Th style={{ textAlign: 'center' }}>Restants</Table.Th>
              <Table.Th style={{ textAlign: 'center' }}>Total</Table.Th>
              <Table.Th style={{ textAlign: 'center' }}>Progression</Table.Th>
              <Table.Th style={{ textAlign: 'center' }}>Statut</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {data.stockInfo.map((item) => (
              <Table.Tr key={item.itemName}>
                <Table.Td>
                  <Text fw={600}>{item.itemName}</Text>
                </Table.Td>
                <Table.Td style={{ textAlign: 'center' }}>
                  <Text>{item.soldCount}</Text>
                </Table.Td>
                <Table.Td style={{ textAlign: 'center' }}>
                  <Text fw={700} c={item.remainingStock === 0 ? 'red' : 'blue'}>
                    {item.remainingStock}
                  </Text>
                </Table.Td>
                <Table.Td style={{ textAlign: 'center' }}>
                  <Text c="dimmed">{item.totalStock}</Text>
                </Table.Td>
                <Table.Td>
                  <Stack gap={4}>
                    <Progress
                      value={item.percentage}
                      color={getStockBadgeColor(item.percentage)}
                      size="lg"
                      radius="sm"
                    />
                    <Text size="xs" c="dimmed" ta="center">
                      {item.percentage.toFixed(1)}%
                    </Text>
                  </Stack>
                </Table.Td>
                <Table.Td style={{ textAlign: 'center' }}>
                  <Badge
                    color={getStockBadgeColor(item.percentage)}
                    variant="filled"
                  >
                    {getStockStatus(item.remainingStock, item.totalStock)}
                  </Badge>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Paper>
    </Container>
  );
}
