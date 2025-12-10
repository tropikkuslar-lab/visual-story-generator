/**
 * Advanced Caching System
 * \u00d6nbellekleme ve performans optimizasyonu
 */

interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  accessCount: number;
  size: number;
}

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum items in cache
  maxMemory?: number; // Maximum memory in bytes (approximate)
  onEvict?: (key: string, value: any) => void;
}

class MemoryCache<T = any> {
  private cache: Map<string, CacheItem<T>> = new Map();
  private options: Required<CacheOptions>;
  private totalSize: number = 0;

  constructor(options: CacheOptions = {}) {
    this.options = {
      ttl: options.ttl ?? 5 * 60 * 1000, // 5 minutes default
      maxSize: options.maxSize ?? 100,
      maxMemory: options.maxMemory ?? 50 * 1024 * 1024, // 50MB default
      onEvict: options.onEvict ?? (() => {})
    };

    // Periodic cleanup
    setInterval(() => this.cleanup(), 60000);
  }

  private estimateSize(value: any): number {
    try {
      return new Blob([JSON.stringify(value)]).size;
    } catch {
      return 1000; // Fallback estimate
    }
  }

  set(key: string, value: T, ttl?: number): void {
    const size = this.estimateSize(value);
    const expiresAt = Date.now() + (ttl ?? this.options.ttl);

    // Check if we need to evict items
    while (
      (this.cache.size >= this.options.maxSize || this.totalSize + size > this.options.maxMemory) &&
      this.cache.size > 0
    ) {
      this.evictLRU();
    }

    // Remove existing item if present
    if (this.cache.has(key)) {
      const existing = this.cache.get(key)!;
      this.totalSize -= existing.size;
    }

    this.cache.set(key, {
      data: value,
      timestamp: Date.now(),
      expiresAt,
      accessCount: 0,
      size
    });

    this.totalSize += size;
  }

  get(key: string): T | undefined {
    const item = this.cache.get(key);

    if (!item) {
      return undefined;
    }

    // Check expiration
    if (Date.now() > item.expiresAt) {
      this.delete(key);
      return undefined;
    }

    // Update access count for LRU
    item.accessCount++;
    item.timestamp = Date.now();

    return item.data;
  }

  has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;
    if (Date.now() > item.expiresAt) {
      this.delete(key);
      return false;
    }
    return true;
  }

  delete(key: string): boolean {
    const item = this.cache.get(key);
    if (item) {
      this.totalSize -= item.size;
      this.options.onEvict(key, item.data);
      return this.cache.delete(key);
    }
    return false;
  }

  clear(): void {
    this.cache.forEach((item, key) => {
      this.options.onEvict(key, item.data);
    });
    this.cache.clear();
    this.totalSize = 0;
  }

  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    let lowestAccess = Infinity;

    this.cache.forEach((item, key) => {
      // Prioritize evicting expired items
      if (Date.now() > item.expiresAt) {
        oldestKey = key;
        return;
      }

      // Then use LRU with access count as tiebreaker
      if (item.timestamp < oldestTime ||
          (item.timestamp === oldestTime && item.accessCount < lowestAccess)) {
        oldestTime = item.timestamp;
        lowestAccess = item.accessCount;
        oldestKey = key;
      }
    });

    if (oldestKey) {
      this.delete(oldestKey);
    }
  }

  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.cache.forEach((item, key) => {
      if (now > item.expiresAt) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => this.delete(key));
  }

  getStats(): {
    size: number;
    totalMemory: number;
    hitRate: number;
  } {
    return {
      size: this.cache.size,
      totalMemory: this.totalSize,
      hitRate: 0 // Would need to track hits/misses
    };
  }
}

// Singleton caches for different purposes
export const analysisCache = new MemoryCache<any>({
  ttl: 10 * 60 * 1000, // 10 minutes
  maxSize: 50
});

export const imageCache = new MemoryCache<string>({
  ttl: 30 * 60 * 1000, // 30 minutes
  maxSize: 20,
  maxMemory: 100 * 1024 * 1024 // 100MB for images
});

export const apiCache = new MemoryCache<any>({
  ttl: 60 * 1000, // 1 minute
  maxSize: 100
});

// Request deduplication
const pendingRequests = new Map<string, Promise<any>>();

export async function cachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl?: number
): Promise<T> {
  // Check cache first
  const cached = apiCache.get(key);
  if (cached !== undefined) {
    return cached as T;
  }

  // Check if there's already a pending request for this key
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key) as Promise<T>;
  }

  // Create new request
  const promise = fetcher()
    .then(data => {
      apiCache.set(key, data, ttl);
      pendingRequests.delete(key);
      return data;
    })
    .catch(error => {
      pendingRequests.delete(key);
      throw error;
    });

  pendingRequests.set(key, promise);
  return promise;
}

// Debounce utility
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

// Throttle utility
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

// Lazy load utility
export function lazyLoad<T>(
  importFn: () => Promise<{ default: T }>
): () => Promise<T> {
  let cached: T | null = null;
  let promise: Promise<T> | null = null;

  return () => {
    if (cached) {
      return Promise.resolve(cached);
    }

    if (promise) {
      return promise;
    }

    promise = importFn().then(module => {
      cached = module.default;
      return cached;
    });

    return promise;
  };
}

// Image preloader
export class ImagePreloader {
  private loadedImages = new Set<string>();
  private loadingImages = new Map<string, Promise<HTMLImageElement>>();

  preload(src: string): Promise<HTMLImageElement> {
    if (this.loadedImages.has(src)) {
      const img = new Image();
      img.src = src;
      return Promise.resolve(img);
    }

    if (this.loadingImages.has(src)) {
      return this.loadingImages.get(src)!;
    }

    const promise = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.loadedImages.add(src);
        this.loadingImages.delete(src);
        resolve(img);
      };
      img.onerror = reject;
      img.src = src;
    });

    this.loadingImages.set(src, promise);
    return promise;
  }

  preloadMultiple(srcs: string[]): Promise<HTMLImageElement[]> {
    return Promise.all(srcs.map(src => this.preload(src)));
  }

  isLoaded(src: string): boolean {
    return this.loadedImages.has(src);
  }
}

export const imagePreloader = new ImagePreloader();

export default MemoryCache;
