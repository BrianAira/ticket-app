import type { Seat } from '../types/api'

interface SeatGridProps {
  seats: Seat[]
  columns: number
  activeUserId?: string
  selectedSeatIds?: number[]
  onSeatClick?: (seat: Seat) => void
}

export function SeatGrid({
  seats,
  columns,
  activeUserId,
  selectedSeatIds = [],
  onSeatClick,
}: SeatGridProps) {
  const selected = new Set(selectedSeatIds)

  return (
    <div className="mx-auto w-full max-w-3xl rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-8 border-b-2 border-slate-300 pb-3 text-center dark:border-slate-700">
        <span className="text-[11px] font-semibold tracking-[0.3em] text-slate-400 dark:text-slate-500">
          ESCENARIO
        </span>
      </div>
      <div
        className="mx-auto grid max-w-2xl gap-2"
        aria-label="Mapa de butacas"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(3rem, 1fr))` }}
      >
        {seats.map((seat) => {
        const isMine = seat.status === 'HELD' && seat.held_by_user_id === activeUserId
        const isSelected = selected.has(seat.id)
        const isAvailable = seat.status === 'AVAILABLE' || isMine
        const className = seat.status === 'CONFIRMED'
          ? 'aspect-square cursor-not-allowed rounded-lg border border-rose-800/50 bg-rose-600 text-xs font-medium text-white dark:border-rose-700 dark:bg-rose-600'
          : isMine || isSelected
          ? 'aspect-square rounded-lg border border-emerald-600 bg-emerald-600 text-xs font-medium text-white shadow-sm transition hover:bg-emerald-700 dark:border-emerald-500 dark:bg-emerald-600 dark:hover:bg-emerald-500'
          : seat.status === 'AVAILABLE'
            ? 'aspect-square rounded-lg border border-slate-300 bg-slate-100 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
            : seat.status === 'HELD'
              ? 'aspect-square cursor-not-allowed rounded-lg border border-amber-400 bg-amber-500 text-xs font-medium text-white dark:border-amber-600 dark:bg-amber-700 dark:text-amber-100'
              : 'aspect-square cursor-not-allowed rounded-lg border border-rose-800/50 bg-rose-900/30 text-xs font-medium text-rose-500 dark:border-rose-800/50 dark:bg-rose-900/30 dark:text-rose-400'

        return (
          <button
            key={seat.id}
            type="button"
            className={className}
            style={{ gridColumnStart: seat.x, gridRowStart: seat.y }}
            disabled={!onSeatClick || !isAvailable}
            onClick={() => onSeatClick?.(seat)}
            aria-label={`Butaca ${seat.label}, ${seat.status}`}
          >
            {seat.label}
          </button>
        )
        })}
      </div>
      <div className="mt-8 flex flex-wrap justify-center gap-x-5 gap-y-3 border-t border-slate-200 pt-5 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-300">
        <span className="inline-flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm border border-slate-300 bg-slate-100 dark:border-slate-700 dark:bg-slate-800" />
          Disponible
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm bg-emerald-600" />
          Tu Retención
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm bg-amber-500" />
          Retenido por otro usuario
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm bg-rose-600" />
          Confirmado / Ocupado
        </span>
      </div>
    </div>
  )
}
