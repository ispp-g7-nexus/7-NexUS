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
    "flex justify-center text-xs min-h-[180px] min-w-0 [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line]:stroke-border/50 [&_.recharts-polar-grid_[stroke=ccc]]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-reference-line_[stroke=red]]:stroke-destructive-foreground"

  const finalClassName = twMerge(clsx(baseClasses, className))

  const containerRef = React.useRef<HTMLDivElement | null>(null)
  const [hasSize, setHasSize] = React.useState<boolean>(false)

  React.useEffect(() => {
    const el = containerRef.current
    if (!el) return
    let mounted = true
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        if (!mounted) return
        setHasSize(width > 0 && height > 0)
      }
    })
    ro.observe(el)
    // initial check
    const rect = el.getBoundingClientRect()
    setHasSize(rect.width > 0 && rect.height > 0)
    return () => {
      mounted = false
      ro.disconnect()
    }
  }, [])

  const setRefs = (node: HTMLDivElement | null) => {
    containerRef.current = node
    if (!ref) return
    if (typeof ref === "function") {
      try {
        ref(node)
      } catch (e) {
        // ignore
      }
    } else {
      ;(ref as React.MutableRefObject<HTMLDivElement | null>).current = node
    }
  }

  return (
    <div
      data-chart-config={JSON.stringify(chartConfig)}
      ref={setRefs}
      className={finalClassName}
      {...props}
    >
      {hasSize ? (
        <RechartsPrimitive.ResponsiveContainer width="100%" height="100%">
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      ) : (
        <div style={{ minHeight: 180, minWidth: 0, width: "100%" }} className="flex items-center justify-center">
          <div className="text-sm text-muted-foreground animate-pulse">Cargando gráfico…</div>
        </div>
      )}
    </div>
  )
})
ChartContainer.displayName = "ChartContainer"

const ChartTooltip = RechartsPrimitive.Tooltip
const ChartTooltipContent = RechartsPrimitive.Tooltip

export { ChartContainer, ChartTooltip, ChartTooltipContent }
