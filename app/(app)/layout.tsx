import { redirect } from 'next/navigation'
import { MobileTabBar, Sidebar } from '@/components/AppNav'
import { getSession } from '@/src/lib/auth'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (!(await getSession())) redirect('/login')

  return (
    <div className="flex h-dvh overflow-hidden bg-bg text-neutral-900">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="relative flex-1 overflow-y-auto">{children}</main>
        <MobileTabBar />
      </div>
    </div>
  )
}
