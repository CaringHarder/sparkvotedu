'use client'

import type { RegionDef } from './region-bracket-view'

// --- Props ---

interface BracketMiniMapProps {
  regions: RegionDef[]
  connectingRegion: RegionDef | null
  activeRegion: string
  onRegionClick: (key: string) => void
  votingCounts: Record<string, number>
}

// --- Component ---

/**
 * Schematic bracket region navigator.
 *
 * Renders each region as a bold, clickable card in a 2-column grid,
 * with the Championship/Final Four centered below. Replaces both
 * the old SVG dot mini-map AND the separate tab bar — serves as
 * the single navigation interface for region switching.
 */
export function BracketMiniMap({
  regions,
  connectingRegion,
  activeRegion,
  onRegionClick,
  votingCounts,
}: BracketMiniMapProps) {
  const allDecided = (region: RegionDef) =>
    region.matchups.length > 0 && region.matchups.every((m) => m.status === 'decided')

  return (
    <div>
      {/* Region cards in 2-col grid */}
      <div className="grid grid-cols-2 gap-2">
        {regions.map((region) => {
          const isActive = region.key === activeRegion
          const votingCount = votingCounts[region.key] ?? 0
          const decided = allDecided(region)
          return (
            <button
              key={region.key}
              onClick={() => onRegionClick(region.key)}
              className={`
                flex items-center justify-between rounded-lg border-2 px-3 py-2.5 text-left text-sm font-medium transition-all
                ${isActive
                  ? 'border-primary bg-primary/10 text-primary shadow-sm'
                  : votingCount > 0
                    ? 'border-primary/30 text-foreground hover:border-primary/50 hover:bg-primary/5'
                    : decided
                      ? 'border-border/50 text-muted-foreground'
                      : 'border-border text-muted-foreground hover:border-foreground/30'
                }
              `}
            >
              <span className="truncate">{region.label}</span>
              {votingCount > 0 ? (
                <span className="ml-2 inline-flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-primary/15 px-1.5 text-xs font-bold text-primary">
                  {votingCount}
                </span>
              ) : decided ? (
                <svg className="ml-2 h-4 w-4 shrink-0 text-muted-foreground/50" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                </svg>
              ) : null}
            </button>
          )
        })}
      </div>

      {/* Connector line */}
      <div className="mx-auto h-3 w-px bg-border" />

      {/* Finals/Championship card centered below */}
      {connectingRegion && (
        <div className="flex justify-center">
          <button
            onClick={() => onRegionClick(connectingRegion.key)}
            className={`
              flex items-center gap-2 rounded-lg border-2 px-4 py-2.5 text-sm font-medium transition-all
              ${activeRegion === connectingRegion.key
                ? 'border-primary bg-primary/10 text-primary shadow-sm'
                : (votingCounts[connectingRegion.key] ?? 0) > 0
                  ? 'border-primary/30 text-foreground hover:border-primary/50 hover:bg-primary/5'
                  : allDecided(connectingRegion)
                    ? 'border-border/50 text-muted-foreground'
                    : 'border-border text-muted-foreground hover:border-foreground/30'
              }
            `}
          >
            <span>{connectingRegion.label}</span>
            {(votingCounts[connectingRegion.key] ?? 0) > 0 ? (
              <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary/15 px-1.5 text-xs font-bold text-primary">
                {votingCounts[connectingRegion.key]}
              </span>
            ) : allDecided(connectingRegion) ? (
              <svg className="h-4 w-4 text-muted-foreground/50" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
              </svg>
            ) : null}
          </button>
        </div>
      )}
    </div>
  )
}
