/**
 * Cache Management Tools
 * Tools for checking and managing documentation cache
 */

import { ContextualToolHandler } from '../types';
import { CacheService } from '../services/cache.service';
import { OutputFormatter } from '../utils/output-formatter';

/**
 * Handler: check_cache
 * Check if documentation cache exists and get its status
 */
export const handleCheckCache: ContextualToolHandler = async (_args, context) => {
  try {
    const cacheService = CacheService.getInstance();
    const metadata = await cacheService.getCacheMetadata(context.projectPath);
    const stats = await cacheService.getCacheStats(context.projectPath);
    const isValid = await cacheService.isCacheValid(context.projectPath, 24 * 60 * 60 * 1000);

    const structuredData = {
      success: true,
      type: 'cache_status',
      exists: stats.exists,
      valid: isValid,
      filesCount: stats.filesCount,
      totalSize: stats.totalSize,
      age: stats.age,
      metadata: metadata || {},
      timestamp: new Date().toISOString(),
    };

    return OutputFormatter.createResponse(structuredData, context.clientCapabilities);
  } catch (error) {
    return OutputFormatter.createErrorResponse(error as Error, { tool: 'check_cache' });
  }
};

/**
 * Handler: invalidate_cache
 * Force invalidate the documentation cache
 */
export const handleInvalidateCache: ContextualToolHandler = async (_args, context) => {
  try {
    const cacheService = CacheService.getInstance();
    await cacheService.invalidateCache(context.projectPath);

    const structuredData = {
      success: true,
      type: 'cache_invalidated',
      message: 'Cache invalidated successfully. Next generation will be fresh.',
      timestamp: new Date().toISOString(),
    };

    return OutputFormatter.createResponse(structuredData, context.clientCapabilities);
  } catch (error) {
    return OutputFormatter.createErrorResponse(error as Error, { tool: 'invalidate_cache' });
  }
};
