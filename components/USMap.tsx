'use client'

import { useEffect, useRef, useState } from 'react'

type StateData = {
  abbr: string
  name: string
  status: string | null
  total_markets: number
}

type Props = {
  states: StateData[]
  onStateClick: (abbr: string) => void
}

const STATUS_COLORS: Record<string, string> = {
  strict: '#c0392b',
  moderate: '#d4a017',
  'grower-friendly': '#27ae60',
  mixed: '#8e44ad',
}

const FIPS_TO_ABBR: Record<string, string> = {
  '01': 'AL', '02': 'AK', '04': 'AZ', '05': 'AR', '06': 'CA',
  '08': 'CO', '09': 'CT', '10': 'DE', '11': 'DC', '12': 'FL',
  '13': 'GA', '15': 'HI', '16': 'ID', '17': 'IL', '18': 'IN',
  '19': 'IA', '20': 'KS', '21': 'KY', '22': 'LA', '23': 'ME',
  '24': 'MD', '25': 'MA', '26': 'MI', '27': 'MN', '28': 'MS',
  '29': 'MO', '30': 'MT', '31': 'NE', '32': 'NV', '33': 'NH',
  '34': 'NJ', '35': 'NM', '36': 'NY', '37': 'NC', '38': 'ND',
  '39': 'OH', '40': 'OK', '41': 'OR', '42': 'PA', '44': 'RI',
  '45': 'SC', '46': 'SD', '47': 'TN', '48': 'TX', '49': 'UT',
  '50': 'VT', '51': 'VA', '53': 'WA', '54': 'WV', '55': 'WI',
  '56': 'WY',
}

export default function USMap({ states, onStateClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string } | null>(null)

  const stateMap = Object.fromEntries(states.map(s => [s.abbr, s]))

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let cancelled = false

    async function renderMap() {
      const d3 = await import('d3')
      const { feature, mesh } = await import('topojson-client')
      const topoRes = await fetch('https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json')
      const us = await topoRes.json()

      if (cancelled || !container) return

      container.innerHTML = ''

      const width = container.clientWidth
      const height = Math.min(width * 0.65, 500)

      const svg = d3.select(container)
        .append('svg')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .attr('width', '100%')
        .attr('role', 'img')
        .attr('aria-label', 'Interactive map of US states — click a state to view regulations')

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const geojson = feature(us, us.objects.states) as any
      const projection = d3.geoAlbersUsa()
        .fitSize([width - 20, height - 20], geojson)

      const path = d3.geoPath().projection(projection)
      const statesFeatures = geojson.features as GeoJSON.Feature[]

      // State paths
      svg.append('g')
        .selectAll('path')
        .data(statesFeatures)
        .join('path')
        .attr('d', d => path(d) || '')
        .attr('fill', d => {
          const abbr = FIPS_TO_ABBR[d.id as string]
          const st = abbr ? stateMap[abbr] : null
          return st?.status ? (STATUS_COLORS[st.status] || '#ccc') : '#ddd'
        })
        .attr('stroke', '#fff')
        .attr('stroke-width', 0.8)
        .attr('cursor', 'pointer')
        .attr('tabindex', '0')
        .attr('role', 'button')
        .attr('aria-label', d => {
          const abbr = FIPS_TO_ABBR[d.id as string]
          const st = abbr ? stateMap[abbr] : null
          return st ? `${st.name} — ${st.status || 'unknown'} (${st.total_markets} markets)` : ''
        })
        .on('mouseenter', function (event, d) {
          const abbr = FIPS_TO_ABBR[d.id as string]
          const st = abbr ? stateMap[abbr] : null
          if (!st) return
          d3.select(this).attr('stroke', '#1a1a1a').attr('stroke-width', 2).raise()
          const [x, y] = d3.pointer(event, container)
          setTooltip({ x, y: y - 10, content: `${st.name} — ${st.total_markets} markets` })
        })
        .on('mousemove', function (event) {
          const [x, y] = d3.pointer(event, container)
          setTooltip(prev => prev ? { ...prev, x, y: y - 10 } : null)
        })
        .on('mouseleave', function () {
          d3.select(this).attr('stroke', '#fff').attr('stroke-width', 0.8)
          setTooltip(null)
        })
        .on('click', (_, d) => {
          const abbr = FIPS_TO_ABBR[d.id as string]
          if (abbr) onStateClick(abbr)
        })
        .on('keydown', (event, d) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            const abbr = FIPS_TO_ABBR[d.id as string]
            if (abbr) onStateClick(abbr)
          }
        })

      // State borders
      svg.append('path')
        .datum(mesh(us, us.objects.states, (a, b) => a !== b))
        .attr('fill', 'none')
        .attr('stroke', '#fff')
        .attr('stroke-width', 0.8)
        .attr('d', path)
    }

    renderMap()
    return () => { cancelled = true }
  }, [states, onStateClick, stateMap])

  return (
    <div className="relative">
      <div ref={containerRef} className="w-full" style={{ minHeight: 300 }} />
      {tooltip && (
        <div
          className="absolute pointer-events-none bg-gray-900 text-white text-sm px-3 py-1.5 rounded shadow-lg z-10"
          style={{ left: tooltip.x, top: tooltip.y, transform: 'translate(-50%, -100%)' }}
        >
          {tooltip.content}
        </div>
      )}
    </div>
  )
}
