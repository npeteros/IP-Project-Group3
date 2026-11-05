import type { Metadata } from 'next'
import { FrameworkBuilder } from '@/components/frameworks'
import { APP_NAME } from '@/src/lib/constants'
import { FRAMEWORK_BUILDER } from '@/src/lib/placeholders/frameworks'

export const metadata: Metadata = {
  title: `${FRAMEWORK_BUILDER.title} · ${APP_NAME}`,
}

export default function NewFrameworkPage() {
  return <FrameworkBuilder />
}
