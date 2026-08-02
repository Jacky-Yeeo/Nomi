export const zhSettings = {
  title: '设置',
  close: '关闭',
  placeholder: '这个分区之后再填。',
  tab: { file: '文件与保存', general: '通用', about: '关于' },
  general: {
    title: '通用',
    screenshot: '全局截图热键',
    screenshotHint:
      '默认关。开启后按一下热键就能把屏幕抓进画布——Nomi 没在前台也管用（找参考时很顺手）。macOS 需要「屏幕录制」权限。',
    screenshotKey: '热键',
    screenshotKeyTaken: '这组键被别的应用占了，Nomi 没抢到。换一组试试。',
    screenshotNeedsPermission:
      'macOS 还没给 Nomi「屏幕录制」权限，现在按热键抓不到画面。这项权限没法由应用自己申请，得去系统设置里勾上，勾完要重开 Nomi 才生效。',
    screenshotOpenSettings: '打开系统设置',
  },
  file: {
    title: '文件与保存',
    autoSave: '自动另存生成物',
    autoSaveHint: '默认关。开启后每张生成的图/视频完成时自动复制一份到下面的目录（Nomi 内部存储不受影响）。',
    saveTo: '另存到',
    noDir: '未设置 · 点「选择」挑一个目录',
    pick: '选择',
    saveRoot: '保存根目录',
    laterTag: '大改 · 稍后支持',
    saveRootHint: '把 Nomi 所有项目、素材、输出的存储根改到你的目录（要迁移现有数据，先占位）。',
  },
}

export const enSettings = {
  title: 'Settings',
  close: 'Close',
  placeholder: 'Coming soon.',
  tab: { file: 'File & saving', general: 'General', about: 'About' },
  general: {
    title: 'General',
    screenshot: 'Global screenshot hotkey',
    screenshotHint:
      'Off by default. When on, one keypress grabs the screen into the canvas — even when Nomi is not in front (handy while hunting references). macOS needs Screen Recording permission.',
    screenshotKey: 'Hotkey',
    screenshotKeyTaken: 'Another app already owns this key combo, so Nomi could not claim it. Try a different one.',
    screenshotNeedsPermission:
      'macOS has not granted Nomi Screen Recording permission, so the hotkey cannot capture anything yet. Apps cannot request this permission themselves — enable it in System Settings, then restart Nomi.',
    screenshotOpenSettings: 'Open System Settings',
  },
  file: {
    title: 'File & saving',
    autoSave: 'Auto-save generated files',
    autoSaveHint:
      'Off by default. When on, each generated image/video is copied to the folder below on completion (internal storage unaffected).',
    saveTo: 'Save to',
    noDir: 'Not set · click Choose to pick a folder',
    pick: 'Choose',
    saveRoot: 'Storage root',
    laterTag: 'Later',
    saveRootHint:
      "Move Nomi's storage root (projects, assets, outputs) to your folder (needs data migration, placeholder for now).",
  },
}
