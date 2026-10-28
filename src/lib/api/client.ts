import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
  type UseMutationOptions,
  type UseQueryOptions,
} from '@tanstack/react-query'
import type { ApiErrorCode } from '@/src/server/api/errors'
import type { ApiErrorBody } from '@/src/server/api/handler'

declare module '@tanstack/react-query' {
  interface Register {
    defaultError: ApiError
  }
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiErrorCode,
    message: string,
    readonly issues?: ApiErrorBody['error']['issues'],
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

type QueryParams = Record<string, string | number | boolean | null | undefined>

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  query?: QueryParams
  body?: unknown
  signal?: AbortSignal
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', query, body, signal } = options

  const res = await fetch(path + toQueryString(query), {
    method,
    signal,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  if (!res.ok) {
    const json: Partial<ApiErrorBody> | null = await res.json().catch(() => null)
    throw new ApiError(
      res.status,
      json?.error?.code ?? 'INTERNAL_ERROR',
      json?.error?.message ?? 'Something went wrong.',
      json?.error?.issues,
    )
  }

  if (res.status === 204) return undefined as T
  return res.json()
}

function toQueryString(query: QueryParams = {}) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value))
  }
  const search = params.toString()
  return search ? `?${search}` : ''
}

type QueryHookOptions<TData> = Omit<UseQueryOptions<TData>, 'queryKey' | 'queryFn'>

export function defineQuery<TInput, TData>(
  key: readonly [domain: string, procedure: string],
  fetcher: (input: TInput, signal?: AbortSignal) => Promise<TData>,
) {
  const queryKey = (input: TInput): QueryKey => [...key, input]
  const options = (input: TInput) =>
    queryOptions({ queryKey: queryKey(input), queryFn: ({ signal }) => fetcher(input, signal) })

  return {
    queryKey,
    queryOptions: options,
    fetch: fetcher,
    useQuery: (input: TInput, hookOptions?: QueryHookOptions<TData>) =>
      useQuery({ ...options(input), ...hookOptions }),
  }
}

export function defineMutation<TInput, TData>(
  mutationFn: (input: TInput) => Promise<TData>,
  config: { invalidates?: QueryKey[] } = {},
) {
  return {
    mutate: mutationFn,
    useMutation: <TOnMutateResult = unknown>(
      hookOptions?: Omit<
        UseMutationOptions<TData, ApiError, TInput, TOnMutateResult>,
        'mutationFn'
      >,
    ) => {
      const queryClient = useQueryClient()

      return useMutation({
        ...hookOptions,
        mutationFn,
        onSuccess: async (...args) => {
          await Promise.all(
            (config.invalidates ?? []).map((queryKey) =>
              queryClient.invalidateQueries({ queryKey }),
            ),
          )
          await hookOptions?.onSuccess?.(...args)
        },
      })
    },
  }
}
