
const STORAGE_KEY = "example_todo_tasks_v1";

const taskForm = document.getElementById("taskForm");
const taskInput = document.getElementById("taskInput");
const prioritySelect = document.getElementById("prioritySelect");
const addButton = document.getElementById("addButton");
const taskList = document.getElementById("taskList");
const totalCount = document.getElementById("totalCount");
const doneCount = document.getElementById("doneCount");
const filters = document.getElementById("filters");
const emptyPlaceholder = document.getElementById("emptyPlaceholder");
const clearAll = document.getElementById("clearAll");

// Modal
const taskModalEl = document.getElementById("taskModal");
const modal = new bootstrap.Modal(taskModalEl);
const modalTitle = document.getElementById("modalTitle");
const modalBody = document.getElementById("modalBody");
const modalPriority = document.getElementById("modalPriority");
const modalStatus = document.getElementById("modalStatus");

// Данные
let tasks = [];
let currentFilter = "all";

// Инициализация
loadTasks();
renderTasks();

// Слушатели
addButton.addEventListener("click", () => {
  const text = taskInput.value.trim();
  if (!text) return;
  addTask(text, prioritySelect.value);
  taskInput.value = "";
  prioritySelect.value = "medium";
});

taskInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") addButton.click();
});

filters.addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;
  // переключаем активную кнопку
  Array.from(filters.children).forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  currentFilter = btn.dataset.filter;
  renderTasks();
});

clearAll.addEventListener("click", () => {
  if (!confirm("Подтвердите: удалить все задачи?")) return;
  tasks = [];
  saveTasks();
  renderTasks();
});

// Функции управления задачами
function addTask(text, priority = "medium") {
  const task = {
    id: cryptoRandomId(),
    text,
    priority,
    completed: false,
    createdAt: new Date().toISOString()
  };
  tasks.unshift(task); // добавляем в начало
  saveTasks();
  renderTasks();
}

function toggleComplete(id) {
  const t = tasks.find(x => x.id === id);
  if (!t) return;
  t.completed = !t.completed;
  saveTasks();
  renderTasks();
}

function removeTask(id) {
  tasks = tasks.filter(x => x.id !== id);
  saveTasks();
  renderTasks();
}

function editTask(id) {
  const t = tasks.find(x => x.id === id);
  if (!t) return;
  const newText = prompt("Изменить текст задачи:", t.text);
  if (newText === null) return;
  t.text = newText.trim() || t.text;
  saveTasks();
  renderTasks();
}

function showDetails(id) {
  const t = tasks.find(x => x.id === id);
  if (!t) return;
  modalTitle.textContent = `Детали задачи`;
  modalBody.textContent = t.text;
  modalPriority.innerHTML = humanPriority(t.priority);
  modalStatus.innerHTML = t.completed ? "<span class='badge bg-success'>Выполнено</span>" : "<span class='badge bg-warning text-dark'>Активно</span>";
  modal.show();
}

// Визуализация
function renderTasks() {
  taskList.innerHTML = "";
  let filtered = tasks;
  if (currentFilter === "active") filtered = tasks.filter(t => !t.completed);
  if (currentFilter === "completed") filtered = tasks.filter(t => t.completed);

  if (filtered.length === 0) {
    emptyPlaceholder.style.display = "block";
  } else {
    emptyPlaceholder.style.display = "none";
  }

  for (const t of filtered) {
    const li = document.createElement("li");
    li.className = "list-group-item d-flex justify-content-between align-items-start";
    if (t.completed) li.classList.add("list-group-item-secondary");

    // Left: text + badge
    const left = document.createElement("div");
    left.className = "ms-2 me-auto";

    const title = document.createElement("div");
    title.className = "fw-semibold";
    title.textContent = t.text;
    if (t.completed) title.style.textDecoration = "line-through";

    const small = document.createElement("div");
    small.className = "small text-muted";
    small.textContent = `создано: ${new Date(t.createdAt).toLocaleString()}`;

    left.appendChild(title);
    left.appendChild(small);

    // Right: buttons group
    const btnGroup = document.createElement("div");
    btnGroup.className = "btn-group btn-group-sm";

    // Complete toggle
    const doneBtn = document.createElement("button");
    doneBtn.className = t.completed ? "btn btn-success" : "btn btn-outline-success";
    doneBtn.title = t.completed ? "Отметить как не выполнено" : "Отметить выполненной";
    doneBtn.innerHTML = `<i class="bi bi-check2"></i>`; // Bootstrap icons optional (we don't include icons CDN). Keep for semantics.
    doneBtn.onclick = () => toggleComplete(t.id);

    // Details
    const infoBtn = document.createElement("button");
    infoBtn.className = "btn btn-outline-info";
    infoBtn.title = "Подробнее";
    infoBtn.textContent = "i";
    infoBtn.onclick = () => showDetails(t.id);

    // Edit
    const editBtn = document.createElement("button");
    editBtn.className = "btn btn-outline-secondary";
    editBtn.title = "Редактировать";
    editBtn.textContent = "✎";
    editBtn.onclick = () => editTask(t.id);

    // Delete
    const delBtn = document.createElement("button");
    delBtn.className = "btn btn-outline-danger";
    delBtn.title = "Удалить";
    delBtn.textContent = "✕";
    delBtn.onclick = () => {
      if (confirm("Удалить задачу?")) removeTask(t.id);
    };

    // Priority badge
    const prBadge = document.createElement("span");
    prBadge.className = `badge ms-2 ${priorityClass(t.priority)}`;
    prBadge.textContent = humanPriority(t.priority);

    btnGroup.appendChild(doneBtn);
    btnGroup.appendChild(infoBtn);
    btnGroup.appendChild(editBtn);
    btnGroup.appendChild(delBtn);

    li.appendChild(left);
    li.appendChild(prBadge);
    li.appendChild(btnGroup);

    taskList.appendChild(li);
  }

  // Счётчики
  totalCount.textContent = tasks.length;
  doneCount.textContent = tasks.filter(t => t.completed).length;
}

// Utils: storage
function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (e) {
    console.error("Ошибка сохранения в localStorage", e);
  }
}

function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    tasks = raw ? JSON.parse(raw) : sampleTasks();
  } catch (e) {
    console.error("Ошибка чтения localStorage. Загружаю пустой список.", e);
    tasks = [];
  }
}

// Helpers
function priorityClass(p) {
  if (p === "high") return "bg-danger";
  if (p === "medium") return "bg-warning text-dark";
  return "bg-secondary";
}
function humanPriority(p) {
  if (p === "high") return "Высокий";
  if (p === "medium") return "Средний";
  return "Низкий";
}
function cryptoRandomId() {
  // Простая уникализация
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function sampleTasks() {
  return [
    { id: cryptoRandomId(), text: "Посмотреть пример страницы", priority: "medium", completed: false, createdAt: new Date().toISOString() },
    { id: cryptoRandomId(), text: "Добавить задачу в список", priority: "low", completed: true, createdAt: new Date().toISOString() }
  ];
}
