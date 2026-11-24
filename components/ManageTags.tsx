'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useId, useState } from 'react'
import { useForm } from 'react-hook-form'
import { api } from '@/src/lib/api'
import { ApiError } from '@/src/lib/api/client'
import { typography } from '@/src/lib/typography'
import { TagRenameSchema, type Tag, type TagRenameInput } from '@/src/server/tag/schemas'

const ERROR_TEXT = 'text-xs leading-[1.4] font-medium text-amber-700'
const ACTION =
  'rounded-full px-2.5 py-1.5 text-xs leading-none font-semibold text-neutral-600 hover:text-neutral-900 disabled:cursor-not-allowed disabled:opacity-60'

const entryCount = (count: number) => `${count} ${count === 1 ? 'entry' : 'entries'}`

function RenameForm({
  tag,
  onDone,
  onRenamed,
}: {
  tag: Tag
  onDone: () => void
  onRenamed: (from: string, to: string) => void
}) {
  const rename = api.tag.rename.useMutation()
  const errorId = useId()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<TagRenameInput>({
    resolver: zodResolver(TagRenameSchema),
    defaultValues: { name: tag.name },
  })

  const submit = handleSubmit(async ({ name }) => {
    if (name === tag.name) return onDone()
    try {
      await rename.mutateAsync({ id: tag.id, name })
      onRenamed(tag.name, name)
      onDone()
    } catch (error) {
      // A name that's taken (409) is a problem with this field, so it shows under it
      setError('name', {
        message:
          error instanceof ApiError && error.status === 409
            ? error.message
            : 'Couldn’t rename this tag. Please try again.',
      })
    }
  })

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <input
          // The user just asked to rename, so the field takes focus right away.
          // oxlint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
          aria-label={`New name for ${tag.name}`}
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? errorId : undefined}
          readOnly={rename.isPending}
          {...register('name')}
          onKeyDown={(event) => {
            if (event.key === 'Escape') onDone()
          }}
          className="h-8 min-w-0 flex-1 rounded-full border border-neutral-200 bg-bg px-3.5 text-[13px] text-neutral-900 outline-none focus:border-neutral-400"
        />
        <button type="submit" disabled={rename.isPending} className={ACTION}>
          {rename.isPending ? 'Saving…' : 'Save'}
        </button>
        <button type="button" disabled={rename.isPending} onClick={onDone} className={ACTION}>
          Cancel
        </button>
      </div>
      {errors.name && (
        <p id={errorId} role="alert" className={ERROR_TEXT}>
          {errors.name.message}
        </p>
      )}
    </form>
  )
}

function DeleteConfirmation({
  tag,
  onDone,
  onDeleted,
}: {
  tag: Tag
  onDone: () => void
  onDeleted: (name: string) => void
}) {
  const remove = api.tag.delete.useMutation()

  return (
    <fieldset
      aria-label={`Confirm deleting ${tag.name}`}
      className="flex min-w-0 flex-col gap-2 rounded-[10px] border border-amber-500 px-3 py-2.5"
    >
      <p className="text-[13px] leading-[1.45] font-medium">
        Delete “{tag.name}”? It will be removed from every entry that uses it
        {tag.entryCount > 0 ? ` (${entryCount(tag.entryCount)}).` : '.'}
      </p>
      {remove.isError && (
        <p role="alert" className={ERROR_TEXT}>
          Couldn’t delete this tag. Please try again.
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={remove.isPending}
          onClick={async () => {
            // Awaited rather than a per-call `onSuccess`, which TanStack skips if this unmounts
            // first (the tag list refetches as soon as the delete lands). Missing `onDeleted`
            // would leave the tag in the editor, and the next Save would create it again.
            try {
              await remove.mutateAsync({ id: tag.id })
            } catch {
              return // Shown through `remove.isError`
            }
            onDeleted(tag.name)
            onDone()
          }}
          className="h-8 rounded-[10px] bg-amber-700 px-3.5 text-xs leading-none font-semibold text-surface disabled:cursor-not-allowed disabled:opacity-60"
        >
          {remove.isPending ? 'Deleting…' : 'Yes, delete'}
        </button>
        <button type="button" disabled={remove.isPending} onClick={onDone} className={ACTION}>
          Keep tag
        </button>
      </div>
    </fieldset>
  )
}

type Active = { id: string; mode: 'rename' | 'delete' } | null

/**
 * Lists every tag with how many entries use it, and lets the user rename or delete them.
 * `onRenamed` and `onDeleted` tell the editor so the entry's own tag list follows along.
 */
export function ManageTags({
  onRenamed,
  onDeleted,
}: {
  onRenamed: (from: string, to: string) => void
  onDeleted: (name: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState<Active>(null)
  const panelId = useId()
  const tagList = api.tag.list.useQuery(undefined, { enabled: open })

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          setOpen((current) => !current)
          setActive(null)
        }}
        className="w-fit text-[13px] leading-none font-semibold text-neutral-600 hover:text-neutral-900"
      >
        Manage tags
      </button>

      {open && (
        <section
          id={panelId}
          aria-label="Your tags"
          className="flex flex-col gap-3 rounded-[14px] border border-neutral-200 bg-surface p-4"
        >
          {tagList.isPending && <output className={typography.bodySmall}>Loading tags…</output>}

          {tagList.isError && (
            <div className="flex flex-wrap items-center gap-2">
              <p role="alert" className={ERROR_TEXT}>
                Couldn’t load your tags.
              </p>
              <button type="button" onClick={() => void tagList.refetch()} className={ACTION}>
                Try again
              </button>
            </div>
          )}

          {tagList.data && tagList.data.tags.length === 0 && (
            <p className={typography.bodySmall}>
              You don’t have any tags yet. Add one to an entry and it will show up here.
            </p>
          )}

          {tagList.data && tagList.data.tags.length > 0 && (
            <ul aria-label="All tags" className="flex flex-col gap-2.5">
              {tagList.data.tags.map((tag) => {
                const mode = active?.id === tag.id ? active.mode : null
                const close = () => setActive(null)

                return (
                  <li key={tag.id} className="flex flex-col gap-2">
                    {mode === 'rename' ? (
                      <RenameForm tag={tag} onDone={close} onRenamed={onRenamed} />
                    ) : (
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="min-w-0 flex-1 text-[13px] leading-[1.4] font-medium break-all">
                          {tag.name}
                        </span>
                        <span className={typography.bodySmall}>{entryCount(tag.entryCount)}</span>
                        <span className="flex">
                          <button
                            type="button"
                            aria-label={`Rename tag ${tag.name}`}
                            onClick={() => setActive({ id: tag.id, mode: 'rename' })}
                            className={ACTION}
                          >
                            Rename
                          </button>
                          <button
                            type="button"
                            aria-label={`Delete tag ${tag.name}`}
                            onClick={() => setActive({ id: tag.id, mode: 'delete' })}
                            className={`${ACTION} text-amber-700 hover:text-amber-700/80`}
                          >
                            Delete
                          </button>
                        </span>
                      </div>
                    )}
                    {mode === 'delete' && (
                      <DeleteConfirmation tag={tag} onDone={close} onDeleted={onDeleted} />
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      )}
    </div>
  )
}
