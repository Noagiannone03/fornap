/**
 * Composant pour afficher les graphiques générés par l'IA
 */

import { Card, Text } from '@mantine/core';
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

  return (
    <Card
      withBorder
      p="lg"
      style={{
        backgroundColor: 'white',
        borderColor: 'var(--mantine-color-indigo-3)',
      }}
    >
      <Text size="md" fw={600} mb="md" c="dark">
        {title}
      </Text>

      <ResponsiveContainer width="100%" height={300}>
        {type === 'line' && (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--mantine-color-gray-3)" />
            <XAxis dataKey={xKey} stroke="var(--mantine-color-gray-6)" />
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
              dataKey={yKey}
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
            <XAxis dataKey={xKey} stroke="var(--mantine-color-gray-6)" />
            <YAxis stroke="var(--mantine-color-gray-6)" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid var(--mantine-color-gray-3)',
                borderRadius: '8px',
              }}
            />
            <Legend />
            <Bar dataKey={yKey} fill="var(--mantine-color-indigo-6)" radius={[8, 8, 0, 0]} />
          </BarChart>
        )}

        {type === 'area' && (
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--mantine-color-gray-3)" />
            <XAxis dataKey={xKey} stroke="var(--mantine-color-gray-6)" />
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
              dataKey={yKey}
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
    </Card>
  );
}
