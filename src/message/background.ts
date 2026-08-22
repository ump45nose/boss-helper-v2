import type { Adapter, Message, OnMessage, SendMessage } from 'comctx'
import { openDB } from 'idb'

import type { Browser } from '#imports'
import { browser } from '#imports'
import { v2StorageKey } from '@/utils/namespace'
import type { ResponseType } from '@/utils/request'

export const userKey = v2StorageKey('conf-user')

const DB_NAME = 'BossHelperV2DB'
const STORE_NAME = 'images'

const ALLOWED_HOSTS = new Set(['zhipin.com'])
const ALLOWED_REQUEST_FIELDS = new Set(['method', 'headers', 'body', 'referrerPolicy'])

/** 只允许招聘站点的 HTTP(S) 请求，防止消息代理被用作任意 URL 代理。 */
function assertAllowedUrl(value: string): URL {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new Error('请求地址无效')
  }
  const isAllowedHost = ALLOWED_HOSTS.has(url.hostname) || url.hostname.endsWith('.zhipin.com')
  if (!['http:', 'https:'].includes(url.protocol) || !isAllowedHost) {
    throw new Error('请求地址不在允许范围内')
  }
  return url
}

/** 校验跨消息边界传入的 RequestInit，仅接受当前业务实际需要的字段。 */
function validateRequestInit(data: RequestInit): RequestInit {
  if (!data || typeof data !== 'object') throw new Error('请求参数无效')
  for (const key of Object.keys(data)) {
    if (!ALLOWED_REQUEST_FIELDS.has(key)) throw new Error(`不支持的请求字段: ${key}`)
  }
  const method = String(data.method ?? 'GET').toUpperCase()
  if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD'].includes(method)) {
    throw new Error('请求方法不允许')
  }
  if (data.headers && typeof data.headers !== 'object') throw new Error('请求头参数无效')
  return { method, headers: data.headers, body: data.body, referrerPolicy: data.referrerPolicy }
}

async function initDB() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    },
  })
}

export class BackgroundCounter {
  async request(args: {
    url: string
    data: RequestInit
    timeout: number
    responseType: ResponseType
  }) {
    const url = assertAllowedUrl(args.url)
    const data = validateRequestInit(args.data)
    if (!Number.isFinite(args.timeout) || args.timeout <= 0 || args.timeout > 120) {
      throw new Error('请求超时时间无效')
    }
    const signal = AbortSignal.timeout(args.timeout * 1000)

    const res = await fetch(url, {
      ...data,
      signal,
      mode: 'cors',
      credentials: 'include',
    }).then(async (res) => {
      if (!res.ok || res.status >= 400) {
        // 错误正文可能含 Cookie、手机号等敏感信息，不写入日志或错误字符串。
        await res.body?.cancel()
        throw new Error(`状态码: ${res.status}`)
      }

      const result = args.responseType === 'json' ? await res.json() : await res.text()

      return result
    })
    return res
  }

  async notify(args: Browser.notifications.NotificationCreateOptions) {
    await browser.notifications.create({
      type: args.type,
      iconUrl: args.iconUrl,
      title: args.title,
      message: args.message,
    })
    return true
  }

  async backgroundTest(type: 'success' | 'error') {
    if (type === 'error') {
      throw new Error(`background test error date: ${Date.now()}`)
    }
    return Date.now()
  }

  async fetch(...args: Parameters<typeof fetch>) {
    const [input, init] = args
    const requestUrl =
      typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    const url = assertAllowedUrl(requestUrl)
    const data = validateRequestInit(init ?? {})
    return await fetch(url, data)
  }
  async getImage(key: string): Promise<
    | { success: false }
    | {
        success: true
        name: string
        type: string
        buffer: number[]
      }
  > {
    const db = await initDB()
    const file: File | undefined = await db.get(STORE_NAME, key)
    if (!file) {
      return { success: false }
    }
    const arrayBuffer = await file.arrayBuffer()
    return {
      success: true,
      name: file.name,
      type: file.type,
      buffer: Array.from(new Uint8Array(arrayBuffer)),
    }
  }
  async setImage(opt: {
    name: string
    type: string
    buffer: number[]
  }): Promise<{ success: boolean; key: string }> {
    const db = await initDB()
    const file = new File([new Uint8Array(opt.buffer).buffer], opt.name, { type: opt.type })
    const key = `img-${await calculateFileMD5(file)}`
    await db.put(STORE_NAME, file, key)
    return { success: true, key }
  }

  /** 删除本机 IndexedDB 中的图片，避免清空配置后继续保留个人简历副本。 */
  async removeImage(key: string): Promise<boolean> {
    if (!key) return false
    const db = await initDB()
    await db.delete(STORE_NAME, key)
    return true
  }
}

interface MessageMeta {
  url: string
  injector: 'content' | 'popup'
}

export class ProvideBackgroundAdapter implements Adapter<MessageMeta> {
  sendMessage: SendMessage<MessageMeta> = async (message) => {
    switch (message.meta.injector) {
      case 'content': {
        const tabs = await browser.tabs.query({ url: message.meta.url })
        void tabs.map((tab) => browser.tabs.sendMessage(tab.id!, message))
        break
      }
      case 'popup': {
        await browser.runtime.sendMessage(message).catch((error) => {
          if (error.message.includes('Receiving end does not exist')) {
            return
          }
          throw error
        })
        break
      }
    }
  }
  onMessage: OnMessage<MessageMeta> = (callback) => {
    const handler = (message?: Partial<Message<MessageMeta>>) => {
      if (!message?.meta) {
        return callback(message)
      }
      callback({
        ...message,
        meta: {
          ...message.meta,
          injector: message?.sender?.name as MessageMeta['injector'],
        },
      })
    }
    browser.runtime.onMessage.addListener(handler)
    return () => browser.runtime.onMessage.removeListener(handler)
  }
}

export class InjectBackgroundAdapter implements Adapter<MessageMeta> {
  constructor(public name: MessageMeta['injector'] = 'content') {}
  sendMessage: SendMessage<MessageMeta> = (message) => {
    void browser.runtime.sendMessage(browser.runtime.id, {
      ...message,
      meta: { url: document.location.href, injector: this.name },
    } satisfies Message<MessageMeta>)
  }
  onMessage: OnMessage<MessageMeta> = (callback) => {
    const handler = (message?: Partial<Message<MessageMeta>>) => {
      callback(message)
    }
    browser.runtime.onMessage.addListener(handler)
    return () => browser.runtime.onMessage.removeListener(handler)
  }
}
