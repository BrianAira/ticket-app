import type {
  ApiErrorDetail,
  ApiErrorResponse,
  ConfirmHoldsRequest,
  ConfirmHoldsResponse,
  CreateHoldsRequest,
  CreateHoldsResponse,
  Event,
  EventSeatsResponse,
  Hold,
  Seat,
  SeatsStreamEvent,
  User,
} from '../types/api'

export class ApiClientError extends Error {
  readonly status: number
  readonly response: ApiErrorResponse

  constructor(status: number, detail: ApiErrorDetail) {
    super(detail.message)
    this.name = 'ApiClientError'
    this.status = status
    this.response = { detail }
  }
}

export interface ApiClient {
  getUsers(): Promise<User[]>
  getEvents(): Promise<Event[]>
  getEvent(eventId: number): Promise<Event>
  getEventSeats(eventId: number): Promise<EventSeatsResponse>
  createHolds(eventId: number, request: CreateHoldsRequest): Promise<CreateHoldsResponse>
  confirmHolds(request: ConfirmHoldsRequest): Promise<ConfirmHoldsResponse>
  releaseHold(holdId: number): Promise<void>
  subscribeToEvent(
    eventId: number,
    onEvent: (event: SeatsStreamEvent) => void,
  ): () => void
}

const users: User[] = [
  { id: 'user-1', name: 'Ana' },
  { id: 'user-2', name: 'Bruno' },
]

const events: Event[] = [
  {
    id: 1,
    name: 'Concierto del sábado',
    room_id: 1,
    room_name: 'Sala Principal',
    starts_at: '2026-08-08T21:00:00Z',
  },
  {
    id: 2,
    name: 'Obra de teatro',
    room_id: 2,
    room_name: 'Sala Experimental',
    starts_at: '2026-08-15T20:00:00Z',
  },
]

const createSeats = (offset: number): Seat[] =>
  ['A', 'B', 'C'].flatMap((row, rowIndex) =>
    [1, 2, 3, 4].map((number) => ({
      id: offset + rowIndex * 4 + number,
      label: `${row}${number}`,
      row,
      number,
      x: number,
      y: rowIndex + 1,
      sector: rowIndex === 2 ? 'PULLMAN' : 'PLATEA',
      status: 'AVAILABLE',
      hold_id: null,
      held_by_user_id: null,
      expires_at: null,
    })),
  )

const cloneSeat = (seat: Seat): Seat => ({ ...seat })
const cloneHold = (hold: Hold): Hold => ({ ...hold })

export class InMemoryApiClient implements ApiClient {
  private readonly seatsByEvent = new Map<number, Seat[]>([
    [1, createSeats(100)],
    [2, createSeats(200)],
  ])

  private readonly holds = new Map<number, Hold>()
  private readonly releasedHoldIds = new Set<number>()
  private nextHoldId = 5001
  private nextStreamEventId = 1
  private readonly subscribers = new Map<number, Set<(event: SeatsStreamEvent) => void>>()

  async getUsers(): Promise<User[]> {
    return users.map((user) => ({ ...user }))
  }

  async getEvents(): Promise<Event[]> {
    return events.map((event) => ({ ...event }))
  }

  async getEvent(eventId: number): Promise<Event> {
    const event = events.find((candidate) => candidate.id === eventId)
    if (!event) {
      throw this.error(404, 'EVENT_NOT_FOUND', 'El evento no existe.')
    }
    return { ...event }
  }

  async getEventSeats(eventId: number): Promise<EventSeatsResponse> {
    const event = await this.getEvent(eventId)
    const seats = this.seatsByEvent.get(eventId)
    if (!seats) {
      throw this.error(404, 'EVENT_NOT_FOUND', 'El evento no existe.')
    }

    return {
      event: {
        id: event.id,
        name: event.name,
        starts_at: event.starts_at,
      },
      room: {
        id: event.room_id,
        name: event.room_name,
        rows: 3,
        columns: 4,
      },
      seats: seats.map(cloneSeat),
    }
  }

  async createHolds(
    eventId: number,
    request: CreateHoldsRequest,
  ): Promise<CreateHoldsResponse> {
    await this.getEvent(eventId)
    if (!users.some((user) => user.id === request.user_id)) {
      throw this.error(404, 'USER_NOT_FOUND', 'El usuario no existe.')
    }
    if (
      request.seat_ids.length === 0 ||
      new Set(request.seat_ids).size !== request.seat_ids.length
    ) {
      throw this.error(422, 'INVALID_REQUEST', 'La solicitud no es válida.')
    }

    const seats = this.seatsByEvent.get(eventId)
    if (!seats) {
      throw this.error(404, 'EVENT_NOT_FOUND', 'El evento no existe.')
    }
    const requestedSeats = request.seat_ids.map((seatId) =>
      seats.find((seat) => seat.id === seatId),
    )
    const missingSeatIds = request.seat_ids.filter(
      (seatId) => !seats.some((seat) => seat.id === seatId),
    )
    if (missingSeatIds.length > 0) {
      throw this.error(404, 'SEATS_NOT_FOUND', 'Una o más butacas no existen.', {
        seat_ids: missingSeatIds,
      })
    }

    const validSeats = requestedSeats.filter((seat): seat is Seat => Boolean(seat))
    const unavailableSeatIds = validSeats
      .filter(
        (seat): seat is Seat =>
          Boolean(seat) &&
          seat.status !== 'AVAILABLE' &&
          seat.held_by_user_id !== request.user_id,
      )
      .map((seat) => seat.id)
    if (unavailableSeatIds.length > 0) {
      throw this.error(
        409,
        'SEATS_UNAVAILABLE',
        'Una o más butacas ya no están disponibles.',
        { seat_ids: unavailableSeatIds },
      )
    }

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString()
    const createdHolds = validSeats.map((seat) => {
      const existingHold = seat.hold_id === null ? undefined : this.holds.get(seat.hold_id)
      if (existingHold && existingHold.user_id === request.user_id) {
        return cloneHold(existingHold)
      }

      const hold: Hold = {
        id: this.nextHoldId++,
        event_id: eventId,
        seat_id: seat.id,
        user_id: request.user_id,
        status: 'HELD',
        expires_at: expiresAt,
      }
      this.holds.set(hold.id, hold)
      Object.assign(seat, {
        status: 'HELD',
        hold_id: hold.id,
        held_by_user_id: hold.user_id,
        expires_at: hold.expires_at ?? null,
      })
      return cloneHold(hold)
    })

    this.publishSeatsUpdated(eventId, validSeats)
    return { holds: createdHolds }
  }

  async confirmHolds(request: ConfirmHoldsRequest): Promise<ConfirmHoldsResponse> {
    const requestedHolds = request.hold_ids.map((holdId) => this.holds.get(holdId))
    const missingHoldIds = request.hold_ids.filter((holdId) => {
      const hold = this.holds.get(holdId)
      return !hold || hold.user_id !== request.user_id
    })
    if (missingHoldIds.length > 0) {
      throw this.error(
        404,
        'HOLDS_NOT_FOUND',
        'Una o más retenciones no existen.',
        { hold_ids: missingHoldIds },
      )
    }
    const validHolds = requestedHolds.filter((hold): hold is Hold => Boolean(hold))
    const invalidHoldIds = validHolds
      .filter(
        (hold): hold is Hold =>
          Boolean(hold) &&
          (this.releasedHoldIds.has(hold.id) ||
            hold.status !== 'HELD' ||
            !hold.expires_at ||
            new Date(hold.expires_at).getTime() <= Date.now()),
      )
      .map((hold) => hold.id)
    if (invalidHoldIds.length > 0) {
      throw this.error(
        409,
        'HOLDS_NOT_CONFIRMABLE',
        'Una o más retenciones no pueden confirmarse.',
        { hold_ids: invalidHoldIds },
      )
    }

    const eventIds = new Set<number>()
    const confirmedHolds = validHolds.map((hold) => {
      hold.status = 'CONFIRMED'
      delete hold.expires_at
      if (hold.event_id !== undefined) {
        eventIds.add(hold.event_id)
        const seat = this.seatsByEvent.get(hold.event_id)?.find(
          (candidate) => candidate.id === hold.seat_id,
        )
        if (seat) {
          seat.status = 'CONFIRMED'
          seat.expires_at = null
        }
      }
      return cloneHold(hold)
    })
    eventIds.forEach((eventId) => this.publishSeatsUpdated(eventId))
    return { holds: confirmedHolds }
  }

  async releaseHold(holdId: number): Promise<void> {
    const hold = this.holds.get(holdId)
    if (!hold) {
      throw this.error(404, 'HOLD_NOT_FOUND', 'La retención no existe.')
    }
    if (this.releasedHoldIds.has(holdId)) {
      return
    }
    if (hold.status === 'CONFIRMED') {
      throw this.error(409, 'HOLD_NOT_RELEASABLE', 'La retención no puede liberarse.')
    }
    if (hold.event_id !== undefined) {
      const seat = this.seatsByEvent.get(hold.event_id)?.find(
        (candidate) => candidate.id === hold.seat_id,
      )
      if (seat) {
        Object.assign(seat, {
          status: 'AVAILABLE',
          hold_id: null,
          held_by_user_id: null,
          expires_at: null,
        })
        this.publishSeatsUpdated(hold.event_id, [seat])
      }
    }
    this.releasedHoldIds.add(holdId)
  }

  subscribeToEvent(
    eventId: number,
    onEvent: (event: SeatsStreamEvent) => void,
  ): () => void {
    const subscribers = this.subscribers.get(eventId) ?? new Set()
    subscribers.add(onEvent)
    this.subscribers.set(eventId, subscribers)
    void this.getEventSeats(eventId).then((data) => {
      onEvent({ id: this.nextStreamEventId++, type: 'snapshot', data })
    })
    return () => {
      subscribers.delete(onEvent)
    }
  }

  private publishSeatsUpdated(eventId: number, changedSeats?: Seat[]): void {
    const subscribers = this.subscribers.get(eventId)
    if (!subscribers) {
      return
    }
    const seats = changedSeats ?? this.seatsByEvent.get(eventId) ?? []
    const event: SeatsStreamEvent = {
      id: this.nextStreamEventId++,
      type: 'seats.updated',
      data: { seats: seats.map(cloneSeat) },
    }
    subscribers.forEach((subscriber) => subscriber(event))
  }

  private error(
    status: number,
    code: string,
    message: string,
    extra: Pick<ApiErrorDetail, 'seat_ids' | 'hold_ids'> = {},
  ): ApiClientError {
    return new ApiClientError(status, { code, message, ...extra })
  }
}
