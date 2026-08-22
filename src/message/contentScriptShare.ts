import { Adapter, SendMessage, OnMessage, Message } from 'comctx'

import { BOSS_HELPER_V2_MESSAGE_EVENT } from '@/utils/namespace'

declare global {
  function cloneInto<T>(value: T, target: any): T
}

/** DOM 事件可被页面伪造；只接受本扩展约定的对象消息，避免把任意值送入 comctx。 */
function isMessageDetail(value: unknown): value is Partial<Message> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const keys = Object.keys(value)
  return keys.length <= 12 && keys.some((key) => key === 'id' || key === 'type' || key === 'meta' || key === 'data')
}

export class ProvideContentAdapter implements Adapter {
  sendMessage: SendMessage = (message) => {
    /**
     * Compatible with Firefox
     * https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Sharing_objects_with_page_scripts#cloneinto
     */
    const detail =
      typeof cloneInto === 'function' ? cloneInto(message, document.defaultView) : message

    document.dispatchEvent(new CustomEvent(BOSS_HELPER_V2_MESSAGE_EVENT, { detail }))
  }
  onMessage: OnMessage = (callback) => {
    const handler = (event: Event) => {
      if (event.target !== document || event.currentTarget !== document) return
      const detail = (event as CustomEvent<unknown>).detail
      if (isMessageDetail(detail)) callback(detail)
    }
    document.addEventListener(BOSS_HELPER_V2_MESSAGE_EVENT, handler)
    return () => document.removeEventListener(BOSS_HELPER_V2_MESSAGE_EVENT, handler)
  }
}

export class ProvideContentScriptAdapter implements Adapter {
  script: HTMLScriptElement

  constructor(script: HTMLScriptElement) {
    this.script = script
  }
  sendMessage: SendMessage = (message) => {
    // /**
    //  * Compatible with Firefox
    //  * https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Sharing_objects_with_page_scripts#cloneinto
    //  */
    const detail =
      typeof cloneInto === 'function' ? cloneInto(message, document.defaultView) : message
    this.script.dispatchEvent(new CustomEvent(BOSS_HELPER_V2_MESSAGE_EVENT, { detail, bubbles: false }))
  }

  onMessage: OnMessage = (callback) => {
    const handler = (event: Event) => {
      if (event.target !== this.script || event.currentTarget !== this.script) return
      const detail = (event as CustomEvent<unknown>).detail
      if (isMessageDetail(detail)) callback(detail)
    }
    this.script.addEventListener(BOSS_HELPER_V2_MESSAGE_EVENT, handler)
    return () => this.script.removeEventListener(BOSS_HELPER_V2_MESSAGE_EVENT, handler)
  }
}
