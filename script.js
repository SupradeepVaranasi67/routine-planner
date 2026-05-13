const storageKeys = {
  theme: "daylight-desk-theme",
  focus: "daylight-desk-focus",
  agenda: "daylight-desk-agenda",
  tasks: "daylight-desk-tasks",
  routineCatalog: "daylight-desk-routine-catalog",
  routines: "daylight-desk-routines",
  water: "daylight-desk-water",
  reflection: "daylight-desk-reflection",
  focusMinutes: "daylight-desk-focus-minutes",
};

const defaultRoutines = [
  {
    id: "routine-1",
    title: "Make the bed",
    copy: "Start the day with one visible win.",
  },
  {
    id: "routine-2",
    title: "Move for 20 minutes",
    copy: "Walk, stretch, or do a short workout.",
  },
  {
    id: "routine-3",
    title: "Read something useful",
    copy: "Even ten focused minutes counts.",
  },
  {
    id: "routine-4",
    title: "Prepare tomorrow's first task",
    copy: "Remove friction from the next morning.",
  },
];

const page = document.body.dataset.page;
const todayKey = getTodayKey();

const state = {
  theme: loadStorage(storageKeys.theme, "light"),
  focus: loadStorage(storageKeys.focus, {}),
  agenda: loadStorage(storageKeys.agenda, {}),
  tasks: loadStorage(storageKeys.tasks, []),
  routineCatalog: loadStorage(storageKeys.routineCatalog, defaultRoutines),
  routines: loadStorage(storageKeys.routines, {}),
  water: loadStorage(storageKeys.water, {}),
  reflection: loadStorage(storageKeys.reflection, {}),
  focusMinutes: loadStorage(storageKeys.focusMinutes, {}),
  timerInterval: null,
  timerRemainingSeconds: 25 * 60,
  timerInitialSeconds: 25 * 60,
  taskFilter: "all",
  taskSearch: "",
};

document.addEventListener("DOMContentLoaded", () => {
  applySavedTheme();
  bindThemeToggle();
  seedRoutines();
  renderSharedSnapshot();

  if (page === "home") {
    initHomePage();
  }

  if (page === "planner") {
    initPlannerPage();
  }

  if (page === "routines") {
    initRoutinesPage();
  }
});

function initHomePage() {
  const todayDate = document.querySelector("#todayDate");
  const focusForm = document.querySelector("#focusForm");
  const clearFocusButton = document.querySelector("#clearFocusButton");
  const agendaForm = document.querySelector("#agendaForm");
  const startTimerButton = document.querySelector("#startTimerButton");
  const pauseTimerButton = document.querySelector("#pauseTimerButton");
  const resetTimerButton = document.querySelector("#resetTimerButton");
  const timerMinutes = document.querySelector("#timerMinutes");

  todayDate.textContent = new Intl.DateTimeFormat("en", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  focusForm.addEventListener("submit", (event) => {
    event.preventDefault();
    saveFocus();
  });

  clearFocusButton.addEventListener("click", () => {
    delete state.focus[todayKey];
    persistStorage(storageKeys.focus, state.focus);
    renderFocusPreview();
  });

  agendaForm.addEventListener("submit", (event) => {
    event.preventDefault();
    saveAgenda();
  });

  startTimerButton.addEventListener("click", () => startTimer(Number(timerMinutes.value)));
  pauseTimerButton.addEventListener("click", pauseTimer);
  resetTimerButton.addEventListener("click", () => resetTimer(Number(timerMinutes.value)));
  timerMinutes.addEventListener("change", () => resetTimer(Number(timerMinutes.value)));

  renderFocusPreview();
  renderAgendaPreview();
  resetTimer(Number(timerMinutes.value));
}

function initPlannerPage() {
  const taskForm = document.querySelector("#taskForm");
  const taskSearch = document.querySelector("#taskSearch");
  const chips = Array.from(document.querySelectorAll(".filter-chip"));

  taskForm.addEventListener("submit", (event) => {
    event.preventDefault();
    addTask();
  });

  taskSearch.addEventListener("input", (event) => {
    state.taskSearch = event.target.value.trim().toLowerCase();
    renderTasks();
  });

  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      state.taskFilter = chip.dataset.status;
      chips.forEach((button) => button.classList.toggle("is-active", button === chip));
      renderTasks();
    });
  });

  renderTasks();
}

function initRoutinesPage() {
  const addWaterButton = document.querySelector("#addWaterButton");
  const resetWaterButton = document.querySelector("#resetWaterButton");
  const reflectionForm = document.querySelector("#reflectionForm");
  const routineForm = document.querySelector("#routineForm");
  const cancelRoutineEditButton = document.querySelector("#cancelRoutineEditButton");

  routineForm.addEventListener("submit", (event) => {
    event.preventDefault();
    saveRoutine();
  });

  cancelRoutineEditButton.addEventListener("click", resetRoutineForm);

  addWaterButton.addEventListener("click", () => {
    const current = Number(state.water[todayKey] || 0);
    state.water[todayKey] = current + 1;
    persistStorage(storageKeys.water, state.water);
    renderWater();
    renderSharedSnapshot();
  });

  resetWaterButton.addEventListener("click", () => {
    state.water[todayKey] = 0;
    persistStorage(storageKeys.water, state.water);
    renderWater();
  });

  reflectionForm.addEventListener("submit", (event) => {
    event.preventDefault();
    saveReflection();
  });

  renderRoutines();
  renderWater();
  renderReflection();
}

function renderSharedSnapshot() {
  const dueToday = state.tasks.filter((task) => !task.done && task.dueDate === todayKey).length;
  const completedToday = state.tasks.filter((task) => task.done && task.completedOn === todayKey).length;
  const routineState = state.routines[todayKey] || {};
  const routinesDone = state.routineCatalog.filter((routine) => routineState[routine.id]).length;
  const focusMinutes = Number(state.focusMinutes[todayKey] || 0);

  setText("#snapshotTasksDue", String(dueToday));
  setText("#snapshotTasksDone", String(completedToday));
  setText("#snapshotRoutinesDone", String(routinesDone));
  setText("#snapshotFocusMinutes", String(focusMinutes));
}

function saveFocus() {
  const titleInput = document.querySelector("#focusTitle");
  const notesInput = document.querySelector("#focusNotes");
  const title = titleInput.value.trim();
  const notes = notesInput.value.trim();

  if (!title) {
    return;
  }

  state.focus[todayKey] = { title, notes };
  persistStorage(storageKeys.focus, state.focus);
  titleInput.value = "";
  notesInput.value = "";
  renderFocusPreview();
}

function renderFocusPreview() {
  const preview = document.querySelector("#focusPreview");

  if (!preview) {
    return;
  }

  const focus = state.focus[todayKey];
  if (!focus) {
    preview.innerHTML = '<p class="empty-state">No focus block saved yet.</p>';
    return;
  }

  preview.innerHTML = `
    <strong>${escapeHtml(focus.title)}</strong>
    <p>${escapeHtml(focus.notes || "One clear target is enough for a good day.")}</p>
  `;
}

function saveAgenda() {
  const morning = document.querySelector("#morningPlan").value.trim();
  const midday = document.querySelector("#middayPlan").value.trim();
  const evening = document.querySelector("#eveningPlan").value.trim();

  state.agenda[todayKey] = { morning, midday, evening };
  persistStorage(storageKeys.agenda, state.agenda);
  renderAgendaPreview();
}

function renderAgendaPreview() {
  const preview = document.querySelector("#agendaPreview");

  if (!preview) {
    return;
  }

  const agenda = state.agenda[todayKey];

  if (!agenda || (!agenda.morning && !agenda.midday && !agenda.evening)) {
    preview.innerHTML = '<p class="empty-state">No agenda saved yet.</p>';
    return;
  }

  preview.innerHTML = `
    <strong>Saved agenda</strong>
    <p><span>Morning:</span> ${escapeHtml(agenda.morning || "Not set")}</p>
    <p><span>Midday:</span> ${escapeHtml(agenda.midday || "Not set")}</p>
    <p><span>Evening:</span> ${escapeHtml(agenda.evening || "Not set")}</p>
  `;
}

function startTimer(minutes) {
  if (state.timerInterval) {
    return;
  }

  if (!Number.isFinite(minutes) || minutes < 5) {
    return;
  }

  if (state.timerRemainingSeconds <= 0 || state.timerInitialSeconds !== minutes * 60) {
    resetTimer(minutes);
  }

  state.timerInterval = window.setInterval(() => {
    state.timerRemainingSeconds -= 1;
    updateTimerDisplay();

    if (state.timerRemainingSeconds <= 0) {
      pauseTimer();
      state.timerRemainingSeconds = 0;
      updateTimerDisplay();
      state.focusMinutes[todayKey] = Number(state.focusMinutes[todayKey] || 0) + Math.round(state.timerInitialSeconds / 60);
      persistStorage(storageKeys.focusMinutes, state.focusMinutes);
      renderSharedSnapshot();
    }
  }, 1000);
}

function pauseTimer() {
  if (state.timerInterval) {
    window.clearInterval(state.timerInterval);
    state.timerInterval = null;
  }
}

function resetTimer(minutes) {
  pauseTimer();
  const safeMinutes = Number.isFinite(minutes) && minutes >= 5 ? minutes : 25;
  state.timerInitialSeconds = safeMinutes * 60;
  state.timerRemainingSeconds = safeMinutes * 60;
  updateTimerDisplay();
}

function updateTimerDisplay() {
  const display = document.querySelector("#timerDisplay");
  const progress = document.querySelector("#timerProgress");

  if (!display || !progress) {
    return;
  }

  const minutes = Math.floor(state.timerRemainingSeconds / 60);
  const seconds = state.timerRemainingSeconds % 60;
  const ratio = state.timerInitialSeconds === 0 ? 0 : state.timerRemainingSeconds / state.timerInitialSeconds;
  const circumference = 301.59;

  display.textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  progress.style.strokeDashoffset = String(circumference * (1 - ratio));
}

function addTask() {
  const title = document.querySelector("#taskTitle").value.trim();
  const category = document.querySelector("#taskCategory").value;
  const priority = document.querySelector("#taskPriority").value;
  const dueDate = document.querySelector("#taskDueDate").value;
  const estimate = Number(document.querySelector("#taskEstimate").value || 0);
  const notes = document.querySelector("#taskNotes").value.trim();

  if (!title) {
    return;
  }

  state.tasks.push({
    id: crypto.randomUUID(),
    title,
    category,
    priority,
    dueDate,
    estimate,
    notes,
    done: false,
    completedOn: "",
  });

  persistStorage(storageKeys.tasks, state.tasks);
  document.querySelector("#taskForm").reset();
  document.querySelector("#taskPriority").value = "High";
  document.querySelector("#taskCategory").value = "Work";
  document.querySelector("#taskEstimate").value = "30";
  renderTasks();
  renderSharedSnapshot();
}

function renderTasks() {
  const list = document.querySelector("#taskList");

  if (!list) {
    return;
  }

  const template = document.querySelector("#taskItemTemplate");
  list.innerHTML = "";
  list.dataset.empty = "No tasks match your current filters. Add one above to get started.";

  const filteredTasks = state.tasks.filter((task) => {
    const matchesStatus =
      state.taskFilter === "all" ||
      (state.taskFilter === "open" && !task.done) ||
      (state.taskFilter === "done" && task.done);
    const searchSource = `${task.title} ${task.notes}`.toLowerCase();
    const matchesSearch = !state.taskSearch || searchSource.includes(state.taskSearch);
    return matchesStatus && matchesSearch;
  });

  filteredTasks
    .slice()
    .sort((first, second) => Number(first.done) - Number(second.done))
    .forEach((task) => {
      const fragment = template.content.cloneNode(true);
      const taskItem = fragment.querySelector(".task-item");
      const toggle = fragment.querySelector(".task-toggle");
      const priorityBadge = fragment.querySelector(".task-priority");

      taskItem.classList.toggle("is-done", task.done);
      fragment.querySelector(".task-title").textContent = task.title;
      fragment.querySelector(".task-meta").textContent = buildTaskMeta(task);
      fragment.querySelector(".task-notes").textContent = task.notes || "No additional notes.";
      fragment.querySelector(".task-estimate").textContent = `${task.estimate} min planned`;
      fragment.querySelector(".task-category").textContent = task.category;
      priorityBadge.textContent = task.priority;
      priorityBadge.classList.add(task.priority.toLowerCase());
      toggle.checked = task.done;
      toggle.addEventListener("change", () => toggleTask(task.id, toggle.checked));
      fragment.querySelector(".remove-task-button").addEventListener("click", () => deleteTask(task.id));

      list.append(fragment);
    });

  renderPlannerSummary();
}

function renderPlannerSummary() {
  const openCount = state.tasks.filter((task) => !task.done).length;
  const dueToday = state.tasks.filter((task) => !task.done && task.dueDate === todayKey).length;
  const completed = state.tasks.filter((task) => task.done).length;
  const plannedMinutes = state.tasks.filter((task) => !task.done).reduce((sum, task) => sum + task.estimate, 0);

  setText("#openTasksCount", String(openCount));
  setText("#dueTodayCount", String(dueToday));
  setText("#completedTasksCount", String(completed));
  setText("#plannedMinutesCount", `${plannedMinutes}m`);
}

function toggleTask(taskId, isDone) {
  state.tasks = state.tasks.map((task) => {
    if (task.id !== taskId) {
      return task;
    }

    return {
      ...task,
      done: isDone,
      completedOn: isDone ? todayKey : "",
    };
  });

  persistStorage(storageKeys.tasks, state.tasks);
  renderTasks();
  renderSharedSnapshot();
}

function deleteTask(taskId) {
  state.tasks = state.tasks.filter((task) => task.id !== taskId);
  persistStorage(storageKeys.tasks, state.tasks);
  renderTasks();
  renderSharedSnapshot();
}

function buildTaskMeta(task) {
  const dueText = task.dueDate ? `Due ${formatDate(task.dueDate)}` : "No due date";
  return `${dueText} · ${task.estimate} min`;
}

function renderRoutines() {
  const list = document.querySelector("#routineList");

  if (!list) {
    return;
  }

  const template = document.querySelector("#routineItemTemplate");
  const todayRoutines = state.routines[todayKey] || {};
  list.innerHTML = "";
  list.dataset.empty = "No routines yet. Add one above to get started.";

  state.routineCatalog.forEach((routine) => {
    const fragment = template.content.cloneNode(true);
    const toggle = fragment.querySelector(".routine-toggle");
    toggle.checked = Boolean(todayRoutines[routine.id]);
    fragment.querySelector(".routine-title").textContent = routine.title;
    fragment.querySelector(".routine-copy").textContent = routine.copy;
    fragment.querySelector(".routine-streak").textContent = `${countRoutineStreak(routine.id)} day streak`;
    fragment.querySelector(".edit-routine-button").addEventListener("click", () => startRoutineEdit(routine.id));
    fragment.querySelector(".delete-routine-button").addEventListener("click", () => deleteRoutine(routine.id));
    toggle.addEventListener("change", () => {
      const nextRoutineState = {
        ...(state.routines[todayKey] || {}),
        [routine.id]: toggle.checked,
      };
      state.routines[todayKey] = nextRoutineState;
      persistStorage(storageKeys.routines, state.routines);
      renderRoutines();
      renderSharedSnapshot();
    });
    list.append(fragment);
  });
}

function saveRoutine() {
  const routineTitle = document.querySelector("#routineTitle");
  const routineCopy = document.querySelector("#routineCopy");
  const routineEditId = document.querySelector("#routineEditId");
  const title = routineTitle.value.trim();
  const copy = routineCopy.value.trim();
  const editId = routineEditId.value;

  if (!title) {
    return;
  }

  if (editId) {
    state.routineCatalog = state.routineCatalog.map((routine) => {
      if (routine.id !== editId) {
        return routine;
      }

      return {
        ...routine,
        title,
        copy,
      };
    });
  } else {
    state.routineCatalog.push({
      id: generateId(),
      title,
      copy,
    });
  }

  persistStorage(storageKeys.routineCatalog, state.routineCatalog);
  resetRoutineForm();
  renderRoutines();
  renderSharedSnapshot();
}

function startRoutineEdit(routineId) {
  const routine = state.routineCatalog.find((item) => item.id === routineId);
  if (!routine) {
    return;
  }

  document.querySelector("#routineTitle").value = routine.title;
  document.querySelector("#routineCopy").value = routine.copy || "";
  document.querySelector("#routineEditId").value = routine.id;
}

function resetRoutineForm() {
  const form = document.querySelector("#routineForm");
  if (!form) {
    return;
  }

  form.reset();
  document.querySelector("#routineEditId").value = "";
}

function deleteRoutine(routineId) {
  state.routineCatalog = state.routineCatalog.filter((routine) => routine.id !== routineId);
  Object.keys(state.routines).forEach((dateKey) => {
    const dayState = state.routines[dateKey];
    if (dayState && Object.prototype.hasOwnProperty.call(dayState, routineId)) {
      delete dayState[routineId];
    }
  });
  persistStorage(storageKeys.routineCatalog, state.routineCatalog);
  persistStorage(storageKeys.routines, state.routines);
  renderRoutines();
  renderSharedSnapshot();
}

function renderWater() {
  setText("#waterCount", String(state.water[todayKey] || 0));
}

function saveReflection() {
  const reflectionInput = document.querySelector("#reflectionInput");
  const value = reflectionInput.value.trim();

  if (!value) {
    return;
  }

  state.reflection[todayKey] = value;
  persistStorage(storageKeys.reflection, state.reflection);
  reflectionInput.value = "";
  renderReflection();
}

function renderReflection() {
  const preview = document.querySelector("#reflectionPreview");

  if (!preview) {
    return;
  }

  const reflection = state.reflection[todayKey];
  if (!reflection) {
    preview.innerHTML = '<p class="empty-state">No reflection saved for today.</p>';
    return;
  }

  preview.innerHTML = `
    <strong>Saved reflection</strong>
    <p>${escapeHtml(reflection)}</p>
  `;
}

function seedRoutines() {
  if (!Array.isArray(state.routineCatalog) || !state.routineCatalog.length) {
    state.routineCatalog = [...defaultRoutines];
    persistStorage(storageKeys.routineCatalog, state.routineCatalog);
  }

  if (!Object.keys(state.routines).length) {
    state.routines = {};
    persistStorage(storageKeys.routines, state.routines);
  }
}

function bindThemeToggle() {
  const toggles = Array.from(document.querySelectorAll(".theme-toggle"));
  toggles.forEach((toggle) => {
    toggle.addEventListener("click", () => {
      const nextTheme = state.theme === "dark" ? "light" : "dark";
      setTheme(nextTheme);
    });
  });
  updateThemeToggleText();
}

function applySavedTheme() {
  const systemPrefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  const preferred = state.theme === "dark" || state.theme === "light"
    ? state.theme
    : systemPrefersDark
      ? "dark"
      : "light";
  setTheme(preferred);
}

function setTheme(theme) {
  state.theme = theme === "dark" ? "dark" : "light";
  document.body.dataset.theme = state.theme;
  persistStorage(storageKeys.theme, state.theme);
  updateThemeToggleText();
}

function updateThemeToggleText() {
  const toggles = Array.from(document.querySelectorAll(".theme-toggle"));
  toggles.forEach((toggle) => {
    toggle.textContent = state.theme === "dark" ? "Light mode" : "Dark mode";
    toggle.setAttribute("aria-pressed", state.theme === "dark" ? "true" : "false");
  });
}

function generateId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return `routine-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function countRoutineStreak(routineId) {
  let streak = 0;
  const cursor = new Date();

  while (true) {
    const key = formatStorageDate(cursor);
    const snapshot = state.routines[key];
    if (!snapshot || !snapshot[routineId]) {
      break;
    }
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function getTodayKey() {
  return formatStorageDate(new Date());
}

function formatStorageDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(value) {
  if (!value) {
    return "";
  }

  const date = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function setText(selector, value) {
  const node = document.querySelector(selector);
  if (node) {
    node.textContent = value;
  }
}

function loadStorage(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function persistStorage(key, value) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
