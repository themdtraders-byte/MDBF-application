
"use client"

import * as React from "react"
import { addDays, format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select"
import { useLanguage } from "@/hooks/use-language"

interface DateRangePickerProps extends React.HTMLAttributes<HTMLDivElement> {
  date: DateRange | undefined
  setDate: (date: DateRange | undefined) => void
}

export function DateRangePicker({
  className,
  date,
  setDate
}: DateRangePickerProps) {
  const { t } = useLanguage();
  const [popoverOpen, setPopoverOpen] = React.useState(false);

  const handlePresetChange = (value: string) => {
    const now = new Date();
    switch (value) {
        case 'today':
            setDate({ from: now, to: now });
            break;
        case 'yesterday':
            const yesterday = addDays(now, -1);
            setDate({ from: yesterday, to: yesterday });
            break;
        case 'this_week':
            setDate({ from: startOfWeek(now), to: endOfWeek(now) });
            break;
        case 'last_week':
            const lastWeekStart = startOfWeek(addDays(now, -7));
            const lastWeekEnd = endOfWeek(addDays(now, -7));
            setDate({ from: lastWeekStart, to: lastWeekEnd });
            break;
        case 'this_month':
            setDate({ from: startOfMonth(now), to: endOfMonth(now) });
            break;
        case 'last_month':
             const lastMonthStart = startOfMonth(subMonths(now, 1));
             const lastMonthEnd = endOfMonth(subMonths(now, 1));
             setDate({ from: lastMonthStart, to: lastMonthEnd });
            break;
        case 'last_3_months':
            setDate({ from: startOfMonth(subMonths(now, 2)), to: endOfMonth(now) });
            break;
        default:
             setDate(undefined);
            break;
    }
    setPopoverOpen(false);
  }

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-full sm:w-[260px] justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "LLL dd, y")} -{" "}
                  {format(date.to, "LLL dd, y")}
                </>
              ) : (
                format(date.from, "LLL dd, y")
              )
            ) : (
              <span>{t('pickADate')}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
            <div className="flex flex-col md:flex-row">
                 <div className="p-2 border-b md:border-r md:border-b-0">
                    <Select onValueChange={handlePresetChange}>
                        <SelectTrigger>
                            <SelectValue placeholder={t('selectPreset')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Time</SelectItem>
                            <SelectItem value="today">{t('today')}</SelectItem>
                            <SelectItem value="yesterday">{t('yesterday')}</SelectItem>
                            <SelectItem value="this_week">{t('thisWeek')}</SelectItem>
                            <SelectItem value="last_week">{t('lastWeek')}</SelectItem>
                            <SelectItem value="this_month">{t('thisMonth')}</SelectItem>
                            <SelectItem value="last_month">{t('lastMonth')}</SelectItem>
                            <SelectItem value="last_3_months">Last 3 Months</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={date?.from}
                    selected={date}
                    onSelect={setDate}
                    numberOfMonths={2}
                />
            </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
