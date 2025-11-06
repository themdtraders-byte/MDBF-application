
"use client"

import * as React from "react"
import { Pie, PieChart, Cell, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { useLanguage } from "@/hooks/use-language"
import { dbLoad } from "@/lib/db"

type Expense = {
    categoryId: string;
    amount: number;
}
type ExpenseCategory = {
    id: string;
    name: string;
}

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export function HomeExpensePieChart() {
  const { t } = useLanguage();
  const [chartData, setChartData] = React.useState<any[]>([]);

  React.useEffect(() => {
    const fetchData = async () => {
        const expenses: Expense[] = await dbLoad("expenses");
        const categories: ExpenseCategory[] = await dbLoad("expense-categories");

        const categoryTotals: {[key: string]: number} = {};

        expenses.forEach(expense => {
          const categoryName = categories.find(c => c.id === expense.categoryId)?.name || "Uncategorized";
          categoryTotals[categoryName] = (categoryTotals[categoryName] || 0) + expense.amount;
        });

        const data = Object.entries(categoryTotals).map(([name, value], index) => ({
          name,
          value,
          fill: COLORS[index % COLORS.length]
        }));

        setChartData(data);
    }
    fetchData();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Expense Breakdown</CardTitle>
        <CardDescription>How you are spending your money.</CardDescription>
      </CardHeader>
      <CardContent>
        <div style={{ width: '100%', height: 300 }}>
            <ChartContainer config={{}} className="mx-auto aspect-square h-full">
                <PieChart>
                <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent hideLabel />}
                />
                <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={60} strokeWidth={5}>
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

    