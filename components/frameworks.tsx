'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useRef, useState, useTransition } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { ApiError, api, type Framework } from '@/src/lib/api'
import {
  FRAMEWORK_BUILDER,
  FRAMEWORK_ICONS,
  FRAMEWORKS_PAGE,
  toFrameworkIcon,
} from '@/src/lib/constants'
import { queueEntryAnalysis } from '@/src/lib/entry-analysis'
import { composeFrameworkBody } from '@/src/lib/framework-entry'
import { typography } from '@/src/lib/typography'
import { useUnsavedChangesWarning } from '@/src/lib/use-unsaved-changes-warning'
import {
  FRAMEWORK_DESCRIPTION_MAX_LENGTH,
  FRAMEWORK_NAME_MAX_LENGTH,
  FRAMEWORK_PROMPT_MAX_LENGTH,
  FRAMEWORK_PROMPTS_MAX,
  FrameworkCreateSchema,
  FrameworkIdSchema,
  type FrameworkCreateInput,
  type FrameworkCreateOutput,
} from '@/src/server/framework/schemas'
import { Icon } from './Icon'
import { Card, SectionLabel } from './ui'

const LINK_BUTTON = `rounded-xl bg-neutral-900 px-5 py-3 text-surface hover:text-surface ${typography.label}`
const ERROR_TEXT = 'text-[13px] leading-[1.4] font-medium text-amber-700'

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
    <p
      role="alert"
      className="rounded-[10px] bg-amber-100 px-3.5 py-2.5 text-[13px] leading-[1.4] font-medium text-amber-700"
    >
      {children}
    </p>
  )
}

/** A centred title, message and action, for not-found and load-error states. */
function PageMessage({
  title,
  message,
  action,
  alert = false,
}: {
  title: string
  message: string
  action: React.ReactNode
  alert?: boolean
}) {
  return (
    <div
      role={alert ? 'alert' : undefined}
      className="flex min-h-full flex-col items-center justify-center gap-4 px-6 py-24 text-center"
    >
      <h1 className={typography.pageTitle}>{title}</h1>
      <p className={`${typography.body} max-w-[360px]`}>{message}</p>
      {action}
    </div>
  )
}

// --- Gallery ----------------------------------------------------------------

function GallerySkeleton() {
  return (
    <output className="contents">
      <span className="sr-only">Loading frameworks…</span>
      {[0, 1, 2].map((key) => (
        <span
          key={key}
          className="block h-[72px] animate-pulse rounded-[14px] bg-neutral-100 md:h-[180px] md:rounded-2xl"
        />
      ))}
    </output>
  )
}

function DeleteFrameworkConfirmation({
  framework,
  onDone,
}: {
  framework: Framework
  onDone: () => void
}) {
  const queryClient = useQueryClient()
  const remove = api.framework.delete.useMutation()
  // Deleted elsewhere (another tab): a retry could never succeed, so it isn't offered
  const alreadyGone = remove.error?.status === 404

  async function confirm() {
    try {
      await remove.mutateAsync({ id: framework.id })
    } catch (error) {
      if (!(error instanceof ApiError && error.status === 404)) return // Shown below
      // Refetch so the stale card drops out of the gallery
      await queryClient.invalidateQueries({ queryKey: ['framework'] })
    }
    onDone()
  }

  return (
    <fieldset
      aria-label={`Confirm deleting ${framework.name}`}
      className="flex min-w-0 flex-col gap-2 rounded-[10px] border border-amber-500 px-3 py-2.5"
    >
      <p className="text-[13px] leading-[1.45] font-medium">
        Delete “{framework.name}”? Entries you wrote with it are kept.
      </p>
      {remove.isError && !alreadyGone && (
        <p className={ERROR_TEXT}>Couldn’t delete this framework. Try again.</p>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={remove.isPending}
          onClick={() => void confirm()}
          className="h-8 rounded-[10px] bg-amber-700 px-3.5 text-xs leading-none font-semibold text-surface disabled:cursor-not-allowed disabled:opacity-60"
        >
          {remove.isPending ? 'Deleting…' : 'Yes, delete'}
        </button>
        <button
          type="button"
          disabled={remove.isPending}
          onClick={onDone}
          className="h-8 rounded-[10px] border border-neutral-200 px-3.5 text-xs leading-none font-semibold text-neutral-600 hover:text-neutral-900 disabled:opacity-60"
        >
          Keep framework
        </button>
      </div>
    </fieldset>
  )
}

function FrameworkCard({ framework }: { framework: Framework }) {
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const isCustom = framework.userId !== null

  return (
    <div className="relative flex flex-col gap-2">
      <Link
        href={`/frameworks/${framework.id}`}
        className="group h-full rounded-[14px] text-neutral-900 hover:text-neutral-900 focus-visible:ring-2 focus-visible:ring-cloud-200 focus-visible:outline-none md:rounded-2xl"
      >
        <Card className="flex h-full items-center gap-3.5 rounded-[14px] p-4 transition-shadow group-hover:shadow-md md:flex-col md:items-start md:rounded-2xl md:p-[22px]">
          <div className="flex size-10 flex-none items-center justify-center rounded-[11px] bg-sage-100 text-sage-700 md:size-11 md:rounded-xl">
            <Icon name={toFrameworkIcon(framework.icon)} size={20} strokeWidth={1.75} />
          </div>
          <div className="flex flex-1 flex-col gap-0.5 md:gap-1">
            <h3 className={typography.cardTitle}>{framework.name}</h3>
            <p className="text-xs leading-[1.4] text-neutral-600 md:text-[13px] md:leading-[1.5]">
              {framework.description}
            </p>
          </div>
          {/* Leaves room for the delete button on custom cards */}
          <span
            className={`text-[11px] leading-none font-medium text-neutral-400 md:mt-auto md:text-xs ${isCustom ? 'mr-8 md:mr-0' : ''}`}
          >
            {framework.durationMinutes} min
          </span>
        </Card>
      </Link>

      {isCustom && !confirmingDelete && (
        <button
          type="button"
          aria-label={`Delete ${framework.name}`}
          onClick={() => setConfirmingDelete(true)}
          className="absolute top-1/2 right-3 -translate-y-1/2 rounded-lg p-1.5 text-neutral-400 hover:text-amber-700 focus-visible:ring-2 focus-visible:ring-cloud-200 focus-visible:outline-none md:top-3 md:translate-y-0"
        >
          <Icon name="trash" size={16} />
        </button>
      )}
      {confirmingDelete && (
        <DeleteFrameworkConfirmation
          framework={framework}
          onDone={() => setConfirmingDelete(false)}
        />
      )}
    </div>
  )
}

/** `/frameworks`: built-in frameworks, then the user's own, then the "Build your own" card. */
export function FrameworkGallery() {
  const query = api.framework.list.useQuery()
  const frameworks = query.data?.frameworks

  if (query.isError && !frameworks) {
    return (
      <div role="alert" className="flex flex-col items-start gap-3">
        <p className={typography.body}>Couldn’t load frameworks. {query.error.message}</p>
        <button type="button" onClick={() => void query.refetch()} className={LINK_BUTTON}>
          Try again
        </button>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 md:gap-5 xl:grid-cols-3">
      {!frameworks && <GallerySkeleton />}
      {frameworks?.length === 0 && (
        <p className={`${typography.bodySmall} md:col-span-2 xl:col-span-3`}>
          {FRAMEWORKS_PAGE.empty}
        </p>
      )}
      {frameworks?.map((framework) => (
        <FrameworkCard key={framework.id} framework={framework} />
      ))}

      <Link
        href="/frameworks/new"
        className="flex items-center gap-3.5 rounded-[14px] border-[1.5px] border-dashed border-sage-200 p-4 text-sage-700 hover:border-sage-500 hover:text-sage-700 md:min-h-[180px] md:flex-col md:justify-center md:gap-2.5 md:rounded-2xl md:p-[22px]"
      >
        <span className="flex size-10 flex-none items-center justify-center md:size-auto">
          <Icon name="plus" size={20} />
        </span>
        <span className="text-sm leading-[1.3] font-semibold">
          {FRAMEWORKS_PAGE.buildYourOwnLabel}
        </span>
      </Link>
    </div>
  )
}

// --- Guided entry -----------------------------------------------------------

/** Answer a framework's prompts in order, then save them as one entry linked to the framework. */
export function FrameworkEntry({ framework }: { framework: Framework }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const createEntry = api.entry.create.useMutation()
  const [answers, setAnswers] = useState(() => framework.prompts.map(() => ''))
  // Keeps Save disabled until the entry page is up, so a second click can't create a duplicate
  const [isNavigating, startNavigation] = useTransition()

  const body = composeFrameworkBody(framework.prompts, answers)
  const isSaving = createEntry.isPending || isNavigating
  const isSaved = createEntry.isSuccess

  useUnsavedChangesWarning(body !== '' && !isSaved)

  async function save() {
    const entry = await createEntry
      .mutateAsync({ title: framework.name, body, frameworkId: framework.id })
      .catch(() => null) // Shown through `createEntry.error`
    if (!entry) return
    // Seed the entry page's query so it opens without a loading state, then analyze it there
    queryClient.setQueryData(api.entry.findOneEntry.queryKey({ id: entry.id }), entry)
    queueEntryAnalysis(entry.id)
    startNavigation(() => router.push(`/journal/${entry.id}`))
  }

  return (
    <div className="flex min-h-full flex-col">
      <FormHeader
        saveLabel={isSaving ? 'Saving…' : 'Save'}
        mobileSaveLabel={isSaving ? 'Saving…' : 'Done'}
        canSave={body !== '' && !isSaving && !isSaved}
        onSave={() => void save()}
      />

      <div className="mx-auto flex w-full max-w-[660px] flex-col gap-5 px-6 pt-2 pb-16 lg:gap-7 lg:px-0 lg:pt-6">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 flex-none items-center justify-center rounded-[9px] bg-sage-100 text-sage-700 lg:size-10 lg:rounded-[11px]">
            <Icon name={toFrameworkIcon(framework.icon)} size={16} strokeWidth={1.75} />
          </span>
          <h1 className="font-serif text-xl leading-[1.3] font-semibold lg:text-[28px]">
            {framework.name}
          </h1>
        </div>

        {createEntry.error && <Notice>{createEntry.error.message}</Notice>}

        <ol className="flex flex-col gap-5 lg:gap-7">
          {framework.prompts.map((prompt, index) => {
            const id = `prompt-${index + 1}`
            return (
              // Prompts can repeat, so the index keeps keys unique; the list never reorders
              <li key={`${index}-${prompt}`} className="flex flex-col gap-1.5">
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
                  readOnly={isSaving || isSaved}
                  onChange={(event) =>
                    setAnswers((current) =>
                      current.map((answer, i) => (i === index ? event.target.value : answer)),
                    )
                  }
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

function FrameworkLoading() {
  return (
    <output className="flex flex-col gap-4 px-6 pt-24 lg:px-14">
      <span className="sr-only">Loading framework…</span>
      <span className="block h-8 w-1/2 max-w-[320px] animate-pulse rounded-lg bg-neutral-100" />
      <span className="block h-4 w-full max-w-[660px] animate-pulse rounded-lg bg-neutral-100" />
      <span className="block h-4 w-full max-w-[600px] animate-pulse rounded-lg bg-neutral-100" />
    </output>
  )
}

/** `/frameworks/[id]`: loads the framework, then shows its guided entry. */
export function GuidedFrameworkEntry({ id }: { id: string }) {
  // An id that isn't a UUID can't exist, so skip the request and show the same not-found state
  const idIsValid = FrameworkIdSchema.safeParse({ id }).success
  const query = api.framework.get.useQuery({ id }, { enabled: idIsValid })
  const framework = query.data

  const notFound = (
    <PageMessage
      title="Framework not found"
      message="This framework doesn’t exist or has been deleted."
      action={
        <Link href="/frameworks" className={LINK_BUTTON}>
          Back to frameworks
        </Link>
      }
    />
  )

  if (!idIsValid) return notFound
  if (!framework) {
    if (!query.isError) return <FrameworkLoading />
    if (query.error.status === 404) return notFound
    return (
      <PageMessage
        alert
        title="Couldn’t load this framework"
        message={query.error.message}
        action={
          <button type="button" onClick={() => void query.refetch()} className={LINK_BUTTON}>
            Try again
          </button>
        }
      />
    )
  }

  return <FrameworkEntry key={framework.id} framework={framework} />
}

// --- Builder ----------------------------------------------------------------

function move<T>(items: T[], from: number, to: number): T[] {
  if (to < 0 || to >= items.length || from === to) return items
  const next = [...items]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

const FIELD =
  'h-12 w-full rounded-xl border border-neutral-200 bg-surface px-4 text-[15px] text-neutral-900 outline-none placeholder:font-sans placeholder:font-normal placeholder:text-neutral-400 focus:border-neutral-400'

/** `/frameworks/new`: name, description, icon and an ordered list of prompts. */
export function FrameworkBuilder() {
  const router = useRouter()
  const createFramework = api.framework.create.useMutation()
  const [isNavigating, startNavigation] = useTransition()
  const [draft, setDraft] = useState('')
  const draftInput = useRef<HTMLInputElement>(null)

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors, isDirty },
  } = useForm<FrameworkCreateInput, unknown, FrameworkCreateOutput>({
    resolver: zodResolver(FrameworkCreateSchema),
    defaultValues: {
      name: '',
      description: '',
      icon: 'layers',
      prompts: [],
    },
  })
  const [name, description, prompts] = useWatch({
    control,
    name: ['name', 'description', 'prompts'],
  })

  const isSaving = createFramework.isPending || isNavigating
  const isSaved = createFramework.isSuccess
  const atLimit = prompts.length >= FRAMEWORK_PROMPTS_MAX
  const hasDraft = draft.trim() !== ''
  const canSave =
    name.trim() !== '' &&
    description.trim() !== '' &&
    (prompts.length > 0 || hasDraft) &&
    !isSaving &&
    !isSaved

  useUnsavedChangesWarning((isDirty || draft.trim() !== '') && !isSaved)

  function setPrompts(next: string[]) {
    setValue('prompts', next, { shouldDirty: true, shouldValidate: errors.prompts !== undefined })
  }

  function addDraft() {
    const text = draft.trim()
    if (!text) {
      draftInput.current?.focus()
      return
    }
    setPrompts([...prompts, text])
    setDraft('')
  }

  const submit = handleSubmit(async (values) => {
    const created = await createFramework.mutateAsync(values).catch(() => null) // Shown through `createFramework.error`
    if (!created) return
    startNavigation(() => router.push('/frameworks'))
  })

  function save() {
    // A prompt typed but not yet added is part of the framework too. `setValue` updates the form
    // synchronously, so the submit below validates and sends it with the rest.
    if (hasDraft && !atLimit) addDraft()
    void submit()
  }

  // Blank prompts can't be added, so only list-level errors (none, or too many) can occur
  const promptsError = errors.prompts?.message ?? errors.prompts?.root?.message

  return (
    <div className="flex min-h-full flex-col">
      <FormHeader
        title={FRAMEWORK_BUILDER.title}
        saveLabel={isSaving ? 'Saving…' : 'Save framework'}
        mobileSaveLabel={isSaving ? 'Saving…' : 'Save'}
        canSave={canSave}
        onSave={save}
      />

      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          save()
        }}
        className="mx-auto flex w-full max-w-[660px] flex-col gap-4 px-5 pt-1 pb-16 lg:gap-5 lg:px-0 lg:pt-6"
      >
        <h1 className={`${typography.pageTitle} hidden lg:block`}>{FRAMEWORK_BUILDER.title}</h1>

        {createFramework.error && <Notice>{createFramework.error.message}</Notice>}

        <div className="flex flex-col gap-1.5">
          <input
            aria-label="Framework name"
            aria-invalid={errors.name ? true : undefined}
            placeholder={FRAMEWORK_BUILDER.namePlaceholder}
            maxLength={FRAMEWORK_NAME_MAX_LENGTH}
            {...register('name')}
            className={`${FIELD} font-serif font-semibold`}
          />
          {errors.name && <p className={ERROR_TEXT}>{errors.name.message}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <input
            aria-label="Description"
            aria-invalid={errors.description ? true : undefined}
            placeholder={FRAMEWORK_BUILDER.descriptionPlaceholder}
            maxLength={FRAMEWORK_DESCRIPTION_MAX_LENGTH}
            {...register('description')}
            className={FIELD}
          />
          {errors.description && <p className={ERROR_TEXT}>{errors.description.message}</p>}
        </div>

        <fieldset className="flex flex-col gap-2.5">
          <legend className="contents">
            <SectionLabel className="text-[11px] tracking-[0.05em]">Icon</SectionLabel>
          </legend>
          <div className="flex flex-wrap gap-2">
            {FRAMEWORK_ICONS.map((icon) => (
              <label key={icon} className="cursor-pointer">
                <input
                  type="radio"
                  value={icon}
                  aria-label={icon}
                  {...register('icon')}
                  className="peer sr-only"
                />
                <span className="flex size-10 items-center justify-center rounded-[11px] border-[1.5px] border-neutral-200 text-neutral-600 peer-checked:border-sage-500 peer-checked:bg-sage-100 peer-checked:text-sage-700 peer-focus-visible:ring-2 peer-focus-visible:ring-cloud-200 hover:border-neutral-300">
                  <Icon name={icon} size={18} strokeWidth={1.75} />
                </span>
              </label>
            ))}
          </div>
          {errors.icon && <p className={ERROR_TEXT}>{errors.icon.message}</p>}
        </fieldset>

        <SectionLabel className="text-[11px] tracking-[0.05em]">Prompts</SectionLabel>

        <ol aria-label="Prompts" className="flex flex-col gap-2.5">
          {prompts.map((prompt, index) => (
            <li
              // Prompts can repeat; index plus text is unique and stable enough for plain text
              key={`${index}-${prompt}`}
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
                    aria-label={`Move “${prompt}” ${direction.label}`}
                    disabled={direction.disabled}
                    onClick={() => setPrompts(move(prompts, index, index + direction.offset))}
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
              <span className="flex-1 text-sm leading-[1.4]">{prompt}</span>
              <button
                type="button"
                aria-label={`Remove “${prompt}”`}
                onClick={() => setPrompts(prompts.filter((_, i) => i !== index))}
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
                maxLength={FRAMEWORK_PROMPT_MAX_LENGTH}
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
        {promptsError && <p className={ERROR_TEXT}>{promptsError}</p>}

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
            A framework can have up to {FRAMEWORK_PROMPTS_MAX} prompts.
          </p>
        )}
      </form>
    </div>
  )
}
