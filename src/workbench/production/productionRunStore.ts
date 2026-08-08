import { create } from 'zustand'

import type { ProductionRun } from '../../../electron/productionRun/productionRunTypes'
import { productionRunApi } from './productionRunApi'

type ProductionRunStore = {
  projectId: string | null
  run: ProductionRun | null
  cursor: number
  loading: boolean
  error: string | null
  lastPolledAt: number | null
  load: (projectId: string) => Promise<void>
  poll: () => Promise<void>
  reset: () => void
}

function isActive(run: { status: string }): boolean {
  return run.status !== 'completed' && run.status !== 'cancelled'
}

export const useProductionRunStore = create<ProductionRunStore>()((set, get) => ({
  projectId: null,
  run: null,
  cursor: 0,
  loading: false,
  error: null,
  lastPolledAt: null,

  load: async (projectId) => {
    const clean = projectId.trim()
    if (!clean) {
      get().reset()
      return
    }
    set({ projectId: clean, run: null, cursor: 0, loading: true, error: null })
    try {
      const summaries = await productionRunApi.list(clean)
      if (get().projectId !== clean) return
      const summary = summaries.find(isActive) ?? summaries[0]
      const run = summary ? await productionRunApi.read(clean, summary.runId) : null
      if (get().projectId !== clean) return
      set({ run, cursor: run?.snapshotCursor ?? 0, loading: false, lastPolledAt: Date.now() })
    } catch (error) {
      if (get().projectId === clean) set({ loading: false, error: error instanceof Error ? error.message : String(error) })
    }
  },

  poll: async () => {
    const { projectId, run, cursor } = get()
    if (!projectId || !run) return
    try {
      const events = await productionRunApi.events(projectId, run.runId, cursor)
      if (get().projectId !== projectId || get().run?.runId !== run.runId) return
      const nextCursor = events.reduce((latest, event) => Math.max(latest, event.cursor), cursor)
      const newestRevision = events.reduce((latest, event) => Math.max(latest, event.runRevision), run.revision)
      if (newestRevision > run.revision) {
        const refreshed = await productionRunApi.read(projectId, run.runId)
        if (get().projectId === projectId && get().run?.runId === run.runId) {
          set({ run: refreshed, cursor: refreshed?.snapshotCursor ?? nextCursor, error: null, lastPolledAt: Date.now() })
        }
      } else {
        set({ cursor: nextCursor, error: null, lastPolledAt: Date.now() })
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : String(error), lastPolledAt: Date.now() })
    }
  },

  reset: () => set({ projectId: null, run: null, cursor: 0, loading: false, error: null, lastPolledAt: null }),
}))
