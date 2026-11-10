import {
  normalizeTagName,
  type Entry,
  type EntryUpdateInput,
  type EntryUpdateOutput,
} from '@/src/server/entry/schemas'

/** What the editor form holds. Both entry schemas accept this shape. */
export type EntryFormValues = { title: string; body: string; tags: string[] }

export const EMPTY_ENTRY_FORM: EntryFormValues = { title: '', body: '', tags: [] }

/** An entry as form values. A missing title is an empty field, shown as the "Untitled" placeholder. */
export function toEntryFormValues(entry: Entry): EntryFormValues {
  return {
    title: entry.title ?? '',
    body: entry.body,
    tags: entry.tags.map((tag) => tag.name),
  }
}

/** Tag sets are equal when they hold the same names, ignoring order and case. */
export function sameTagNames(a: string[], b: string[]) {
  const names = new Set(a.map(normalizeTagName))
  return (
    names.size === new Set(b.map(normalizeTagName)).size &&
    b.every((name) => names.has(normalizeTagName(name)))
  )
}

/**
 * The fields in `values` (already parsed by `EntryUpdateSchema`) that differ from the saved
 * `entry`, as a PATCH body. `null` when nothing changed, so the caller can skip the request.
 */
export function changedEntryFields(
  values: EntryUpdateOutput,
  entry: Entry,
): EntryUpdateInput | null {
  const changes: EntryUpdateInput = {}

  if (values.title !== undefined && values.title !== entry.title) changes.title = values.title
  if (values.body !== undefined && values.body !== entry.body) changes.body = values.body
  if (
    values.tags !== undefined &&
    !sameTagNames(
      values.tags,
      entry.tags.map((tag) => tag.name),
    )
  ) {
    changes.tags = values.tags
  }

  return Object.keys(changes).length > 0 ? changes : null
}
