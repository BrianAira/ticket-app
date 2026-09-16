import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { InMemoryApiClient } from '../api/apiClient'
import { SeatGrid } from './SeatGrid'

describe('SeatGrid con InMemoryApiClient', () => {
  it('permite seleccionar y retener un lote de butacas', async () => {
    const client = new InMemoryApiClient()
    const snapshot = await client.getEventSeats(1)
    const selectedSeatIds: number[] = []
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

    function TestSeatSelection() {
      return (
        <>
          <SeatGrid
            seats={snapshot.seats}
            columns={snapshot.room.columns}
            activeUserId="user-1"
            selectedSeatIds={selectedSeatIds}
            onSeatClick={(seat) => selectedSeatIds.push(seat.id)}
          />
          <button
            type="button"
            onClick={() => {
              void client.createHolds(1, {
                user_id: 'user-1',
                seat_ids: selectedSeatIds,
              })
            }}
          >
            Retener selección
          </button>
        </>
      )
    }

    render(
      <QueryClientProvider client={queryClient}>
        <TestSeatSelection />
      </QueryClientProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: /Butaca A1/i }))
    fireEvent.click(screen.getByRole('button', { name: /Butaca A2/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Retener selección' }))

    await waitFor(async () => {
      const updated = await client.getEventSeats(1)
      expect(updated.seats.filter((seat) => seat.status === 'HELD')).toHaveLength(2)
      expect(updated.seats.filter((seat) => seat.held_by_user_id === 'user-1')).toHaveLength(2)
    })
  })
})
