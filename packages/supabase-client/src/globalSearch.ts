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

      supabase
        .from('contacts')
        .select('id, name, company, email')
        .textSearch('name', query, { type: 'websearch' })
        .limit(10),

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

  // Contacts
  if (contactsResult.status === 'fulfilled' && contactsResult.value.data) {
    for (const row of contactsResult.value.data) {
      results.push({
        type: 'contact',
        id: row.id,
        title: row.name,
        snippet: [row.company, row.email].filter(Boolean).join(' — ') || undefined,
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
