import { parseAssetLibraryDrag } from '../assets/assetLibraryDrag'
import { readAudioDurationSeconds } from '../../media/audioDurationProbe'
import { buildAudioClipFromAssetRef } from './buildClipFromAssetRef'
import { useWorkbenchStore } from '../workbenchStore'

/**
 * 从素材库拖拽数据落一条音频 clip 到时间轴音频轨（单一实现，TimelineTrack 与收起窄条共用，P1）。
 * 时长离屏探测(异步)后才落 clip。返回 true = 是音频素材拖拽(已受理);false = 不是素材库音频拖拽。
 * 非音频的素材库拖拽(图/视频)返回 'reject'，由调用方决定是否提示。
 */
export function tryAddAudioAssetFromDragData(
  raw: string | null | undefined,
  opts: { fps: number; startFrame: number },
): 'audio' | 'reject' | null {
  const assetDrag = parseAssetLibraryDrag(raw)
  if (!assetDrag) return null
  if (assetDrag.kind !== 'audio') return 'reject'
  addAudioAssetToTimeline(
    {
      id: assetDrag.origin.source === 'project' ? assetDrag.origin.relativePath : assetDrag.origin.nodeId,
      kind: 'audio',
      name: assetDrag.name,
      renderUrl: assetDrag.renderUrl,
      source: assetDrag.origin.source === 'project' ? 'project' : 'canvas',
      origin: assetDrag.origin,
    },
    opts,
  )
  return 'audio'
}

/**
 * 落一条音频 clip 的**唯一实现**：拖拽路径与「＋配乐」点击路径共用（P1，别写第二遍）。
 * 时长离屏探测(异步)后才落 clip。
 */
export function addAudioAssetToTimeline(
  asset: Parameters<typeof buildAudioClipFromAssetRef>[0],
  opts: { fps: number; startFrame: number },
): void {
  void readAudioDurationSeconds(asset.renderUrl).then((durationSeconds) => {
    const clip = buildAudioClipFromAssetRef(asset, {
      fps: opts.fps,
      startFrame: opts.startFrame,
      durationSeconds,
    })
    if (clip) useWorkbenchStore.getState().addTimelineClipAtFrame(clip, 'audio', opts.startFrame)
  })
}
