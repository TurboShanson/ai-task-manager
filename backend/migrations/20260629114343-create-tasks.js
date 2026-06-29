'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
  await queryInterface.createTable('tasks', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users', // Название таблицы, на которую ссылаемся
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      status: {
        type: Sequelize.STRING(20),
        defaultValue: 'new',
      },
      priority: {
        type: Sequelize.STRING(20),
        defaultValue: 'medium',
      },
      category: {
        type: Sequelize.STRING(50),
        defaultValue: 'general',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      }
    });

    await queryInterface.addConstraint('tasks', {
      fields: ['status'],
      type: 'check',
      where: {
        status: ['new', 'in_progress', 'done']
      },
      name: 'check_tasks_status'
    });

    await queryInterface.addConstraint('tasks', {
      fields: ['priority'],
      type: 'check',
      where: {
        priority: ['low', 'medium', 'high']
      },
      name: 'check_tasks_priority'
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('tasks');
  }
};
