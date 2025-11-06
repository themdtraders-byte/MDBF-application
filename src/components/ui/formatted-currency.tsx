
"use client";

import { cn } from "@/lib/utils";

interface FormattedCurrencyProps {
  amount: number;
  className?: string;
  currency?: string;
  integerClassName?: string;
  decimalClassName?: string;
}

export function FormattedCurrency({
  amount,
  className,
  currency = "PKR",
  integerClassName,
  decimalClassName,
}: FormattedCurrencyProps) {
  const formatted = (amount || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const [integerPart, decimalPart] = formatted.split('.');

  return (
    <span className={cn(className)}>
      {currency}{' '}
      <span className={cn("font-bold", integerClassName)}>{integerPart}</span>
      <span className={cn("font-semibold", decimalClassName)}>.{decimalPart}</span>
    </span>
  );
}
