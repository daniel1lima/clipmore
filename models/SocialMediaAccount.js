import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const SocialMediaAccount = sequelize.define('SocialMediaAccount', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    platform: {
      type: DataTypes.ENUM('INSTAGRAM', 'TIKTOK', 'YOUTUBE', 'X'),
      allowNull: false
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    ytChannelId: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null
    },
    isVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    verificationCode: {
      type: DataTypes.STRING
    },
    userDiscordId: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'discordId'
      }
    }
  });

  return SocialMediaAccount;
}; 