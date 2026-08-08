import { beforeEach, describe, expect, it, vi } from 'vitest'
import { describeBlockedNotice, runPlanWithToasts } from './batchPlanPreview'
import type { DependencyWavePlan } from '../runner/dependencyWaves'
import { runGenerationNodesByPlan } from '../runner/generationRunController'

vi.mock('../runner/generationRunController', () => ({
  runGenerationNodesByPlan: vi.fn(async () => ({ totalCount: 1, successes: [], failures: [] })),
  spendCostKindForNodes: vi.fn(() => 'image'),
}))

function plan(over: Partial<DependencyWavePlan>): DependencyWavePlan {
  return { waves: [], blocked: [], edgesUsed: [], ...over }
}

describe('describeBlockedNotice — 批量「缺啥提示啥」', () => {
  it('无 blocked → null（不提示）', () => {
    expect(describeBlockedNotice(plan({ waves: [['a', 'b']] }))).toBeNull()
  })

  it('上游参考未生成被拦 → 提示「在等上游参考」', () => {
    const p = plan({
      waves: [['s1']],
      blocked: [{ nodeId: 's2', reason: 'missing-upstream', detail: '上游「创作工位」还没有生成结果' }],
    })
    const msg = describeBlockedNotice(p)
    expect(msg).toContain('1 个在等上游参考')
    expect(msg).toContain('先把它们生成')
  })

  it('循环引用单独计数', () => {
    const p = plan({
      blocked: [
        { nodeId: 'a', reason: 'cycle', detail: '与其他节点构成循环引用' },
        { nodeId: 'b', reason: 'missing-upstream', detail: 'x' },
      ],
    })
    const msg = describeBlockedNotice(p)!
    expect(msg).toContain('1 个在等上游参考')
    expect(msg).toContain('1 个存在循环引用')
  })
})

describe('runPlanWithToasts concurrency', () => {
  beforeEach(() => {
    vi.mocked(runGenerationNodesByPlan).mockClear()
  })

  it('passes the chosen concurrency to the dependency-wave runner', async () => {
    const dependencyPlan = plan({ waves: [['a']] })

    await runPlanWithToasts(dependencyPlan, { grantId: 'grant-1', concurrency: 4 })

    expect(runGenerationNodesByPlan).toHaveBeenCalledWith(dependencyPlan, {
      grantId: 'grant-1',
      concurrency: 4,
    })
  })
})
