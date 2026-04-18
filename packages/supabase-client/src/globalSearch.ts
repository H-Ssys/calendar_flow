import { supabase } from './client'

export interface SearchResult {
  type: 'event' | 'task' | 'note' | 'contact'
  id: string
  title: string
  snippet?: string
  score: number
}

const API_URL = import.meta.env.VITE_API_URL

/**
 * Global search (Cmd+K) — fan-out across events, tasks, notes, contacts.
 *
 * Design decisions:
 * - Promise.allSettled: partial failure is NOT total failure
 * - SiYuan offline = note content empty, not an error
 * - Never throws on partial failure
 */
export async function globalSearch(query: string, jwt: string): Promise<SearchResult[]> {
  if (!query.trim()) return []

  const [eventsResult, tasksResult, notesResult, contactsResult, siyuanResult] =
    await Promise.allSettled([
      supabase
        .from('events')
        .select('id, title, description, start_time')
        .textSearch('title', query, { type: 'websearch' })
        .limit(10),

      supabase
        .from('tasks')
        .select('id, title, description, due_date')
        .textSearch('title', query, { type: 'websearch' })
        .limit(10),

      supabase
        .from('notes')
        .select('id, title, vault_path, updated_at')
        .textSearch('title', query, { type: 'websearch' })
        .limit(10),

      // Contacts: search both own-row tsvector (search_text) and the reference
      // tsvector maintained by migration 013's trigger. Both use `'simple'`
      // config — match it in the .fts filter. `active_contacts` enforces soft
      // delete (deleted_at IS NULL).
      supabase
        .from('active_contacts')
        .select('id, full_name, name, company, alt_language, front_ocr')
        .or(
          `search_text.fts(simple).${query},reference_search_text.fts(simple).${query}`,
        )
        .limit(20),

      // SiYuan search proxied via FastAPI — silent failure on offline
      fetch(`${API_URL}/api/v1/notes/search`, {
        method: 'POST',
        body: JSON.stringify({ query }),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwt}`,
        },
      })
        .then((r) => r.json() as Promise<{ blocks: Array<{ id: string; content: string }> }>)
        .catch(() => ({ blocks: [] as Array<{ id: string; content: string }> })),
    ])

  const results: SearchResult[] = []

  // Events
  if (eventsResult.status === 'fulfilled' && eventsResult.value.data) {
    for (const row of eventsResult.value.data) {
      results.push({
        type: 'event',
        id: row.id,
        title: row.title,
        snippet: row.description ?? undefined,
        score: 1.0,
      })
    }
  }

  // Tasks
  if (tasksResult.status === 'fulfilled' && tasksResult.value.data) {
    for (const row of tasksResult.value.data) {
      results.push({
        type: 'task',
        id: row.id,
        title: row.title,
        snippet: row.description ?? undefined,
        score: 0.9,
      })
    }
  }

  // Notes (Supabase metadata)
  if (notesResult.status === 'fulfilled' && notesResult.value.data) {
    for (const row of notesResult.value.data) {
      results.push({
        type: 'note',
        id: row.id,
        title: row.title,
        snippet: row.vault_path,
        score: 0.8,
      })
    }
  }

  // Contacts — snippet format: "{name} · {company}" with optional alt-language
  // display name appended when back side was scanned (per namecard-ocr contract).
  if (contactsResult.status === 'fulfilled' && contactsResult.value.data) {
    for (const row of contactsResult.value.data as Array<{
      id: string
      full_name: string | null
      name: string | null
      company: string | null
      alt_language: string | null
      front_ocr: { name?: string | null; alt_name?: string | null } | null
    }>) {
      const title = row.full_name ?? row.name ?? 'Unnamed'
      const parts = [title, row.company].filter(Boolean) as string[]
      let snippet = parts.join(' · ')
      const altDisplay = row.front_ocr?.alt_name ?? row.front_ocr?.name ?? null
      if (row.alt_language && altDisplay && altDisplay !== title) {
        snippet = snippet ? `${snippet} (+ ${altDisplay})` : `(+ ${altDisplay})`
      }
      results.push({
        type: 'contact',
        id: row.id,
        title,
        snippet: snippet || undefined,
        score: 0.85,
      })
    }
  }

  // SiYuan notes (offline-safe — empty on failure, not an error)
  if (siyuanResult.status === 'fulfilled') {
    const siyuan = siyuanResult.value as { blocks: Array<{ id: string; content: string }> }
    if (siyuan.blocks) {
      for (const block of siyuan.blocks) {
        results.push({
          type: 'note',
          id: block.id,
          title: block.content.slice(0, 100),
          snippet: block.content.slice(0, 200),
          score: 0.7,
        })
      }
    }
  }

  // Sort by score descending
  results.sort((a, b) => b.score - a.score)

  return results
}
