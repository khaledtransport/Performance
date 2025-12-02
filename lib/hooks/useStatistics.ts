import useSWR from 'swr'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('فشل جلب الإحصائيات')
  return res.json()
}

export function useStatistics(date?: string) {
  const d = date || new Date().toISOString().split('T')[0]
  const key = `/api/statistics?date=${d}`
  const { data, error, mutate, isLoading } = useSWR(key, fetcher, { refreshInterval: 120_000 })

  return {
    statistics: data,
    isLoading,
    isError: !!error,
    refresh: mutate
  }
}