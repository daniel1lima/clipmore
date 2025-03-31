import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const User = sequelize.define('User', {
    discordId: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false
    },
    isVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    totalViews: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    currentBalance: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.00
    },
    paypalEmail: {
      type: DataTypes.STRING,
      allowNull: true
    },
    username: {
      type: DataTypes.STRING,
      allowNull: true
    },
    joinedAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  });

  return User;
}; 