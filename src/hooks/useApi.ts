import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query'
import { apiClient, type ApiClient } from '../api/apiClient'
import type {
  ConfirmHoldsRequest,
  ConfirmHoldsResponse,
  CreateHoldsRequest,
  CreateHoldsResponse,
  Event,
  EventSeatsResponse,
  Hold,
  User,
} from '../types/api'

export const queryKeys = {
  users: ['users'] as const,
  events: ['events'] as const,
  eventSeats: (eventId: number) => ['events', eventId, 'seats'] as const,
}

export const useUsers = (
  client: ApiClient = apiClient,
): UseQueryResult<User[]> =>
  useQuery({
    queryKey: queryKeys.users,
    queryFn: () => client.getUsers(),
  })

export const useEvents = (
  client: ApiClient = apiClient,
): UseQueryResult<Event[]> =>
  useQuery({
    queryKey: queryKeys.events,
    queryFn: () => client.getEvents(),
  })

export const useEventSeats = (
  eventId: number,
  client: ApiClient = apiClient,
): UseQueryResult<EventSeatsResponse> =>
  useQuery({
    queryKey: queryKeys.eventSeats(eventId),
    queryFn: () => client.getEventSeats(eventId),
    enabled: Number.isFinite(eventId),
    refetchInterval: 30000,
  })

export interface HoldSeatsVariables {
  eventId: number
  request: CreateHoldsRequest
}

export const useHoldSeats = (
  client: ApiClient = apiClient,
): UseMutationResult<CreateHoldsResponse, Error, HoldSeatsVariables> => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ eventId, request }) => client.createHolds(eventId, request),
    onSuccess: (_response, { eventId }) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.eventSeats(eventId),
      })
    },
  })
}

export const useConfirmHolds = (
  client: ApiClient = apiClient,
): UseMutationResult<ConfirmHoldsResponse, Error, ConfirmHoldsRequest> => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request) => client.confirmHolds(request),
    onSuccess: (response) => {
      const eventIds = new Set(
        response.holds
          .map((hold) => hold.event_id)
          .filter((eventId): eventId is number => eventId !== undefined),
      )
      eventIds.forEach((eventId) => {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.eventSeats(eventId),
        })
      })
    },
  })
}

export const useReleaseHold = (
  client: ApiClient = apiClient,
): UseMutationResult<void, Error, { holdId: number; eventId?: number }> => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ holdId }) => client.releaseHold(holdId),
    onSuccess: (_response, { eventId }) => {
      if (eventId !== undefined) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.eventSeats(eventId),
        })
      } else {
        void queryClient.invalidateQueries({ queryKey: ['events'] })
      }
    },
  })
}

export type { Hold }
