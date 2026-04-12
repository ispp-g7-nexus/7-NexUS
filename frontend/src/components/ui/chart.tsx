"use client"

import * as React from "react"
import * as RechartsPrimitive from "recharts"
import clsx from "clsx"
import { twMerge } from "tailwind-merge"
// ... (código de shadcn/ui para charts)

const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    config: any
  }
>(({ config, children, className, ...props }, ref) => {
  const chartConfig = React.useMemo(
    () => {
      return config
    },
    [config]
  )

  const baseClasses =
    "flex justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line]:stroke-border/50 [&_.recharts-polar-grid_[stroke=ccc]]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-reference-line_[stroke=red]]:stroke-destructive-foreground"

  const finalClassName = twMerge(clsx(baseClasses, className))

  return (
    <div
      data-chart-config={JSON.stringify(chartConfig)}
      ref={ref}
      className={finalClassName}
      {...props}
    >
      <RechartsPrimitive.ResponsiveContainer width="100%" height="100%">
        {children}
      </RechartsPrimitive.ResponsiveContainer>
    </div>
  )
})
ChartContainer.displayName = "ChartContainer"

const ChartTooltip = RechartsPrimitive.Tooltip
const ChartTooltipContent = RechartsPrimitive.Tooltip

export { ChartContainer, ChartTooltip, ChartTooltipContent }
