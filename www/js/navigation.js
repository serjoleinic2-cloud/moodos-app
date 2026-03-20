import { checkAutoReminder } from "./screens/pdf-report.js";

// ============================================================
// closeAllOverlays — живёт здесь, используется навигацией
// ============================================================
export function closeAllOverlays() {
  document.getElementById("pdfReportScreen")?.remove();
  document.getElementById("moodCalendarOverlay")?.remove();
  document.querySelectorAll(".health-modal-overlay").forEach(m => m.remove());
}

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
    try {
      if (!loadedScreens[name]) {
        loadedScreens[name] = await screenModules[name]();
      }
      const module = loadedScreens[name];
      if (module && module.onEnter) module.onEnter();
    } catch (err) {
      console.error(`[nav] loadScreen error for "${name}":`, err);
      delete loadedScreens[name];
    }
  }

  const hamburgerBtn = document.getElementById("hamburgerBtn");
  const menuPanel    = document.getElementById("menuPanel");
  const menuOverlay  = document.getElementById("menuOverlay");
  const toolsBtn     = document.querySelector('[data-nav="tools"]');
  const toolsPanel   = document.getElementById("toolsPanel");
  const toolsOverlay = document.getElementById("toolsOverlay");

  function closeMenu() {
    menuPanel.style.bottom = "-400px";
    setTimeout(() => { menuOverlay.style.display = "none"; }, 350);
  }

  function closeToolsMenu() {
    toolsPanel.style.bottom = "-560px";
    setTimeout(() => { toolsOverlay.style.display = "none"; }, 350);
  }

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

  function openScreen(name) {
    closeMenu();
    closeToolsMenu();
    closeAllOverlays();
    screenElements.forEach(s => s.classList.remove("active"));
    buttons.forEach(b => { if (b.id !== "hamburgerBtn") b.classList.remove("active"); });
    const targetScreen = document.querySelector(`[data-screen="${name}"]`);
    const targetButton = document.querySelector(`[data-nav="${name}"]`);
    if (!targetScreen) return;
    targetScreen.classList.add("active");
    if (targetButton && targetButton.id !== "hamburgerBtn") targetButton.classList.add("active");
    currentScreen = name;
    loadScreen(name);
  }

  hamburgerBtn.addEventListener("click", () => {
    closeAllOverlays();
    openMenu();
  });
  menuOverlay.addEventListener("click", (e) => { e.stopPropagation(); closeMenu(); });
  menuPanel.addEventListener("click", (e) => e.stopPropagation());

  document.querySelectorAll(".menuItem").forEach(item => {
    item.addEventListener("click", () => { closeMenu(); openScreen(item.dataset.nav); });
  });

  toolsBtn.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); openToolsMenu(); });
  toolsOverlay.addEventListener("click", () => closeToolsMenu());
  toolsPanel.addEventListener("click", (e) => e.stopPropagation());

  document.getElementById("toolsBreathing").onclick = async () => {
    closeToolsMenu(); openScreen("tools");
    await new Promise(r => setTimeout(r, 50));
    const { initBreathing } = await import("./breathing.js");
    const c = document.getElementById("tools-content");
    if (c) { c.innerHTML = ""; initBreathing(c); }
  };

  document.getElementById("toolsMeditation").onclick = async () => {
    closeToolsMenu(); openScreen("tools");
    await new Promise(r => setTimeout(r, 50));
    const { initMeditation } = await import("./screens/meditation.js");
    const c = document.getElementById("tools-content");
    if (c) { c.innerHTML = ""; initMeditation(c); }
  };

  const vfBtn = document.getElementById("toolsVisualFocus");
  if (vfBtn) vfBtn.onclick = async () => {
    closeToolsMenu(); openScreen("tools");
    await new Promise(r => setTimeout(r, 50));
    const { initVisualFocus } = await import("./visual-focus.js");
    const c = document.getElementById("tools-content");
    if (c) { c.innerHTML = ""; initVisualFocus(c); }
  };

  const mdBtn = document.getElementById("toolsMindDump");
  if (mdBtn) mdBtn.onclick = async () => {
    closeToolsMenu(); openScreen("tools");
    await new Promise(r => setTimeout(r, 50));
    const { initMindDump } = await import("./mind-dump.js");
    const c = document.getElementById("tools-content");
    if (c) { c.innerHTML = ""; initMindDump(c); }
  };

  const tcBtn = document.getElementById("toolsTapCalm");
  if (tcBtn) tcBtn.onclick = async () => {
    closeToolsMenu(); openScreen("tools");
    await new Promise(r => setTimeout(r, 50));
    const { initTapCalm } = await import("./tap-calm.js");
    const c = document.getElementById("tools-content");
    if (c) { c.innerHTML = ""; initTapCalm(c); }
  };

  buttons.forEach(btn => {
    if (btn.dataset.nav === "tools") return;
    if (btn.id === "hamburgerBtn") return;
    btn.addEventListener("click", e => { e.preventDefault(); e.stopPropagation(); openScreen(btn.dataset.nav); });
  });

  // Push-напоминания инициализируем здесь
  setTimeout(() => { try { checkAutoReminder(); } catch(e) {} }, 3000);

  openScreen("home");
}
