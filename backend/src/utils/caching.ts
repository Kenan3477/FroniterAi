import { logger } from './logging';

/**
 * Cache configuration interface
 */
export interface CacheConfig {
  defaultTTL: number; // Time to live in seconds
  maxMemorySize: number; // Maximum memory usage in bytes
  evictionPolicy: 'lru' | 'fifo' | 'ttl';
  compressionEnabled: boolean;
}

/**
 * Cache entry interface
 */
interface CacheEntry<T = any> {
  value: T;
  expiresAt: number;
  accessCount: number;
  lastAccessed: number;
  size: number;
}

/**
 * Cache statistics interface
 */
export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  evictions: number;
  memoryUsage: number;
  hitRate: number;
  totalEntries: number;
}

/**
 * In-memory cache with Redis-like interface
 * Provides caching for database queries, API responses, and session data
 */
export class CacheManager {
  private static instance: CacheManager;
  private cacheStore: Map<string, CacheEntry>;
  private stats: CacheStats;
  private config: CacheConfig;
  private cleanupInterval: NodeJS.Timeout | null = null;

  private constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      defaultTTL: 300, // 5 minutes
      maxMemorySize: 100 * 1024 * 1024, // 100MB
      evictionPolicy: 'lru',
      compressionEnabled: true,
      ...config
    };

    this.cacheStore = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
      memoryUsage: 0,
      hitRate: 0,
      totalEntries: 0
    };

    // Start cleanup interval for expired entries
    this.startCleanupInterval();

    logger.info('Cache manager initialized', {
      config: this.config
    });
  }

  static getInstance(config?: Partial<CacheConfig>): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager(config);
    }
    return CacheManager.instance;
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    const entry = this.cacheStore.get(key);

    if (!entry) {
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cacheStore.delete(key);
      this.stats.misses++;
      this.updateMemoryUsage();
      this.updateHitRate();
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.stats.hits++;
    this.updateHitRate();

    return entry.value as T;
  }

  /**
   * Set value in cache
   */
  async set<T>(
    key: string, 
    value: T, 
    ttlSeconds?: number
  ): Promise<boolean> {
    try {
      const ttl = ttlSeconds || this.config.defaultTTL;
      const expiresAt = Date.now() + (ttl * 1000);
      const size = this.calculateSize(value);

      // Check memory limits before adding
      if (this.shouldEvict(size)) {
        this.performEviction();
      }

      const entry: CacheEntry<T> = {
        value: this.config.compressionEnabled ? this.compress(value) : value,
        expiresAt,
        accessCount: 0,
        lastAccessed: Date.now(),
        size
      };

      this.cacheStore.set(key, entry);
      this.stats.sets++;
      this.updateMemoryUsage();
      this.updateTotalEntries();

      logger.debug('Cache entry set', {
        key,
        ttl,
        size,
        totalEntries: this.stats.totalEntries
      });

      return true;
    } catch (error) {
      logger.error('Failed to set cache entry', {
        key,
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<boolean> {
    const deleted = this.cacheStore.delete(key);
    if (deleted) {
      this.stats.deletes++;
      this.updateMemoryUsage();
      this.updateTotalEntries();
    }
    return deleted;
  }

  /**
   * Check if key exists in cache
   */
  async exists(key: string): Promise<boolean> {
    const entry = this.cacheStore.get(key);
    if (!entry) return false;

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cacheStore.delete(key);
      this.updateMemoryUsage();
      return false;
    }

    return true;
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    this.cacheStore.clear();
    this.stats.memoryUsage = 0;
    this.stats.totalEntries = 0;
    logger.info('Cache cleared');
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Get cache configuration
   */
  getConfig(): CacheConfig {
    return { ...this.config };
  }

  /**
   * Get or set pattern (cache-aside pattern)
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttlSeconds?: number
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Not in cache, fetch from source
    try {
      const value = await factory();
      await this.set(key, value, ttlSeconds);
      return value;
    } catch (error) {
      logger.error('Failed to fetch value for cache', {
        key,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Cache decorator for methods
   */
  cached(ttlSeconds?: number) {
    return function (
      target: any,
      propertyName: string,
      descriptor: PropertyDescriptor
    ) {
      const originalMethod = descriptor.value;

      descriptor.value = async function (...args: any[]) {
        const cacheManager = CacheManager.getInstance();
        const cacheKey = `${target.constructor.name}:${propertyName}:${JSON.stringify(args)}`;

        return await cacheManager.getOrSet(
          cacheKey,
          () => originalMethod.apply(this, args),
          ttlSeconds
        );
      };

      return descriptor;
    };
  }

  /**
   * Start cleanup interval for expired entries
   */
  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredEntries();
    }, 60000); // Run every minute
  }

  /**
   * Cleanup expired entries
   */
  private cleanupExpiredEntries(): void {
    const now = Date.now();
    let evicted = 0;

    for (const [key, entry] of this.cacheStore.entries()) {
      if (now > entry.expiresAt) {
        this.cacheStore.delete(key);
        evicted++;
      }
    }

    if (evicted > 0) {
      this.stats.evictions += evicted;
      this.updateMemoryUsage();
      this.updateTotalEntries();
      
      logger.debug('Cleaned up expired cache entries', {
        evicted,
        totalEntries: this.stats.totalEntries
      });
    }
  }

  /**
   * Check if eviction is needed
   */
  private shouldEvict(newEntrySize: number): boolean {
    return this.stats.memoryUsage + newEntrySize > this.config.maxMemorySize;
  }

  /**
   * Perform cache eviction based on policy
   */
  private performEviction(): void {
    const entriesToEvict = Math.ceil(this.cacheStore.size * 0.1); // Evict 10%
    let evicted = 0;

    if (this.config.evictionPolicy === 'lru') {
      // Sort by last accessed time (ascending)
      const sortedEntries = Array.from(this.cacheStore.entries())
        .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);

      for (let i = 0; i < entriesToEvict && i < sortedEntries.length; i++) {
        this.cacheStore.delete(sortedEntries[i][0]);
        evicted++;
      }
    } else if (this.config.evictionPolicy === 'fifo') {
      // Delete oldest entries first
      const keys = Array.from(this.cacheStore.keys());
      for (let i = 0; i < entriesToEvict && i < keys.length; i++) {
        this.cacheStore.delete(keys[i]);
        evicted++;
      }
    }

    this.stats.evictions += evicted;
    this.updateMemoryUsage();
    this.updateTotalEntries();

    logger.debug('Performed cache eviction', {
      policy: this.config.evictionPolicy,
      evicted,
      remainingEntries: this.stats.totalEntries
    });
  }

  /**
   * Calculate approximate size of value
   */
  private calculateSize(value: any): number {
    try {
      return JSON.stringify(value).length * 2; // Approximate bytes
    } catch {
      return 1000; // Default size if can't calculate
    }
  }

  /**
   * Simple compression (for demo purposes)
   */
  private compress<T>(value: T): T {
    // In production, use a real compression library like zlib
    return value;
  }

  /**
   * Update memory usage statistics
   */
  private updateMemoryUsage(): void {
    let totalSize = 0;
    for (const entry of this.cacheStore.values()) {
      totalSize += entry.size;
    }
    this.stats.memoryUsage = totalSize;
  }

  /**
   * Update hit rate statistics
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
  }

  /**
   * Update total entries count
   */
  private updateTotalEntries(): void {
    this.stats.totalEntries = this.cacheStore.size;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.cacheStore.clear();
    logger.info('Cache manager destroyed');
  }
}

// Export singleton instance
export const cacheManager = CacheManager.getInstance();

/**
 * Cache middleware for Express routes
 */
export function cacheMiddleware(ttlSeconds: number = 300) {
  return async (req: any, res: any, next: any) => {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const cacheKey = `route:${req.originalUrl}`;
    
    try {
      const cached = await cacheManager.get(cacheKey);
      
      if (cached) {
        logger.debug('Cache hit for route', { url: req.originalUrl });
        return res.json(cached);
      }

      // Store original json method
      const originalJson = res.json;
      
      // Override json method to cache response
      res.json = function(data: any) {
        // Cache the response
        cacheManager.set(cacheKey, data, ttlSeconds)
          .catch(error => {
            logger.error('Failed to cache response', {
              url: req.originalUrl,
              error: error.message
            });
          });

        // Call original json method
        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      logger.error('Cache middleware error', {
        url: req.originalUrl,
        error: error instanceof Error ? error.message : String(error)
      });
      next();
    }
  };
}