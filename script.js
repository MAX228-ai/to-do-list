const STORAGE_KEY = "class_todo_tasks_v1";
const taskInput = document.getElementById("taskInput");
const prioritySelect = document.getElementById("prioritySelect");
const addButton = document.getElementById("addButton");
const taskList = document.getElementById("taskList");
const totalCount = document.getElementById("totalCount");
const doneCount = document.getElementById("doneCount");
const filters = document.getElementById("filters");
const emptyPlaceholder = document.getElementById("emptyPlaceholder");
const clearAll = document.getElementById("clearAll");
const taskModalEl = document.getElementById("taskModal");
const modal = new bootstrap.Modal(taskModalEl);
const modalTitle = document.getElementById("modalTitle");
const modalBody = document.getElementById("modalBody");
const modalPriority = document.getElementById("modalPriority");
const modalStatus = document.getElementById("modalStatus");
const modalCreated = document.getElementById("modalCreated");
const modalDue = document.getElementById("modalDue");
const modalDueContainer = document.getElementById("modalDueContainer");
class Task {
  constructor({ id = null, text = "", priority = "medium", completed = false, createdAt = null } = {}) {
    this.id = id || Task.generateId();
    this._text = text;
    this._priority = priority;
    this._completed = Boolean(completed);
    this.createdAt = createdAt || new Date().toISOString();
    this.type = "Task";
  }
  get text() {
    return this._text;
  }
  set text(value) {
    const v = String(value).trim();
    if (!v) throw new Error("Text cannot be empty");
    this._text = v;
  }
  get priority() {
    return this._priority;
  }
  set priority(value) {
    const allowed = ["low", "medium", "high"];
    if (!allowed.includes(value)) throw new Error("Invalid priority");
    this._priority = value;
  }
  get completed() {
    return this._completed;
  }
  set completed(value) {
    this._completed = Boolean(value);
  }
  toggleComplete() {
    this.completed = !this.completed;
  }
  toJSON() {
    return {
      type: this.type,
      id: this.id,
      text: this._text,
      priority: this._priority,
      completed: this._completed,
      createdAt: this.createdAt
    };
  }
  static fromJSON(obj) {
    if (!obj || !obj.type) return null;
    if (obj.type === "DatedTask") return DatedTask.fromJSON(obj);
    return new Task({
      id: obj.id,
      text: obj.text,
      priority: obj.priority,
      completed: obj.completed,
      createdAt: obj.createdAt
    });
  }
  static generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }
}
class DatedTask extends Task {
  constructor({ dueDate = null, ...rest } = {}) {
    super(rest);
    this.dueDate = dueDate ? new Date(dueDate).toISOString() : null;
    this.type = "DatedTask";
  }
  get due() {
    return this.dueDate ? new Date(this.dueDate) : null;
  }
  set due(value) {
    if (!value) {
      this.dueDate = null;
      return;
    }
    const d = new Date(value);
    if (isNaN(d)) throw new Error("Invalid date");
    this.dueDate = d.toISOString();
  }
  toJSON() {
    const base = super.toJSON();
    base.dueDate = this.dueDate;
    base.type = this.type;
    return base;
  }
  static fromJSON(obj) {
    return new DatedTask({
      id: obj.id,
      text: obj.text,
      priority: obj.priority,
      completed: obj.completed,
      createdAt: obj.createdAt,
      dueDate: obj.dueDate
    });
  }
}
class TaskManager {
  constructor(storageKey) {
    this.storageKey = storageKey;
    this.tasks = [];
    this.currentFilter = "all";
    this.load();
  }
  add(task) {
    if (!(task instanceof Task)) {
      if (task.dueDate) task = new DatedTask(task);
      else task = new Task(task);
    }
    this.tasks.unshift(task);
    this.save();
  }
  remove(id) {
    this.tasks = this.tasks.filter(t => t.id !== id);
    this.save();
  }
  find(id) {
    return this.tasks.find(t => t.id === id);
  }
  save() {
    try {
      const arr = this.tasks.map(t => t.toJSON());
      localStorage.setItem(this.storageKey, JSON.stringify(arr));
    } catch (e) {
      console.error("Save error", e);
    }
  }
  load() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) {
        this.tasks = this.sample();
        this.save();
        return;
      }
      const arr = JSON.parse(raw);
      this.tasks = arr.map(Task.fromJSON).filter(Boolean);
    } catch (e) {
      console.error("Load error, setting empty list", e);
      this.tasks = [];
    }
  }
  clear() {
    this.tasks = [];
    this.save();
  }
  sample() {
    return [
      new Task({ text: "Review the new version", priority: "medium", completed: false }),
      new DatedTask({ text: "Submit the project", priority: "high", completed: false, dueDate: new Date(Date.now() + 3*24*3600*1000).toISOString() }),
      new Task({ text: "Send a reply", priority: "low", completed: true })
    ];
  }
}
const manager = new TaskManager(STORAGE_KEY);
function render() {
  taskList.innerHTML = "";
  let list = manager.tasks;
  if (manager.currentFilter === "active") list = list.filter(t => !t.completed);
  if (manager.currentFilter === "completed") list = list.filter(t => t.completed);
  if (list.length === 0) emptyPlaceholder.style.display = "block";
  else emptyPlaceholder.style.display = "none";
  for (const t of list) {
    const li = document.createElement("li");
    li.className = "list-group-item d-flex justify-content-between align-items-start";
    if (t.completed) li.classList.add("list-group-item-secondary");
    const left = document.createElement("div");
    left.className = "ms-2 me-auto";
    const title = document.createElement("div");
    title.className = "fw-semibold";
    title.textContent = t.text;
    if (t.completed) title.style.textDecoration = "line-through";
    const small = document.createElement("div");
    small.className = "small text-muted";
    small.textContent = `created: ${new Date(t.createdAt).toLocaleString()}`;
    left.appendChild(title);
    left.appendChild(small);
    const prBadge = document.createElement("span");
    prBadge.className = `badge ms-2 ${priorityClass(t.priority)}`;
    prBadge.textContent = humanPriority(t.priority);
    const btnGroup = document.createElement("div");
    btnGroup.className = "btn-group btn-group-sm";
    const doneBtn = document.createElement("button");
    doneBtn.className = t.completed ? "btn btn-success" : "btn btn-outline-success";
    doneBtn.title = t.completed ? "Mark as not done" : "Mark as done";
    doneBtn.innerHTML = "✓";
    doneBtn.onclick = () => {
      t.toggleComplete();
      manager.save();
      render();
    };
    const infoBtn = document.createElement("button");
    infoBtn.className = "btn btn-outline-info";
    infoBtn.title = "Details";
    infoBtn.textContent = "i";
    infoBtn.onclick = () => showDetails(t.id);
    const editBtn = document.createElement("button");
    editBtn.className = "btn btn-outline-secondary";
    editBtn.title = "Edit";
    editBtn.textContent = "✎";
    editBtn.onclick = () => {
      try {
        const newText = prompt("Edit task text:", t.text);
        if (newText === null) return;
        t.text = newText;
        manager.save();
        render();
      } catch (e) {
        alert("Could not save: " + e.message);
      }
    };
    const delBtn = document.createElement("button");
    delBtn.className = "btn btn-outline-danger";
    delBtn.title = "Delete";
    delBtn.textContent = "✕";
    delBtn.onclick = () => {
      if (confirm("Delete task?")) {
        manager.remove(t.id);
        render();
      }
    };
    btnGroup.appendChild(doneBtn);
    btnGroup.appendChild(infoBtn);
    btnGroup.appendChild(editBtn);
    btnGroup.appendChild(delBtn);
    li.appendChild(left);
    li.appendChild(prBadge);
    li.appendChild(btnGroup);
    taskList.appendChild(li);
  }
  totalCount.textContent = manager.tasks.length;
  doneCount.textContent = manager.tasks.filter(t => t.completed).length;
}
function showDetails(id) {
  const t = manager.find(id);
  if (!t) return;
  modalTitle.textContent = "Task details";
  modalBody.textContent = t.text;
  modalPriority.textContent = humanPriority(t.priority);
  modalStatus.innerHTML = t.completed ? "<span class='badge bg-success'>Completed</span>" : "<span class='badge bg-warning text-dark'>Active</span>";
  modalCreated.textContent = new Date(t.createdAt).toLocaleString();
  if (t instanceof DatedTask && t.dueDate) {
    modalDue.textContent = new Date(t.dueDate).toLocaleString();
    modalDueContainer.style.display = "block";
  } else {
    modalDueContainer.style.display = "none";
  }
  modal.show();
}
function priorityClass(p) {
  if (p === "high") return "bg-danger";
  if (p === "medium") return "bg-warning text-dark";
  return "bg-secondary";
}
function humanPriority(p) {
  if (p === "high") return "High";
  if (p === "medium") return "Medium";
  return "Low";
}
addButton.addEventListener("click", () => {
  const text = taskInput.value.trim();
  if (!text) return;
  const priority = prioritySelect.value;
  const dueMatch = text.match(/\[due:([\d-]+)\]$/);
  if (dueMatch) {
    const cleanText = text.replace(/\[due:[\d-]+\]$/, "").trim();
    try {
      const dt = new DatedTask({ text: cleanText, priority, dueDate: dueMatch[1] });
      manager.add(dt);
    } catch (e) {
      alert("Cannot create dated task: " + e.message);
      return;
    }
  } else {
    try {
      const t = new Task({ text, priority });
      manager.add(t);
    } catch (e) {
      alert("Could not add: " + e.message);
      return;
    }
  }
  taskInput.value = "";
  prioritySelect.value = "medium";
  render();
});
taskInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") addButton.click();
});
filters.addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;
  Array.from(filters.children).forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  manager.currentFilter = btn.dataset.filter;
  render();
});
clearAll.addEventListener("click", () => {
  if (!confirm("Confirm: delete all tasks?")) return;
  manager.clear();
  render();
});
render();