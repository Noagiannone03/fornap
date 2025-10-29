import { Paper, Title, Text, Box } from '@mantine/core';
import {
  BarChart,
  Bar,
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

interface ReusableBarChartProps {
  title: string;
  data: any[];
  xAxisKey: string;
  series: DataSeries[];
  height?: number;
  stacked?: boolean;
  horizontal?: boolean;
  yAxisLabel?: string;
  subtitle?: string;
}

export function ReusableBarChart({
  title,
  data,
  xAxisKey,
  series,
  height = 300,
  stacked = false,
  horizontal = false,
  yAxisLabel,
  subtitle,
}: ReusableBarChartProps) {
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
        <BarChart
          data={data}
          layout={horizontal ? 'vertical' : 'horizontal'}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
          {horizontal ? (
            <>
              <XAxis type="number" tick={{ fontSize: 12 }} stroke="#868e96" />
              <YAxis dataKey={xAxisKey} type="category" tick={{ fontSize: 12 }} stroke="#868e96" />
            </>
          ) : (
            <>
              <XAxis dataKey={xAxisKey} tick={{ fontSize: 12 }} stroke="#868e96" />
              <YAxis
                tick={{ fontSize: 12 }}
                stroke="#868e96"
                label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft' } : undefined}
              />
            </>
          )}
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e9ecef',
              borderRadius: '8px',
              padding: '8px 12px',
            }}
          />
          <Legend wrapperStyle={{ paddingTop: '20px' }} />
          {series.map((s) => (
            <Bar
              key={s.dataKey}
              dataKey={s.dataKey}
              name={s.name}
              fill={s.color}
              stackId={stacked ? 'stack' : undefined}
              radius={[4, 4, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </Paper>
  );
}
