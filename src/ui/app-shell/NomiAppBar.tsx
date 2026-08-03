import React from 'react'
import { useTranslation } from 'react-i18next'
import { IconArrowRight, IconBrowser, IconPlugConnected, IconSettings } from '@tabler/icons-react'
import type { WorkspaceMode } from '../../workbench/workbenchStore'
import { NomiBrand, NomiStepper, WorkbenchButton } from '../../design'
import { OnboardingChecklist } from '../../workbench/onboarding/OnboardingChecklist'
import { TaskCenterButton } from '../../workbench/taskCenter/TaskCenterButton'
import { useGenerationCanvasStore } from '../../workbench/generationCanvas/store/generationCanvasStore'
import { cn } from '../../utils/cn'
import { handleWindowTitlebarDoubleClick } from './windowTitlebarDoubleClick'

// 平台分流：win32 下品牌/关于 + 上手清单都让位给 WorkbenchShell 的自绘标题栏（windowbar），
// 本栏不重复渲染；非 win32（mac/Linux）保持原生窗口，品牌与清单仍住这里——两平台都有家、不丢失、不重复。
const isWindows = window.nomiDesktop?.platform === 'win32'

function openBrowser(): void {
  window.dispatchEvent(new CustomEvent('nomi-open-browser'))
}

type NomiAppBarProps = {
  workspaceMode: WorkspaceMode
  onWorkspaceModeChange: (mode: WorkspaceMode) => void
  projectName?: string
  onBackToLibrary?: () => void
  onOpenModelCatalog?: () => void
  onOpenSettings?: () => void
  onRenameProject?: (name: string) => void
}

export default function NomiAppBar({
  workspaceMode,
  onWorkspaceModeChange,
  projectName,
  onBackToLibrary,
  onOpenModelCatalog,
  onOpenSettings,
  onRenameProject,
}: NomiAppBarProps): JSX.Element {
  const { t } = useTranslation()
  const [editingProjectName, setEditingProjectName] = React.useState(false)
  const [projectTitle, setProjectTitle] = React.useState(projectName || t('appBar.untitledProject'))

  React.useEffect(() => {
    if (!editingProjectName && projectName) setProjectTitle(projectName)
  }, [projectName, editingProjectName])

  const commitProjectTitle = React.useCallback(() => {
    setProjectTitle((value) => {
      const trimmed = value.trim() || t('appBar.untitledProject')
      onRenameProject?.(trimmed)
      return trimmed
    })
    setEditingProjectName(false)
  }, [onRenameProject, t])

  const handleOpenModelCatalog = React.useCallback(() => {
    onOpenModelCatalog?.()
  }, [onOpenModelCatalog])

  return (
    <header
      className={cn(
        'nomi-appbar',
        isWindows && 'app-drag',
        'relative z-[120] grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center',
        'h-[var(--workbench-topbar-height)] px-[18px]',
        'border-b border-workbench-border bg-workbench-surface',
        'max-[700px]:grid-cols-[auto_minmax(0,1fr)_auto] max-[700px]:gap-x-1.5 max-[700px]:px-2',
      )}
      aria-label={t('appBar.workspace')}
      onDoubleClick={handleWindowTitlebarDoubleClick}
    >
      <div
        className={cn(
          'nomi-appbar__left',
          'app-no-drag',
          'inline-flex items-center justify-self-start gap-3 min-w-0',
          'max-[700px]:gap-0',
        )}
      >
        {!isWindows ? (
          <>
            {/* 品牌回归纯品牌（§1.5 归位）：过去这颗钮一钮四用（品牌 + 上手手册 + 明暗 + 检查更新），
                四件事已各自归位到设置「关于」/「通用」，这里只剩标识、不再是功能入口。 */}
            <span className={cn('nomi-appbar__brand', 'inline-flex items-center')}>
              <NomiBrand />
            </span>
            <span
              className={cn('nomi-appbar__divider', 'w-px h-[18px] bg-workbench-border', 'max-[700px]:hidden')}
              aria-hidden="true"
            />
          </>
        ) : null}

        {/* Breadcrumb: [项目库] › [项目名] — unified bordered container */}
        <div
          className={cn(
            'nomi-appbar__breadcrumb',
            'inline-flex items-center h-[30px]',
            'border border-workbench-border rounded-[var(--nomi-radius-sm)]',
            'bg-workbench-bg overflow-hidden min-w-0 shrink',
          )}
          role="navigation"
          aria-label={t('appBar.locationNavigation')}
        >
          {onBackToLibrary ? (
            <>
              <WorkbenchButton
                className={cn(
                  'nomi-appbar__breadcrumb-seg nomi-appbar__breadcrumb-seg--lib',
                  'app-no-drag',
                  'inline-flex items-center h-full px-2.5',
                  'border-none bg-transparent font-inherit text-body-sm',
                  'cursor-pointer whitespace-nowrap',
                  'text-[var(--nomi-ink-40)]',
                  'transition-[background,color] duration-[var(--nomi-transition-fast)]',
                  'hover:bg-[var(--nomi-ink-05)] hover:text-[var(--nomi-ink)]',
                  'max-[700px]:hidden',
                )}
                aria-label={t('appBar.backToLibrary')}
                onClick={onBackToLibrary}
              >
                {t('appBar.projectLibrary')}
              </WorkbenchButton>
              <span
                className={cn(
                  'nomi-appbar__breadcrumb-arrow',
                  'text-[var(--nomi-ink-30)] text-sm leading-none select-none shrink-0',
                  'max-[700px]:hidden',
                )}
                aria-hidden="true"
              >
                ›
              </span>
            </>
          ) : null}
          {editingProjectName ? (
            <input
              className={cn(
                'nomi-appbar__breadcrumb-input',
                'app-no-drag',
                'h-full px-2.5 border-none',
                'bg-[color-mix(in_oklch,var(--nomi-accent)_6%,var(--nomi-bg))]',
                'text-[var(--nomi-ink)] font-inherit text-body-sm',
                'outline-none min-w-[80px] max-w-[240px]',
              )}
              value={projectTitle}
              autoFocus
              aria-label={t('appBar.projectName')}
              onBlur={commitProjectTitle}
              onChange={(event) => setProjectTitle(event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') commitProjectTitle()
                if (event.key === 'Escape') setEditingProjectName(false)
              }}
            />
          ) : (
            <WorkbenchButton
              className={cn(
                'nomi-appbar__breadcrumb-seg nomi-appbar__breadcrumb-seg--name',
                'app-no-drag',
                'inline-flex items-center h-full px-2.5',
                'border-none bg-transparent font-inherit text-body-sm',
                'cursor-pointer whitespace-nowrap',
                'text-[var(--nomi-ink-80)] max-w-[200px] overflow-hidden text-ellipsis',
                'transition-[background,color] duration-[var(--nomi-transition-fast)]',
                'hover:bg-[var(--nomi-ink-05)] hover:text-[var(--nomi-ink)]',
              )}
              title={projectTitle}
              onClick={() => setEditingProjectName(true)}
            >
              {projectTitle}
            </WorkbenchButton>
          )}
        </div>
      </div>

      <div className="app-no-drag">
        <NomiStepper value={workspaceMode} onChange={onWorkspaceModeChange} />
      </div>

      {/* 右簇分 3 组（§1.5「分组」）：在跑什么｜工具与环境｜主线。主行动永远在最右。
          改前是 7 个平铺、7 类心智、只靠 gap-2 排排坐，「切语言」和「导出成片」权重几乎一样。 */}
      <div
        className={cn(
          'nomi-appbar__right',
          'app-no-drag',
          'inline-flex items-center justify-self-end gap-2.5 min-w-0',
          'max-[700px]:gap-1.5',
        )}
        role="toolbar"
        aria-label={t('appBar.globalActions')}
      >
        {/* 组 1 · 在跑什么：任务中心闲着且没跑过时自己 return null。
            分隔线跟它装在同一个壳里，并用 :has(button) 绑定它的**真实渲染**（不复制它的判定条件）——
            否则任务钮一藏，右簇最左就挂着一条没有前件的悬空竖线（2026-08-02 真机走查抓到）。 */}
        <span
          className={cn(
            'nomi-appbar__group nomi-appbar__group--tasks',
            'inline-flex items-center gap-2.5',
            '[&:not(:has(button))]:hidden',
          )}
        >
          <TaskCenterButton
            onRevealNode={(nodeId) => {
              onWorkspaceModeChange('generation')
              useGenerationCanvasStore.getState().selectNodes([nodeId])
            }}
          />
          <span className={cn('nomi-appbar__divider', 'w-px h-[18px] bg-workbench-border')} aria-hidden="true" />
        </span>

        {/* 组 2 · 工具与环境：上手引导 · 浏览器 · 设置。
            win32 下上手/浏览器住 WorkbenchShell 自绘标题栏，这里只剩设置——不重复渲染。
            整组也可能全空（win32 且宿主没给 onOpenSettings），同样让分隔线跟着一起藏。 */}
        <span
          className={cn(
            'nomi-appbar__group nomi-appbar__group--tools',
            'inline-flex items-center gap-2.5',
            '[&:not(:has(button))]:hidden',
          )}
        >
        <span className={cn('nomi-appbar__group', 'inline-flex items-center gap-1')}>
          {!isWindows ? <OnboardingChecklist /> : null}
          {!isWindows ? (
            <WorkbenchButton
              className={cn(
                'nomi-appbar__ghost',
                'app-no-drag',
                'inline-flex items-center gap-1.5 h-[30px] px-2.5',
                'border border-transparent rounded-[var(--nomi-radius-sm)]',
                'bg-transparent text-[var(--nomi-ink-80)] font-inherit text-body-sm',
                'transition-[background,color] duration-[var(--nomi-transition-fast)]',
                'hover:bg-[var(--nomi-ink-05)] hover:text-[var(--nomi-ink)]',
                'max-[1400px]:w-[30px] max-[1400px]:h-[30px] max-[1400px]:justify-center max-[1400px]:p-0',
              )}
              aria-label={t('appBar.openBrowser')}
              title={t('appBar.browser')}
              onClick={openBrowser}
            >
              {/* 顶栏操作按钮统一解剖：图标 15/1.8 + 文字，窄屏一起收成 30px 方块。 */}
              <IconBrowser size={15} stroke={1.8} />
              <span className={cn('nomi-appbar__action-text', 'max-[1400px]:hidden')}>{t('appBar.browser')}</span>
            </WorkbenchButton>
          ) : null}
          {onOpenSettings ? (
            <WorkbenchButton
              className={cn(
                'nomi-appbar__ghost',
                'app-no-drag',
                'inline-flex items-center justify-center h-[30px] w-[30px] p-0',
                'border border-transparent rounded-[var(--nomi-radius-sm)]',
                'bg-transparent text-[var(--nomi-ink-80)]',
                'transition-[background,color] duration-[var(--nomi-transition-fast)]',
                'hover:bg-[var(--nomi-ink-05)] hover:text-[var(--nomi-ink)]',
              )}
              aria-label={t('settings.title')}
              title={t('settings.title')}
              onClick={onOpenSettings}
            >
              <IconSettings size={15} stroke={1.8} />
            </WorkbenchButton>
          ) : null}
        </span>
          <span className={cn('nomi-appbar__divider', 'w-px h-[18px] bg-workbench-border')} aria-hidden="true" />
        </span>

        {/* 组 3 · 主线：接模型 → 出片。 */}
        <span className={cn('nomi-appbar__group', 'inline-flex items-center gap-1')}>
          <WorkbenchButton
            className={cn(
              'nomi-appbar__ghost',
              'app-no-drag',
              'inline-flex items-center gap-1.5 h-[30px] px-2.5',
              'border border-transparent rounded-[var(--nomi-radius-sm)]',
              'bg-transparent text-[var(--nomi-ink-80)] font-inherit text-body-sm',
              'transition-[background,color] duration-[var(--nomi-transition-fast)]',
              'hover:bg-[var(--nomi-ink-05)] hover:text-[var(--nomi-ink)]',
              'max-[1400px]:w-[30px] max-[1400px]:h-[30px] max-[1400px]:justify-center max-[1400px]:p-0',
            )}
            aria-label={t('appBar.openModelAccess')}
            title={t('appBar.modelAccess')}
            onClick={handleOpenModelCatalog}
          >
            <IconPlugConnected size={15} stroke={1.8} />
            <span className={cn('nomi-appbar__action-text', 'max-[1400px]:hidden')}>{t('appBar.modelAccess')}</span>
          </WorkbenchButton>

          {/* 「导出」拆成两个诚实的词（§1.5「去重」+ 一功能一个家）：
              这颗在非预览页时只是**跳转**（原来却叫「导出」，点了什么也不导），故改叫「去出片」；
              到了预览页整颗隐藏 —— 那里控制条的「导出 MP4」才是真导出、且是唯一入口。 */}
          {workspaceMode !== 'preview' ? (
            <WorkbenchButton
              className={cn(
                'nomi-appbar__primary',
                'app-no-drag',
                'inline-flex items-center gap-1.5 h-[30px] px-2.5',
                'border border-transparent rounded-[var(--nomi-radius-sm)]',
                'bg-[var(--nomi-ink)] text-[var(--nomi-paper)] font-inherit text-body-sm',
                'transition-[background,color] duration-[var(--nomi-transition-fast)]',
                'hover:bg-[var(--nomi-ink-80)]',
                'max-[1400px]:w-[30px] max-[1400px]:h-[30px] max-[1400px]:justify-center max-[1400px]:p-0',
              )}
              aria-label={t('appBar.goToProduce')}
              title={t('appBar.goToProduce')}
              onClick={() => onWorkspaceModeChange('preview')}
            >
              <IconArrowRight size={15} stroke={1.8} />
              <span className={cn('nomi-appbar__action-text', 'max-[1400px]:hidden')}>{t('appBar.goToProduce')}</span>
            </WorkbenchButton>
          ) : null}
        </span>
      </div>
    </header>
  )
}
