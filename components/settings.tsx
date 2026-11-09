'use client'

import { useState } from 'react'
import {
  EXPORT_SUMMARY,
  LANGUAGE_NOTE,
  LANGUAGES,
  REMINDER_DEFAULTS,
  type LanguageCode,
} from '@/src/lib/placeholders/settings'
import { RadioCards, Toggle } from './controls'
import { Icon } from './Icon'
import { SettingsGroup, SettingsRow } from './ui'

const NOT_CONNECTED = 'This isn’t connected yet — settings use placeholder data for now.'

/** Inline notice for actions that aren't wired to the API yet. */
export function PlaceholderNotice({ children = NOT_CONNECTED }: { children?: React.ReactNode }) {
  return (
    <output className="block rounded-[10px] bg-amber-100 px-3.5 py-2.5 text-[13px] leading-[1.4] font-medium text-amber-700">
      {children}
    </output>
  )
}

export function LanguageGroup() {
  const [language, setLanguage] = useState<LanguageCode>('en')

  return (
    <div className="flex flex-col gap-2.5">
      <SettingsGroup label="Language">
        <SettingsRow icon="globe" label={<label htmlFor="language">App language</label>}>
          <select
            id="language"
            value={language}
            onChange={(event) => setLanguage(event.target.value as LanguageCode)}
            className="h-9 rounded-[10px] border border-neutral-200 bg-surface px-3 text-[13px] font-medium text-neutral-900 outline-none focus-visible:ring-2 focus-visible:ring-cloud-200"
          >
            {LANGUAGES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </SettingsRow>
      </SettingsGroup>
      {language !== 'en' && (
        <p className="flex items-start gap-2.5 rounded-[14px] bg-amber-100 px-4 py-3.5 text-xs leading-normal text-amber-700">
          <Icon name="info" size={16} className="mt-px flex-none" />
          {LANGUAGE_NOTE}
        </p>
      )}
    </div>
  )
}

const PASSWORD_FIELD =
  'h-11 w-full rounded-xl border border-neutral-200 bg-surface px-3.5 text-sm text-neutral-900 outline-none focus:border-neutral-900 focus-visible:ring-2 focus-visible:ring-cloud-200'

/** "Change password" row that expands into a form. UI only until the auth flow supports it. */
export function ChangePasswordRow() {
  const [open, setOpen] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => {
          setOpen(!open)
          setSubmitted(false)
        }}
        className="flex min-h-[60px] w-full items-center justify-between gap-4 px-4 py-3.5 text-left hover:bg-neutral-100/60 sm:px-5"
      >
        <span className="flex items-center gap-3">
          <span className="flex size-7 flex-none items-center justify-center rounded-lg bg-sage-100 text-sage-700">
            <Icon name="lock" size={15} />
          </span>
          <span className="text-sm leading-none font-medium">Change password</span>
        </span>
        <Icon
          name="chevron-right"
          size={16}
          className={`text-neutral-400 transition-transform ${open ? 'rotate-90' : ''}`}
        />
      </button>
      {open && (
        <form
          onSubmit={(event) => {
            event.preventDefault()
            setSubmitted(true)
          }}
          className="flex flex-col gap-3 px-4 pb-4 sm:px-5 sm:pl-[60px]"
        >
          {[
            { id: 'current-password', label: 'Current password', autoComplete: 'current-password' },
            { id: 'new-password', label: 'New password', autoComplete: 'new-password' },
            { id: 'confirm-password', label: 'Confirm new password', autoComplete: 'new-password' },
          ].map((field) => (
            <div key={field.id} className="flex flex-col gap-1.5">
              <label
                htmlFor={field.id}
                className="text-[13px] leading-none font-medium text-neutral-600"
              >
                {field.label}
              </label>
              <input
                id={field.id}
                type="password"
                autoComplete={field.autoComplete}
                className={PASSWORD_FIELD}
              />
            </div>
          ))}
          <button
            type="submit"
            className="mt-1 h-10 w-fit rounded-[10px] bg-neutral-900 px-[18px] text-[13px] leading-none font-semibold text-surface hover:bg-neutral-900/90"
          >
            Update password
          </button>
          {submitted && <PlaceholderNotice />}
        </form>
      )}
    </div>
  )
}

export function RemindersGroup() {
  const [enabled, setEnabled] = useState(REMINDER_DEFAULTS.enabled)
  const [time, setTime] = useState(REMINDER_DEFAULTS.time)

  return (
    <SettingsGroup label="Reminders" id="reminders">
      <SettingsRow icon="bell" label="Daily reminder">
        <Toggle label="Daily reminder" checked={enabled} onChange={setEnabled} />
      </SettingsRow>
      <SettingsRow
        label={
          <label htmlFor="reminder-time" className="sm:pl-[30px]">
            Reminder time
          </label>
        }
      >
        <input
          id="reminder-time"
          type="time"
          value={time}
          disabled={!enabled}
          onChange={(event) => setTime(event.target.value)}
          className="h-9 rounded-[10px] border border-neutral-200 bg-surface px-2.5 text-[13px] font-medium text-neutral-600 outline-none focus-visible:ring-2 focus-visible:ring-cloud-200 disabled:opacity-50"
        />
      </SettingsRow>
    </SettingsGroup>
  )
}

const EXPORT_FORMATS = [
  { value: 'md', label: 'Markdown', icon: 'file-text' },
  { value: 'json', label: 'JSON', icon: 'file-text' },
] as const

export function ExportCard() {
  const [format, setFormat] = useState<'md' | 'json'>('md')
  const [requested, setRequested] = useState(false)

  return (
    <div className="flex flex-col gap-3.5 rounded-[14px] border border-neutral-200 bg-surface p-5 shadow-sm">
      <p className="text-[13px] leading-normal text-neutral-600">
        Download a full copy of your entries. Nothing is sent anywhere.
      </p>
      <RadioCards
        label="Export format"
        options={[...EXPORT_FORMATS]}
        value={format}
        onChange={(next) => {
          setFormat(next)
          setRequested(false)
        }}
      />
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs leading-none font-medium text-neutral-400">
          {EXPORT_SUMMARY.entryCount} entries · {EXPORT_SUMMARY.size}
        </span>
        <button
          type="button"
          onClick={() => setRequested(true)}
          className="flex h-[38px] items-center gap-2 rounded-[10px] bg-neutral-900 px-[18px] text-[13px] leading-none font-semibold text-surface hover:bg-neutral-900/90"
        >
          <Icon name="download" size={14} strokeWidth={2.2} />
          Export .{format}
        </button>
      </div>
      {requested && <PlaceholderNotice>Export isn&rsquo;t connected yet.</PlaceholderNotice>}
    </div>
  )
}

/** Danger zone. Two-step confirm; nothing is deleted while it's placeholder UI. */
export function DeleteAllData() {
  const [step, setStep] = useState<'idle' | 'confirm' | 'done'>('idle')

  return (
    <section
      aria-label="Danger zone"
      className="flex flex-col gap-3 rounded-[14px] border border-amber-500 p-4 sm:px-5 sm:py-[18px]"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="flex items-start gap-3">
          <Icon name="trash" size={18} className="mt-px flex-none text-amber-700" />
          <div className="flex flex-col gap-1">
            <span className="text-sm leading-none font-semibold text-amber-700">
              Delete all data now
            </span>
            <span className="text-xs leading-normal text-neutral-600">
              Every entry, tag and insight is permanently erased from your account and
              Moodiary&rsquo;s servers.
            </span>
          </div>
        </div>
        {step === 'idle' && (
          <button
            type="button"
            onClick={() => setStep('confirm')}
            className="h-[38px] w-fit flex-none rounded-[10px] border border-amber-500 px-[18px] text-[13px] leading-none font-semibold text-amber-700 hover:bg-amber-100"
          >
            Delete
          </button>
        )}
      </div>
      {step === 'confirm' && (
        <div className="flex flex-wrap items-center gap-2.5 sm:pl-[30px]">
          <span className="text-[13px] font-medium">This can&rsquo;t be undone. Are you sure?</span>
          <button
            type="button"
            onClick={() => setStep('done')}
            className="h-9 rounded-[10px] bg-amber-700 px-4 text-[13px] leading-none font-semibold text-surface"
          >
            Yes, delete everything
          </button>
          <button
            type="button"
            onClick={() => setStep('idle')}
            className="h-9 rounded-[10px] px-3 text-[13px] leading-none font-semibold text-neutral-600 hover:text-neutral-900"
          >
            Cancel
          </button>
        </div>
      )}
      {step === 'done' && (
        <PlaceholderNotice>
          Deleting isn&rsquo;t connected yet &mdash; nothing was deleted.
        </PlaceholderNotice>
      )}
    </section>
  )
}
