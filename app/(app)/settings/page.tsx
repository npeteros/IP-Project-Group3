import { LogOutButton } from '@/components/LogOutButton'
import { SettingsGroup } from '@/components/ui'
import { typography } from '@/src/lib/typography'

// Placeholder until the full Settings page lands (Phase 6). Log out lives here now.
export default function SettingsPage() {
  return (
    <div className="flex max-w-[760px] flex-col gap-7 px-5 pt-7 pb-8 md:px-10 lg:px-16 lg:pt-12">
      <h1 className={typography.pageTitle}>Settings</h1>
      <SettingsGroup label="Security">
        <LogOutButton />
      </SettingsGroup>
    </div>
  )
}
