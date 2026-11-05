import { LogOutButton } from '@/components/LogOutButton'
import { ThemeSwitch } from '@/components/ThemeSwitch'
import { SettingsGroup, SettingsRow } from '@/components/ui'
import { getTheme } from '@/src/lib/theme-server'
import { typography } from '@/src/lib/typography'

// Placeholder until the full Settings page lands (Phase 6).
export default async function SettingsPage() {
  const theme = await getTheme()

  return (
    <div className="flex max-w-[760px] flex-col gap-7 px-5 pt-7 pb-8 md:px-10 lg:px-16 lg:pt-12">
      <h1 className={typography.pageTitle}>Settings</h1>
      <SettingsGroup label="Appearance">
        <SettingsRow icon="sun" label="Theme">
          <ThemeSwitch initialTheme={theme} />
        </SettingsRow>
      </SettingsGroup>
      <SettingsGroup label="Security">
        <LogOutButton />
      </SettingsGroup>
    </div>
  )
}
