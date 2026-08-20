import { useState } from 'react'

export interface BarSeries {
  key: string
  label: string
  color: string
  data: number[]
}

export interface TrendLineSeries {
  key: string
  label: string
  color: string
  data: number[]
  valueFormatter?: (val: number) => string
  suffix?: string
  useRightAxis?: boolean
}

export interface ClusterBarTrendChartProps {
  title: string
  subtitle?: string
  categories: string[]
  barSeries: BarSeries[]
  trendLine?: TrendLineSeries
  height?: number
  valueSuffix?: string
}

export default function ClusterBarTrendChart({
  title,
  subtitle,
  categories,
  barSeries,
  trendLine,
  height = 340,
  valueSuffix = '',
}: ClusterBarTrendChartProps) {
  const [activeSeries, setActiveSeries] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    barSeries.forEach((s) => (initial[s.key] = true))
    if (trendLine) initial[trendLine.key] = true
    return initial
  })

  const [hoveredGroupIndex, setHoveredGroupIndex] = useState<number | null>(null)

  const visibleBarSeries = barSeries.filter((s) => activeSeries[s.key] !== false)
  const isTrendVisible = trendLine && activeSeries[trendLine.key] !== false

  const svgWidth = 800
  const svgHeight = height
  const marginTop = 36
  const marginBottom = 48
  const marginLeft = 45
  const marginRight = trendLine?.useRightAxis ? 55 : 24

  const plotWidth = svgWidth - marginLeft - marginRight
  const plotHeight = svgHeight - marginTop - marginBottom

  // Calculate Left Y Axis max (Bar values)
  const allBarValues = visibleBarSeries.flatMap((s) => s.data)
  const maxBarRaw = Math.max(...allBarValues, 1)
  const maxY = Math.ceil(maxBarRaw * 1.25) || 5

  // Calculate Right Y Axis max (Trend values if separate axis)
  const trendValues = isTrendVisible ? trendLine.data : []
  const maxTrendRaw = Math.max(...trendValues, 1)
  const maxTrendY = trendLine?.useRightAxis ? Math.ceil(maxTrendRaw * 1.25) || 5 : maxY

  const numCategories = categories.length
  const groupWidth = numCategories > 0 ? plotWidth / numCategories : plotWidth

  const toggleSeries = (key: string) => {
    setActiveSeries((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  // Y-axis tick values (4 steps)
  const ticks = [0, Math.round(maxY * 0.25), Math.round(maxY * 0.5), Math.round(maxY * 0.75), maxY]
  const trendTicks = [
    0,
    Math.round(maxTrendY * 0.25),
    Math.round(maxTrendY * 0.5),
    Math.round(maxTrendY * 0.75),
    maxTrendY,
  ]

  // Calculate Trend points
  const trendPoints = isTrendVisible
    ? categories.map((_, i) => {
        const val = trendLine.data[i] ?? 0
        const x = marginLeft + i * groupWidth + groupWidth / 2
        const yRatio = maxTrendY > 0 ? val / maxTrendY : 0
        const y = marginTop + plotHeight * (1 - yRatio)
        return { x, y, val }
      })
    : []

  // Smooth Bezier Curve Path for Trend Line
  const buildSmoothPath = (pts: { x: number; y: number }[]) => {
    if (pts.length === 0) return ''
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`

    let d = `M ${pts[0].x} ${pts[0].y}`
    for (let i = 0; i < pts.length - 1; i++) {
      const curr = pts[i]
      const next = pts[i + 1]
      const cpX1 = curr.x + (next.x - curr.x) / 2
      const cpY1 = curr.y
      const cpX2 = curr.x + (next.x - curr.x) / 2
      const cpY2 = next.y
      d += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${next.x} ${next.y}`
    }
    return d
  }

  const trendPathD = buildSmoothPath(trendPoints)
  const trendAreaD =
    trendPoints.length > 0
      ? `${trendPathD} L ${trendPoints[trendPoints.length - 1].x} ${marginTop + plotHeight} L ${trendPoints[0].x} ${marginTop + plotHeight} Z`
      : ''

  return (
    <div className="chart-card">
      <div className="chart-header">
        <div>
          <h3 className="chart-title">{title}</h3>
          {subtitle && <p className="chart-subtitle">{subtitle}</p>}
        </div>
        <div className="chart-legend">
          {barSeries.map((s) => {
            const isActive = activeSeries[s.key] !== false
            return (
              <button
                key={s.key}
                className={`legend-pill ${isActive ? 'active' : 'inactive'}`}
                onClick={() => toggleSeries(s.key)}
                type="button"
              >
                <span className="legend-dot" style={{ backgroundColor: s.color }} />
                <span>{s.label}</span>
              </button>
            )
          })}
          {trendLine && (
            <button
              className={`legend-pill ${activeSeries[trendLine.key] !== false ? 'active' : 'inactive'}`}
              onClick={() => toggleSeries(trendLine.key)}
              type="button"
            >
              <span className="legend-line" style={{ backgroundColor: trendLine.color }} />
              <span>{trendLine.label} (Trend)</span>
            </button>
          )}
        </div>
      </div>

      <div className="chart-svg-container">
        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="chart-svg" preserveAspectRatio="xMidYMid meet">
          <defs>
            {trendLine && (
              <linearGradient id={`trendGrad-${title.replace(/\s+/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={trendLine.color} stopOpacity={0.25} />
                <stop offset="100%" stopColor={trendLine.color} stopOpacity={0.0} />
              </linearGradient>
            )}
            {barSeries.map((s) => (
              <linearGradient key={s.key} id={`barGrad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity={0.95} />
                <stop offset="100%" stopColor={s.color} stopOpacity={0.7} />
              </linearGradient>
            ))}
          </defs>

          {/* Grid lines & Left Y-Axis Ticks */}
          {ticks.map((val, idx) => {
            const y = marginTop + plotHeight * (1 - val / maxY)
            return (
              <g key={`grid-${idx}`} className="chart-grid-line">
                <line x1={marginLeft} y1={y} x2={svgWidth - marginRight} y2={y} stroke="#e4e7ec" strokeDasharray="3 3" />
                <text x={marginLeft - 8} y={y + 4} textAnchor="end" className="axis-label">
                  {val}
                  {valueSuffix}
                </text>
              </g>
            )
          })}

          {/* Right Y-Axis Ticks if separate trend axis */}
          {trendLine?.useRightAxis &&
            isTrendVisible &&
            trendTicks.map((val, idx) => {
              const y = marginTop + plotHeight * (1 - val / maxTrendY)
              return (
                <text key={`rgrid-${idx}`} x={svgWidth - marginRight + 8} y={y + 4} textAnchor="start" className="axis-label trend-axis-text">
                  {trendLine.valueFormatter ? trendLine.valueFormatter(val) : `${val}${trendLine.suffix || ''}`}
                </text>
              )
            })}

          {/* Render Category Clusters */}
          {categories.map((cat, groupIdx) => {
            const isHovered = hoveredGroupIndex === groupIdx
            const groupXStart = marginLeft + groupIdx * groupWidth
            const barSlotWidth = groupWidth * 0.72
            const barCount = visibleBarSeries.length
            const gapRatio = 0.15
            const totalGaps = barCount > 1 ? (barCount - 1) * gapRatio : 0
            const singleBarWidth = barCount > 0 ? barSlotWidth / (barCount + totalGaps) : 0
            const gapWidth = singleBarWidth * gapRatio
            const startOffsetX = groupXStart + (groupWidth - barSlotWidth) / 2

            return (
              <g
                key={`cat-${cat}`}
                onMouseEnter={() => setHoveredGroupIndex(groupIdx)}
                onMouseLeave={() => setHoveredGroupIndex(null)}
                className="chart-group"
              >
                {/* Background hover highlight column */}
                <rect
                  x={groupXStart + 4}
                  y={marginTop}
                  width={groupWidth - 8}
                  height={plotHeight}
                  fill={isHovered ? 'rgba(22, 119, 255, 0.05)' : 'transparent'}
                  rx={6}
                  className="group-hover-bg"
                />

                {/* X-Axis Category Label */}
                <text
                  x={groupXStart + groupWidth / 2}
                  y={svgHeight - 14}
                  textAnchor="middle"
                  className={`x-axis-label ${isHovered ? 'hovered' : ''}`}
                >
                  {cat}
                </text>

                {/* Render Individual Clustered Bars */}
                {visibleBarSeries.map((s, seriesIdx) => {
                  const val = s.data[groupIdx] ?? 0
                  const barX = startOffsetX + seriesIdx * (singleBarWidth + gapWidth)
                  const barH = maxY > 0 ? (val / maxY) * plotHeight : 0
                  const barY = marginTop + (plotHeight - barH)

                  return (
                    <rect
                      key={`bar-${s.key}-${cat}`}
                      x={barX}
                      y={barY}
                      width={singleBarWidth}
                      height={barH}
                      fill={`url(#barGrad-${s.key})`}
                      rx={Math.min(4, singleBarWidth / 2)}
                      className="cluster-bar"
                    >
                      <title>{`${s.label}: ${val}${valueSuffix}`}</title>
                    </rect>
                  )
                })}
              </g>
            )
          })}

          {/* Overlaid Trend Area Fill */}
          {isTrendVisible && trendAreaD && (
            <path d={trendAreaD} fill={`url(#trendGrad-${title.replace(/\s+/g, '')})`} pointerEvents="none" />
          )}

          {/* Overlaid Trend Line Path */}
          {isTrendVisible && trendPathD && (
            <path
              d={trendPathD}
              fill="none"
              stroke={trendLine.color}
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="trend-line-path"
              pointerEvents="none"
            />
          )}

          {/* Overlaid Trend Line Nodes / Markers */}
          {isTrendVisible &&
            trendPoints.map((pt, idx) => {
              const isGroupHovered = hoveredGroupIndex === idx
              const formattedVal = trendLine.valueFormatter
                ? trendLine.valueFormatter(pt.val)
                : `${pt.val}${trendLine.suffix || ''}`

              return (
                <g key={`trend-pt-${idx}`} className="trend-node-group">
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={isGroupHovered ? 6 : 4}
                    fill="#ffffff"
                    stroke={trendLine.color}
                    strokeWidth={isGroupHovered ? 3 : 2}
                    className="trend-node"
                  />
                  {isGroupHovered && (
                    <text x={pt.x} y={pt.y - 10} textAnchor="middle" className="trend-node-text">
                      {formattedVal}
                    </text>
                  )}
                </g>
              );
            })}

          {/* Baseline axis line */}
          <line
            x1={marginLeft}
            y1={marginTop + plotHeight}
            x2={svgWidth - marginRight}
            y2={marginTop + plotHeight}
            stroke="#c5c9d1"
            strokeWidth={1}
          />
        </svg>

        {/* Floating Tooltip card when category cluster is hovered */}
        {hoveredGroupIndex !== null && (
          <div
            className="chart-tooltip-floating"
            style={{
              left: `${((marginLeft + hoveredGroupIndex * groupWidth + groupWidth / 2) / svgWidth) * 100}%`,
            }}
          >
            <div className="tooltip-header">{categories[hoveredGroupIndex]}</div>
            <div className="tooltip-body">
              {visibleBarSeries.map((s) => {
                const val = s.data[hoveredGroupIndex] ?? 0
                return (
                  <div key={s.key} className="tooltip-row">
                    <span className="tooltip-dot" style={{ backgroundColor: s.color }} />
                    <span className="tooltip-label">{s.label}:</span>
                    <strong className="tooltip-val">{val}</strong>
                  </div>
                )
              })}
              {isTrendVisible && trendLine && (
                <div className="tooltip-row tooltip-trend-row">
                  <span className="tooltip-line" style={{ backgroundColor: trendLine.color }} />
                  <span className="tooltip-label">{trendLine.label}:</span>
                  <strong className="tooltip-val" style={{ color: trendLine.color }}>
                    {trendLine.valueFormatter
                      ? trendLine.valueFormatter(trendLine.data[hoveredGroupIndex] ?? 0)
                      : `${trendLine.data[hoveredGroupIndex] ?? 0}${trendLine.suffix || ''}`}
                  </strong>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
