const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { sequelize } = require('./models');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json()); 

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Бэк робит' });
});

async function startServer() {
  try {
    await sequelize.authenticate();
    console.log('Соединёние с PostgreSQL успешно');

    app.listen(PORT, () => {
      console.log(`Сервер запущен на порте ${PORT}`);
    });
  } catch (error) {
    console.error('Не удалось подключиться к БД:', error);
    process.exit(1);
  }
}

startServer();