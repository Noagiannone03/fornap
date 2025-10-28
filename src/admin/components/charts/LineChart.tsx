import { LineChart as MantineLineChart } from '@mantine/charts';
import { Paper, Title } from '@mantine/core';

interface LineChartProps {
  title: string;
  data: any[];
  dataKey: string;
  series: { name: string; color: string }[];
  height?: number;
}

export function LineChart({ title, data, dataKey, series, height = 300 }: LineChartProps) {
  return (
    <Paper withBorder p="md" radius="md" shadow="sm">
      <Title order={4} mb="md">
        {title}
      </Title>
      <MantineLineChart
        h={height}
        data={data}
        dataKey={dataKey}
        series={series}
        curveType="natural"
        withLegend
        withDots
        withTooltip
        gridAxis="xy"
      />
    </Paper>
  );
}
