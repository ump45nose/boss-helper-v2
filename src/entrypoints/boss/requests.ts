// import axios from 'axios'

import {
  GreetError,
  BossHelperError,
  LimitError,
  PublishError,
  RateLimitError,
} from '@/composables/useApplying/deliverError'
import { calculateFileMD5 } from '@/utils/file'
import { logger } from '@/utils/logger'
import { v2StorageKey } from '@/utils/namespace'

import type { BossZpBossData, BossZpDetailData } from './types'

// const { userInfo } = useStore()
const toast = useToast()
export const sameCompanyKey = v2StorageKey('same-company')
export const sameHrKey = v2StorageKey('same-hr')

/** BOSS 图片上传后可直接放入 protobuf 图片消息的最小结构。 */
export interface UploadedImage {
  iid?: number
  tinyImage: { url: string; width: number; height: number }
  originImage: { url: string; width: number; height: number }
}

export async function getJobDetail(params: { securityId: string; lid: string }): Promise<{
  code: number
  message: string
  zpData: BossZpDetailData
}> {
  const token = window?.Cookie.get('bst')
  if (!token) {
    toast.add({
      title: '没有获取到token,请刷新重试',
      color: 'error',
    })
    throw new PublishError('没有获取到token')
  }
  const url = new URL('https://www.zhipin.com/wapi/zpgeek/job/detail.json')
  url.searchParams.set('securityId', params.securityId)
  url.searchParams.set('lid', params.lid)
  url.searchParams.set('_', String(Date.now()))

  return fetch(url.toString(), {
    headers: { Zp_token: token },
    signal: AbortSignal.timeout(5000),
  }).then((r) => r.json())
}

/**
 * 投递 Boss 沟通请求，并在安全的临时故障下有限重试。
 * @param data 投递所需的职位安全标识和加密职位 ID
 * @param errorMsg 上一次临时失败的错误信息
 * @param retries 剩余重试次数；同时限制 120 限额确认后的再次投递
 * @param _params 追加到请求查询参数的值（例如限额确认后的 cid）
 */
export async function sendPublishReq(
  data: { securityId: string; encryptJobId: string },
  errorMsg?: string,
  retries = 3,
  _params = {},
) {
  if (retries <= 0) {
    throw new PublishError(errorMsg ?? '重试多次失败')
  }
  const url = new URL('https://www.zhipin.com/wapi/zpgeek/friend/add.json')
  Object.entries({
    securityId: data.securityId,
    jobId: data.encryptJobId,
    ..._params,
  }).forEach(([key, value]) => url.searchParams.append(key, String(value)))

  const token = window?.Cookie.get('bst')
  if (!token) {
    toast.add({
      title: '没有获取到token,请刷新重试',
      color: 'error',
    })
    throw new PublishError('没有获取到token')
  }
  try {
    // 请求本身设置超时；AbortError/TimeoutError 会按临时网络故障处理。
    const response = await fetch(url, {
      method: 'POST',
      headers: { Zp_token: token },
      signal: AbortSignal.timeout(10000),
    })
    // 只有服务端 5xx 才允许重试，4xx（包括 429）必须直接交给业务错误处理。
    if (response.status >= 500 && response.status <= 599) {
      const temporaryError = new Error(`HTTP ${response.status}`)
      temporaryError.name = 'TemporaryServerError'
      throw temporaryError
    }
    const res = await response.json()

    if (res.code !== 0) {
      // 只记录状态码和短错误消息，禁止把响应对象或 token 相关字段写入日志。
      logger.error('投递失败', {
        code: res.code,
        message: String(res.message ?? '').slice(0, 240),
      })
    }

    if (res.code === 1) {
      const content = String(
        res?.zpData?.bizData?.chatRemindDialog?.content || res.message || '未知错误',
      )
      // 命中限额弹窗 → 立刻发送确认请求
      if (content.includes('您今天已与120位BOSS沟通')) {
        try {
          const url = new URL('https://www.zhipin.com/wapi/zpCommon/actionLog/geek/chatremind.json')
          url.searchParams.set('ba', res.zpData.bizData.chatRemindDialog.ba)
          url.searchParams.set('action', 'addf-limit-popup-c')
          await fetch(url, {
            method: 'POST',
            headers: { Zp_token: token },
          })

          // 确认后只消耗一次有限重试额度，避免 120 限额响应导致无限递归。
          return sendPublishReq(data, undefined, retries - 1, { cid: 1 })
        } catch (e) {
          logger.error('尝试确认投递限制失败', e)
          throw new PublishError(`投递限制确认失败]${content}`)
        }
      } else if (content.includes('您今天已与150位BOSS沟通')) {
        throw new LimitError(content)
      } else if (content.includes('操作过于频繁')) {
        throw new RateLimitError(content)
      }

      throw new PublishError(content)
    } else if (res.code !== 0) {
      throw new PublishError(`未知错误状态:${res.message}`)
    }
    return res
  } catch (e: any) {
    if (e instanceof BossHelperError) {
      throw e
    }
    // 业务异常不重试；仅网络、超时和 5xx 这类安全临时故障允许退避重试。
    const isTemporaryFailure =
      e?.name === 'TemporaryServerError' ||
      e?.name === 'AbortError' ||
      e?.name === 'TimeoutError' ||
      e instanceof TypeError
    if (!isTemporaryFailure || retries <= 1) {
      throw new PublishError(e?.message ?? errorMsg ?? '投递失败')
    }
    // 指数退避限制在 250/500/1000ms，避免失败时快速重复投递。
    const retryIndex = 4 - retries
    await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** Math.max(0, retryIndex)))
    return sendPublishReq(data, e?.message as string, retries - 1, _params)
  }
}

export async function getBossData(
  job: { encryptUserId: string; securityId: string },
  errorMsg?: string,
  retries = 3,
): Promise<BossZpBossData> {
  if (retries === 0) {
    throw new GreetError(errorMsg ?? '重试多次失败')
  }
  const url = 'https://www.zhipin.com/wapi/zpchat/geek/getBossData'
  // userInfo.value?.token 不相等！
  const token = window?.Cookie.get('bst')
  if (!token) {
    toast.add({
      title: '没有获取到token,请刷新重试',
      color: 'error',
    })
    throw new GreetError('没有获取到token')
  }
  try {
    const body = new FormData()
    body.append('bossId', job.encryptUserId)
    body.append('securityId', job.securityId)
    body.append('bossSrc', '0')

    const res: {
      code: number
      message: string
      zpData: BossZpBossData
    } = await fetch(url, {
      body: body,
      method: 'POST',
      headers: { Zp_token: token },
    }).then((r) => r.json())

    if (res.code !== 0) {
      if (res.message === '非好友关系') {
        return await getBossData(job, '非好友关系', retries - 1)
      }
      throw new GreetError(`状态错误:${res.message}`)
    }
    return res.zpData
  } catch (e: any) {
    if (e instanceof GreetError) {
      throw e
    }
    return getBossData(job, e?.message as string, retries - 1)
  }
}

/** 上传图片到当前招聘会话；不记录图片内容、令牌或完整上传响应。 */
export async function uploadImage(securityId: string, file: File): Promise<UploadedImage> {
  const toast = useToast()
  const token = window?.Cookie.get('bst')
  if (!token) {
    toast.add({
      title: '没有获取到token,请刷新重试',
      color: 'error',
    })
    throw new Error('没有获取到token')
  }

  const params = new URLSearchParams()
  params.append('fileMd5', await calculateFileMD5(file))
  params.append('fileSize', file.size.toString())
  params.append('source', 'chat_file')
  params.append('securityId', securityId)

  const quickRes: {
    code: number
    message: string
    zpData?: {
      metadata: {
        width: number
        height: number
        fileSize: number
        contentMd5: string
        originFilename: string
        aigcMetadataBO: {
          label: number
          contentProducer: any
          produceID: any
          reserveCode1: any
          contentPropagator: any
          propagateID: any
          reserveCode2: any
          aigcempty: boolean
          aigcnotEmpty: boolean
        }
      }
      url: string
      relativeUrl: string
      source: string
      tinyUrl: string
      relativeTinyUrl: string
      waterUrl: any
      relativeWaterUrl: any
      flagKey: any
      fileName: any
    }
  } = await fetch('https://www.zhipin.com/wapi/zpupload/quicklyUpload', {
    headers: {
      zp_token: token,
    },
    referrer: 'https://www.zhipin.com/web/geek/chat',
    body: params,
    method: 'POST',
  }).then((res) => res.json())
  if (quickRes.code === 0 && quickRes.zpData && quickRes.zpData.url) {
    return {
      tinyImage: {
        url: quickRes.zpData.tinyUrl,
        width: 200,
        height: 118,
      },
      originImage: {
        url: quickRes.zpData.url,
        width: quickRes.zpData.metadata.width,
        height: quickRes.zpData.metadata.height,
      },
    }
  }
  const body = new FormData()
  body.append('securityId', securityId)

  body.append('source', 'chat_file')
  body.append('file', file, file.name)

  const res: {
    code: number
    message: string
    zpData: {
      metadata: {
        width: number
        height: number
        fileSize: number
        contentMd5: string
        originFilename: string
        aigcMetadataBO: {
          label: number
          contentProducer: any
          produceID: any
          reserveCode1: any
          contentPropagator: any
          propagateID: any
          reserveCode2: any
          aigcnotEmpty: boolean
          aigcempty: boolean
        }
      }
      url: string
      relativeUrl: string
      source: string
      tinyUrl: string
      relativeTinyUrl: string
      waterUrl: any
      relativeWaterUrl: any
      flagKey: any
      fileName: any
    }
  } = await fetch('https://www.zhipin.com/wapi/zpupload/image/uploadSingle', {
    headers: {
      zp_token: token,
    },
    referrer: 'https://www.zhipin.com/web/geek/chat',
    body: body,
    method: 'POST',
  }).then((res) => res.json())
  if (res.code !== 0) {
    throw new Error('上传图片失败:' + res.message)
  }
  return {
    tinyImage: {
      url: res.zpData.tinyUrl,
      width: 200,
      height: 118,
    },
    originImage: {
      url: res.zpData.url,
      width: res.zpData.metadata.width,
      height: res.zpData.metadata.height,
    },
  }
}
