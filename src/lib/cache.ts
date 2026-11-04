// IndexedDB Caching Layer
const DB_NAME = 'arogga-desk'
const DB_VERSION = 1
const STORE_NAME = 'products'
const CACHE_TTL = 60 * 60 * 1000 // 1 hour

export interface CachedData {
  key: string
  data: unknown
  timestamp: number
}

let db: IDBDatabase | null = null

export async function initDB(): Promise<IDBDatabase> {
  if (db) return db

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      db = request.result
      resolve(db)
    }

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'key' })
      }
    }
  })
}

export async function getCached<T>(key: string): Promise<T | null> {
  try {
    const database = await initDB()
    return new Promise((resolve) => {
      const transaction = database.transaction(STORE_NAME, 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.get(key)

      request.onsuccess = () => {
        const result = request.result as CachedData | undefined
        if (!result) {
          resolve(null)
          return
        }

        const now = Date.now()
        if (now - result.timestamp > CACHE_TTL) {
          deleteCache(key)
          resolve(null)
          return
        }

        resolve(result.data as T)
      }

      request.onerror = () => resolve(null)
    })
  } catch {
    return null
  }
}

export async function setCached<T>(key: string, data: T): Promise<void> {
  try {
    const database = await initDB()
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.put({
        key,
        data,
        timestamp: Date.now(),
      })

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.warn('Cache set error:', error)
  }
}

export async function deleteCache(key: string): Promise<void> {
  try {
    const database = await initDB()
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.delete(key)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.warn('Cache delete error:', error)
  }
}

export async function clearCache(): Promise<void> {
  try {
    const database = await initDB()
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.clear()

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.warn('Cache clear error:', error)
  }
}

// API wrapper with caching
export async function fetchWithCache<T>(
  url: string,
  cacheKey: string,
  options?: RequestInit
): Promise<T> {
  // Try to get from cache first
  const cached = await getCached<T>(cacheKey)
  if (cached) {
    console.log('Loaded from cache:', cacheKey)
    return cached
  }

  // Fetch from API
  const response = await fetch(url, options)
  if (!response.ok) throw new Error(`HTTP ${response.status}`)

  const data = (await response.json()) as T
  await setCached(cacheKey, data)
  console.log('Cached new data:', cacheKey)

  return data
}
