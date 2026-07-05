import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../api';

const STATUSES = ['new', 'in_progress', 'done'];

export default function TasksPage() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState('');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

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
      body: JSON.stringify({ title, description }),
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
            <th>Создана</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr key={task.id}>
              <td>{task.title}</td>
              <td>
                <select
                  value={task.status}
                  onChange={(e) => handleStatusChange(task.id, e.target.value)}
                >
                  {STATUSES.map((value) => (
                    <option key={value} value={value}>{value}</option>
                  ))}
                </select>
              </td>
              <td>{task.priority}</td>
              <td>{task.category}</td>
              <td>{new Date(task.createdAt).toLocaleDateString()}</td>
              <td>
                <button type="button" onClick={() => handleDelete(task.id)}>Удалить</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
