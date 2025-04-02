import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const Payment = sequelize.define('Payment', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userDiscordId: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'discordId'
      }
    },
    discordGuildId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'Campaigns',
        key: 'discordGuildId'
      }
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    totalViews: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    clipCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    status: {
      type: DataTypes.ENUM('PENDING', 'PAID', 'FAILED'),
      defaultValue: 'PENDING'
    },
    paidAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    paymentMethod: {
      type: DataTypes.STRING,
      allowNull: true
    },
    expedite: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    createdBy: {
      type: DataTypes.STRING,
      allowNull: true
    },
    paidBy: {
      type: DataTypes.STRING,
      allowNull: true
    },
    transactionId: {
      type: DataTypes.STRING,
      allowNull: true
    }
  });

  Payment.associate = (models) => {
    Payment.belongsTo(models.User, { foreignKey: 'userDiscordId' });
    Payment.belongsTo(models.Campaign, { foreignKey: 'discordGuildId' });
    Payment.hasMany(models.Clip, { foreignKey: 'paymentId' });
  };

  return Payment;
}; 