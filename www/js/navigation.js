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
    menuPanel.style.bottom    = "0";
    menuOverlay.style.display = "block";
    menuOverlay.style.zIndex  = "100";
    menuPanel.style.zIndex    = "101";
  }

  function openToolsMenu() {
    closeMenu();
    toolsPanel.style.bottom    = "0";
    toolsOverlay.style.display = "block";
    toolsOverlay.style.zIndex  = "100";
    toolsPanel.style.zIndex    = "101";
  }

  // ---- openScreen ----
  function openScreen(name) {
    closeMenu();
    closeToolsMenu();

    if (currentScreen === name) return;

    screenElements.forEach(s => s.classList.remove("active"));

    // Снимаем active только с nav-кнопок (не с hamburgerBtn)
    buttons.forEach(b => {
      if (b.id !== "hamburgerBtn") b.classList.remove("active");
    });

    const targetScreen = document.querySelector(`[data-screen="${name}"]`);
    const targetButton = document.querySelector(`[data-nav="${name}"]`);

    if (!targetScreen) return;

    targetScreen.classList.add("active");

    // Подсвечиваем только если кнопка есть И это не hamburger
    if (targetButton && targetButton.id !== "hamburgerBtn") {
      targetButton.classList.add("active");
    }

    currentScreen = name;
    loadScreen(name);
  }

  // ---- HAMBURGER СОБЫТИЯ ----
  hamburgerBtn.addEventListener("click", () => {
    // hamburgerBtn никогда не получает класс active
    openMenu();
  });
  menuOverlay.addEventListener("click", (e) => { e.stopPropagation(); closeMenu(); });
  menuPanel.addEventListener("click", (e) => e.stopPropagation());

  document.querySelectorAll(".menuItem").forEach(item => {
    item.addEventListener("click", () => {
      closeMenu();
      openScreen(item.dataset.nav);
    });
  });

  // ---- TOOLS СОБЫТИЯ ----
  toolsBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    openToolsMenu();
  });

  toolsOverlay.addEventListener("click", () => closeToolsMenu());
  toolsPanel.addEventListener("click", (e) => e.stopPropagation());

  document.getElementById("toolsBreathing").onclick = async () => {
    closeToolsMenu();
    openScreen("tools");
    await new Promise(r => setTimeout(r, 50));
    const { initBreathing } = await import("./breathing.js");
    const content = document.getElementById("tools-content");
    if (content) { content.innerHTML = ""; initBreathing(content); }
  };

  document.getElementById("toolsMeditation").onclick = async () => {
    closeToolsMenu();
    openScreen("tools");
    await new Promise(r => setTimeout(r, 50));
    const { initMeditation } = await import("./screens/meditation.js");
    const content = document.getElementById("tools-content");
    if (content) { content.innerHTML = ""; initMeditation(content); }
  };

  // Дополнительные инструменты (если есть)
  const visualFocus = document.getElementById("toolsVisualFocus");
  if (visualFocus) {
    visualFocus.onclick = async () => {
      closeToolsMenu();
      openScreen("tools");
      await new Promise(r => setTimeout(r, 50));
      try {
        const { initVisualFocus } = await import("./screens/visual-focus.js");
        const content = document.getElementById("tools-content");
        if (content) { content.innerHTML = ""; initVisualFocus(content); }
      } catch(e) {}
    };
  }

  const mindDump = document.getElementById("toolsMindDump");
  if (mindDump) {
    mindDump.onclick = async () => {
      closeToolsMenu();
      openScreen("tools");
      await new Promise(r => setTimeout(r, 50));
      try {
        const { initMindDump } = await import("./screens/mind-dump.js");
        const content = document.getElementById("tools-content");
        if (content) { content.innerHTML = ""; initMindDump(content); }
      } catch(e) {}
    };
  }

  const tapCalm = document.getElementById("toolsTapCalm");
  if (tapCalm) {
    tapCalm.onclick = async () => {
      closeToolsMenu();
      openScreen("tools");
      await new Promise(r => setTimeout(r, 50));
      try {
        const { initTapCalm } = await import("./screens/tap-calm.js");
        const content = document.getElementById("tools-content");
        if (content) { content.innerHTML = ""; initTapCalm(content); }
      } catch(e) {}
    };
  }

  // ---- НАВИГАЦИЯ ----
  buttons.forEach(btn => {
    if (btn.dataset.nav === "tools") return;
    if (btn.id === "hamburgerBtn") return; // hamburger обрабатывается отдельно
    btn.addEventListener("click", e => {
      e.preventDefault();
      e.stopPropagation();
      openScreen(btn.dataset.nav);
    });
  });

  openScreen("home");
}