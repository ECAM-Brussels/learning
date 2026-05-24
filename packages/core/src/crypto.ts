import * as v from 'valibot'
const encoder = new TextEncoder()
const decoder = new TextDecoder()

async function deriveKey(password: string) {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  )

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('fixed-salt'),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

const toBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes))
const fromBase64 = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))

const password = 'test'

export const Encrypted = v.pipe(v.string(), v.brand('encrypted'))
export type Encrypted = v.InferOutput<typeof Encrypted>

export async function encrypt<T extends string>(rawText: T): Promise<T & Encrypted> {
  'use server'
  const text = v.parse(v.string(), rawText)
  const key = await deriveKey(password)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(text))
  const result = new Uint8Array(iv.length + encrypted.byteLength)
  result.set(iv)
  result.set(new Uint8Array(encrypted), iv.length)
  return toBase64(result) as T & Encrypted
}

export async function decrypt(rawCipherText: Encrypted) {
  'use server'
  const cipherText = v.parse(Encrypted, rawCipherText)
  const key = await deriveKey(password)
  const data = fromBase64(cipherText)
  const iv = data.slice(0, 12)
  const encrypted = data.slice(12)
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, encrypted)
  return decoder.decode(decrypted)
}
