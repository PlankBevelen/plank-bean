const DB_NAME = 'plank-bean'
const STORE_NAME = 'app-state'

function isBrowser() {
  return typeof window !== 'undefined'
}

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    if (!isBrowser() || typeof window.indexedDB === 'undefined') {
      reject(new Error('IndexedDB 不可用'))
      return
    }

    const request = window.indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('打开 IndexedDB 失败'))
  })
}

export async function readPersistedValue(key: string) {
  if (!isBrowser()) {
    return null
  }

  try {
    const database = await openDatabase()
    return await new Promise<string | null>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.get(key)
      request.onsuccess = () => {
        resolve(request.result === undefined ? null : request.result)
      }
      request.onerror = () => reject(request.error ?? new Error('读取持久化数据失败'))
      transaction.oncomplete = () => database.close()
      transaction.onerror = () => {
        database.close()
        reject(transaction.error ?? new Error('读取持久化数据失败'))
      }
    })
  } catch {
    return window.localStorage.getItem(key)
  }
}

export async function writePersistedValue(key: string, value: string) {
  if (!isBrowser()) {
    return
  }

  try {
    const database = await openDatabase()
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.put(value, key)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error ?? new Error('写入持久化数据失败'))
      transaction.oncomplete = () => database.close()
      transaction.onerror = () => {
        database.close()
        reject(transaction.error ?? new Error('写入持久化数据失败'))
      }
    })
  } catch {
    window.localStorage.setItem(key, value)
  }
}

export async function removePersistedValue(key: string) {
  if (!isBrowser()) {
    return
  }

  try {
    const database = await openDatabase()
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.delete(key)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error ?? new Error('删除持久化数据失败'))
      transaction.oncomplete = () => database.close()
      transaction.onerror = () => {
        database.close()
        reject(transaction.error ?? new Error('删除持久化数据失败'))
      }
    })
  } catch {
    window.localStorage.removeItem(key)
  }
}
