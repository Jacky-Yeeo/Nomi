import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8')
const expect = (value, message) => {
  if (!value) throw new Error(`MARKETING HOME FAIL: ${message}`)
}

const zh = read('marketing/index.html')
const en = read('marketing/en/index.html')
const files = [
  'marketing/assets/video/hero-loop.mp4',
  'marketing/assets/demo.mp4',
  'marketing/assets/video/launch-film-en.mp4',
  'marketing/assets/video/launch-film-zh.vtt',
  'marketing/assets/video/launch-film-en.vtt',
  'marketing/assets/video/hero-poster.jpg',
  'marketing/assets/social-preview-zh.jpg',
  'marketing/assets/social-preview-en.jpg',
  'marketing/assets/screen-agentic.jpg',
  '.github/ISSUE_TEMPLATE/business_inquiry.yml',
  'README.zh-CN.md',
]

expect(/<html lang="zh-CN">/.test(zh), 'Chinese lang is static')
expect(/<html lang="en">/.test(en), 'English lang is static')
expect(zh.includes('把镜头讲清楚'), 'Chinese Hero claim exists')
expect(en.includes('Direct the shot. Not just the prompt.'), 'English Hero claim exists')
expect(zh.includes('定制开发') && en.includes('Custom builds'), 'paid services are localized')
expect(zh.includes('Nomi MCP') && zh.includes('可编辑初稿'), 'Chinese agentic workflow is explicit')
expect(en.includes('One sentence to an editable first cut') && en.includes('Nomi over MCP'), 'English agentic workflow is explicit')
expect(zh.includes('/assets/nomi-logo.svg') && en.includes('/assets/nomi-logo.svg'), 'official Nomi mark is used')
expect(zh.includes('/en/') && en.includes('href="/"'), 'locale switch is a real link')
expect(zh.includes('rel="canonical" href="https://nomiaqm.com/"'), 'Chinese canonical')
expect(en.includes('rel="canonical" href="https://nomiaqm.com/en/"'), 'English canonical')
for (const html of [zh, en]) {
  expect((html.match(/hreflang=/g) || []).length === 3, 'three hreflang links')
  expect(html.includes('https://www.gnu.org/licenses/agpl-3.0.html'), 'AGPL JSON-LD URL')
  expect(!html.includes('https://www.apache.org/licenses/LICENSE-2.0'), 'no current Apache JSON-LD')
  expect(html.includes('autoplay') && html.includes('muted') && html.includes('playsinline'), 'silent hero attributes')
  expect(html.includes('<dialog') && html.includes('<track kind="captions"'), 'film dialog and captions')
  expect(html.includes('business_inquiry.yml'), 'business CTA destination')
}
for (const rel of files) expect(fs.existsSync(path.join(root, rel)), `${rel} exists`)
expect(!fs.existsSync(path.join(root, 'marketing/assets/demo.gif')), 'legacy demo GIF removed')
expect(!fs.existsSync(path.join(root, 'marketing/assets/vendor/gsap.min.js')), 'GSAP removed')
expect(!fs.existsSync(path.join(root, 'marketing/assets/vendor/ScrollTrigger.min.js')), 'ScrollTrigger removed')
console.log('MARKETING HOME STATIC PASS')
