import type { Metadata } from 'next'
import { FrameworkBuilder } from '@/components/frameworks'
import { APP_NAME, FRAMEWORK_BUILDER } from '@/src/lib/constants'

export const metadata: Metadata = {
  title: `${FRAMEWORK_BUILDER.title} · ${APP_NAME}`,
}

export default function NewFrameworkPage() {
  return <FrameworkBuilder />
}
