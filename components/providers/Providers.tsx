'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'
import { ApiError } from '@/src/lib/api'

const MAX_RETRIES = 3

function shouldRetry(failureCount: number, error: Error) {
  if (error instanceof ApiError && error.status < 500) return false
  return failureCount < MAX_RETRIES
}

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 60 * 1000, retry: shouldRetry },
    },
  })
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(makeQueryClient)

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools />
    </QueryClientProvider>
  )
}
