import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { ApiClientError } from '../api/apiClient'
import { queryKeys } from '../hooks/useApi'

interface ConflictModalProps {
  error: ApiClientError | null
  eventId: number
  onClose: () => void
}

export function ConflictModal({ error, eventId, onClose }: ConflictModalProps) {
  const queryClient = useQueryClient()
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!error) {
      return
    }
    previousFocusRef.current = document.activeElement as HTMLElement | null
    closeButtonRef.current?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
        return
      }
      if (event.key !== 'Tab') {
        return
      }
      const modal = event.currentTarget as HTMLElement
      const focusable = Array.from(
        modal.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      )
      if (focusable.length === 0) {
        event.preventDefault()
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    const modal = document.getElementById('conflict-modal')
    modal?.addEventListener('keydown', handleKeyDown)
    return () => {
      modal?.removeEventListener('keydown', handleKeyDown)
      previousFocusRef.current?.focus()
    }
  }, [error, onClose])

  if (!error || error.status !== 409) {
    return null
  }

  const { detail } = error.response
  const affectedIds = detail.seat_ids ?? detail.hold_ids ?? []
  const affectedLabel = detail.seat_ids ? 'Butacas afectadas' : 'Retenciones afectadas'

  const handleRefresh = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.eventSeats(eventId) })
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <section
        id="conflict-modal"
        aria-labelledby="conflict-modal-title"
        aria-describedby="conflict-modal-message"
        aria-modal="true"
        className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900"
        role="dialog"
        tabIndex={-1}
      >
        <h2 id="conflict-modal-title" className="text-lg font-semibold text-slate-900 dark:text-white">
          La disponibilidad cambió
        </h2>
        <p id="conflict-modal-message" className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          {detail.message}
        </p>
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {affectedLabel}
          </p>
          <ul className="mt-2 list-inside list-disc text-sm text-slate-700 dark:text-slate-200">
            {affectedIds.map((id) => <li key={id}>{id}</li>)}
          </ul>
        </div>
        <button
          ref={closeButtonRef}
          type="button"
          className="mt-6 w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
          onClick={handleRefresh}
        >
          Entendido / Refrescar Mapa
        </button>
      </section>
    </div>
  )
}
