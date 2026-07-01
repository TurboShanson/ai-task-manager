const { Task } = require('../models');

const VALID_STATUSES = ['new', 'in_progress', 'done'];
const VALID_PRIORITIES = ['low', 'medium', 'high'];

exports.getTasks = async (req, res) => {
  try {
    const tasks = await Task.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']],
    });

    return res.json(tasks);
  } catch (error) {
    console.error('Ошибка получения задач:', error);
    return res.status(500).json({ message: 'Внутренняя ошибка сервера при получении задач' });
  }
};

exports.createTask = async (req, res) => {
  try {
    const { title, description, status, priority, category } = req.body;

    if (!title) {
      return res.status(400).json({ message: 'Название задачи обязательно' });
    }

    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ message: 'Недопустимый статус задачи' });
    }

    if (priority && !VALID_PRIORITIES.includes(priority)) {
      return res.status(400).json({ message: 'Недопустимый приоритет задачи' });
    }

    const task = await Task.create({
      userId: req.user.id,
      title,
      description,
      status,
      priority,
      category,
    });

    return res.status(201).json(task);
  } catch (error) {
    console.error('Ошибка создания задачи:', error);
    return res.status(500).json({ message: 'Внутренняя ошибка сервера при создании задачи' });
  }
};

exports.updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, status, priority, category } = req.body;

    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ message: 'Недопустимый статус задачи' });
    }

    if (priority && !VALID_PRIORITIES.includes(priority)) {
      return res.status(400).json({ message: 'Недопустимый приоритет задачи' });
    }

    const task = await Task.findOne({ where: { id, userId: req.user.id } });
    if (!task) {
      return res.status(404).json({ message: 'Задача не найдена' });
    }

    if (title !== undefined) task.title = title;
    if (description !== undefined) task.description = description;
    if (status !== undefined) task.status = status;
    if (priority !== undefined) task.priority = priority;
    if (category !== undefined) task.category = category;

    await task.save();

    return res.json(task);
  } catch (error) {
    console.error('Ошибка обновления задачи:', error);
    return res.status(500).json({ message: 'Внутренняя ошибка сервера при обновлении задачи' });
  }
};

exports.deleteTask = async (req, res) => {
  try {
    const { id } = req.params;

    const task = await Task.findOne({ where: { id, userId: req.user.id } });
    if (!task) {
      return res.status(404).json({ message: 'Задача не найдена' });
    }

    await task.destroy();

    return res.json({ message: 'Задача удалена' });
  } catch (error) {
    console.error('Ошибка удаления задачи:', error);
    return res.status(500).json({ message: 'Внутренняя ошибка сервера при удалении задачи' });
  }
};
