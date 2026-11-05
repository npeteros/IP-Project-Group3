import { LogOutButton } from '@/components/LogOutButton'
import { ChangePasswordRow, LanguageGroup, RemindersGroup } from '@/components/settings'
import { ThemeSwitch } from '@/components/ThemeSwitch'
import { SettingsGroup, SettingsRow } from '@/components/ui'
import { NO_TRAINING_NOTE } from '@/src/lib/placeholders/settings'
import { getTheme } from '@/src/lib/theme-server'
import { typography } from '@/src/lib/typography'

export default async function GeneralSettingsPage() {
  const theme = await getTheme()

  return (
    <div className="flex max-w-[632px] flex-col gap-7 pt-2 lg:pt-0">
      <h2 className={typography.sectionTitle}>General</h2>

      <SettingsGroup label="Appearance">
        <SettingsRow icon="sun" label="Theme">
          <ThemeSwitch initialTheme={theme} />
        </SettingsRow>
      </SettingsGroup>

      <LanguageGroup />

      <SettingsGroup label="Security" id="security">
        <ChangePasswordRow />
        <LogOutButton />
      </SettingsGroup>

      <RemindersGroup />

      <p className="mt-1 text-center text-xs leading-[1.4] text-neutral-400">{NO_TRAINING_NOTE}</p>
    </div>
  )
}
