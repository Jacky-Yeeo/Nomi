import { beforeEach, describe, expect, it } from 'vitest'
import { useGenerationCanvasStore } from '../store/generationCanvasStore'
import type { GenerationCanvasNode, NodeGroup } from './generationCanvasTypes'
import { planGroupLinkEdges, removeGroupLinkEdgesForMember, upsertGroupInputLink } from './groupInputLinks'

// 组入参 = 声明，真边 = 物化（展开式，图结构不变）。这里既测纯函数，也用**真 store** 走一遍
// connectToGroup / moveNodeToGroup / removeNodeFromGroup，因为「动态」那半条命就住在成员变动的钩子里。

function imageNode(id: string, url?: string): GenerationCanvasNode {
  return {
    id, kind: 'image', title: id, position: { x: 0, y: 0 }, prompt: '', categoryId: 'shots',
    ...(url ? { result: { id: `${id}-r`, url } } : {}),
  } as GenerationCanvasNode
}
function textNode(id: string): GenerationCanvasNode {
  return {
    id, kind: 'text', title: id, position: { x: 0, y: 0 }, prompt: '', categoryId: 'shots',
    contentJson: { type: 'doc', content: [] },
  } as GenerationCanvasNode
}
function group(id: string, nodeIds: string[], inputLinks?: NodeGroup['inputLinks']): NodeGroup {
  return {
    id, name: id, categoryId: 'shots', nodeIds, createdAt: 1, updatedAt: 1,
    ...(inputLinks ? { inputLinks } : {}),
  }
}
const store = () => useGenerationCanvasStore.getState()
/**
 * 成员关系是**双向冗余存**的（group.nodeIds + node.groupId，见 canvasGraphActions.groupSelectedNodes）。
 * 夹具必须把两边都摆上，否则 removeNodeFromGroup 会在 `!node.groupId` 处早退 —— 测的就不是真行为了。
 */
function seed(nodes: GenerationCanvasNode[], groups: NodeGroup[] = []) {
  const groupIdByNode = new Map(groups.flatMap((g) => g.nodeIds.map((nodeId) => [nodeId, g.id] as const)))
  const withGroupId = nodes.map((node) => {
    const groupId = groupIdByNode.get(node.id)
    return groupId ? ({ ...node, groupId } as GenerationCanvasNode) : node
  })
  store().restoreSnapshot({ nodes: withGroupId, edges: [], selectedNodeIds: [], groups })
}
const edgesTo = (id: string) => store().edges.filter((edge) => edge.target === id)

beforeEach(() => seed([]))

describe('planGroupLinkEdges — 纯函数', () => {
  it('给每个成员各排一条边，跳过源节点自己', () => {
    const nodes = [imageNode('src', 'https://x/a.png'), imageNode('m1'), imageNode('m2')]
    const plan = planGroupLinkEdges({ link: { sourceNodeId: 'src' }, targets: nodes, nodes, edges: [] })
    expect(plan.connect.map((item) => item.targetNodeId)).toEqual(['m1', 'm2'])
    expect(plan.skipped).toEqual([])
  })

  it('已经连过的不重复建，单独计数', () => {
    const nodes = [imageNode('src', 'https://x/a.png'), imageNode('m1')]
    const edges = [{ id: 'e1', source: 'src', target: 'm1', mode: 'reference' as const, order: 0 }]
    const plan = planGroupLinkEdges({ link: { sourceNodeId: 'src' }, targets: [nodes[1]!], nodes, edges })
    expect(plan.connect).toEqual([])
    expect(plan.alreadyConnected).toEqual(['m1'])
  })

  it('过不了能力校验的进 skipped，不静默丢', () => {
    // 文本→文本：不是 isTextPromptEdge（那条只放行文本→图/视频），且文本节点产不出可参考资产
    // → source_not_referenceable。注意图片节点**没有产物照样可参考**（依赖波次会先把它跑出来）。
    const nodes = [textNode('src'), textNode('m1')]
    const plan = planGroupLinkEdges({ link: { sourceNodeId: 'src' }, targets: [nodes[1]!], nodes, edges: [] })
    expect(plan.connect).toEqual([])
    expect(plan.skipped).toEqual([{ targetNodeId: 'm1', reason: 'source_not_referenceable' }])
  })

  it('源节点不存在 → 空计划，不抛', () => {
    const plan = planGroupLinkEdges({ link: { sourceNodeId: 'ghost' }, targets: [imageNode('m1')], nodes: [], edges: [] })
    expect(plan).toEqual({ connect: [], skipped: [], alreadyConnected: [] })
  })
})

describe('removeGroupLinkEdgesForMember — 只撤自己组物化的边', () => {
  const edges = [
    { id: 'e1', source: 'a', target: 'm1', mode: 'reference' as const, order: 0, viaGroupId: 'g1' },
    { id: 'e2', source: 'b', target: 'm1', mode: 'reference' as const, order: 1 },
    { id: 'e3', source: 'a', target: 'm2', mode: 'reference' as const, order: 0, viaGroupId: 'g1' },
    { id: 'e4', source: 'c', target: 'm1', mode: 'reference' as const, order: 2, viaGroupId: 'g2' },
  ]

  it('撤掉本组给该成员连的，手工边（无 viaGroupId）绝不误伤', () => {
    const next = removeGroupLinkEdgesForMember(edges, 'g1', 'm1')
    expect(next.map((edge) => edge.id)).toEqual(['e2', 'e3', 'e4'])
  })

  it('不碰别的组给它连的边', () => {
    expect(removeGroupLinkEdgesForMember(edges, 'g1', 'm1').some((edge) => edge.id === 'e4')).toBe(true)
  })

  it('没有命中时返回等价数组', () => {
    expect(removeGroupLinkEdgesForMember(edges, 'g9', 'm1').map((e) => e.id)).toEqual(edges.map((e) => e.id))
  })
})

describe('upsertGroupInputLink', () => {
  it('同 source+mode 只留一条', () => {
    const once = upsertGroupInputLink(undefined, { sourceNodeId: 'a' })
    expect(upsertGroupInputLink(once, { sourceNodeId: 'a' })).toHaveLength(1)
  })
  it('不同 mode 各留一条', () => {
    const once = upsertGroupInputLink(undefined, { sourceNodeId: 'a' })
    expect(upsertGroupInputLink(once, { sourceNodeId: 'a', mode: 'style_ref' })).toHaveLength(2)
  })
})

describe('connectToGroup — 真 store', () => {
  it('连到组 = 组内每个成员一根真边 + 记下组入参', () => {
    seed([imageNode('src', 'https://x/a.png'), imageNode('m1'), imageNode('m2')], [group('g1', ['m1', 'm2'])])
    store().startConnection('src')
    const result = store().connectToGroup('g1')
    expect(result).toMatchObject({ ok: true, connected: 2, skipped: 0 })
    expect(edgesTo('m1')).toHaveLength(1)
    expect(edgesTo('m2')).toHaveLength(1)
    expect(store().groups[0]?.inputLinks).toEqual([{ sourceNodeId: 'src' }])
  })

  it('物化出来的边盖了 viaGroupId 溯源章', () => {
    seed([imageNode('src', 'https://x/a.png'), imageNode('m1')], [group('g1', ['m1'])])
    store().startConnection('src')
    store().connectToGroup('g1')
    expect(edgesTo('m1')[0]?.viaGroupId).toBe('g1')
  })

  it('连完清掉待连态（不会连着连着还挂着一根线）', () => {
    seed([imageNode('src', 'https://x/a.png'), imageNode('m1')], [group('g1', ['m1'])])
    store().startConnection('src')
    store().connectToGroup('g1')
    expect(store().pendingConnectionSourceId).toBe('')
  })

  it('没有待连的线 → dangling，不动图', () => {
    seed([imageNode('m1')], [group('g1', ['m1'])])
    expect(store().connectToGroup('g1')).toMatchObject({ ok: false, reason: 'dangling' })
    expect(store().edges).toHaveLength(0)
  })

  it('空组 → group_empty，并清掉待连态', () => {
    seed([imageNode('src', 'https://x/a.png')], [group('g1', [])])
    store().startConnection('src')
    expect(store().connectToGroup('g1')).toMatchObject({ ok: false, reason: 'group_empty' })
    expect(store().pendingConnectionSourceId).toBe('')
  })

  it('全被能力校验拦下 → all_skipped，且不记入参（免得后来的成员继续白试）', () => {
    seed([textNode('src'), textNode('m1')], [group('g1', ['m1'])])
    store().startConnection('src')
    expect(store().connectToGroup('g1')).toMatchObject({ ok: false, reason: 'all_skipped', skipped: 1 })
    expect(store().groups[0]?.inputLinks).toBeUndefined()
    expect(store().edges).toHaveLength(0)
  })

  it('只连组内**本分类**的成员（组里残留的跨分类 id 不算）', () => {
    const stray = { ...imageNode('m2'), categoryId: 'characters' } as GenerationCanvasNode
    seed([imageNode('src', 'https://x/a.png'), imageNode('m1'), stray], [group('g1', ['m1', 'm2'])])
    store().startConnection('src')
    expect(store().connectToGroup('g1')).toMatchObject({ connected: 1 })
    expect(edgesTo('m2')).toHaveLength(0)
  })
})

describe('动态：成员变动自动补/撤边', () => {
  it('新节点进组 → 按组入参自动补上同款边', () => {
    seed([imageNode('src', 'https://x/a.png'), imageNode('m1'), imageNode('m2')], [group('g1', ['m1'])])
    store().startConnection('src')
    store().connectToGroup('g1')
    expect(edgesTo('m2')).toHaveLength(0)
    store().moveNodeToGroup('m2', 'g1')
    expect(edgesTo('m2')).toHaveLength(1)
    expect(edgesTo('m2')[0]?.viaGroupId).toBe('g1')
  })

  it('移出组 → 撤掉本组给它连的边', () => {
    seed([imageNode('src', 'https://x/a.png'), imageNode('m1')], [group('g1', ['m1'])])
    store().startConnection('src')
    store().connectToGroup('g1')
    expect(edgesTo('m1')).toHaveLength(1)
    store().removeNodeFromGroup('m1')
    expect(edgesTo('m1')).toHaveLength(0)
  })

  it('改投别的组 → 撤旧组的、补新组的，不会同时挂两组参考', () => {
    seed(
      [imageNode('srcA', 'https://x/a.png'), imageNode('srcB', 'https://x/b.png'), imageNode('m1'), imageNode('m2')],
      [group('g1', ['m1']), group('g2', ['m2'])],
    )
    store().startConnection('srcA')
    store().connectToGroup('g1')
    store().startConnection('srcB')
    store().connectToGroup('g2')
    expect(edgesTo('m1').map((edge) => edge.source)).toEqual(['srcA'])
    store().moveNodeToGroup('m1', 'g2')
    // 关键不变量：只剩新组的参考，旧组那根撤干净了（否则会同时挂两个角色参考、悄悄出错图）。
    expect(edgesTo('m1').map((edge) => edge.source)).toEqual(['srcB'])
  })

  it('手工连的边在成员移出组时不受影响', () => {
    seed([imageNode('src', 'https://x/a.png'), imageNode('hand', 'https://x/h.png'), imageNode('m1')], [group('g1', ['m1'])])
    store().startConnection('src')
    store().connectToGroup('g1')
    store().connectNodes('hand', 'm1')
    expect(edgesTo('m1')).toHaveLength(2)
    store().removeNodeFromGroup('m1')
    expect(edgesTo('m1').map((edge) => edge.source)).toEqual(['hand'])
  })

  it('文本节点当源也能连到组（通用 reference 边作为 prompt 上下文）', () => {
    seed([textNode('t1'), imageNode('m1')], [group('g1', ['m1'])])
    store().startConnection('t1')
    expect(store().connectToGroup('g1')).toMatchObject({ ok: true, connected: 1 })
  })
})
