/**
 * Composant pour afficher les graphiques générés par l'IA
 */

import { useRef } from 'react';
import { Card, Text, Group, Button, Menu } from '@mantine/core';
import { IconDownload, IconFileTypeCsv, IconFileTypePng } from '@tabler/icons-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface ChartData {
  chartType: 'chart';
  type: 'line' | 'bar' | 'pie' | 'area';
  title: string;
  data: any[];
  xKey?: string;
  yKey?: string;
  nameKey?: string;
  valueKey?: string;
}

interface ChartDisplayProps {
  chartData: ChartData;
}

const COLORS = [
  'var(--mantine-color-indigo-6)',
  'var(--mantine-color-violet-6)',
  'var(--mantine-color-blue-6)',
  'var(--mantine-color-cyan-6)',
  'var(--mantine-color-teal-6)',
  'var(--mantine-color-green-6)',
  'var(--mantine-color-lime-6)',
  'var(--mantine-color-yellow-6)',
  'var(--mantine-color-orange-6)',
  'var(--mantine-color-red-6)',
];

export function ChartDisplay({ chartData }: ChartDisplayProps) {
  const { type, title, data, xKey, yKey, nameKey, valueKey } = chartData;
  const chartRef = useRef<HTMLDivElement>(null);

  console.log('📈 ChartDisplay - Rendering chart:', { type, title, data, xKey, yKey, nameKey, valueKey });

  // Vérifier si les données sont vides
  if (!data || data.length === 0) {
    return (
      <Card
        withBorder
        p="lg"
        style={{
          backgroundColor: 'var(--mantine-color-yellow-0)',
          borderColor: 'var(--mantine-color-yellow-3)',
        }}
      >
        <Text size="md" fw={600} c="dark" mb="sm">
          {title}
        </Text>
        <Text size="sm" c="dimmed">
          Aucune donnée disponible pour générer ce graphique.
        </Text>
      </Card>
    );
  }

  // Export en CSV
  const exportToCSV = () => {
    const headers = Object.keys(data[0] || {});
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(h => row[h]).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${title.replace(/[^a-z0-9]/gi, '_')}.csv`;
    link.click();
  };

  // Export en PNG
  const exportToPNG = async () => {
    if (!chartRef.current) return;

    try {
      // Utiliser html2canvas pour capturer le graphique
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(chartRef.current, {
        backgroundColor: '#ffffff',
        scale: 2, // Meilleure qualité
      });

      canvas.toBlob((blob) => {
        if (!blob) return;
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${title.replace(/[^a-z0-9]/gi, '_')}.png`;
        link.click();
      });
    } catch (error) {
      console.error('Erreur lors de l\'export PNG:', error);
    }
  };

  return (
    <Card
      withBorder
      p="lg"
      style={{
        backgroundColor: 'white',
        borderColor: 'var(--mantine-color-indigo-3)',
      }}
    >
      <Group justify="space-between" mb="md">
        <Text size="md" fw={600} c="dark">
          {title}
        </Text>
        <Menu shadow="md" width={200}>
          <Menu.Target>
            <Button
              size="xs"
              variant="light"
              color="indigo"
              leftSection={<IconDownload size={16} />}
            >
              Exporter
            </Button>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item
              leftSection={<IconFileTypePng size={16} />}
              onClick={exportToPNG}
            >
              Exporter en PNG
            </Menu.Item>
            <Menu.Item
              leftSection={<IconFileTypeCsv size={16} />}
              onClick={exportToCSV}
            >
              Exporter en CSV
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>

      <div ref={chartRef}>

      <ResponsiveContainer width="100%" height={300}>
        {type === 'line' && (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--mantine-color-gray-3)" />
            <XAxis dataKey={xKey || 'name'} stroke="var(--mantine-color-gray-6)" />
            <YAxis stroke="var(--mantine-color-gray-6)" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid var(--mantine-color-gray-3)',
                borderRadius: '8px',
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey={yKey || 'value'}
              stroke="var(--mantine-color-indigo-6)"
              strokeWidth={2}
              dot={{ fill: 'var(--mantine-color-indigo-6)', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        )}

        {type === 'bar' && (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--mantine-color-gray-3)" />
            <XAxis dataKey={xKey || 'name'} stroke="var(--mantine-color-gray-6)" />
            <YAxis stroke="var(--mantine-color-gray-6)" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid var(--mantine-color-gray-3)',
                borderRadius: '8px',
              }}
            />
            <Legend />
            <Bar dataKey={yKey || 'value'} fill="var(--mantine-color-indigo-6)" radius={[8, 8, 0, 0]} />
          </BarChart>
        )}

        {type === 'area' && (
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--mantine-color-gray-3)" />
            <XAxis dataKey={xKey || 'name'} stroke="var(--mantine-color-gray-6)" />
            <YAxis stroke="var(--mantine-color-gray-6)" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid var(--mantine-color-gray-3)',
                borderRadius: '8px',
              }}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey={yKey || 'value'}
              stroke="var(--mantine-color-indigo-6)"
              fill="var(--mantine-color-indigo-1)"
              strokeWidth={2}
            />
          </AreaChart>
        )}

        {type === 'pie' && (
          <PieChart>
            <Pie
              data={data}
              dataKey={valueKey || 'value'}
              nameKey={nameKey || 'name'}
              cx="50%"
              cy="50%"
              outerRadius={100}
              label
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid var(--mantine-color-gray-3)',
                borderRadius: '8px',
              }}
            />
            <Legend />
          </PieChart>
        )}
      </ResponsiveContainer>
      </div>
    </Card>
  );
}
