import { useState } from 'react';
import { VENUE_ZONES } from '../lib/venueData';

const CROWD_COLORS = {
  critical: { fill: '#EA4335', glow: 'rgba(234,67,53,0.3)' },
  high: { fill: '#FBBC05', glow: 'rgba(251,188,5,0.3)' },
  moderate: { fill: '#4285F4', glow: 'rgba(66,133,244,0.3)' },
  low: { fill: '#34A853', glow: 'rgba(52,168,83,0.3)' },
};

export default function VenueMap({
  zones = [],
  highlightPath = [],
  selectedZone = null,
  onZoneClick,
  compact = false,
  className = '',
}) {
  const [hoveredZone, setHoveredZone] = useState(null);
  const liveMap = Object.fromEntries(zones.map((z) => [z.id, z]));

  return (
    <div className={`relative ${className}`}>
      <svg
        viewBox="-10 -10 620 385"
        className="w-full"
        style={{ maxHeight: compact ? 220 : 400 }}
        role="img"
        aria-label="Venue map showing zones and crowd levels"
      >
        {/* Background grid pattern */}
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e8eaed" strokeWidth="0.5" opacity="0.5" />
          </pattern>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#1a73e8" />
          </marker>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <rect x="-10" y="-10" width="620" height="385" fill="url(#grid)" />

        {/* Zone polygons */}
        {VENUE_ZONES.map((zone) => {
          const live = liveMap[zone.id];
          const crowdLevel = live?.crowdLevel || 'low';
          const colors = CROWD_COLORS[crowdLevel];
          const isOnPath = highlightPath.includes(zone.id);
          const isSelected = selectedZone === zone.id;
          const isHovered = hoveredZone === zone.id;
          const occupancy = live?.currentOccupancy || 0;
          const pct = zone.capacity > 0 ? Math.round((occupancy / zone.capacity) * 100) : 0;
          const isActive = isOnPath || isSelected || isHovered;

          return (
            <g
              key={zone.id}
              onClick={() => onZoneClick?.(zone.id)}
              onMouseEnter={() => setHoveredZone(zone.id)}
              onMouseLeave={() => setHoveredZone(null)}
              className={onZoneClick ? 'cursor-pointer' : ''}
              role={onZoneClick ? 'button' : undefined}
              tabIndex={onZoneClick ? 0 : undefined}
              aria-label={`${zone.name}: ${pct}% occupied`}
            >
              {/* Glow effect for active zones */}
              {isActive && (
                <polygon
                  points={zone.points}
                  fill={colors.glow}
                  stroke="none"
                  filter="url(#glow)"
                />
              )}
              <polygon
                points={zone.points}
                fill={isActive ? colors.fill : zone.color}
                fillOpacity={isActive ? 0.35 : 0.15}
                stroke={isSelected ? '#202124' : isActive ? colors.fill : zone.color}
                strokeWidth={isSelected ? 2.5 : isActive ? 2 : 1}
                strokeLinejoin="round"
                className="transition-all duration-300"
              />
              {/* Labels */}
              {!compact && (
                <>
                  <text
                    x={zone.center.x}
                    y={zone.center.y - 5}
                    textAnchor="middle"
                    style={{ fontSize: '7.5px', fontWeight: 500, fill: '#3c4043' }}
                    className="pointer-events-none select-none"
                  >
                    {zone.name}
                  </text>
                  <text
                    x={zone.center.x}
                    y={zone.center.y + 9}
                    textAnchor="middle"
                    style={{ fontSize: '8px', fontWeight: 700, fill: colors.fill }}
                    className="pointer-events-none select-none"
                  >
                    {pct}%
                  </text>
                </>
              )}
              {compact && (
                <text
                  x={zone.center.x}
                  y={zone.center.y + 3}
                  textAnchor="middle"
                  style={{ fontSize: '7px', fontWeight: 700, fill: colors.fill }}
                  className="pointer-events-none select-none"
                >
                  {pct > 0 ? `${pct}%` : ''}
                </text>
              )}
            </g>
          );
        })}

        {/* Path lines with animated dashes */}
        {highlightPath.length > 1 &&
          highlightPath.slice(0, -1).map((zoneId, i) => {
            const from = VENUE_ZONES.find((z) => z.id === zoneId);
            const to = VENUE_ZONES.find((z) => z.id === highlightPath[i + 1]);
            if (!from || !to) return null;
            return (
              <g key={`path-${i}`}>
                <line
                  x1={from.center.x} y1={from.center.y}
                  x2={to.center.x} y2={to.center.y}
                  stroke="#1a73e8" strokeWidth="2.5" strokeDasharray="8,4"
                  markerEnd="url(#arrowhead)" opacity="0.8"
                >
                  <animate attributeName="stroke-dashoffset" from="24" to="0" dur="1s" repeatCount="indefinite" />
                </line>
              </g>
            );
          })}

        {/* Start/End markers on path */}
        {highlightPath.length > 1 && (() => {
          const startZone = VENUE_ZONES.find((z) => z.id === highlightPath[0]);
          const endZone = VENUE_ZONES.find((z) => z.id === highlightPath[highlightPath.length - 1]);
          return (
            <>
              {startZone && (
                <circle cx={startZone.center.x} cy={startZone.center.y} r="6" fill="#34A853" stroke="white" strokeWidth="2" />
              )}
              {endZone && (
                <circle cx={endZone.center.x} cy={endZone.center.y} r="6" fill="#EA4335" stroke="white" strokeWidth="2" />
              )}
            </>
          );
        })()}
      </svg>

      {/* Hover tooltip */}
      {hoveredZone && !compact && (() => {
        const zone = VENUE_ZONES.find((z) => z.id === hoveredZone);
        const live = liveMap[hoveredZone];
        if (!zone) return null;
        const pct = zone.capacity > 0 ? Math.round(((live?.currentOccupancy || 0) / zone.capacity) * 100) : 0;
        return (
          <div className="absolute top-2 right-2 bg-white rounded-xl shadow-lg border border-google-gray-200 p-3 min-w-[160px] pointer-events-none z-10">
            <p className="text-sm font-medium text-google-gray-900">{zone.name}</p>
            <p className="text-xs text-google-gray-500 capitalize">{zone.type}</p>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-google-gray-500">{(live?.currentOccupancy || 0).toLocaleString()} / {zone.capacity.toLocaleString()}</span>
              <span className={`text-xs font-semibold ${
                pct >= 85 ? 'text-google-red' : pct >= 65 ? 'text-yellow-600' : pct >= 35 ? 'text-google-blue' : 'text-google-green'
              }`}>{pct}%</span>
            </div>
            <div className="mt-1.5 h-1.5 bg-google-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  pct >= 85 ? 'bg-google-red' : pct >= 65 ? 'bg-google-yellow' : pct >= 35 ? 'bg-google-blue' : 'bg-google-green'
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })()}
    </div>
  );
}
