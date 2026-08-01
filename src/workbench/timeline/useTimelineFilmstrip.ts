import React from 'react'
import type { TimelineClip } from './timelineTypes'
import { getDesktopBridge } from '../../desktop/bridge'
import { getActiveWorkbenchProjectId } from '../project/workbenchProjectSession'

/**
 * 时间轴视频 clip 的胶片条（16 帧横向拼图）懒加载。
 * 同源共享一份（key=projectId::url），失败落 failed 由 clip 回退占位——绝不冒充。
 * 并发闸 2：几十个 clip 首开时不并发拉起几十个 ffmpeg。
 */
export type FilmstripEntry =
  | { status: 'ready'; url: string; tiles: number }
  | { status: 'pending' }
  | { status: 'failed' }

const cache = new Map<string, FilmstripEntry>()
const listeners = new Set<() => void>()
const queue: Array<() => void> = []
let running = 0
const MAX_CONCURRENT = 2

function notify(): void {
  for (const listener of listeners) listener()
}

function pump(): void {
  while (running < MAX_CONCURRENT && queue.length > 0) {
    const job = queue.shift()
    if (job) job()
  }
}

function request(key: string, videoUrl: string, projectId: string): void {
  if (cache.has(key)) return
  cache.set(key, { status: 'pending' })
  const bridge = getDesktopBridge()
  const extract = bridge?.video?.extractFilmstrip
  if (!extract) {
    cache.set(key, { status: 'failed' })
    return
  }
  queue.push(() => {
    running += 1
    extract({ videoUrl, projectId })
      .then((result) => {
        cache.set(key, { status: 'ready', url: result.url, tiles: result.tiles })
      })
      .catch(() => {
        cache.set(key, { status: 'failed' })
      })
      .finally(() => {
        running -= 1
        notify()
        pump()
      })
  })
  pump()
}

export function useTimelineFilmstrip(clip: TimelineClip): FilmstripEntry | null {
  const url = clip.type === 'video' && typeof clip.url === 'string' ? clip.url.trim() : ''
  const projectId = getActiveWorkbenchProjectId() || ''
  const key = url && projectId ? `${projectId}::${url}` : ''

  const subscribe = React.useCallback((onStoreChange: () => void) => {
    listeners.add(onStoreChange)
    return () => {
      listeners.delete(onStoreChange)
    }
  }, [])
  const getSnapshot = React.useCallback((): FilmstripEntry | null => (key ? (cache.get(key) ?? null) : null), [key])
  const entry = React.useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  React.useEffect(() => {
    if (!key) return
    request(key, url, projectId)
  }, [key, url, projectId])

  return entry
}

/** 测试用：清缓存与队列。 */
export function resetTimelineFilmstripForTests(): void {
  cache.clear()
  queue.length = 0
  running = 0
}
