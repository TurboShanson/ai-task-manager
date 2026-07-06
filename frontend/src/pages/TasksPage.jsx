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

const SORT_LABELS = {
  dueDate: 'Срок',
  priority: 'Приоритет',
  category: 'Категория',
};

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

const SORT_COMPARATORS = {
  // Ближайший срок первым, задачи без срока — в конце
  dueDate: (a, b) => {
    if (!a.dueDate && !b.dueDate) return 0;
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return a.dueDate.localeCompare(b.dueDate);
  },
  priority: (a, b) => (PRIORITY_ORDER[a.priority] ?? 3) - (PRIORITY_ORDER[b.priority] ?? 3),
  category: (a, b) =>
    (CATEGORY_LABELS[a.category] || a.category)
      .localeCompare(CATEGORY_LABELS[b.category] || b.category, 'ru'),
};

const formatDate = (value) => new Date(value).toLocaleDateString('ru-RU');

// Сколько полных дней осталось до срока: 0 — сегодня, отрицательное — просрочено
const getDaysLeft = (dueDate) => {
  if (!dueDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${dueDate}T00:00:00`);
  return Math.round((due - today) / 86400000);
};

const formatDaysLeft = (daysLeft) => {
  if (daysLeft === null) return '';
  if (daysLeft > 0) return `осталось ${daysLeft} дн.`;
  if (daysLeft === 0) return 'срок сегодня';
  return `просрочено на ${Math.abs(daysLeft)} дн.`;
};

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
  const [sortKeys, setSortKeys] = useState([]);
  const [filters, setFilters] = useState({ status: '', priority: '', category: '', dueBefore: '' });
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [view, setView] = useState(() => localStorage.getItem('tasksView') || 'grid');
  const [dragOverStatus, setDragOverStatus] = useState(null);
  const [deadlineEnabled, setDeadlineEnabled] = useState(
    () => localStorage.getItem('deadlineHighlight') !== 'off'
  );
  const [deadlineDays, setDeadlineDays] = useState(
    () => localStorage.getItem('deadlineDays') || '2'
  );

  const [isCreateOpen, setCreateOpen] = useState(false);
  const [isLogoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [createStatus, setCreateStatus] = useState('new');
  const [formError, setFormError] = useState('');

  const selectedTask = tasks.find((task) => task.id === selectedTaskId);

  const toggleSortKey = (key) => {
    setSortKeys((keys) =>
      keys.includes(key) ? keys.filter((k) => k !== key) : [...keys, key]
    );
  };

  const updateFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({ status: '', priority: '', category: '', dueBefore: '' });
  };

  const hasActiveFilters = Object.values(filters).some(Boolean);

  // Категории для фильтра берём из реальных задач — на случай нестандартных значений
  const knownCategories = [...new Set(tasks.map((task) => task.category))].sort((a, b) =>
    (CATEGORY_LABELS[a] || a).localeCompare(CATEGORY_LABELS[b] || b, 'ru')
  );

  const filteredTasks = tasks.filter((task) =>
    (!filters.status || task.status === filters.status)
    && (!filters.priority || task.priority === filters.priority)
    && (!filters.category || task.category === filters.category)
    && (!filters.dueBefore || (task.dueDate && task.dueDate <= filters.dueBefore))
  );

  // Сортировка стабильная: при равенстве по всем критериям сохраняется порядок сервера (новые первыми)
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    for (const key of sortKeys) {
      const result = SORT_COMPARATORS[key](a, b);
      if (result !== 0) return result;
    }
    return 0;
  });

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

  // Справа открыта либо панель создания, либо панель просмотра — не обе сразу
  const openCreatePanel = (status = 'new') => {
    setSelectedTaskId(null);
    setTitle('');
    setDescription('');
    setDueDate('');
    setCreateStatus(status);
    setFormError('');
    setCreateOpen(true);
  };

  const openTaskPanel = (taskId) => {
    setCreateOpen(false);
    setSelectedTaskId(taskId);
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
      body: JSON.stringify({ title, description, dueDate, status: createStatus }),
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

  const handleDragStart = (event, taskId) => {
    event.dataTransfer.setData('text/plain', String(taskId));
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (event, status) => {
    event.preventDefault();
    setDragOverStatus(null);

    const taskId = Number(event.dataTransfer.getData('text/plain'));
    const task = tasks.find((t) => t.id === taskId);

    if (task && task.status !== status) {
      handleStatusChange(task.id, status);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const switchView = (nextView) => {
    setView(nextView);
    localStorage.setItem('tasksView', nextView);
  };

  const updateDeadlineEnabled = (enabled) => {
    setDeadlineEnabled(enabled);
    localStorage.setItem('deadlineHighlight', enabled ? 'on' : 'off');
  };

  // Пустое поле разрешено во время набора, чтобы можно было стереть значение и ввести новое
  const updateDeadlineDays = (value) => {
    if (value === '') {
      setDeadlineDays('');
      return;
    }
    const days = Math.max(1, Math.floor(Number(value)) || 1);
    setDeadlineDays(String(days));
    localStorage.setItem('deadlineDays', String(days));
  };

  const normalizeDeadlineDays = () => {
    if (deadlineDays === '') {
      setDeadlineDays('2');
      localStorage.setItem('deadlineDays', '2');
    }
  };

  // Класс подсветки рамки: жёлтая — срок близко, красная — сегодня или просрочено
  const getDeadlineClass = (task) => {
    if (!deadlineEnabled || !task.dueDate || task.status === 'done') return '';
    const threshold = Number(deadlineDays) || 2;
    const daysLeft = getDaysLeft(task.dueDate);
    if (daysLeft <= 0) return ' due-danger';
    if (daysLeft <= threshold) return ' due-warning';
    return '';
  };

  const renderTaskCard = (task) => (
    <article
      className={`task-card${getDeadlineClass(task)}`}
      key={task.id}
      draggable={view === 'kanban'}
      onDragStart={(e) => handleDragStart(e, task.id)}
    >
      <header className="task-card-header">
        <h3 title="Открыть задачу" onClick={() => openTaskPanel(task.id)}>
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
        onClick={() => openTaskPanel(task.id)}
      >
        {task.description || 'Описание отсутствует'}
      </p>

      <footer className="task-card-footer">
        <div className="task-card-dates">
          <span>Срок: {task.dueDate ? formatDate(task.dueDate) : '—'}</span>
          {view === 'grid' && task.dueDate && (
            <span className="days-left">{formatDaysLeft(getDaysLeft(task.dueDate))}</span>
          )}
          <span>Создана: {formatDate(task.createdAt)}</span>
        </div>
        <div className="task-card-meta">
          {view === 'kanban' && task.dueDate && (
            <span className="days-left">{formatDaysLeft(getDaysLeft(task.dueDate))}</span>
          )}
          <div className="task-card-badges">
            {view === 'grid' && (
              <span className="badge badge-status">
                {STATUS_LABELS[task.status] || task.status}
              </span>
            )}
            <span className={`badge priority-${task.priority}`}>
              {PRIORITY_LABELS[task.priority] || task.priority}
            </span>
            <span className="badge badge-category">
              {CATEGORY_LABELS[task.category] || task.category}
            </span>
          </div>
        </div>
      </footer>
    </article>
  );

  return (
    <div className="tasks-layout">
      <aside className={`sidebar${isSidebarOpen ? '' : ' collapsed'}`}>
        <h1>Мои задачи</h1>

        <div className="sidebar-filters">
          <h2>Фильтры</h2>
          <label className="filter-field">
            <span>Статус</span>
            <select value={filters.status} onChange={(e) => updateFilter('status', e.target.value)}>
              <option value="">Все</option>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label className="filter-field">
            <span>Приоритет</span>
            <select value={filters.priority} onChange={(e) => updateFilter('priority', e.target.value)}>
              <option value="">Все</option>
              {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label className="filter-field">
            <span>Категория</span>
            <select value={filters.category} onChange={(e) => updateFilter('category', e.target.value)}>
              <option value="">Все</option>
              {knownCategories.map((category) => (
                <option key={category} value={category}>
                  {CATEGORY_LABELS[category] || category}
                </option>
              ))}
            </select>
          </label>
          <label className="filter-field">
            <span>Срок до</span>
            <input
              type="date"
              value={filters.dueBefore}
              onChange={(e) => updateFilter('dueBefore', e.target.value)}
            />
          </label>
          {hasActiveFilters && (
            <button type="button" className="btn-ghost" onClick={resetFilters}>
              Сбросить фильтры
            </button>
          )}
        </div>

        <div className="sidebar-settings">
          <h2>Настройки</h2>
          <label className="settings-toggle">
            <input
              type="checkbox"
              checked={deadlineEnabled}
              onChange={(e) => updateDeadlineEnabled(e.target.checked)}
            />
            <span>Подсветка дедлайнов</span>
          </label>
          {deadlineEnabled && (
            <label className="filter-field">
              <span>Предупреждать за (дней)</span>
              <input
                type="number"
                min="1"
                value={deadlineDays}
                onChange={(e) => updateDeadlineDays(e.target.value)}
                onBlur={normalizeDeadlineDays}
              />
            </label>
          )}
        </div>

        <div className="sidebar-footer">
          {user?.username && <span className="user-name">{user.username}</span>}
          <button type="button" onClick={() => setLogoutConfirmOpen(true)}>Выйти</button>
        </div>
      </aside>

      <main className="tasks-content">
        <div className="content-header">
          <button
            type="button"
            className="btn-ghost btn-menu"
            title={isSidebarOpen ? 'Скрыть панель' : 'Показать панель'}
            onClick={() => setSidebarOpen((open) => !open)}
          >
            ☰
          </button>
          <div className="view-toggle">
            <button
              type="button"
              className={view === 'grid' ? 'active' : ''}
              onClick={() => switchView('grid')}
            >
              Сетка
            </button>
            <button
              type="button"
              className={view === 'kanban' ? 'active' : ''}
              onClick={() => switchView('kanban')}
            >
              Канбан
            </button>
          </div>
          {tasks.length > 0 && (
            <div className="sort-bar" title="Порядок нажатия определяет важность критерия">
              <span className="sort-label">Сортировка:</span>
              {Object.entries(SORT_LABELS).map(([key, label]) => {
                const position = sortKeys.indexOf(key);
                return (
                  <button
                    key={key}
                    type="button"
                    className={`sort-chip${position !== -1 ? ' active' : ''}`}
                    onClick={() => toggleSortKey(key)}
                  >
                    {label}
                    {position !== -1 && <span className="sort-order">{position + 1}</span>}
                  </button>
                );
              })}
              {sortKeys.length > 0 && (
                <button type="button" className="sort-reset" onClick={() => setSortKeys([])}>
                  Сбросить
                </button>
              )}
            </div>
          )}
          {hasActiveFilters && tasks.length > 0 && (
            <span className="found-count">Найдено: {sortedTasks.length}</span>
          )}
          <button type="button" className="btn-add" onClick={() => openCreatePanel()}>
            Добавить задачу
          </button>
        </div>

        {error && <p className="error">{error}</p>}

        {tasks.length === 0 ? (
          <p className="empty-state">Задач пока нет — нажмите «Добавить задачу», чтобы создать первую.</p>
        ) : sortedTasks.length === 0 ? (
          <p className="empty-state">По выбранным фильтрам ничего не найдено.</p>
        ) : view === 'grid' ? (
          <div className="task-grid">
            {sortedTasks.map(renderTaskCard)}
          </div>
        ) : (
          <div className="kanban">
            {Object.entries(STATUS_LABELS).map(([status, statusLabel]) => {
              const columnTasks = sortedTasks.filter((task) => task.status === status);
              return (
                <section
                  key={status}
                  className={`kanban-column${dragOverStatus === status ? ' drag-over' : ''}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverStatus(status);
                  }}
                  onDragLeave={() => {
                    setDragOverStatus((current) => (current === status ? null : current));
                  }}
                  onDrop={(e) => handleDrop(e, status)}
                >
                  <header className="kanban-column-header">
                    <h2>{statusLabel}</h2>
                    <span className="kanban-count">{columnTasks.length}</span>
                  </header>

                  <div className="kanban-cards">
                    {columnTasks.map(renderTaskCard)}
                    {columnTasks.length === 0 && (
                      <p className="kanban-empty">Перетащите задачу сюда</p>
                    )}
                  </div>

                  {status !== 'done' && (
                    <button
                      type="button"
                      className="kanban-add"
                      title={`Добавить задачу в «${statusLabel}»`}
                      onClick={() => openCreatePanel(status)}
                    >
                      +
                    </button>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </main>

      {isCreateOpen && (
        <aside className="task-panel">
          <header className="modal-header">
            <div>
              <h2>Новая задача</h2>
              <p className="modal-subtitle">Колонка: {STATUS_LABELS[createStatus]}</p>
            </div>
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
              onInput={(e) => {
                e.target.style.height = 'auto';
                e.target.style.height = `${e.target.scrollHeight + 2}px`;
              }}
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
        </aside>
      )}

      {selectedTask && (
        <aside className="task-panel">
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
              {selectedTask.dueDate && (
                <span>{formatDaysLeft(getDaysLeft(selectedTask.dueDate))}</span>
              )}
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
        </aside>
      )}

      {isLogoutConfirmOpen && (
        <div className="modal-overlay" onClick={() => setLogoutConfirmOpen(false)}>
          <div className="modal modal-confirm" onClick={(e) => e.stopPropagation()}>
            <header className="modal-header">
              <h2>Выход</h2>
              <button
                type="button"
                className="btn-close"
                title="Закрыть"
                onClick={() => setLogoutConfirmOpen(false)}
              >
                ✕
              </button>
            </header>

            <p className="modal-description">Вы действительно хотите выйти из аккаунта?</p>

            <footer className="modal-footer">
              <button type="button" className="btn-ghost" onClick={() => setLogoutConfirmOpen(false)}>
                Отмена
              </button>
              <button type="button" onClick={handleLogout}>Выйти</button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
