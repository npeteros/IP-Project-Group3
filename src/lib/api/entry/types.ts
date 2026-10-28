// Placeholder response types until #15 replaces them with `z.infer` of the response schemas
export type Entry = {
  id: string
  title: string | null
  body: string
  writtenAt: string
  entryDate: string
  createdAt: string
  updatedAt: string
  tags: { id: string; name: string }[]
}

export type EntryList = { entries: Entry[]; total: number }
