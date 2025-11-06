
"use client"

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"
import useEmblaCarousel from 'embla-carousel-react'
import { cn } from "@/lib/utils"

const SwipeableTabs = TabsPrimitive.Root;

const SwipeableTabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "flex flex-wrap h-auto items-center justify-start rounded-md bg-accent p-1 text-muted-foreground",
      className
    )}
    {...props}
  />
));
SwipeableTabsList.displayName = TabsPrimitive.List.displayName;

const SwipeableTabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-2 py-1 text-xs font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm sm:px-3 sm:py-1.5 sm:text-sm",
      className
    )}
    {...props}
  />
));
SwipeableTabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const SwipeableTabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
    <TabsPrimitive.Content
        ref={ref}
        className={cn("mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2", className)}
        {...props}
    />
));
SwipeableTabsContent.displayName = TabsPrimitive.Content.displayName;

interface SwipeableTabsCarouselProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
}

const SwipeableTabsCarousel = ({ value, onValueChange, children, ...props }: SwipeableTabsCarouselProps) => {
    const contentChildren = React.useMemo(() => {
        return React.Children.toArray(children);
    }, [children]);

    const [emblaRef, emblaApi] = useEmblaCarousel({
        align: 'start',
        containScroll: 'keepSnaps',
        loop: false,
        watchDrag: (emblaApi, event) => {
            const target = event.target as HTMLElement;
            // Prevent swipe on scrollable table containers
            if (target.closest('.relative.w-full.overflow-auto')) {
                return false;
            }
            return true;
        },
    });

    React.useEffect(() => {
        if (!emblaApi) return;

        const onSelect = () => {
            const selectedIndex = emblaApi.selectedScrollSnap();
            const selectedChild = contentChildren[selectedIndex] as React.ReactElement;
            if (selectedChild && selectedChild.props.value !== value) {
              onValueChange(selectedChild.props.value);
            }
        };

        emblaApi.on('select', onSelect);
        return () => { emblaApi.off('select', onSelect); };
    }, [emblaApi, onValueChange, contentChildren, value]);

    React.useEffect(() => {
        if (!emblaApi) return;

        const tabIndex = contentChildren.findIndex(
            (child) => (child as React.ReactElement).props.value === value
        );

        if (tabIndex !== -1 && tabIndex !== emblaApi.selectedScrollSnap()) {
            emblaApi.scrollTo(tabIndex);
        }
    }, [value, emblaApi, contentChildren]);


    return (
        <div className="overflow-hidden mt-2" ref={emblaRef}>
            <div className="flex -ml-4" {...props}>
                {React.Children.map(children, (child, index) => (
                    <div key={index} className="min-w-0 flex-shrink-0 w-full pl-4">
                        {child}
                    </div>
                ))}
            </div>
        </div>
    )
}


export { SwipeableTabs, SwipeableTabsList, SwipeableTabsTrigger, SwipeableTabsContent, SwipeableTabsCarousel }
