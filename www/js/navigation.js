export function initNavigation() {

  const buttons        = document.querySelectorAll("[data-nav]");
  const screenElements = document.querySelectorAll("[data-screen]");

  if (!buttons.length || !screenElements.length) return;

  let currentScreen = null;
  const loadedScreens = {};

  const screenModules = {
    home:      () => import("./screens/home.js"),
    insight:   () => import("./screens/insight.js"),
    stability: () => import("./screens/stability.js"),
    report:    () => import("./screens/report.js"),
    tools:     () => import("./screens/tools.js"),
    settings:  () => import("./screens/settings.js"),
    premium:   () => import("./screens/premium.js"),
    history:   () => import("./screens/history.js"),
  };

  async function loadScreen(name) {
    if (!screenModules[name]) return;
    if (!loadedScreens[name]) {
      loadedScreens[name] = await screenModules[name]();
    }
    const module = loadedScreens[name];
    if (module.onEnter) module.onEnter();
  }

  // ---- DOM ЭЛЕМЕНТЫ ----
  const hamburgerBtn = document.getElementById("hamburgerBtn");
  const menuPanel    = document.getElementById("menuPanel");
  const menuOverlay  = document.getElementById("menuOverlay");
  const toolsBtn     = document.querySelector('[data-nav="tools"]');
  const toolsPanel   = document.getElementById("toolsPanel");
  const toolsOverlay = document.getElementById("toolsOverlay");

  // ---- ПОДСВЕТКА КНОПКИ (отдельно от переключения экрана) ----
  function setActiveButton(name) {
    buttons.forEach(b => b.classList.remove("active"));
    const btn = document.querySelector(`[data-nav="${name}"]`);
    if (btn) btn.classList.add("active");
  }

  // ---- CLOSE ФУНКЦИИ ----
  function closeMenu() {
    menuPanel.style.bottom = "-300px";
    setTimeout(() => { menuOverlay.style.display = "none"; }, 350);
  }

  function closeToolsMenu() {
    toolsPanel.style.bottom = "-460px";
    setTimeout(() => { toolsOverlay.style.display = "none"; }, 350);
  }

  // ---- OPEN ФУНКЦИИ ----
  function openMenu() {
    closeToolsMenu();
    // Подсвечиваем hamburger при открытии
    buttons.forEach(b => b.classList.remove("active"));
    hamburgerBtn.classList.add("active");
    menuPanel.style.bottom    = "0";
    menuOverlay.style.display = "block";
    menuOverlay.style.zIndex  = "100";
    menuPanel.style.zIndex    = "101";
  }

  function openToolsMenu() {
    closeMenu();
    setActiveButton("tools"); // подсвечиваем кнопку 5 сразу
    toolsPanel.style.bottom    = "0";
    toolsOverlay.style.display = "block";
    toolsOverlay.style.zIndex  = "100";
    toolsPanel.style.zIndex    = "101";
  }

  // ---- openScreen ----
  function openScreen(name) {
    closeMenu();
    closeToolsMenu();

    screenElements.forEach(s => s.classList.remove("active"));
    const targetScreen = document.querySelector(`[data-screen="${name}"]`);
    if (!targetScreen) return;
    targetScreen.classList.add("active");

    setActiveButton(name);
    currentScreen = name;
    loadScreen(name);
  }

  // Закрытие панели без выбора — восстанавливаем подсветку текущего экрана
  function closeToolsMenuWithRestore() {
    closeToolsMenu();
    if (currentScreen) setActiveButton(currentScreen);
  }

  // ---- HAMBURGER ----
  hamburgerBtn.addEventListener("click", () => openMenu());
  menuOverlay.addEventListener("click", (e) => {
    e.stopPropagation();
    closeMenu();
    if (currentScreen) setActiveButton(currentScreen); // восстанавливаем подсветку
  });
  menuPanel.addEventListener("click", (e) => e.stopPropagation());

  document.querySelectorAll(".menuItem").forEach(item => {
    item.addEventListener("click", () => {
      closeMenu();
      openScreen(item.dataset.nav);
    });
  });

  // ---- TOOLS ----
  toolsBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    openToolsMenu();
  });

  toolsOverlay.addEventListener("click", () => closeToolsMenuWithRestore());
  toolsPanel.addEventListener("click", (e) => e.stopPropagation());

  // Вспомогательная функция — открыть инструмент
  async function openTool(importFn, initKey) {
    closeToolsMenu();
    screenElements.forEach(s => s.classList.remove("active"));
    const toolScreen = document.querySelector('[data-screen="tools"]');
    if (toolScreen) toolScreen.classList.add("active");
    setActiveButton("tools");
    currentScreen = "tools";
    await new Promise(r => setTimeout(r, 50));
    const mod = await importFn();
    const content = document.getElementById("tools-content");
    if (content) { content.innerHTML = ""; mod[initKey](content); }
  }

  // 🫁 Дыхание
  document.getElementById("toolsBreathing").onclick = () =>
    openTool(() => import("./breathing.js"), "initBreathing");

  // 🧘 Медитация
  document.getElementById("toolsMeditation").onclick = () =>
    openTool(() => import("./screens/meditation.js"), "initMeditation");

  // 👁 Зрительный якорь
  document.getElementById("toolsVisualFocus").onclick = () =>
    openTool(() => import("./visual-focus.js"), "initVisualFocus");

  // 🧠 Выгрузка мыслей
  document.getElementById("toolsMindDump").onclick = () =>
    openTool(() => import("./mind-dump.js"), "initMindDump");

  // ✋ Тактильная разрядка
  document.getElementById("toolsTapCalm").onclick = () =>
    openTool(() => import("./tap-calm.js"), "initTapCalm");

  // ---- НАВИГАЦИЯ (остальные кнопки) ----
  buttons.forEach(btn => {
    if (btn.dataset.nav === "tools") return;
    btn.addEventListener("click", e => {
      e.preventDefault();
      e.stopPropagation();
      openScreen(btn.dataset.nav);
    });
  });

  openScreen("home");
}