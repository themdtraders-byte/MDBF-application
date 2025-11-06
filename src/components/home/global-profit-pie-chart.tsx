
"use client"

import * as React from "react"
import { Pie, PieChart, Cell, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { useLanguage } from "@/hooks/use-language";

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export function GlobalProfitPieChart({ accounts }: { accounts: any[] }) {
  const { t } = useLanguage();

  const chartData = accounts.map((acc, index) => ({
      name: acc.name,
      value: acc.netProfit > 0 ? acc.netProfit : 0, // Only show positive profit in pie chart
      fill: COLORS[index % COLORS.length]
  }));

  const totalProfit = chartData.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('profitContribution')}</CardTitle>
        <CardDescription>{t('fromEachBusiness')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div style={{ width: '100%', height: 300 }}>
            <ChartContainer config={{}} className="mx-auto aspect-square h-full">
                <PieChart>
                    <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent 
                            formatter={(value) => `PKR ${(value as number).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                            hideLabel 
                        />}
                    />
                    <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={60} strokeWidth={5} >
                        {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                    </Pie>
                </PieChart>
            </ChartContainer>
        </div>
      </CardContent>
    </Card>
  )
}
