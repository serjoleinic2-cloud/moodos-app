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
        if (s) s.innerHTML = '<div style="padding:40px;text-align:center;color:#aaa;">Ошибка загрузки экрана</div>';
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
  window.openScreen = openScreen;

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
    const c = document.getElementById("tools-content");
    if (!c) return;
    c.innerHTML = "<div style='padding:20px;color:red;font-size:16px;'>Загрузка...</div>";
    try {
      const mod = await import("./screens/breathing.js");
      c.innerHTML = "<div style='padding:20px;color:green;font-size:16px;'>Модуль загружен: " + Object.keys(mod).join(", ") + "</div>";
      if (mod.initBreathing) mod.initBreathing(c);
    } catch(e) {
      c.innerHTML = "<div style='padding:20px;color:red;font-size:14px;'>ОШИБКА: " + e.message + "</div>";
    }
  };

  document.getElementById("toolsMeditation").onclick = async () => {
    console.log("[DEBUG] meditation clicked");
    closeToolsMenu(); openScreen("tools");
    await new Promise(r => setTimeout(r, 50));
    console.log("[DEBUG] importing meditation");
    try {
      const { onEnter } = await import("./screens/meditation.js");
      console.log("[DEBUG] meditation imported, onEnter:", typeof onEnter);
      const c = document.getElementById("tools-content");
      console.log("[DEBUG] tools-content:", c);
      if (c) { c.innerHTML = ""; onEnter(c); }
      console.log("[DEBUG] meditation init done");
    } catch(e) {
      console.error("[DEBUG] meditation error:", e.message, e.stack);
    }
  };

  const vfBtn = document.getElementById("toolsVisualFocus");
  if (vfBtn) vfBtn.onclick = async () => {
    console.log("[DEBUG] visual-focus clicked");
    closeToolsMenu(); openScreen("tools");
    await new Promise(r => setTimeout(r, 50));
    console.log("[DEBUG] importing visual-focus");
    try {
      const { onEnter } = await import("./screens/visual-focus.js");
      console.log("[DEBUG] visual-focus imported, onEnter:", typeof onEnter);
      const c = document.getElementById("tools-content");
      console.log("[DEBUG] tools-content:", c);
      if (c) { c.innerHTML = ""; onEnter(c); }
      console.log("[DEBUG] visual-focus init done");
    } catch(e) {
      console.error("[DEBUG] visual-focus error:", e.message, e.stack);
    }
  };

  const mdBtn = document.getElementById("toolsMindDump");
  if (mdBtn) mdBtn.onclick = async () => {
    console.log("[DEBUG] mind-dump clicked");
    closeToolsMenu(); openScreen("tools");
    await new Promise(r => setTimeout(r, 50));
    console.log("[DEBUG] importing mind-dump");
    try {
      const { onEnter } = await import("./screens/mind-dump.js");
      console.log("[DEBUG] mind-dump imported, onEnter:", typeof onEnter);
      const c = document.getElementById("tools-content");
      console.log("[DEBUG] tools-content:", c);
      if (c) { c.innerHTML = ""; onEnter(c); }
      console.log("[DEBUG] mind-dump init done");
    } catch(e) {
      console.error("[DEBUG] mind-dump error:", e.message, e.stack);
    }
  };

  const tcBtn = document.getElementById("toolsTapCalm");
  if (tcBtn) tcBtn.onclick = async () => {
    console.log("[DEBUG] tap-calm clicked");
    closeToolsMenu(); openScreen("tools");
    await new Promise(r => setTimeout(r, 50));
    console.log("[DEBUG] importing tap-calm");
    try {
      const { onEnter } = await import("./screens/tap-calm.js");
      console.log("[DEBUG] tap-calm imported, onEnter:", typeof onEnter);
      const c = document.getElementById("tools-content");
      console.log("[DEBUG] tools-content:", c);
      if (c) { c.innerHTML = ""; onEnter(c); }
      console.log("[DEBUG] tap-calm init done");
    } catch(e) {
      console.error("[DEBUG] tap-calm error:", e.message, e.stack);
    }
  };

  const stBtn = document.getElementById("toolsSupportTexts");
  if (stBtn) stBtn.onclick = async () => {
    console.log("[DEBUG] support-texts clicked");
    closeToolsMenu(); openScreen("tools");
    await new Promise(r => setTimeout(r, 50));
    console.log("[DEBUG] importing support-texts");
    try {
      const { initSupportTexts } = await import("./screens/support-texts.js");
      console.log("[DEBUG] support-texts imported, initSupportTexts:", typeof initSupportTexts);
      const c = document.getElementById("tools-content");
      console.log("[DEBUG] tools-content:", c);
      if (c) { c.innerHTML = ""; initSupportTexts(c); }
      console.log("[DEBUG] support-texts init done");
    } catch(e) {
      console.error("[DEBUG] support-texts error:", e.message, e.stack);
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
