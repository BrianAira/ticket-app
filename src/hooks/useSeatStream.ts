import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { apiClient, type ApiClient } from '../api/apiClient'
import type { EventSeatsResponse, Seat, SeatsStreamEvent } from '../types/api'
import { queryKeys } from './useApi'

interface UseSeatStreamOptions {
  client?: ApiClient
  streamUrl?: string
}

interface SeatStreamState {
  data: EventSeatsResponse | undefined
  error: Error | null
}

const mergeSeats = (current: Seat[], updates: Seat[]): Seat[] => {
  const updatesById = new Map(updates.map((seat) => [seat.id, seat]))
  return current.map((seat) => updatesById.get(seat.id) ?? seat)
}

export const useSeatStream = (
  eventId: number,
  options: UseSeatStreamOptions = {},
): SeatStreamState => {
  const queryClient = useQueryClient()
  const [state, setState] = useState<SeatStreamState>({
    data: undefined,
    error: null,
  })

  useEffect(() => {
    if (!Number.isFinite(eventId)) {
      return
    }

    let active = true
    const handleEvent = (event: SeatsStreamEvent): void => {
      if (!active) {
        return
      }
      setState((previous) => {
        if (event.type === 'snapshot') {
          queryClient.setQueryData(queryKeys.eventSeats(eventId), event.data)
          return { data: event.data, error: null }
        }
        if (!previous.data) {
          return previous
        }
        const data = {
          ...previous.data,
          seats: mergeSeats(previous.data.seats, event.data.seats),
        }
        queryClient.setQueryData(queryKeys.eventSeats(eventId), data)
        return { data, error: null }
      })
    }

    if (options.streamUrl) {
      const source = new EventSource(options.streamUrl)
      source.addEventListener('snapshot', (message) => {
        handleEvent({
          id: Number(message.lastEventId),
          type: 'snapshot',
          data: JSON.parse(message.data) as EventSeatsResponse,
        })
      })
      source.addEventListener('seats.updated', (message) => {
        handleEvent({
          id: Number(message.lastEventId),
          type: 'seats.updated',
          data: JSON.parse(message.data) as { seats: Seat[] },
        })
      })
      source.onerror = () => {
        if (active) {
          setState((previous) => ({
            ...previous,
            error: new Error('La conexión de asientos se cerró.'),
          }))
        }
      }
      return () => {
        active = false
        source.close()
      }
    }

    const unsubscribe = (options.client ?? apiClient).subscribeToEvent(
      eventId,
      handleEvent,
    )
    return () => {
      active = false
      unsubscribe()
    }
  }, [eventId, options.client, options.streamUrl, queryClient])

  return state
}
