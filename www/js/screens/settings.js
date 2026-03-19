// =====================================
// MoodOS Settings Screen
// =====================================

import { getProfile, saveProfile, saveMedReminder, removeMedReminder, getMedReminder } from "../services/user-profile.js";
import { showPdfReportModal } from "./pdf-report.js";
import { t, getLang, setLang, LANG_OPTIONS } from "../i18n.js";
import { backupAndShare, restoreFromBackup, getLastBackupTime } from "../services/drive-backup.js";

export function onEnter() {
  const el = document.querySelector('[data-screen="settings"]');
  if (!el) return;
  el.innerHTML = buildHTML();
  attachEvents(el);
}

function fmtTime(date) {
  if (!date) return "";
  return date.toLocaleDateString("ru-RU") + " " + date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

function buildHTML() {
  const profile   = getProfile();
  const reminder  = getMedReminder();
  const takesMeds = profile?.takesMeds && profile.takesMeds !== "нет" && profile.takesMeds !== "не_скажу";
  const lastTime  = getLastBackupTime();

  const medVal = {
    "нет": "Не принимаю", "антидепрессанты": "Антидепрессанты",
    "седативные": "Седативные", "другое": "Другое", "не_скажу": "Не указано",
  };
  const effVal = {
    "лучше": "Стало лучше", "примерно_так_же": "Так же",
    "приглушённость": "Приглушённость", "побочки": "Побочки", "адаптация": "Адаптация",
  };
  const remVal = {
    "нет": "Выключено", "утро": "Утром 8:00", "день": "Днём 13:00", "вечер": "Вечером 20:00",
  };

  const langInfo = LANG_OPTIONS.find(l => l.code === getLang()) || { flag: "🌍", label: "Русский" };
  const backupSub = lastTime ? "Последний: " + fmtTime(lastTime) : "Не создавалась";

  return `<style>
    .sw{padding:20px 16px 120px;font-family:-apple-system,'SF Pro Display',sans-serif}
    .sw h2{font-size:22px;font-weight:700;color:#3d3d3d;margin:0 0 24px}
    .sg{margin-bottom:28px}
    .sl{font-size:11px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#b0b8c4;margin-bottom:10px;padding-left:4px}
    .sr{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;background:rgba(232,237,230,0.9);border-radius:18px;box-shadow:6px 6px 14px #b8c4b4,-6px -6px 14px #ffffff;margin-bottom:10px;cursor:pointer;-webkit-tap-highlight-color:transparent;min-height:56px}
    .sr:active{box-shadow:inset 4px 4px 8px #b8c4b4,inset -4px -4px 8px #ffffff}
    .sr-l{display:flex;align-items:center;flex:1;gap:12px}
    .sr-ico{font-size:20px;flex-shrink:0}
    .sr-tx{flex:1}
    .sr-name{font-size:15px;color:#555;font-weight:500}
    .sr-sub{font-size:11px;color:#aaa;margin-top:2px}
    .sr-val{font-size:13px;color:#aaa;text-align:right;flex-shrink:0;margin-left:8px}
    .mo{position:fixed;inset:0;background:rgba(0,0,0,0.35);z-index:200;display:flex;align-items:flex-end}
    .mp{width:100%;background:linear-gradient(160deg,#d4ede8,#e8e0d5);border-radius:24px 24px 0 0;padding:24px 20px 32px;max-height:80vh;overflow-y:auto;box-sizing:border-box;animation:su .35s ease}
    @keyframes su{from{transform:translateY(100%)}to{transform:translateY(0)}}
    .mt{font-size:18px;font-weight:700;color:#3d3d3d;margin-bottom:6px}
    .ms{font-size:13px;color:#aaa;margin-bottom:20px}
    .mops{display:flex;flex-direction:column;gap:8px;margin-bottom:20px}
    .mop{padding:13px 16px;border-radius:14px;background:rgba(232,237,230,0.9);box-shadow:4px 4px 9px #b8c4b4,-4px -4px 9px #ffffff;font-size:15px;color:#555;cursor:pointer;-webkit-tap-highlight-color:transparent}
    .mop.sel{box-shadow:inset 3px 3px 7px #b8c4b4,inset -3px -3px 7px #ffffff;color:#7eb8d4;font-weight:600}
    .mbtn{width:100%;padding:15px;border:none;border-radius:16px;background:rgba(232,237,230,0.9);box-shadow:6px 6px 14px #b8c4b4,-6px -6px 14px #ffffff;font-size:16px;font-weight:700;color:#7eb8d4;cursor:pointer;display:block;box-sizing:border-box}
    .mcanc{width:100%;padding:12px;text-align:center;font-size:14px;color:#bbb;cursor:pointer;margin-top:8px}
  </style>
  <div class="sw">
    <h2>Настройки</h2>

    <div class="sg">
      <div class="sl">Здоровье</div>
      <div class="sr" id="sMeds">
        <div class="sr-l"><span class="sr-ico">💊</span><div class="sr-tx"><div class="sr-name">Приём лекарств</div></div></div>
        <div class="sr-val">${medVal[profile?.takesMeds] || "Не указано"} ›</div>
      </div>
      ${takesMeds ? `
      <div class="sr" id="sEffect">
        <div class="sr-l"><span class="sr-ico">🔍</span><div class="sr-tx"><div class="sr-name">Как влияет</div></div></div>
        <div class="sr-val">${effVal[profile?.medEffect] || "Не указано"} ›</div>
      </div>
      <div class="sr" id="sReminder">
        <div class="sr-l"><span class="sr-ico">⏰</span><div class="sr-tx"><div class="sr-name">Напоминание о приёме</div></div></div>
        <div class="sr-val">${reminder?.active ? (remVal[profile?.medReminder] || "Включено") : "Выключено"} ›</div>
      </div>` : ""}
    </div>

    <div class="sg">
      <div class="sl">Приложение</div>
      <div class="sr" id="sBaseline">
        <div class="sr-l"><span class="sr-ico">🎯</span><div class="sr-tx"><div class="sr-name">Базовое состояние</div></div></div>
        <div class="sr-val">${profile?.moodBaseline ?? 50}% ›</div>
      </div>
      <div class="sr" id="sLang">
        <div class="sr-l"><span class="sr-ico">🌍</span><div class="sr-tx"><div class="sr-name">Язык</div></div></div>
        <div class="sr-val">${langInfo.flag} ${langInfo.label} ›</div>
      </div>
    </div>

    <div class="sg">
      <div class="sl">Данные</div>
      <div class="sr" id="sPdf">
        <div class="sr-l"><span class="sr-ico">📄</span><div class="sr-tx"><div class="sr-name">Отчёт для врача</div></div></div>
        <div class="sr-val">PDF ›</div>
      </div>
      <div class="sr" id="sBackup">
        <div class="sr-l"><span class="sr-ico">☁️</span>
          <div class="sr-tx">
            <div class="sr-name">Резервная копия</div>
            <div class="sr-sub" id="backupSub">${backupSub}</div>
          </div>
        </div>
        <div class="sr-val" id="backupVal">Сохранить ›</div>
      </div>
      <div class="sr" id="sRestore">
        <div class="sr-l"><span class="sr-ico">📥</span>
          <div class="sr-tx">
            <div class="sr-name">Восстановить данные</div>
            <div class="sr-sub">Загрузить из файла .json</div>
          </div>
        </div>
        <div class="sr-val">›</div>
      </div>
      <input type="file" id="restoreFile" accept=".json" style="display:none">
    </div>
  </div>`;
}

function attachEvents(el) {
  // Лекарства
  el.querySelector("#sMeds")?.addEventListener("click", () => modal({
    title: "Приём лекарств", field: "takesMeds",
    opts: [
      { v: "нет", l: "🙅 Не принимаю" },
      { v: "антидепрессанты", l: "💙 Антидепрессанты" },
      { v: "седативные", l: "🌙 Седативные" },
      { v: "другое", l: "💊 Другое" },
      { v: "не_скажу", l: "🔒 Не скажу" },
    ]
  }));

  // Эффект
  el.querySelector("#sEffect")?.addEventListener("click", () => modal({
    title: "Как влияет препарат", field: "medEffect",
    opts: [
      { v: "лучше", l: "✨ Стало лучше" },
      { v: "примерно_так_же", l: "➡️ Примерно так же" },
      { v: "приглушённость", l: "🔇 Приглушённость" },
      { v: "побочки", l: "⚡ Побочки" },
      { v: "адаптация", l: "⏳ Адаптация" },
    ]
  }));

  // Напоминание
  el.querySelector("#sReminder")?.addEventListener("click", () => modal({
    title: "Напоминание о приёме", field: "medReminder",
    opts: [
      { v: "нет", l: "🙅 Без напоминания" },
      { v: "утро", l: "🌅 Утром (8:00)" },
      { v: "день", l: "☀️ Днём (13:00)" },
      { v: "вечер", l: "🌙 Вечером (20:00)" },
    ],
    onSave: (v) => {
      const times = { утро: "08:00", день: "13:00", вечер: "20:00" };
      if (times[v]) saveMedReminder(times[v]); else removeMedReminder();
    }
  }));

  // Базовое состояние
  el.querySelector("#sBaseline")?.addEventListener("click", baselineModal);

  // PDF
  el.querySelector("#sPdf")?.addEventListener("click", () => showPdfReportModal());

  // Язык
  el.querySelector("#sLang")?.addEventListener("click", langModal);

  // Бэкап
  el.querySelector("#sBackup")?.addEventListener("click", async () => {
    const valEl = document.getElementById("backupVal");
    const subEl = document.getElementById("backupSub");
    if (valEl) valEl.textContent = "⏳...";

    const res = await backupAndShare();

    if (res.message === "cancelled") {
      if (valEl) valEl.textContent = "Сохранить ›";
      return;
    }
    if (res.success) {
      const label = res.message === "shared" ? "✅ Отправлено" : "✅ Скачано";
      if (valEl) valEl.textContent = label;
      if (subEl) subEl.textContent = "Последний: " + fmtTime(new Date());
      setTimeout(() => { if (valEl) valEl.textContent = "Сохранить ›"; }, 3000);
    } else {
      if (valEl) valEl.textContent = "❌ Ошибка";
      setTimeout(() => { if (valEl) valEl.textContent = "Сохранить ›"; }, 3000);
    }
  });

  // Восстановление
  el.querySelector("#sRestore")?.addEventListener("click", () => el.querySelector("#restoreFile")?.click());
  el.querySelector("#restoreFile")?.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    restoreModal(file);
  });
}

// ── Модал выбора опции ────────────────────────────────────────
function modal({ title, field, opts, onSave }) {
  const profile = getProfile() || {};
  const cur = profile[field];
  const ov = document.createElement("div");
  ov.className = "mo";
  ov.innerHTML = `<div class="mp">
    <div class="mt">${title}</div>
    <div class="mops">${opts.map(o => `<div class="mop${o.v === cur ? " sel" : ""}" data-v="${o.v}">${o.l}</div>`).join("")}</div>
    <button class="mbtn" id="mSave">Сохранить</button>
    <div class="mcanc" id="mCanc">Отмена</div>
  </div>`;
  document.body.appendChild(ov);

  let sel = cur;
  ov.querySelectorAll(".mop").forEach(o => o.addEventListener("click", () => {
    ov.querySelectorAll(".mop").forEach(x => x.classList.remove("sel"));
    o.classList.add("sel"); sel = o.dataset.v;
  }));
  ov.querySelector("#mSave").addEventListener("click", () => {
    if (sel) { saveProfile({ ...profile, [field]: sel }); if (onSave) onSave(sel); }
    ov.remove(); refresh();
  });
  ov.querySelector("#mCanc").addEventListener("click", () => ov.remove());
  ov.addEventListener("click", e => { if (e.target === ov) ov.remove(); });
}

// ── Базовое состояние ─────────────────────────────────────────
function baselineModal() {
  const profile = getProfile() || {};
  const cur = profile.moodBaseline ?? 50;
  const ov = document.createElement("div");
  ov.className = "mo";
  ov.innerHTML = `<div class="mp">
    <div class="mt">Базовое состояние</div>
    <div class="ms">Точка отсчёта для анализа изменений</div>
    <div style="background:rgba(232,237,230,0.9);border-radius:16px;box-shadow:inset 3px 3px 7px #b8c4b4,inset -3px -3px 7px #fff;padding:20px;margin-bottom:20px">
      <div style="text-align:center;font-size:28px;font-weight:800;color:#555;margin-bottom:12px"><span id="bVal">${cur}%</span></div>
      <input type="range" id="bSlider" min="0" max="100" value="${cur}" style="width:100%;accent-color:#7eb8d4">
    </div>
    <button class="mbtn" id="mSave">Сохранить</button>
    <div class="mcanc" id="mCanc">Отмена</div>
  </div>`;
  document.body.appendChild(ov);
  const sl = ov.querySelector("#bSlider");
  sl.addEventListener("input", () => { ov.querySelector("#bVal").textContent = sl.value + "%"; });
  ov.querySelector("#mSave").addEventListener("click", () => {
    saveProfile({ ...profile, moodBaseline: Number(sl.value) });
    ov.remove(); refresh();
  });
  ov.querySelector("#mCanc").addEventListener("click", () => ov.remove());
  ov.addEventListener("click", e => { if (e.target === ov) ov.remove(); });
}

// ── Язык ──────────────────────────────────────────────────────
function langModal() {
  const cur = getLang();
  const ov = document.createElement("div");
  ov.className = "mo";
  ov.innerHTML = `<div class="mp">
    <div class="mt">🌍 Язык / Language</div>
    <div class="mops">${LANG_OPTIONS.map(l => `<div class="mop${l.code === cur ? " sel" : ""}" data-v="${l.code}"><span style="font-size:20px;margin-right:10px">${l.flag}</span>${l.label}</div>`).join("")}</div>
    <button class="mbtn" id="mSave">Сохранить / Save</button>
    <div class="mcanc" id="mCanc">Отмена / Cancel</div>
  </div>`;
  document.body.appendChild(ov);
  let sel = cur;
  ov.querySelectorAll(".mop").forEach(o => o.addEventListener("click", () => {
    ov.querySelectorAll(".mop").forEach(x => x.classList.remove("sel"));
    o.classList.add("sel"); sel = o.dataset.v;
  }));
  ov.querySelector("#mSave").addEventListener("click", () => {
    setLang(sel); ov.remove();
    setTimeout(() => { window.location.href = window.location.href; }, 100);
  });
  ov.querySelector("#mCanc").addEventListener("click", () => ov.remove());
  ov.addEventListener("click", e => { if (e.target === ov) ov.remove(); });
}

// ── Восстановление ────────────────────────────────────────────
function restoreModal(file) {
  const ov = document.createElement("div");
  ov.className = "mo";
  ov.innerHTML = `<div class="mp">
    <div class="mt">📥 Восстановить данные</div>
    <div class="ms" style="color:#e05555">Текущие данные будут заменены!</div>
    <div style="background:rgba(232,237,230,0.9);border-radius:14px;padding:14px;margin-bottom:20px;font-size:13px;color:#666">📄 ${file.name}</div>
    <button class="mbtn" id="mSave" style="color:#e05555">Восстановить</button>
    <div class="mcanc" id="mCanc">Отмена</div>
  </div>`;
  document.body.appendChild(ov);
  ov.querySelector("#mSave").addEventListener("click", async () => {
    const btn = ov.querySelector("#mSave");
    btn.textContent = "⏳ Восстанавливаю..."; btn.disabled = true;
    const res = await restoreFromBackup(file);
    ov.remove();
    if (res.success) {
      const msg = document.createElement("div");
      msg.style.cssText = "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#4caf87;color:#fff;padding:20px 28px;border-radius:18px;font-size:16px;font-weight:700;z-index:9999";
      msg.textContent = "✅ Данные восстановлены";
      document.body.appendChild(msg);
      setTimeout(() => { window.location.href = window.location.href; }, 1500);
    } else {
      alert("Ошибка: " + res.message);
    }
  });
  ov.querySelector("#mCanc").addEventListener("click", () => ov.remove());
  ov.addEventListener("click", e => { if (e.target === ov) ov.remove(); });
}

function refresh() {
  const el = document.querySelector('[data-screen="settings"]');
  if (el) { el.innerHTML = buildHTML(); attachEvents(el); }
}
