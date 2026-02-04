const logger = require('../utils/logger');

/**
 * FeatureFlags
 * Manages feature flags for gradual rollout and A/B testing
 * Backend: Supabase (when integrated) or in-memory for development
 */
class FeatureFlags {
  constructor() {
    // In-memory store for development (would be Supabase in production)
    this.flags = new Map();
    this.userOverrides = new Map();
    this.rolloutPercentages = new Map();
    
    // Initialize with default flags
    this.initializeDefaultFlags();
  }

  /**
   * Initialize default feature flags
   */
  initializeDefaultFlags() {
    this.flags.set('new-dashboard', {
      enabled: false,
      rolloutPercentage: 0,
      description: 'New dashboard UI',
      environment: ['qa', 'pre-production']
    });

    this.flags.set('ai-task-generation', {
      enabled: true,
      rolloutPercentage: 100,
      description: 'AI-powered task generation from research',
      environment: ['all']
    });

    this.flags.set('advanced-analytics', {
      enabled: false,
      rolloutPercentage: 10,
      description: 'Advanced project analytics',
      environment: ['qa']
    });
  }

  /**
   * Check if a feature is enabled for a user
   * @param {string} featureName - Feature flag name
   * @param {string} userId - User ID (optional)
   * @param {string} environment - Environment (dev, qa, pre-production, production)
   * @returns {boolean} True if feature is enabled
   */
  isEnabled(featureName, userId = null, environment = 'production') {
    try {
      // Check user-specific override first
      if (userId && this.userOverrides.has(`${featureName}:${userId}`)) {
        return this.userOverrides.get(`${featureName}:${userId}`);
      }

      const flag = this.flags.get(featureName);
      if (!flag) {
        logger.warn(`[FeatureFlags] Unknown feature: ${featureName}`);
        return false;
      }

      // Check environment restrictions
      if (!this.isEnabledInEnvironment(flag, environment)) {
        return false;
      }

      // Check global enable/disable
      if (!flag.enabled) {
        return false;
      }

      // Check rollout percentage
      if (flag.rolloutPercentage < 100) {
        return this.isInRollout(featureName, userId, flag.rolloutPercentage);
      }

      return true;
    } catch (error) {
      logger.error(`[FeatureFlags] Error checking feature ${featureName}:`, error);
      return false;
    }
  }

  /**
   * Check if feature is enabled in current environment
   * @param {Object} flag - Flag object
   * @param {string} environment - Current environment
   * @returns {boolean} True if enabled in environment
   */
  isEnabledInEnvironment(flag, environment) {
    if (flag.environment.includes('all')) {
      return true;
    }
    return flag.environment.includes(environment);
  }

  /**
   * Check if user is in rollout percentage
   * @param {string} featureName - Feature name
   * @param {string} userId - User ID
   * @param {number} percentage - Rollout percentage (0-100)
   * @returns {boolean} True if user is in rollout
   */
  isInRollout(featureName, userId, percentage) {
    if (!userId) {
      // If no userId, use random rollout
      return Math.random() * 100 < percentage;
    }

    // Deterministic rollout based on user ID hash
    const hash = this.hashString(`${featureName}:${userId}`);
    return (hash % 100) < percentage;
  }

  /**
   * Simple string hash function
   * @param {string} str - String to hash
   * @returns {number} Hash value
   */
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Enable a feature flag
   * @param {string} featureName - Feature name
   * @param {Object} options - Options
   * @returns {boolean} Success
   */
  enable(featureName, options = {}) {
    try {
      const flag = this.flags.get(featureName);
      if (!flag) {
        logger.warn(`[FeatureFlags] Cannot enable unknown feature: ${featureName}`);
        return false;
      }

      flag.enabled = true;
      if (options.rolloutPercentage !== undefined) {
        flag.rolloutPercentage = Math.min(100, Math.max(0, options.rolloutPercentage));
      }
      if (options.environment) {
        flag.environment = Array.isArray(options.environment) 
          ? options.environment 
          : [options.environment];
      }

      this.flags.set(featureName, flag);
      logger.info(`[FeatureFlags] Enabled feature: ${featureName} (${flag.rolloutPercentage}%)`);
      return true;
    } catch (error) {
      logger.error(`[FeatureFlags] Error enabling feature ${featureName}:`, error);
      return false;
    }
  }

  /**
   * Disable a feature flag
   * @param {string} featureName - Feature name
   * @returns {boolean} Success
   */
  disable(featureName) {
    try {
      const flag = this.flags.get(featureName);
      if (!flag) {
        logger.warn(`[FeatureFlags] Cannot disable unknown feature: ${featureName}`);
        return false;
      }

      flag.enabled = false;
      this.flags.set(featureName, flag);
      logger.info(`[FeatureFlags] Disabled feature: ${featureName}`);
      return true;
    } catch (error) {
      logger.error(`[FeatureFlags] Error disabling feature ${featureName}:`, error);
      return false;
    }
  }

  /**
   * Gradually increase rollout percentage
   * @param {string} featureName - Feature name
   * @param {number} targetPercentage - Target percentage
   * @param {number} incrementPercentage - Increment per step
   * @returns {boolean} Success
   */
  async gradualRollout(featureName, targetPercentage, incrementPercentage = 10) {
    try {
      const flag = this.flags.get(featureName);
      if (!flag) {
        logger.warn(`[FeatureFlags] Cannot rollout unknown feature: ${featureName}`);
        return false;
      }

      const currentPercentage = flag.rolloutPercentage;
      const newPercentage = Math.min(targetPercentage, currentPercentage + incrementPercentage);

      flag.rolloutPercentage = newPercentage;
      this.flags.set(featureName, flag);

      logger.info(`[FeatureFlags] Gradual rollout: ${featureName} ${currentPercentage}% → ${newPercentage}%`);
      return newPercentage >= targetPercentage;
    } catch (error) {
      logger.error(`[FeatureFlags] Error during gradual rollout:`, error);
      return false;
    }
  }

  /**
   * Set feature override for specific user
   * @param {string} featureName - Feature name
   * @param {string} userId - User ID
   * @param {boolean} enabled - Enable or disable
   */
  setUserOverride(featureName, userId, enabled) {
    this.userOverrides.set(`${featureName}:${userId}`, enabled);
    logger.info(`[FeatureFlags] User override: ${featureName} for ${userId} = ${enabled}`);
  }

  /**
   * Remove user override
   * @param {string} featureName - Feature name
   * @param {string} userId - User ID
   */
  removeUserOverride(featureName, userId) {
    this.userOverrides.delete(`${featureName}:${userId}`);
    logger.info(`[FeatureFlags] Removed user override: ${featureName} for ${userId}`);
  }

  /**
   * Create a new feature flag
   * @param {string} featureName - Feature name
   * @param {Object} config - Flag configuration
   * @returns {boolean} Success
   */
  createFlag(featureName, config = {}) {
    try {
      if (this.flags.has(featureName)) {
        logger.warn(`[FeatureFlags] Feature already exists: ${featureName}`);
        return false;
      }

      const flag = {
        enabled: config.enabled || false,
        rolloutPercentage: config.rolloutPercentage || 0,
        description: config.description || '',
        environment: config.environment || ['all'],
        createdAt: new Date().toISOString()
      };

      this.flags.set(featureName, flag);
      logger.info(`[FeatureFlags] Created feature flag: ${featureName}`);
      return true;
    } catch (error) {
      logger.error(`[FeatureFlags] Error creating feature flag:`, error);
      return false;
    }
  }

  /**
   * Get all feature flags
   * @returns {Array} Array of flag objects
   */
  getAllFlags() {
    const flags = [];
    for (const [name, config] of this.flags.entries()) {
      flags.push({
        name,
        ...config
      });
    }
    return flags;
  }

  /**
   * Get feature flag details
   * @param {string} featureName - Feature name
   * @returns {Object|null} Flag details
   */
  getFlag(featureName) {
    const flag = this.flags.get(featureName);
    if (!flag) return null;

    return {
      name: featureName,
      ...flag
    };
  }

  /**
   * Emergency kill switch - disable all features
   * @param {Array<string>} exceptions - Features to keep enabled
   */
  emergencyDisableAll(exceptions = []) {
    logger.warn('[FeatureFlags] EMERGENCY: Disabling all features');
    
    for (const [name, flag] of this.flags.entries()) {
      if (!exceptions.includes(name)) {
        flag.enabled = false;
        this.flags.set(name, flag);
      }
    }
  }

  /**
   * Export flags for backup
   * @returns {Object} Flags as JSON
   */
  export() {
    const exported = {
      flags: {},
      userOverrides: {},
      exportedAt: new Date().toISOString()
    };

    for (const [name, config] of this.flags.entries()) {
      exported.flags[name] = config;
    }

    for (const [key, value] of this.userOverrides.entries()) {
      exported.userOverrides[key] = value;
    }

    return exported;
  }

  /**
   * Import flags from backup
   * @param {Object} data - Exported data
   */
  import(data) {
    try {
      if (data.flags) {
        for (const [name, config] of Object.entries(data.flags)) {
          this.flags.set(name, config);
        }
      }

      if (data.userOverrides) {
        for (const [key, value] of Object.entries(data.userOverrides)) {
          this.userOverrides.set(key, value);
        }
      }

      logger.info(`[FeatureFlags] Imported ${Object.keys(data.flags || {}).length} flags`);
    } catch (error) {
      logger.error('[FeatureFlags] Error importing flags:', error);
    }
  }

  /**
   * Get rollout statistics
   * @param {string} featureName - Feature name
   * @returns {Object} Statistics
   */
  getStats(featureName) {
    const flag = this.flags.get(featureName);
    if (!flag) return null;

    return {
      name: featureName,
      enabled: flag.enabled,
      rolloutPercentage: flag.rolloutPercentage,
      environment: flag.environment,
      estimatedUsers: `~${flag.rolloutPercentage}% of users`,
      userOverrides: Array.from(this.userOverrides.keys())
        .filter(key => key.startsWith(`${featureName}:`))
        .length
    };
  }
}

module.exports = new FeatureFlags();
