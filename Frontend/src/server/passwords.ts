import { sha256Hex } from '@/lib/shared/sha256'

/* ─────────────────────────────────────────────────────────────
 * 帐户密码哈希（环境无关：Node 服务端与浏览器 Local 引擎共用）
 * 存储格式 sha256$<salt-hex>$<hash-hex>，摘要算法与 node:crypto 一致；
 * 旧明文快照在 verify 成功后自动升级为哈希（登录时迁移，真实系统惯例）；
 * 客户端永不接触哈希——API 响应经 stripAccount 剥离 password 字段。
 * ───────────────────────────────────────────────────────────── */

/** 盐：8 字节 hex（浏览器端无 crypto.randomBytes，用 crypto.getRandomValues） */
function randomSaltHex(): string {
  const b = new Uint8Array(8)
  if (typeof globalThis.crypto?.getRandomValues === 'function') globalThis.crypto.getRandomValues(b)
  else for (let i = 0; i < 8; i++) b[i] = Math.floor(Math.random() * 256) /* 理论上不可达：所有目标环境均有 WebCrypto */
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('')
}

export function hashPassword(plain: string): string {
  const salt = randomSaltHex()
  return `sha256$${salt}$${sha256Hex(salt + plain)}`
}

export function isHashed(stored: string): boolean {
  return stored.startsWith('sha256$') && stored.split('$').length === 3
}

/** 验证：哈希格式按 salt 重算比较；旧明文直接相等（用于迁移判定） */
export function verifyPassword(plain: string, stored: string): boolean {
  if (!isHashed(stored)) return stored === plain
  const [, salt, hash] = stored.split('$')
  return sha256Hex(salt + plain) === hash
}
