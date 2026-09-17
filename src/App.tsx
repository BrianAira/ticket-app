import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import {
  Link,
  Navigate,
  Route,
  Routes,
  useNavigate,
  useParams,
} from 'react-router-dom'
import { Navbar } from './components/Navbar'
import { ConflictModal } from './components/ConflictModal'
import { SeatGrid } from './components/SeatGrid'
import { Timer } from './components/Timer'
import {
  useConfirmHolds,
  useEventSeats,
  useEvents,
  useHoldSeats,
  useReleaseHold,
} from './hooks/useApi'
import { useSeatStream } from './hooks/useSeatStream'
import type { RootState } from './store'
import { ApiClientError } from './api/apiClient'


function EventsPage() {
  const eventsQuery = useEvents()
  if (eventsQuery.isLoading) return <p className="mx-auto w-[calc(100%-3rem)] max-w-5xl py-12 text-slate-700 dark:text-slate-200">Cargando eventos...</p>
  if (eventsQuery.isError) return <p className="mx-auto w-[calc(100%-3rem)] max-w-5xl py-12 text-red-600 dark:text-red-400">No se pudieron cargar los eventos.</p>
  return (
    <section className="mx-auto max-w-6xl px-6 py-12 text-slate-900 dark:text-slate-100">
      <div className="mb-8 border-b border-slate-200 pb-6 dark:border-slate-800">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Agenda</p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Próximos eventos</h1>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {eventsQuery.data?.map((event) => (
          <Link className="group block rounded-xl border border-slate-200 bg-white p-5 text-slate-800 no-underline shadow-sm transition hover:-translate-y-0.5 hover:border-slate-400 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-600" key={event.id} to={`/eventos/${event.id}`}>
            <h2 className="text-xl font-semibold tracking-tight group-hover:text-slate-600 dark:group-hover:text-slate-300">{event.name}</h2>
            <p className="mt-2 text-slate-600 dark:text-slate-300">{event.room_name}</p>
            <time className="mt-1 block text-sm text-slate-500 dark:text-slate-400" dateTime={event.starts_at}>
              {new Date(event.starts_at).toLocaleString()}
            </time>
          </Link>
        ))}
      </div>
    </section>
  )
}

function EventPage() {
  const { eventId } = useParams()
  const parsedEventId = Number(eventId)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const activeUser = useSelector((state: RootState) => state.user.selectedUser)
  const seatsQuery = useEventSeats(parsedEventId)
  const stream = useSeatStream(parsedEventId)
  const holdSeats = useHoldSeats()
  const confirmHolds = useConfirmHolds()
  const releaseHold = useReleaseHold()
  const [selectedSeatIds, setSelectedSeatIds] = useState<number[]>([])
  const activeUserId = activeUser?.id
  const data = stream.data ?? seatsQuery.data
  const selectedSeats = useMemo(
    () => data?.seats.filter((seat) => selectedSeatIds.includes(seat.id)) ?? [],
    [data?.seats, selectedSeatIds],
  )
  const conflictError = holdSeats.error instanceof ApiClientError && holdSeats.error.status === 409
    ? holdSeats.error
    : confirmHolds.error instanceof ApiClientError && confirmHolds.error.status === 409
      ? confirmHolds.error
      : null
  const userHeldSeats = data?.seats.filter(
    (seat) => seat.status === 'HELD' && seat.held_by_user_id === activeUserId,
  ) ?? []
  const handleHoldConfirmed = () => {
    setSelectedSeatIds([])
    void queryClient.invalidateQueries({
      queryKey: ['seats', parsedEventId],
    })
  }
  const handleHoldExpired = useCallback(() => {
    setSelectedSeatIds([])
    void queryClient.invalidateQueries({
      queryKey: ['seats', parsedEventId],
    })
  }, [parsedEventId, queryClient])
  const handleReleaseHold = useCallback(async () => {
    if (!activeUserId || userHeldSeats.length === 0) {
      return
    }

    const holdIds = userHeldSeats
      .map((seat) => seat.hold_id)
      .filter((holdId): holdId is number => holdId !== null)

    await Promise.all(
      holdIds.map((holdId) =>
        releaseHold.mutateAsync({ holdId, eventId: parsedEventId }),
      ),
    )

    setSelectedSeatIds([])
    void queryClient.invalidateQueries({
      queryKey: ['seats', parsedEventId],
    })
  }, [activeUserId, parsedEventId, queryClient, releaseHold, userHeldSeats])

  useEffect(() => {
    const resetSelection = window.setTimeout(() => {
      setSelectedSeatIds([])
    }, 0)
    return () => window.clearTimeout(resetSelection)
  }, [activeUserId])

  if (!Number.isInteger(parsedEventId)) return <Navigate to="/eventos" replace />
  if (seatsQuery.isLoading && !data) return <p className="mx-auto w-[calc(100%-3rem)] max-w-5xl py-12 text-slate-700 dark:text-slate-200">Cargando sala...</p>
  if (seatsQuery.isError && !data) return <p className="mx-auto w-[calc(100%-3rem)] max-w-5xl py-12 text-red-600 dark:text-red-400">No se pudo cargar la sala.</p>
  if (!data) return null

  const toggleSeat = (seatId: number) => {
    setSelectedSeatIds((ids) =>
      ids.includes(seatId) ? ids.filter((id) => id !== seatId) : [...ids, seatId],
    )
  }

  return (
    <section className="mx-auto max-w-6xl px-6 py-12 text-slate-900 dark:text-slate-100">
      <button className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800" type="button" onClick={() => navigate('/eventos')}>← Volver a eventos</button>
      <div className="mb-8 mt-8">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Detalle del evento</p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{data.event.name}</h1>
      </div>
      <p className="mt-2 text-slate-600 dark:text-slate-300">{data.room.name}</p>
      <SeatGrid
        seats={data.seats}
        columns={data.room.columns}
        activeUserId={activeUser?.id}
        selectedSeatIds={selectedSeatIds}
        onSeatClick={(seat) => toggleSeat(seat.id)}
      />
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <p className="text-sm text-slate-600 dark:text-slate-300"><span className="font-semibold text-slate-900 dark:text-white">{selectedSeats.length}</span> butaca(s) seleccionada(s)</p>
        {selectedSeats.some((seat) => seat.expires_at) && (
          <p>Retención: <Timer
            expiresAt={selectedSeats.find((seat) => seat.expires_at)?.expires_at}
            onExpire={handleHoldExpired}
          /></p>
        )}
        <button
          type="button"
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
          disabled={!activeUser || selectedSeatIds.length === 0 || holdSeats.isPending}
          onClick={() => {
            if (activeUser) {
              holdSeats.mutate({
                eventId: parsedEventId,
                request: { user_id: activeUser.id, seat_ids: selectedSeatIds },
              })
            }
          }}
        >
          {holdSeats.isPending ? 'Reteniendo...' : 'Retener butacas'}
        </button>
        {userHeldSeats.length > 0 && activeUser && (
          <>
            <button
              type="button"
              className="rounded-lg border border-emerald-600 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-emerald-500 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
              disabled={confirmHolds.isPending}
              onClick={() => {
                confirmHolds.mutate(
                  {
                    user_id: activeUser.id,
                    hold_ids: userHeldSeats.flatMap((seat) =>
                      seat.hold_id === null ? [] : [seat.hold_id],
                    ),
                  },
                  { onSuccess: handleHoldConfirmed },
                )
              }}
            >
              {confirmHolds.isPending ? 'Confirmando...' : 'Confirmar Compra'}
            </button>
            <button
              type="button"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              disabled={releaseHold.isPending}
              onClick={() => {
                void handleReleaseHold()
              }}
            >
              {releaseHold.isPending ? 'Cancelando...' : 'Cancelar Retención'}
            </button>
          </>
        )}
      </div>
      <ConflictModal
        error={conflictError}
        eventId={parsedEventId}
        onClose={() => holdSeats.reset()}
      />
    </section>
  )
}
function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<EventPage />} />
          <Route path="/eventos" element={<EventsPage />} />
          <Route path="/eventos/:eventId" element={<EventPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}

export default App