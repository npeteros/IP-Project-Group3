import { defineMutation, defineQuery, request } from '@/src/lib/api/client'
import type {
  Framework,
  FrameworkCreateInput,
  FrameworkIdInput,
  FrameworkList,
} from '@/src/server/framework/schemas'

const FRAMEWORKS = '/api/v1/frameworks'

export const framework = {
  list: defineQuery(['framework', 'list'], (_input: void, signal) =>
    request<FrameworkList>(FRAMEWORKS, { signal }),
  ),
  get: defineQuery(['framework', 'get'], ({ id }: FrameworkIdInput, signal) =>
    request<Framework>(`${FRAMEWORKS}/${id}`, { signal }),
  ),
  create: defineMutation(
    (input: FrameworkCreateInput) =>
      request<Framework>(FRAMEWORKS, { method: 'POST', body: input }),
    { invalidates: [['framework']] },
  ),
  delete: defineMutation(
    ({ id }: FrameworkIdInput) => request<void>(`${FRAMEWORKS}/${id}`, { method: 'DELETE' }),
    { invalidates: [['framework']] },
  ),
}
