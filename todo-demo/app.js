/**
 * Task Tracker — a small to-do app with no dependencies and no build step.
 *
 * Tasks live in localStorage, so they survive a page reload but stay on this
 * one browser. Each task looks like: { id, title, done, createdAt }
 */

const STORAGE_KEY = "task-tracker.tasks";

const els = {
  composer: document.getElementById("composer"),
  input: document.getElementById("new-task"),
  list: document.getElementById("tasks"),
  empty: document.getElementById("empty"),
  summary: document.getElementById("summary"),
  clearDone: document.getElementById("clear-done"),
  tabs: Array.from(document.querySelectorAll(".filters__tab")),
};

let tasks = load();
let filter = "all";

/* Storage ----------------------------------------------------------------- */

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Drop anything that doesn't look like a task, so one bad record can't
    // break the whole list.
    return parsed
      .filter((t) => t && typeof t.title === "string")
      .map((t) => ({
        id: typeof t.id === "string" ? t.id : newId(),
        title: t.title,
        done: Boolean(t.done),
        createdAt: Number(t.createdAt) || Date.now(),
      }));
  } catch {
    return [];
  }
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch {
    // Private browsing or a full quota — the app still works for this session.
  }
}

function newId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/* Actions ----------------------------------------------------------------- */

function addTask(title) {
  const trimmed = title.trim();
  if (!trimmed) return;
  tasks.unshift({
    id: newId(),
    title: trimmed,
    done: false,
    createdAt: Date.now(),
  });
  commit();
}

function toggleTask(id) {
  const task = tasks.find((t) => t.id === id);
  if (!task) return;
  task.done = !task.done;
  commit();
}

function renameTask(id, title) {
  const task = tasks.find((t) => t.id === id);
  if (!task) return;
  const trimmed = title.trim();
  // An emptied-out title means "delete this" — matches what most to-do apps do.
  if (!trimmed) {
    deleteTask(id);
    return;
  }
  if (trimmed === task.title) return;
  task.title = trimmed.slice(0, 200);
  commit();
}

function deleteTask(id) {
  tasks = tasks.filter((t) => t.id !== id);
  commit();
}

function clearDone() {
  tasks = tasks.filter((t) => !t.done);
  commit();
}

function commit() {
  save();
  render();
}

/* Rendering --------------------------------------------------------------- */

function visibleTasks() {
  if (filter === "active") return tasks.filter((t) => !t.done);
  if (filter === "done") return tasks.filter((t) => t.done);
  return tasks;
}

function buildTask(task) {
  const li = document.createElement("li");
  li.className = task.done ? "task task--done" : "task";
  li.dataset.id = task.id;

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "task__checkbox";
  checkbox.checked = task.done;
  checkbox.setAttribute("aria-label", `Mark "${task.title}" as done`);
  checkbox.addEventListener("change", () => toggleTask(task.id));

  const title = document.createElement("span");
  title.className = "task__title";
  title.textContent = task.title;
  title.contentEditable = "true";
  title.spellcheck = false;
  title.setAttribute("role", "textbox");
  title.setAttribute("aria-label", "Task title, editable");

  let committed = false;
  title.addEventListener("blur", () => {
    if (committed) return;
    committed = true;
    renameTask(task.id, title.textContent);
  });
  title.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      title.blur();
    } else if (event.key === "Escape") {
      event.preventDefault();
      committed = true;
      title.textContent = task.title;
      title.blur();
    }
  });

  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "task__delete";
  remove.textContent = "×";
  remove.setAttribute("aria-label", `Delete "${task.title}"`);
  remove.addEventListener("click", () => deleteTask(task.id));

  li.append(checkbox, title, remove);
  return li;
}

function render() {
  const shown = visibleTasks();

  els.list.replaceChildren(...shown.map(buildTask));

  const remaining = tasks.filter((t) => !t.done).length;
  const doneCount = tasks.length - remaining;

  if (tasks.length === 0) {
    els.summary.textContent = "No tasks yet";
  } else {
    els.summary.textContent =
      `${remaining} ${remaining === 1 ? "task" : "tasks"} left` +
      (doneCount ? ` · ${doneCount} done` : "");
  }

  if (shown.length === 0) {
    els.empty.hidden = false;
    els.empty.textContent =
      tasks.length === 0
        ? "Add your first task above."
        : filter === "active"
          ? "Nothing left to do here."
          : "No completed tasks yet.";
  } else {
    els.empty.hidden = true;
  }

  els.clearDone.hidden = doneCount === 0;

  els.tabs.forEach((tab) => {
    tab.setAttribute("aria-selected", String(tab.dataset.filter === filter));
  });
}

/* Wiring ------------------------------------------------------------------ */

els.composer.addEventListener("submit", (event) => {
  event.preventDefault();
  addTask(els.input.value);
  els.input.value = "";
  els.input.focus();
});

els.tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    filter = tab.dataset.filter;
    render();
  });
});

els.clearDone.addEventListener("click", clearDone);

render();
