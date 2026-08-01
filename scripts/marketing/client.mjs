export const homepageClientJs = `(() => {
  const localeKey = 'nomi_locale'
  const pageLocale = document.documentElement.lang
  const preferred = (() => { try { return localStorage.getItem(localeKey) } catch { return null } })()
  const browserLanguages = navigator.languages || [navigator.language || '']
  const wantsEnglish = browserLanguages[0]?.toLowerCase().startsWith('en') && !browserLanguages.some((value) => value.toLowerCase().startsWith('zh'))
  if (location.pathname === '/' && !preferred && wantsEnglish) location.replace('/en/')
  document.querySelectorAll('[data-locale-choice]').forEach((link) => link.addEventListener('click', () => {
    try { localStorage.setItem(localeKey, link.dataset.localeChoice) } catch {}
  }))
  const dialog = document.querySelector('#launch-film')
  const trigger = document.querySelector('[data-open-film]')
  const close = document.querySelector('[data-close-film]')
  if (dialog && trigger && typeof dialog.showModal === 'function') {
    trigger.addEventListener('click', (event) => { event.preventDefault(); dialog.showModal() })
    close?.addEventListener('click', () => dialog.close())
    dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close() })
  }
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) document.querySelector('[data-hero-video]')?.pause()
  document.documentElement.dataset.enhanced = 'true'
  document.documentElement.dataset.locale = pageLocale
})()`
