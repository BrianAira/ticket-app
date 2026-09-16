export interface User {
  id: string
  name: string
}

export interface Event {
  id: number
  name: string
  room_id: number
  room_name: string
  starts_at: string
}

export type SeatStatus = 'AVAILABLE' | 'HELD' | 'CONFIRMED'

export interface Seat {
  id: number
  label: string
  row: string
  number: number
  x: number
  y: number
  sector: string
  status: SeatStatus
  hold_id: number | null
  held_by_user_id: string | null
  expires_at: string | null
}

export type HoldStatus = 'HELD' | 'CONFIRMED'

export interface Hold {
  id: number
  event_id?: number
  seat_id: number
  user_id: string
  status: HoldStatus
  expires_at?: string
}

export interface Room {
  id: number
  name: string
  rows: number
  columns: number
}

export interface EventSeatsResponse {
  event: Pick<Event, 'id' | 'name' | 'starts_at'>
  room: Room
  seats: Seat[]
}

export interface CreateHoldsRequest {
  user_id: string
  seat_ids: number[]
}

export interface CreateHoldsResponse {
  holds: Hold[]
}

export interface ConfirmHoldsRequest {
  user_id: string
  hold_ids: number[]
}

export interface ConfirmHoldsResponse {
  holds: Hold[]
}

export interface ApiErrorDetail {
  code: string
  message: string
  seat_ids?: number[]
  hold_ids?: number[]
}

export interface ApiErrorResponse {
  detail: ApiErrorDetail
}

export interface SnapshotEvent {
  id: number
  type: 'snapshot'
  data: EventSeatsResponse
}

export interface SeatsUpdatedEvent {
  id: number
  type: 'seats.updated'
  data: {
    seats: Seat[]
  }
}

export type SeatsStreamEvent = SnapshotEvent | SeatsUpdatedEvent

