// ============================================================
// closeAllOverlays — живёт здесь, используется навигацией
// ============================================================
import { saveCheckpointOnExit } from "./services/checkpoint-manager.js";
import { t } from "./i18n.js";

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
    paywall:   () => import("./screens/paywall.js"),
    howItWorks: () => import("./screens/how-it-works.js"),
  };

  async function loadScreen(name) {
    if (!screenModules[name]) return;
    
    if (!window.systemState?.isReady) {
      console.log('[nav] Waiting for system to be ready...');
      setTimeout(() => loadScreen(name), 300);
      return;
    }
    
    try {
      if (!loadedScreens[name]) {
        loadedScreens[name] = await screenModules[name]();
      }
      const module = loadedScreens[name];
      if (module && module.onEnter) module.onEnter();
    } catch (err) {
      console.error(`[nav] loadScreen error for "${name}":`, err);
      delete loadedScreens[name];
      if (!loadScreen._retried) loadScreen._retried = new Set();
      if (!loadScreen._retried.has(name)) {
        loadScreen._retried.add(name);
        setTimeout(() => loadScreen(name), 500);
      } else {
        loadScreen._retried.delete(name);
        const s = document.querySelector(`[data-screen="${name}"]`);
        if (s) s.innerHTML = `<div style="padding:40px;text-align:center;color:#aaa;">${t("screen_load_error")}</div>`;
      }
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
    menuOverlay.style.zIndex  = "200";
    menuPanel.style.zIndex    = "201";
  }

  function openToolsMenu() {
    closeMenu();
    toolsPanel.style.bottom    = "0";
    toolsOverlay.style.display = "block";
    toolsOverlay.style.zIndex  = "100";
    toolsPanel.style.zIndex    = "101";
  }

  function openScreen(name) {
    // Stop meditation FIRST if active (before any screen switch)
    if (window._activeMeditationModule) {
      if (typeof window._activeMeditationModule.onExit === 'function') {
        window._activeMeditationModule.onExit();
      }
      window._activeMeditationModule = null;
    }
    
    // Call onExit for current screen BEFORE switching
    if (currentScreen && loadedScreens[currentScreen]) {
      const prevModule = loadedScreens[currentScreen];
      if (prevModule && typeof prevModule.onExit === 'function') {
        prevModule.onExit();
      }
      saveCheckpointOnExit(currentScreen, currentScreen);
    }
    
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
  window.openScreen = openScreen;

  hamburgerBtn.addEventListener("click", () => {
    closeAllOverlays();
    const toolsContent = document.getElementById("tools-content");
    if (toolsContent) toolsContent.innerHTML = "";
    if (window._activeMeditationModule) {
      if (typeof window._activeMeditationModule.onExit === 'function') {
        window._activeMeditationModule.onExit();
      }
      window._activeMeditationModule = null;
    }
    openMenu();
  });
  menuOverlay.addEventListener("click", (e) => { e.stopPropagation(); closeMenu(); });
  menuPanel.addEventListener("click", (e) => e.stopPropagation());

  document.querySelectorAll(".menuItem").forEach(item => {
    item.addEventListener("click", () => { 
      closeMenu();
      if (window._activeMeditationModule) {
        if (typeof window._activeMeditationModule.onExit === 'function') {
          window._activeMeditationModule.onExit();
        }
        window._activeMeditationModule = null;
      }
      openScreen(item.dataset.nav); 
    });
  });

  toolsBtn.addEventListener("click", (e) => { 
    e.preventDefault(); 
    e.stopPropagation();
    closeAllOverlays();
    if (window._activeMeditationModule) {
      if (typeof window._activeMeditationModule.onExit === 'function') {
        window._activeMeditationModule.onExit();
      }
      window._activeMeditationModule = null;
    }
    openToolsMenu(); 
  });
  toolsOverlay.addEventListener("click", () => closeToolsMenu());
  toolsPanel.addEventListener("click", (e) => e.stopPropagation());

  document.getElementById("toolsBreathing").onclick = async () => {
    openScreen("tools");
    await new Promise(r => setTimeout(r, 50));
    const c = document.getElementById("tools-content");
    if (!c) return;
    try {
      const mod = await import("./screens/breathing.js");
      c.innerHTML = "";
      if (mod.initBreathing) mod.initBreathing(c);
    } catch(e) {
      console.error("[nav] breathing error:", e.message);
    }
  };

  document.getElementById("toolsMeditation").onclick = async () => {
    // Clean up previous tool if any
    if (window._activeMeditationModule) {
      if (typeof window._activeMeditationModule.onExit === 'function') {
        window._activeMeditationModule.onExit();
      }
      window._activeMeditationModule = null;
    }
    
    openScreen("tools");
    await new Promise(r => setTimeout(r, 50));
    const c = document.getElementById("tools-content");
    if (!c) return;
    try {
      const mod = await import("./screens/meditation.js");
      window._activeMeditationModule = mod;
      loadedScreens["tools"] = mod;
      c.innerHTML = "";
      mod.onEnter(c);
    } catch(e) {
      console.error("[nav] meditation error:", e.message);
    }
  };

  const vfBtn = document.getElementById("toolsVisualFocus");
  if (vfBtn) vfBtn.onclick = async () => {
    openScreen("tools");
    await new Promise(r => setTimeout(r, 50));
    const c = document.getElementById("tools-content");
    if (!c) return;
    try {
      const { onEnter } = await import("./screens/visual-focus.js");
      c.innerHTML = "";
      onEnter(c);
    } catch(e) {
      console.error("[nav] visual-focus error:", e.message);
    }
  };

  const mdBtn = document.getElementById("toolsMindDump");
  if (mdBtn) mdBtn.onclick = async () => {
    openScreen("tools");
    await new Promise(r => setTimeout(r, 50));
    const c = document.getElementById("tools-content");
    if (!c) return;
    try {
      const { onEnter } = await import("./screens/mind-dump.js");
      c.innerHTML = "";
      onEnter(c);
    } catch(e) {
      console.error("[nav] mind-dump error:", e.message);
    }
  };

  const tcBtn = document.getElementById("toolsTapCalm");
  if (tcBtn) tcBtn.onclick = async () => {
    openScreen("tools");
    await new Promise(r => setTimeout(r, 50));
    const c = document.getElementById("tools-content");
    if (!c) return;
    try {
      const { onEnter } = await import("./screens/tap-calm.js");
      c.innerHTML = "";
      onEnter(c);
    } catch(e) {
      console.error("[nav] tap-calm error:", e.message);
    }
  };

  const stBtn = document.getElementById("toolsSupportTexts");
  if (stBtn) stBtn.onclick = async () => {
    openScreen("tools");
    await new Promise(r => setTimeout(r, 50));
    const c = document.getElementById("tools-content");
    if (!c) return;
    try {
      const { initSupportTexts } = await import("./screens/support-texts.js");
      c.innerHTML = "";
      initSupportTexts(c);
    } catch(e) {
      console.error("[nav] support-texts error:", e.message);
    }
  };
  
  buttons.forEach(btn => {
    if (btn.dataset.nav === "tools") return;
    if (btn.id === "hamburgerBtn") return;
    btn.addEventListener("click", e => { e.preventDefault(); e.stopPropagation(); openScreen(btn.dataset.nav); });
  });

  // pdf-report загружается динамически — не блокирует старт WebView
  setTimeout(() => {
    import("./screens/pdf-report.js")
      .then(m => { try { m.checkAutoReminder(); } catch(e) {} })
      .catch(() => {});
  }, 3000);

  openScreen("home");

  document.addEventListener("languageChanged", () => {
    Object.keys(loadedScreens).forEach(k => delete loadedScreens[k]);
    if (currentScreen) {
      loadScreen(currentScreen);
    }
  });

  document.addEventListener('premiumChanged', () => {
    if (currentScreen) loadScreen(currentScreen);
  });
}
