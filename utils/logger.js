import db from '../models/index.js';

export const LogLevel = {
  INFO: 'INFO',
  WARNING: 'WARNING',
  ERROR: 'ERROR',
  AUDIT: 'AUDIT'
};

export const LogCategory = {
  METADATA: 'METADATA',
  CAMPAIGN: 'CAMPAIGN',
  CLIP: 'CLIP',
  USER: 'USER',
  PAYMENT: 'PAYMENT',
  SECURITY: 'SECURITY',
  SYSTEM: 'SYSTEM'
};

export class Logger {
  static async log(level, category, message, metadata = {}) {
    try {
      await db.Log.create({
        level,
        category,
        message,
        metadata: JSON.stringify(metadata),
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Logging failed:', error);
    }
  }

  static async getLogsByCategory(category, limit = 100, offset = 0) {
    return await db.Log.findAll({
      where: { category },
      order: [['timestamp', 'DESC']],
      limit,
      offset
    });
  }

  static async getLogsByLevel(level, limit = 100, offset = 0) {
    return await db.Log.findAll({
      where: { level },
      order: [['timestamp', 'DESC']],
      limit,
      offset
    });
  }

  static async searchLogs(query) {
    // Implement search functionality
  }
} 