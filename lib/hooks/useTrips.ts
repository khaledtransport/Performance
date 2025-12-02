import useSWR from 'swr'

interface TripFilters {
  date?: string
  status?: string
  direction?: string
  routeId?: string
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('فشل جلب البيانات')
  return res.json()
}

export function useTrips(filters: TripFilters = {}) {
  const params = new URLSearchParams()
  if (filters.date) params.set('date', filters.date)
  if (filters.status && filters.status !== 'all') params.set('status', filters.status)
  if (filters.direction) params.set('direction', filters.direction)
  if (filters.routeId) params.set('routeId', filters.routeId)

  const key = `/api/trips${params.toString() ? `?${params.toString()}` : ''}`
  const { data, error, mutate, isLoading } = useSWR(key, fetcher, { refreshInterval: 60_000 })

  return {
    trips: Array.isArray(data) ? data : [],
    isLoading,
    isError: !!error,
    refresh: mutate
  }
}