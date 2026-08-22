import type { Ref } from 'vue'
import { ref, toValue } from 'vue'

const rootVue = ref()

/**
 * 轮询查找 Vue 实例，并统一管理轮询和超时定时器，避免等待结束后遗留定时器。
 */
function waitForVueInstance(selectors: string, intervalMs: number, errorMessage: string) {
  let interval: ReturnType<typeof setInterval> | undefined
  let timeout: ReturnType<typeof setTimeout> | undefined
  let settled = false

  const cleanup = () => {
    if (interval !== undefined) clearInterval(interval)
    if (timeout !== undefined) clearTimeout(timeout)
    interval = undefined
    timeout = undefined
  }

  const promise = new Promise<any>((resolve, reject) => {
    const finish = (callback: () => void) => {
      if (settled) return
      settled = true
      cleanup()
      callback()
    }

    interval = setInterval(() => {
      const vueInstance = document.querySelector<any>(selectors)?.__vue__
      if (vueInstance) finish(() => resolve(vueInstance))
    }, intervalMs)

    timeout = setTimeout(() => {
      finish(() => reject(new Error(errorMessage)))
    }, 20000)
  })

  return { promise, cleanup }
}

export async function getRootVue(): Promise<any> {
  if (rootVue.value !== undefined) {
    return rootVue.value
  }

  const waitVueMount = waitForVueInstance('#wrap', 300, '未找到vue根组件')
  await waitVueMount.promise
  if (rootVue.value === undefined) {
    const wrap = document.querySelector<any>('#wrap')
    if (wrap?.__vue__) rootVue.value = wrap.__vue__
  }
  return rootVue.value
}

export function useHookVueData<T = any>(
  selectors: string,
  key: string,
  data: Ref<T>,
  update?: (val: T) => void,
) {
  return async () => {
    const waitJobVue = waitForVueInstance(selectors, 100, '未找到对应元素')
    const jobVue = await waitJobVue.promise

    data.value = jobVue[key]
    update?.(toValue(jobVue[key] as T))
    // eslint-disable-next-line no-restricted-properties
    const originalDescriptor = Object.getOwnPropertyDescriptor(jobVue, key)
    const originalSet = jobVue.__lookupSetter__?.(key)
    // 保留原 getter，避免拦截 setter 后页面读取同一字段变成 undefined。
    const originalGet = jobVue.__lookupGetter__?.(key)
    let currentValue = jobVue[key] as T
    // eslint-disable-next-line accessor-pairs
    Object.defineProperty(jobVue, key, {
      configurable: true,
      enumerable: originalDescriptor?.enumerable ?? true,
      get() {
        return originalGet ? originalGet.call(this) : currentValue
      },
      set(val: T) {
        data.value = val
        update?.(val)
        if (originalSet) originalSet.call(this, val)
        else currentValue = val
      },
    })

    // 返回可调用清理函数，恢复 hook 前的属性描述符；无原描述符时删除新增属性。
    return () => {
      if (originalDescriptor) {
        // 数据属性在 hook 期间没有原 setter，恢复时保留页面最后一次赋值。
        const descriptor = 'value' in originalDescriptor
          ? { ...originalDescriptor, value: currentValue }
          : originalDescriptor
        Object.defineProperty(jobVue, key, descriptor)
      }
      else delete jobVue[key]
    }
  }
}

export function useHookVueFn(selectors: string, key: string | string[]) {
  return async () => {
    const waitJobVue = waitForVueInstance(selectors, 100, '未找到对应元素')
    const jobVue = await waitJobVue.promise
    if (Array.isArray(key)) {
      for (const k of key) {
        if (jobVue[k]) {
          return jobVue[k]
        }
      }
    } else {
      return jobVue[key]
    }
  }
}
