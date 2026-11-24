import type { Metadata } from 'next'
import { GuidedFrameworkEntry } from '@/components/frameworks'
import { APP_NAME } from '@/src/lib/constants'

export const metadata: Metadata = {
  title: `Framework · ${APP_NAME}`,
}

export default async function FrameworkPage(props: PageProps<'/frameworks/[id]'>) {
  const { id } = await props.params

  // Keyed by id so moving between frameworks starts with fresh answers
  return <GuidedFrameworkEntry key={id} id={id} />
}
