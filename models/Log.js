import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const Log = sequelize.define('Log', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    level: {
      type: DataTypes.ENUM('INFO', 'WARNING', 'ERROR', 'AUDIT'),
      allowNull: false
    },
    category: {
      type: DataTypes.ENUM('METADATA', 'CAMPAIGN', 'CLIP', 'USER', 'PAYMENT', 'SECURITY', 'SYSTEM'),
      allowNull: false
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    timestamp: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  });

  return Log;
}; 