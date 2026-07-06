import { useEffect, useState } from 'react';
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
        <button type="button" className="btn-ghost" onClick={handleLogout}>Выйти</button>
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

      {tasks.length === 0 ? (
        <p className="empty-state">Задач пока нет — добавьте первую в форме выше.</p>
      ) : (
        <div className="task-grid">
          {tasks.map((task) => (
            <article className="task-card" key={task.id}>
              <header className="task-card-header">
                <h3>{task.title}</h3>
                <button
                  type="button"
                  className="btn-close"
                  title="Удалить задачу"
                  onClick={() => handleDelete(task.id)}
                >
                  ✕
                </button>
              </header>

              <p
                className={`task-card-description${expandedTaskId === task.id ? ' expanded' : ''}`}
                title="Показать описание полностью"
                onClick={() => setExpandedTaskId(expandedTaskId === task.id ? null : task.id)}
              >
                {task.description || 'Описание отсутствует'}
              </p>

              <div className="task-card-badges">
                <span className={`badge priority-${task.priority}`}>
                  {PRIORITY_LABELS[task.priority] || task.priority}
                </span>
                <span className="badge badge-category">
                  {CATEGORY_LABELS[task.category] || task.category}
                </span>
              </div>

              <footer className="task-card-footer">
                <select
                  className="status-select"
                  value={task.status}
                  onChange={(e) => handleStatusChange(task.id, e.target.value)}
                >
                  {Object.entries(STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                <div className="task-card-dates">
                  <span>Срок: {task.dueDate ? formatDate(task.dueDate) : '—'}</span>
                  <span>Создана: {formatDate(task.createdAt)}</span>
                </div>
              </footer>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
