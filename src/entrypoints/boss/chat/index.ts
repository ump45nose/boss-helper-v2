import mqtt from 'mqtt'

import { getUuid } from '@/utils'

import { ProtoBufferMessage } from './geek-chat-core'

interface WtResponse {
  code?: number
  message?: string
  zpData?: {
    wt2?: string
  }
}

export class GeekChatClientManager {
  client!: mqtt.MqttClient
  msgBuilder!: ProtoBufferMessage

  constructor() {}

  /**
   * 初始化 BOSS 聊天连接；失败时抛出可恢复原因，交由页面层降级而不影响职位投递。
   */
  async connect(): Promise<void> {
    const response = await fetch('https://www.zhipin.com/wapi/zppassport/get/wt')
    if (!response.ok) {
      throw new Error(`获取聊天会话失败：服务返回 HTTP ${response.status}`)
    }

    const res = (await response.json()) as WtResponse
    if (res.code !== 0) {
      throw new Error(`获取聊天会话失败：${res.message || '当前登录状态不可用'}`)
    }

    const wt = res.zpData?.wt2
    if (!wt) {
      throw new Error('获取聊天会话失败：服务未返回 wt 参数')
    }

    const token = window._PAGE?.token

    if (!token) {
      throw new Error('获取聊天会话失败：未获取到当前用户 token')
    }

    this.client = mqtt.connect(`wss://ws6.zhipin.com/chatws`, {
      clientId: `ws-${getUuid(16, 16)}`,
      username: `${token}|0`,
      password: wt,
      keepalive: 25,
      clean: true,
      reconnectPeriod: 1000,
      connectTimeout: 10000,
      protocolVersion: 4,
      createWebsocket: (url: string) => {
        const subProtocols = wt ? [wt] : ['mqtt']
        return new WebSocket(url, subProtocols)
      },
    })

    this.msgBuilder = new ProtoBufferMessage({
      userId: Number(window._PAGE?.uid ?? window._PAGE?.userId),
      token,
      platform: 'web',
      friendSource: 0,
      supportPush: true,
      wt,
    })
  }

  /**
   * 关闭当前 MQTT 连接，避免路由重挂载时遗留多个聊天客户端。
   */
  async disconnect(): Promise<void> {
    if (!this.client) return
    // MQTT 的关闭回调可携带错误参数；连接清理只等待回调完成，不将该参数传给 Promise.resolve。
    await new Promise<void>((resolve) => this.client.end(true, {}, () => resolve()))
  }
}
