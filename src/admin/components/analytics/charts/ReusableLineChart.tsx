import { Paper, Title, Text, Box } from '@mantine/core';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface DataSeries {
  dataKey: string;
  name: string;
  color: string;
}

interface ReusableLineChartProps {
  title: string;
  data: any[];
  xAxisKey: string;
  series: DataSeries[];
  height?: number;
  yAxisLabel?: string;
  subtitle?: string;
}

export function ReusableLineChart({
  title,
  data,
  xAxisKey,
  series,
  height = 300,
  yAxisLabel,
  subtitle,
}: ReusableLineChartProps) {
  return (
    <Paper shadow="sm" p="md" radius="md" withBorder>
      <Box mb="md">
        <Title order={3} size="h4">
          {title}
        </Title>
        {subtitle && (
          <Text size="sm" c="dimmed" mt={4}>
            {subtitle}
          </Text>
        )}
      </Box>

      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
          <XAxis
            dataKey={xAxisKey}
            tick={{ fontSize: 12 }}
            stroke="#868e96"
          />
          <YAxis
            tick={{ fontSize: 12 }}
            stroke="#868e96"
            label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft' } : undefined}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e9ecef',
              borderRadius: '8px',
              padding: '8px 12px',
            }}
          />
          <Legend
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="line"
          />
          {series.map((s) => (
            <Line
              key={s.dataKey}
              type="monotone"
              dataKey={s.dataKey}
              name={s.name}
              stroke={s.color}
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </Paper>
  );
}
