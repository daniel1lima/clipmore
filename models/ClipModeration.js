import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const ClipModeration = sequelize.define('ClipModeration', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    clipId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Clips',
        key: 'id'
      }
    },
    status: {
      type: DataTypes.ENUM('PENDING', 'APPROVED', 'REJECTED', 'FLAGGED'),
      defaultValue: 'PENDING'
    },
    moderatorId: {
      type: DataTypes.STRING, // Discord ID of moderator
      allowNull: true
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    moderationNotes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    reviewedAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  });

  return ClipModeration;
}; 