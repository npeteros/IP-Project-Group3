'use client'

import Link from 'next/link'
import { useRef, useState } from 'react'
import { FRAMEWORK_BUILDER, type Framework } from '@/src/lib/placeholders/frameworks'
import { typography } from '@/src/lib/typography'
import { Icon } from './Icon'
import { SectionLabel } from './ui'

const NOT_CONNECTED = 'Saving isn’t connected yet — frameworks use placeholder data.'

/** Cancel / title / Save bar: text actions on mobile, a filled Save button on desktop. */
function FormHeader({
  title,
  saveLabel,
  mobileSaveLabel = saveLabel,
  canSave = true,
  onSave,
}: {
  title?: string
  saveLabel: string
  mobileSaveLabel?: string
  canSave?: boolean
  onSave: () => void
}) {
  return (
    <header className="grid h-16 flex-none grid-cols-[1fr_auto_1fr] items-center gap-4 px-5 lg:flex lg:h-auto lg:justify-end lg:px-14 lg:pt-8">
      <Link
        href="/frameworks"
        className="justify-self-start text-[15px] leading-none font-medium text-neutral-400 hover:text-neutral-600 lg:text-sm"
      >
        Cancel
      </Link>
      <span className="font-serif text-base leading-none font-semibold lg:hidden">{title}</span>
      <button
        type="button"
        onClick={onSave}
        disabled={!canSave}
        className="justify-self-end text-[15px] leading-none font-bold text-neutral-900 disabled:cursor-not-allowed disabled:opacity-40 lg:rounded-[11px] lg:bg-neutral-900 lg:px-[22px] lg:py-2.5 lg:text-sm lg:font-semibold lg:text-surface lg:enabled:hover:bg-neutral-900/90"
      >
        <span className="lg:hidden">{mobileSaveLabel}</span>
        <span className="hidden lg:inline">{saveLabel}</span>
      </button>
    </header>
  )
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <output className="block rounded-[10px] bg-amber-100 px-3.5 py-2.5 text-[13px] leading-[1.4] font-medium text-amber-700">
      {children}
    </output>
  )
}

/** Answer a framework's prompts in order. Placeholder: answers stay in local state. */
export function FrameworkEntry({ framework }: { framework: Framework }) {
  const [answers, setAnswers] = useState(() => framework.prompts.map(() => ''))
  const [saved, setSaved] = useState(false)

  return (
    <div className="flex min-h-full flex-col">
      <FormHeader saveLabel="Save" mobileSaveLabel="Done" onSave={() => setSaved(true)} />

      <div className="mx-auto flex w-full max-w-[660px] flex-col gap-5 px-6 pt-2 pb-16 lg:gap-7 lg:px-0 lg:pt-6">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 flex-none items-center justify-center rounded-[9px] bg-sage-100 text-sage-700 lg:size-10 lg:rounded-[11px]">
            <Icon name={framework.icon} size={16} strokeWidth={1.75} />
          </span>
          <h1 className="font-serif text-xl leading-[1.3] font-semibold lg:text-[28px]">
            {framework.name}
          </h1>
        </div>

        {saved && <Notice>{NOT_CONNECTED}</Notice>}

        <ol className="flex flex-col gap-5 lg:gap-7">
          {framework.prompts.map((prompt, index) => {
            const id = `prompt-${index + 1}`
            return (
              <li key={prompt} className="flex flex-col gap-1.5">
                <label htmlFor={id} className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="flex size-5 flex-none items-center justify-center rounded-full bg-neutral-900 text-[11px] leading-none font-bold text-surface"
                  >
                    {index + 1}
                  </span>
                  <span className="text-sm leading-[1.3] font-semibold lg:text-[15px]">
                    {prompt}
                  </span>
                </label>
                <textarea
                  id={id}
                  value={answers[index]}
                  placeholder="Write your answer…"
                  onChange={(event) => {
                    setSaved(false)
                    setAnswers((current) =>
                      current.map((answer, i) => (i === index ? event.target.value : answer)),
                    )
                  }}
                  className="min-h-[48px] w-full resize-none bg-transparent pl-7 text-sm leading-[1.6] text-neutral-600 outline-none [field-sizing:content] placeholder:text-neutral-400 focus:text-neutral-900 lg:text-[15px]"
                />
              </li>
            )
          })}
        </ol>
      </div>
    </div>
  )
}

function move<T>(items: T[], from: number, to: number): T[] {
  if (to < 0 || to >= items.length || from === to) return items
  const next = [...items]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

type Prompt = { id: number; text: string }

/** Build a custom framework: a name and an ordered list of prompts. Placeholder: not saved. */
export function FrameworkBuilder() {
  const [name, setName] = useState('')
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [draft, setDraft] = useState('')
  const [saved, setSaved] = useState(false)
  const nextId = useRef(1)
  const draftInput = useRef<HTMLInputElement>(null)

  const atLimit = prompts.length >= FRAMEWORK_BUILDER.maxPrompts
  const canSave = name.trim() !== '' && prompts.length > 0

  function change(next: Prompt[]) {
    setSaved(false)
    setPrompts(next)
  }

  function addDraft() {
    const text = draft.trim()
    if (!text) {
      draftInput.current?.focus()
      return
    }
    change([...prompts, { id: nextId.current++, text }])
    setDraft('')
  }

  return (
    <div className="flex min-h-full flex-col">
      <FormHeader
        title={FRAMEWORK_BUILDER.title}
        saveLabel="Save framework"
        mobileSaveLabel="Save"
        canSave={canSave}
        onSave={() => setSaved(true)}
      />

      <div className="mx-auto flex w-full max-w-[660px] flex-col gap-4 px-5 pt-1 pb-16 lg:gap-5 lg:px-0 lg:pt-6">
        <h1 className={`${typography.pageTitle} hidden lg:block`}>{FRAMEWORK_BUILDER.title}</h1>

        {saved && <Notice>{NOT_CONNECTED}</Notice>}

        <input
          aria-label="Framework name"
          value={name}
          placeholder={FRAMEWORK_BUILDER.namePlaceholder}
          onChange={(event) => {
            setSaved(false)
            setName(event.target.value)
          }}
          className="h-12 w-full rounded-xl border border-neutral-200 bg-surface px-4 font-serif text-[15px] font-semibold text-neutral-900 outline-none placeholder:font-sans placeholder:font-normal placeholder:text-neutral-400 focus:border-neutral-400"
        />

        <SectionLabel className="text-[11px] tracking-[0.05em]">Prompts</SectionLabel>

        <ol aria-label="Prompts" className="flex flex-col gap-2.5">
          {prompts.map((prompt, index) => (
            <li
              key={prompt.id}
              className="flex items-center gap-2.5 rounded-xl border border-neutral-200 bg-surface py-2.5 pr-3 pl-2 shadow-sm"
            >
              <div className="flex flex-none flex-col">
                {[
                  { label: 'up', offset: -1, rotate: '-rotate-90', disabled: index === 0 },
                  {
                    label: 'down',
                    offset: 1,
                    rotate: 'rotate-90',
                    disabled: index === prompts.length - 1,
                  },
                ].map((direction) => (
                  <button
                    key={direction.label}
                    type="button"
                    aria-label={`Move “${prompt.text}” ${direction.label}`}
                    disabled={direction.disabled}
                    onClick={() => change(move(prompts, index, index + direction.offset))}
                    className="rounded p-px text-neutral-400 hover:text-neutral-900 focus-visible:ring-2 focus-visible:ring-cloud-200 focus-visible:outline-none disabled:opacity-30"
                  >
                    <Icon
                      name="chevron-right"
                      size={14}
                      strokeWidth={2.4}
                      className={direction.rotate}
                    />
                  </button>
                ))}
              </div>
              <span className="flex-1 text-sm leading-[1.4]">{prompt.text}</span>
              <button
                type="button"
                aria-label={`Remove “${prompt.text}”`}
                onClick={() => change(prompts.filter((p) => p.id !== prompt.id))}
                className="rounded p-0.5 text-neutral-400 hover:text-neutral-900"
              >
                <Icon name="close" size={16} />
              </button>
            </li>
          ))}

          {!atLimit && (
            <li className="flex items-center gap-2.5 rounded-xl border border-neutral-200 bg-surface py-3 pr-3 pl-2.5 shadow-sm">
              <Icon name="plus" size={18} className="flex-none text-neutral-400" />
              <input
                ref={draftInput}
                aria-label="New prompt"
                value={draft}
                placeholder={FRAMEWORK_BUILDER.promptPlaceholder}
                maxLength={200}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    addDraft()
                  }
                }}
                className="flex-1 bg-transparent text-sm text-neutral-900 outline-none placeholder:text-neutral-400"
              />
            </li>
          )}
        </ol>

        <button
          type="button"
          onClick={addDraft}
          disabled={atLimit}
          className="flex h-[46px] items-center justify-center gap-2 rounded-xl border border-neutral-200 text-sm leading-none font-semibold text-neutral-600 hover:text-neutral-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Icon name="plus" size={15} strokeWidth={2.2} />
          Add prompt
        </button>
        {atLimit && (
          <p className="text-xs text-neutral-400">
            A framework can have up to {FRAMEWORK_BUILDER.maxPrompts} prompts.
          </p>
        )}
      </div>
    </div>
  )
}
