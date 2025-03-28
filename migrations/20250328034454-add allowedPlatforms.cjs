'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('Campaigns', 'allowedPlatforms', {
      type: Sequelize.ARRAY(Sequelize.STRING),
      allowNull: false,
      defaultValue: ["INSTAGRAM", "TIKTOK", "YOUTUBE", "X"],
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('Campaigns', 'allowedPlatforms');
  }
};
