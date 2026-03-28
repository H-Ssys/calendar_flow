import { useEffect } from 'react'
import { useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query'
import { supabase } from './client'

export interface RealtimeConfig {
  table: string
  filter?: string
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*'
}

/**
 * Standard hook for all data-reading components that need Realtime updates.
 *
 * Rules:
 * - Channel name: `rt-{table}-{filter ?? 'all'}` — prevents collision between subscriptions
 * - queryKey is serialized with JSON.stringify for useEffect stability
 * - This is the ONLY Realtime pattern allowed — components never call supabase.channel() directly
 */
export function useRealtimeQuery<T>(
  queryKey: unknown[],
  queryFn: () => Promise<T>,
  realtimeConfig: RealtimeConfig
): UseQueryResult<T> {
  const queryClient = useQueryClient()

  // CRITICAL: Channel name format prevents collision
  const channelName = `rt-${realtimeConfig.table}-${realtimeConfig.filter ?? 'all'}`

  useEffect(() => {
    // CRITICAL: Serialize queryKey with JSON.stringify for useEffect stability
    const serializedKey = JSON.stringify(queryKey)

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: realtimeConfig.event ?? '*',
          schema: 'public',
          table: realtimeConfig.table,
          filter: realtimeConfig.filter,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: JSON.parse(serializedKey) })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelName, JSON.stringify(queryKey)])

  return useQuery({ queryKey, queryFn })
}
