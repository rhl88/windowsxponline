// d18: web-reader 抓取页面（正文 + 图片 URL 列表）
import ZAI from 'z-ai-web-dev-sdk'

const [,, url] = process.argv
const zai = await ZAI.create()
const r = await zai.functions.invoke('page_reader', { url })
const html = r.data?.html ?? ''
const title = r.data?.title ?? ''
console.log('TITLE:', title)
// 提取正文文本（前 3000 字符）
const text = html
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ')
  .replace(/\s+/g, ' ')
console.log('TEXT:', text.slice(0, 3000))
// 提取图片
const imgs = [...html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)].map((m) => m[1])
console.log('IMAGES:')
imgs.forEach((u) => console.log(' ', u))
