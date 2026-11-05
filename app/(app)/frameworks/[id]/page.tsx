import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { FrameworkEntry } from '@/components/frameworks'
import { APP_NAME } from '@/src/lib/constants'
import { getFramework } from '@/src/lib/placeholders/frameworks'

export async function generateMetadata(props: PageProps<'/frameworks/[id]'>): Promise<Metadata> {
  const { id } = await props.params
  const framework = getFramework(id)
  return { title: framework ? `${framework.name} · ${APP_NAME}` : APP_NAME }
}

export default async function FrameworkPage(props: PageProps<'/frameworks/[id]'>) {
  const { id } = await props.params
  const framework = getFramework(id)
  if (!framework) notFound()

  return <FrameworkEntry key={framework.id} framework={framework} />
}
