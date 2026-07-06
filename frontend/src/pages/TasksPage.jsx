import { Fragment, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../api';

const STATUS_LABELS = {
  new: 'Новая',
  in_progress: 'В работе',
  done: 'Выполнена',
};

const PRIORITY_LABELS = {
  low: 'Низкий',
  medium: 'Средний',
  high: 'Высокий',
};

const CATEGORY_LABELS = {
  business: 'Бизнес',
  study: 'Учёба',
  personal: 'Личное',
  general: 'Общее',
};

const formatDate = (value) => new Date(value).toLocaleDateString('ru-RU');

export default function TasksPage() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState('');
  const [expandedTaskId, setExpandedTaskId] = useState(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');

  const handleUnauthorized = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const loadTasks = async () => {
    const response = await fetch(`${API_URL}/tasks`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.status === 401) {
      handleUnauthorized();
      return;
    }

    const data = await response.json();

    if (!response.ok) {
      setError(data.message);
      return;
    }

    setTasks(data);
  };

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    loadTasks();
  }, []);

  const handleCreate = async (event) => {
    event.preventDefault();
    setError('');

    const response = await fetch(`${API_URL}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ title, description, dueDate }),
    });

    if (response.status === 401) {
      handleUnauthorized();
      return;
    }

    const data = await response.json();

    if (!response.ok) {
      setError(data.message);
      return;
    }

    setTitle('');
    setDescription('');
    setDueDate('');
    loadTasks();
  };

  const handleStatusChange = async (taskId, status) => {
    const response = await fetch(`${API_URL}/tasks/${taskId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    });

    if (response.status === 401) {
      handleUnauthorized();
      return;
    }

    loadTasks();
  };

  const handleDelete = async (taskId) => {
    const response = await fetch(`${API_URL}/tasks/${taskId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.status === 401) {
      handleUnauthorized();
      return;
    }

    loadTasks();
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <div className="tasks-page">
      <header className="tasks-header">
        <h1>Мои задачи</h1>
        <button type="button" onClick={handleLogout}>Выйти</button>
      </header>

      <form className="task-form" onSubmit={handleCreate}>
        <input
          type="text"
          placeholder="Название задачи"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Описание"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <input
          type="text"
          placeholder="Срок выполнения"
          title="Срок задачи"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          onFocus={(e) => { e.target.type = 'date'; }}
          onBlur={(e) => { if (!e.target.value) e.target.type = 'text'; }}
        />
        <button type="submit">Добавить</button>
      </form>

      {error && <p className="error">{error}</p>}

      <table className="tasks-table">
        <thead>
          <tr>
            <th>Название</th>
            <th>Статус</th>
            <th>Приоритет</th>
            <th>Категория</th>
            <th>Срок</th>
            <th>Создана</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <Fragment key={task.id}>
              <tr>
                <td>
                  <button
                    type="button"
                    className="task-title"
                    onClick={() => setExpandedTaskId(expandedTaskId === task.id ? null : task.id)}
                  >
                    {task.title}
                  </button>
                </td>
                <td>
                  <select
                    value={task.status}
                    onChange={(e) => handleStatusChange(task.id, e.target.value)}
                  >
                    {Object.entries(STATUS_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </td>
                <td>{PRIORITY_LABELS[task.priority] || task.priority}</td>
                <td>{CATEGORY_LABELS[task.category] || task.category}</td>
                <td>{task.dueDate ? formatDate(task.dueDate) : '—'}</td>
                <td>{formatDate(task.createdAt)}</td>
                <td>
                  <button type="button" onClick={() => handleDelete(task.id)}>Удалить</button>
                </td>
              </tr>
              {expandedTaskId === task.id && (
                <tr className="task-description-row">
                  <td colSpan={7}>
                    {task.description || 'Описание отсутствует'}
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
