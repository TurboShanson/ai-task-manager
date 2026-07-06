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

const readStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user'));
  } catch {
    return null;
  }
};

export default function TasksPage() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const [user] = useState(readStoredUser);

  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState('');

  const [isCreateOpen, setCreateOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [formError, setFormError] = useState('');

  const selectedTask = tasks.find((task) => task.id === selectedTaskId);

  const handleUnauthorized = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
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

  const openCreateModal = () => {
    setTitle('');
    setDescription('');
    setDueDate('');
    setFormError('');
    setCreateOpen(true);
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    setFormError('');

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
      setFormError(data.message);
      return;
    }

    setCreateOpen(false);
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

    setSelectedTaskId(null);
    loadTasks();
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="tasks-page">
      <header className="tasks-header">
        <h1>Мои задачи</h1>
        <div className="tasks-header-actions">
          {user?.username && <span className="user-name">{user.username}</span>}
          <button type="button" onClick={openCreateModal}>Добавить задачу</button>
          <button type="button" className="btn-ghost" onClick={handleLogout}>Выйти</button>
        </div>
      </header>

      {error && <p className="error">{error}</p>}

      {tasks.length === 0 ? (
        <p className="empty-state">Задач пока нет — нажмите «Добавить задачу», чтобы создать первую.</p>
      ) : (
        <div className="task-grid">
          {tasks.map((task) => (
            <article className="task-card" key={task.id}>
              <header className="task-card-header">
                <h3 title="Открыть задачу" onClick={() => setSelectedTaskId(task.id)}>
                  {task.title}
                </h3>
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
                className="task-card-description"
                title="Открыть задачу"
                onClick={() => setSelectedTaskId(task.id)}
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

      {isCreateOpen && (
        <div className="modal-overlay" onClick={() => setCreateOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <header className="modal-header">
              <h2>Новая задача</h2>
              <button
                type="button"
                className="btn-close"
                title="Закрыть"
                onClick={() => setCreateOpen(false)}
              >
                ✕
              </button>
            </header>

            <form className="modal-form" onSubmit={handleCreate}>
              <input
                type="text"
                placeholder="Название задачи"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
              <textarea
                rows={4}
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
              {formError && <p className="error">{formError}</p>}
              <button type="submit">Добавить</button>
            </form>
          </div>
        </div>
      )}

      {selectedTask && (
        <div className="modal-overlay" onClick={() => setSelectedTaskId(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <header className="modal-header">
              <h2>{selectedTask.title}</h2>
              <button
                type="button"
                className="btn-close"
                title="Закрыть"
                onClick={() => setSelectedTaskId(null)}
              >
                ✕
              </button>
            </header>

            <p className="modal-description">
              {selectedTask.description || 'Описание отсутствует'}
            </p>

            <div className="task-card-badges">
              <span className={`badge priority-${selectedTask.priority}`}>
                {PRIORITY_LABELS[selectedTask.priority] || selectedTask.priority}
              </span>
              <span className="badge badge-category">
                {CATEGORY_LABELS[selectedTask.category] || selectedTask.category}
              </span>
            </div>

            <footer className="modal-footer">
              <select
                className="status-select"
                value={selectedTask.status}
                onChange={(e) => handleStatusChange(selectedTask.id, e.target.value)}
              >
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <div className="modal-dates">
                <span>Срок: {selectedTask.dueDate ? formatDate(selectedTask.dueDate) : '—'}</span>
                <span>Создана: {formatDate(selectedTask.createdAt)}</span>
              </div>
              <button
                type="button"
                className="btn-danger"
                onClick={() => handleDelete(selectedTask.id)}
              >
                Удалить задачу
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
