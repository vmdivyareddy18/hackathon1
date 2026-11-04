const STORAGE_KEY = 'student-task-manager';

const taskForm = document.getElementById('task-form');
const titleInput = document.getElementById('task-title');
const dateInput = document.getElementById('task-date');
const descriptionInput = document.getElementById('task-description');
const priorityInput = document.getElementById('task-priority');
const submitBtn = document.getElementById('submit-btn');
const formTitle = document.getElementById('form-title');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const taskList = document.getElementById('task-list');
const searchInput = document.getElementById('search-input');
const statusFilter = document.getElementById('status-filter');
const priorityFilter = document.getElementById('priority-filter');
const clearAllBtn = document.getElementById('clear-all-btn');

const totalTasksEl = document.getElementById('total-tasks');
const completedTasksEl = document.getElementById('completed-tasks');
const pendingTasksEl = document.getElementById('pending-tasks');
const highPriorityTasksEl = document.getElementById('high-priority-tasks');

let tasks = loadTasks();
let editingId = null;

function loadTasks() {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (!stored) {
        return [];
    }

    try {
        const parsed = JSON.parse(stored);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.error('Unable to parse stored tasks:', error);
        return [];
    }
}

function saveTasks() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function getPriorityClass(priority) {
    return priority.toLowerCase();
}

function formatDate(dateString) {
    if (!dateString) {
        return 'No deadline';
    }

    const date = new Date(dateString + 'T00:00:00');

    if (Number.isNaN(date.getTime())) {
        return 'No deadline';
    }

    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    }).format(date);
}

function getTaskStatus(task) {
    if (task.completed) {
        return 'completed';
    }

    if (task.dueDate && new Date(task.dueDate + 'T00:00:00') < new Date(new Date().toDateString())) {
        return 'overdue';
    }

    return 'pending';
}

function getStats() {
    const total = tasks.length;
    const completed = tasks.filter((task) => task.completed).length;
    const pending = tasks.filter((task) => !task.completed).length;
    const highPriority = tasks.filter((task) => task.priority === 'High').length;

    return { total, completed, pending, highPriority };
}

function resetForm() {
    taskForm.reset();
    priorityInput.value = 'Medium';
    editingId = null;
    submitBtn.textContent = 'Add task';
    formTitle.textContent = 'Add new task';
    cancelEditBtn.classList.add('hidden');
}

function renderStats() {
    const stats = getStats();
    totalTasksEl.textContent = stats.total;
    completedTasksEl.textContent = stats.completed;
    pendingTasksEl.textContent = stats.pending;
    highPriorityTasksEl.textContent = stats.highPriority;
}

function getFilteredTasks() {
    const searchValue = searchInput.value.trim().toLowerCase();
    const statusValue = statusFilter.value;
    const priorityValue = priorityFilter.value;

    return tasks.filter((task) => {
        const matchesSearch =
            !searchValue ||
            task.title.toLowerCase().includes(searchValue) ||
            task.description.toLowerCase().includes(searchValue);

        const matchesStatus =
            statusValue === 'all' ||
            (statusValue === 'completed' && task.completed) ||
            (statusValue === 'pending' && !task.completed);

        const matchesPriority = priorityValue === 'all' || task.priority === priorityValue;

        return matchesSearch && matchesStatus && matchesPriority;
    });
}

function renderTasks() {
    const filteredTasks = getFilteredTasks();

    if (!filteredTasks.length) {
        taskList.innerHTML = `
      <div class="empty-state">
        <p>No tasks match your current filters.</p>
      </div>
    `;
        return;
    }

    taskList.innerHTML = filteredTasks
        .map((task) => {
            const status = getTaskStatus(task);
            const dueDateText = formatDate(task.dueDate);

            return `
        <article class="task-card ${task.completed ? 'completed' : ''} priority-${getPriorityClass(task.priority)}">
          <div class="task-main">
            <div class="task-heading">
              <button
                class="status-toggle ${task.completed ? 'is-complete' : ''}"
                type="button"
                data-action="toggle-complete"
                data-id="${task.id}"
                aria-label="Mark task as complete"
              >
                ${task.completed ? '✓' : ''}
              </button>

              <div>
                <h3>${task.title}</h3>
                ${task.description ? `<p class="task-description">${task.description}</p>` : ''}
              </div>
            </div>

            <div class="task-meta">
              <span class="badge priority ${getPriorityClass(task.priority)}">${task.priority}</span>
              <span class="badge status ${status}">${status === 'completed' ? 'Completed' : status === 'overdue' ? 'Overdue' : 'Pending'}</span>
              <span class="badge date">${dueDateText}</span>
            </div>
          </div>

          <div class="task-actions">
            <button class="action-button edit" type="button" data-action="edit" data-id="${task.id}">Edit</button>
            <button class="action-button delete" type="button" data-action="delete" data-id="${task.id}">Delete</button>
          </div>
        </article>
      `;
        })
        .join('');
}

function render() {
    renderStats();
    renderTasks();
}

function createTask(event) {
    event.preventDefault();

    const title = titleInput.value.trim();
    const description = descriptionInput.value.trim();
    const dueDate = dateInput.value;
    const priority = priorityInput.value;

    if (!title) {
        titleInput.focus();
        return;
    }

    const taskData = {
        id: crypto.randomUUID(),
        title,
        description,
        dueDate,
        priority,
        completed: false,
        createdAt: new Date().toISOString(),
    };

    tasks.unshift(taskData);
    saveTasks();
    resetForm();
    render();
}

function updateTask(event) {
    event.preventDefault();

    const title = titleInput.value.trim();
    const description = descriptionInput.value.trim();
    const dueDate = dateInput.value;
    const priority = priorityInput.value;

    if (!title) {
        titleInput.focus();
        return;
    }

    tasks = tasks.map((task) => {
        if (task.id === editingId) {
            return {
                ...task,
                title,
                description,
                dueDate,
                priority,
            };
        }

        return task;
    });

    saveTasks();
    resetForm();
    render();
}

function handleSubmit(event) {
    if (editingId) {
        updateTask(event);
        return;
    }

    createTask(event);
}

function handleTaskActions(event) {
    const actionTarget = event.target.closest('[data-action]');

    if (!actionTarget) {
        return;
    }

    const { action, id } = actionTarget.dataset;
    const task = tasks.find((item) => item.id === id);

    if (!task) {
        return;
    }

    if (action === 'delete') {
        tasks = tasks.filter((item) => item.id !== id);
        if (editingId === id) {
            resetForm();
        }
    }

    if (action === 'toggle-complete') {
        task.completed = !task.completed;
    }

    if (action === 'edit') {
        editingId = id;
        titleInput.value = task.title;
        descriptionInput.value = task.description;
        dateInput.value = task.dueDate || '';
        priorityInput.value = task.priority;
        submitBtn.textContent = 'Save changes';
        formTitle.textContent = 'Edit task';
        cancelEditBtn.classList.remove('hidden');
        titleInput.focus();
        return;
    }

    saveTasks();
    render();
}

function clearAllTasks() {
    const shouldClear = window.confirm('Are you sure you want to delete all tasks?');

    if (!shouldClear) {
        return;
    }

    tasks = [];
    saveTasks();
    resetForm();
    render();
}

searchInput.addEventListener('input', renderTasks);
statusFilter.addEventListener('change', renderTasks);
priorityFilter.addEventListener('change', renderTasks);
clearAllBtn.addEventListener('click', clearAllTasks);
cancelEditBtn.addEventListener('click', resetForm);
taskForm.addEventListener('submit', handleSubmit);
taskList.addEventListener('click', handleTaskActions);

render();
