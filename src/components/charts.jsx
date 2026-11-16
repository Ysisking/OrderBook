import { useEffect, useState } from 'react'
import { SERIES } from '@/lib/constants'

/** true jika <html> sedang mode gelap (mengikuti toggle tema). */
export function useIsDark() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))
  useEffect(() => {
    const obs = new MutationObserver(() => setDark(document.documentElement.classList.contains('dark')))
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])
  return dark
}

export function useSeries() {
  const dark = useIsDark()
  return { colors: dark ? SERIES.dark : SERIES.light, dark, surface: dark ? '#1a1a19' : '#ffffff' }
}

/** Tooltip Recharts bergaya kartu; formatter(value, name, entry) -> string */
export function ChartTooltip({ active, payload, label, formatter, labelFormatter }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-white/10 dark:bg-[#232322]">
      {label !== undefined && <p className="mb-1 font-bold">{labelFormatter ? labelFormatter(label, payload) : label}</p>}
      {payload.map((p) => (
        <div key={p.dataKey ?? p.name} className="flex items-center gap-2 py-0.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: p.color || p.payload?.fill }} />
          <span className="muted">{p.name}</span>
          <span className="num ml-auto pl-3 font-semibold">{formatter ? formatter(p.value, p.name, p) : p.value}</span>
        </div>
      ))}
    </div>
  )
}

export function Legend({ items }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
      {items.map((i) => (
        <span key={i.label} className="muted flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: i.color }} />
          {i.label}
        </span>
      ))}
    </div>
  )
}

/** Batang horizontal sederhana (HTML) untuk peringkat — mudah dibaca di HP. */
export function RankBars({ rows, valueKey = 'count', labelKey = 'label', color, format = (v) => v, max: maxProp }) {
  const max = maxProp ?? Math.max(1, ...rows.map((r) => r[valueKey]))
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r[labelKey]} title={`${r[labelKey]}: ${format(r[valueKey])}`}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate font-medium">{r[labelKey]}</span>
            <span className="num shrink-0 font-semibold">{format(r[valueKey])}</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100 dark:bg-white/5">
            <div className="h-2 rounded-full" style={{ width: `${(r[valueKey] / max) * 100}%`, background: color, minWidth: r[valueKey] ? 4 : 0 }} />
          </div>
        </li>
      ))}
    </ul>
  )
}
