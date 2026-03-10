// =====================================
// MoodOS Onboarding v5 — i18n + Terms + default EN
// =====================================
import { saveProfile, markOnboardingDone, saveMedReminder } from "./services/user-profile.js";
import { t, getLang, setLang, LANG_OPTIONS } from "./i18n.js";

export function initOnboarding(onComplete) {

  // По умолчанию — английский
  if (!localStorage.getItem("app_language")) {
    setLang("en");
  }

  const overlay = document.createElement("div");
  overlay.id = "onboardingOverlay";
  overlay.style.cssText = `
    position:fixed; inset:0;
    background:linear-gradient(160deg,#d4ede8 0%,#e8e0d5 100%);
    z-index:9999; display:flex; flex-direction:column;
    align-items:center; justify-content:center; text-align:center;
    padding:28px 24px; box-sizing:border-box;
    font-family:-apple-system,'SF Pro Display',sans-serif;
    overflow-y:auto;
  `;
  document.body.appendChild(overlay);

  const profile = {
    baseFeeling:  null,
    takesMeds:    null,
    medEffect:    null,
    medReminder:  null,
    moodBaseline: 50,
    createdAt:    Date.now()
  };

  const allSteps = [

    // ШАГ 0: ВЫБОР ЯЗЫКА
    {
      id: "language",
      render: () => `
        <div style="font-size:52px;margin-bottom:20px;">🌍</div>
        <div style="font-size:22px;font-weight:700;color:#3a3530;margin-bottom:10px;line-height:1.3;">${t("choose_language")}</div>
        <div style="font-size:14px;color:#aaa;margin-bottom:24px;">${t("choose_language_sub")}</div>
        <div id="opts" style="width:100%;display:flex;flex-direction:column;gap:9px;">
          ${LANG_OPTIONS.map(l => `
            <div class="ob-opt ${getLang()===l.code?'sel':''}" data-v="${l.code}" style="display:flex;align-items:center;">
              <span style="font-size:20px;margin-right:10px;">${l.flag}</span>${l.label}
            </div>
          `).join('')}
        </div>
      `,
      needsChoice: true,
      onNext: () => {
        const s = overlay.querySelector("#opts .ob-opt.sel");
        if (!s) return false;
        setLang(s.dataset.v);
        return true;
      }
    },

    // ШАГ 1: TERMS
    {
      id: "terms",
      render: () => `
        <div style="font-size:52px;margin-bottom:20px;">📋</div>
        <div style="font-size:22px;font-weight:700;color:#3a3530;margin-bottom:10px;line-height:1.3;">${t("terms_title")}</div>
        <div style="font-size:14px;color:#aaa;margin-bottom:20px;">${t("terms_sub")}</div>
        <div style="display:flex;flex-direction:column;gap:8px;width:100%;margin-bottom:20px;">
          <div id="readTermsBtn" style="padding:13px 16px;border-radius:14px;background:rgba(232,237,230,0.9);box-shadow:4px 4px 9px #b8c4b4,-4px -4px 9px #ffffff;font-size:14px;color:#7eb8d4;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:space-between;">
            <span>📄 ${t("terms_read_terms")}</span><span style="color:#aaa;">›</span>
          </div>
          <div id="readPrivacyBtn" style="padding:13px 16px;border-radius:14px;background:rgba(232,237,230,0.9);box-shadow:4px 4px 9px #b8c4b4,-4px -4px 9px #ffffff;font-size:14px;color:#7eb8d4;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:space-between;">
            <span>🔒 ${t("terms_read_privacy")}</span><span style="color:#aaa;">›</span>
          </div>
        </div>
        <div id="termsCheckRow" style="display:flex;align-items:flex-start;gap:12px;padding:14px 16px;border-radius:14px;background:rgba(232,237,230,0.9);box-shadow:4px 4px 9px #b8c4b4,-4px -4px 9px #ffffff;cursor:pointer;text-align:left;width:100%;box-sizing:border-box;">
          <div id="termsCheckbox" style="width:22px;height:22px;min-width:22px;border-radius:7px;background:#e0e8de;box-shadow:inset 3px 3px 6px #b8c4b4,inset -3px -3px 6px #ffffff;display:flex;align-items:center;justify-content:center;font-size:14px;margin-top:1px;transition:all 0.15s;"></div>
          <div style="font-size:14px;color:#555;line-height:1.5;">${t("terms_agree")}<br><span style="color:#aaa;">${t("terms_privacy")}</span></div>
        </div>
      `,
      needsChoice: false,
      onMount: () => {
        let checked = false;
        const checkbox = overlay.querySelector("#termsCheckbox");
        const row      = overlay.querySelector("#termsCheckRow");
        row.addEventListener("click", () => {
          checked = !checked;
          checkbox.textContent  = checked ? "✓" : "";
          checkbox.style.color  = "#4caf87";
          checkbox.style.fontWeight = "700";
          checkbox.style.background = checked ? "#d4ede8" : "#e0e8de";
          row._checked = checked;
        });
        overlay.querySelector("#readTermsBtn").addEventListener("click", () => showTextModal(t("terms_read_terms"), t("terms_text")));
        overlay.querySelector("#readPrivacyBtn").addEventListener("click", () => showTextModal(t("terms_read_privacy"), t("privacy_text")));
      },
      onNext: () => {
        const row = overlay.querySelector("#termsCheckRow");
        if (!row?._checked) {
          const cb = overlay.querySelector("#termsCheckbox");
          if (cb) { cb.style.transform="scale(1.3)"; setTimeout(()=>cb.style.transform="",300); }
          return false;
        }
        return true;
      }
    },

    // ШАГ 2: ПРИВЕТСТВИЕ
    {
      id: "welcome",
      render: () => `
        <div style="font-size:52px;margin-bottom:20px;">🌿</div>
        <div style="font-size:22px;font-weight:700;color:#3a3530;margin-bottom:16px;line-height:1.3;">${t("ob_welcome_title")}</div>
        <div style="font-size:15px;color:#777;line-height:1.65;">${t("ob_welcome_text").replace(/\n/g,"<br>")}</div>
      `,
      needsChoice: false,
      onNext: () => true
    },

    // ШАГ 3: КАК СЕБЯ ЧУВСТВУЕШЬ
    {
      id: "feeling",
      render: () => `
        <div style="font-size:52px;margin-bottom:20px;">💬</div>
        <div style="font-size:22px;font-weight:700;color:#3a3530;margin-bottom:10px;line-height:1.3;">${t("ob_feeling_title").replace(/\n/g,"<br>")}</div>
        <div style="font-size:14px;color:#aaa;margin-bottom:20px;">${t("ob_feeling_sub")}</div>
        <div id="opts" style="width:100%;display:flex;flex-direction:column;gap:9px;">
          <div class="ob-opt" data-v="хорошо">${t("ob_feeling_good")}</div>
          <div class="ob-opt" data-v="трудные_дни">${t("ob_feeling_hard")}</div>
          <div class="ob-opt" data-v="непростой_период">${t("ob_feeling_hard_period")}</div>
          <div class="ob-opt" data-v="честно_не_очень">${t("ob_feeling_bad")}</div>
        </div>
      `,
      needsChoice: true,
      onNext: () => {
        const s = overlay.querySelector("#opts .ob-opt.sel");
        if (!s) return false;
        profile.baseFeeling = s.dataset.v;
        return true;
      }
    },

    // ШАГ 4: ЛЕКАРСТВА
    {
      id: "meds",
      render: () => `
        <div style="font-size:52px;margin-bottom:20px;">💊</div>
        <div style="font-size:22px;font-weight:700;color:#3a3530;margin-bottom:10px;line-height:1.3;">${t("ob_meds_title")}</div>
        <div style="font-size:14px;color:#aaa;margin-bottom:20px;line-height:1.55;">${t("ob_meds_sub").replace(/\n/g,"<br>")}</div>
        <div id="opts" style="width:100%;display:flex;flex-direction:column;gap:9px;">
          <div class="ob-opt" data-v="нет">${t("ob_meds_no")}</div>
          <div class="ob-opt" data-v="антидепрессанты">${t("ob_meds_anti")}</div>
          <div class="ob-opt" data-v="седативные">${t("ob_meds_sed")}</div>
          <div class="ob-opt" data-v="другое">${t("ob_meds_other")}</div>
          <div class="ob-opt" data-v="не_скажу">${t("ob_meds_skip")}</div>
        </div>
      `,
      needsChoice: true,
      onNext: () => {
        const s = overlay.querySelector("#opts .ob-opt.sel");
        if (!s) return false;
        profile.takesMeds = s.dataset.v;
        return true;
      }
    },

    // ШАГ 5: ЭФФЕКТ
    {
      id: "effect",
      shouldSkip: () => !profile.takesMeds || profile.takesMeds === "нет" || profile.takesMeds === "не_скажу",
      render: () => `
        <div style="font-size:52px;margin-bottom:20px;">🔍</div>
        <div style="font-size:22px;font-weight:700;color:#3a3530;margin-bottom:10px;line-height:1.3;">${t("ob_effect_title").replace(/\n/g,"<br>")}</div>
        <div style="font-size:14px;color:#aaa;margin-bottom:20px;">${t("ob_effect_sub")}</div>
        <div id="opts" style="width:100%;display:flex;flex-direction:column;gap:9px;">
          <div class="ob-opt" data-v="лучше">${t("ob_effect_better")}</div>
          <div class="ob-opt" data-v="примерно_так_же">${t("ob_effect_same")}</div>
          <div class="ob-opt" data-v="приглушённость">${t("ob_effect_numb")}</div>
          <div class="ob-opt" data-v="побочки">${t("ob_effect_side")}</div>
          <div class="ob-opt" data-v="адаптация">${t("ob_effect_adapt")}</div>
        </div>
      `,
      needsChoice: true,
      onNext: () => {
        const s = overlay.querySelector("#opts .ob-opt.sel");
        if (!s) return false;
        profile.medEffect = s.dataset.v;
        return true;
      }
    },

    // ШАГ 6: НАПОМИНАНИЕ
    {
      id: "reminder",
      shouldSkip: () => !profile.takesMeds || profile.takesMeds === "нет" || profile.takesMeds === "не_скажу",
      render: () => `
        <div style="font-size:52px;margin-bottom:20px;">⏰</div>
        <div style="font-size:22px;font-weight:700;color:#3a3530;margin-bottom:10px;line-height:1.3;">${t("ob_reminder_title")}</div>
        <div style="font-size:14px;color:#aaa;margin-bottom:20px;">${t("ob_reminder_sub")}</div>
        <div id="opts" style="width:100%;display:flex;flex-direction:column;gap:9px;">
          <div class="ob-opt" data-v="нет">${t("ob_reminder_no")}</div>
          <div class="ob-opt" data-v="утро">${t("ob_reminder_morning")}</div>
          <div class="ob-opt" data-v="день">${t("ob_reminder_day")}</div>
          <div class="ob-opt" data-v="вечер">${t("ob_reminder_evening")}</div>
        </div>
      `,
      needsChoice: true,
      onNext: () => {
        const s = overlay.querySelector("#opts .ob-opt.sel");
        if (!s) return false;
        profile.medReminder = s.dataset.v;
        const times = { утро:"08:00", день:"13:00", вечер:"20:00" };
        if (times[s.dataset.v]) saveMedReminder(times[s.dataset.v]);
        return true;
      }
    },

    // ШАГ 7: ПОЛЗУНОК
    {
      id: "baseline",
      render: () => `
        <div style="font-size:52px;margin-bottom:20px;">🎯</div>
        <div style="font-size:22px;font-weight:700;color:#3a3530;margin-bottom:10px;line-height:1.3;">${t("ob_baseline_title")}</div>
        <div style="font-size:14px;color:#aaa;margin-bottom:24px;line-height:1.55;">${t("ob_baseline_sub").replace(/\n/g,"<br>")}</div>
        <div style="background:rgba(232,237,230,0.9);border-radius:20px;box-shadow:6px 6px 14px #b8c4b4,-6px -6px 14px #ffffff;padding:20px 24px;width:100%;box-sizing:border-box;">
          <div style="display:flex;justify-content:space-between;margin-bottom:12px;">
            <span style="font-size:13px;color:#aaa;">${t("ob_baseline_bad")}</span>
            <span id="sliderVal" style="font-size:22px;font-weight:800;color:#555;">50%</span>
            <span style="font-size:13px;color:#aaa;">${t("ob_baseline_good")}</span>
          </div>
          <input type="range" id="baseSlider" min="0" max="100" value="50" style="width:100%;accent-color:#7eb8d4;">
        </div>
        <div style="font-size:13px;color:#bbb;margin-top:14px;">${t("ob_baseline_hint")}</div>
      `,
      needsChoice: false,
      onMount: () => {
        const sl = document.getElementById("baseSlider");
        const vl = document.getElementById("sliderVal");
        if (sl && vl) sl.oninput = () => { vl.textContent = sl.value + "%"; };
      },
      onNext: () => {
        const sl = document.getElementById("baseSlider");
        profile.moodBaseline = sl ? Number(sl.value) : 50;
        return true;
      }
    }
  ];

  let pos = 0;

  function getVisible() {
    return allSteps
      .map((s, i) => ({ step: s, idx: i }))
      .filter(({ step }) => !step.shouldSkip || !step.shouldSkip());
  }

  function render() {
    const visible = getVisible();
    const total   = visible.length;
    if (pos < 0) pos = 0;
    if (pos >= total) pos = total - 1;

    const { step } = visible[pos];
    const isFirst  = pos === 0;
    const isLast   = pos === total - 1;

    overlay.innerHTML = `
      <style>
        .ob-progress { display:flex; gap:7px; margin-bottom:24px; }
        .ob-dot { width:32px; height:5px; border-radius:4px; background:#d0d5de; transition:background 0.3s; }
        .ob-dot.done   { background:#4caf87; }
        .ob-dot.active { background:#7eb8d4; }
        .ob-step-lbl   { font-size:13px; color:#999; font-weight:600; margin-bottom:18px; letter-spacing:0.4px; }
        .ob-content    { width:100%; }
        .ob-opt {
          padding:14px 18px; border-radius:15px; text-align:left;
          background:rgba(232,237,230,0.9);
          box-shadow:5px 5px 10px #b8c4b4,-5px -5px 10px #ffffff;
          font-size:15px; color:#555; cursor:pointer;
          transition:box-shadow 0.15s,color 0.15s;
          -webkit-tap-highlight-color:transparent;
        }
        .ob-opt.sel {
          box-shadow:inset 4px 4px 8px #b8c4b4,inset -4px -4px 8px #ffffff;
          color:#7eb8d4; font-weight:600;
        }
        .ob-nav { display:flex; gap:12px; margin-top:24px; width:100%; }
        .ob-back { flex:1; padding:14px; border:none; border-radius:15px; background:rgba(232,237,230,0.9); box-shadow:5px 5px 10px #b8c4b4,-5px -5px 10px #ffffff; font-size:15px; color:#aaa; cursor:pointer; -webkit-tap-highlight-color:transparent; }
        .ob-next { flex:2; padding:14px; border:none; border-radius:15px; background:rgba(232,237,230,0.9); box-shadow:5px 5px 10px #b8c4b4,-5px -5px 10px #ffffff; font-size:15px; font-weight:700; color:#7eb8d4; cursor:pointer; -webkit-tap-highlight-color:transparent; }
        .ob-next:active { box-shadow:inset 4px 4px 8px #b8c4b4,inset -4px -4px 8px #ffffff; }
        .ob-next.shake  { animation:obShake 0.35s ease; }
        @keyframes obShake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-6px)} 75%{transform:translateX(6px)} }
      </style>

      <div class="ob-progress">
        ${Array.from({length:total},(_,i)=>`<div class="ob-dot ${i<pos?'done':i===pos?'active':''}"></div>`).join('')}
      </div>

      <div class="ob-step-lbl">${t("ob_step")} ${pos+1} ${t("ob_of")} ${total}</div>

      <div class="ob-content">${step.render()}</div>

      <div class="ob-nav">
        ${!isFirst ? `<button class="ob-back" id="obBack">${t("ob_back")}</button>` : `<div style="flex:1"></div>`}
        <button class="ob-next" id="obNext">${isLast ? t("ob_done") : t("ob_next")}</button>
      </div>
    `;

    // Опции
    overlay.querySelectorAll(".ob-opt").forEach(o => {
      o.onclick = () => {
        overlay.querySelectorAll(".ob-opt").forEach(x => x.classList.remove("sel"));
        o.classList.add("sel");
        // При выборе языка — сразу перерендерить на новом языке
        if (step.id === "language") {
          setLang(o.dataset.v);
          render();
        }
      };
    });

    document.getElementById("obBack")?.addEventListener("click", () => { pos--; render(); });

    document.getElementById("obNext").addEventListener("click", () => {
      const ok = step.onNext ? step.onNext() : true;
      if (!ok) {
        const btn = document.getElementById("obNext");
        if (btn) { btn.classList.remove("shake"); void btn.offsetWidth; btn.classList.add("shake"); }
        return;
      }
      if (isLast) { finish(); return; }
      pos++;
      const newVisible = getVisible();
      while (pos < newVisible.length && newVisible[pos].step.shouldSkip && newVisible[pos].step.shouldSkip()) {
        pos++;
      }
      if (pos >= newVisible.length) { finish(); return; }
      render();
    });

    if (step.onMount) setTimeout(step.onMount, 30);
  }

  function finish() {
    saveProfile(profile);
    markOnboardingDone();
    overlay.style.transition = "opacity 0.35s ease";
    overlay.style.opacity = "0";
    // НЕТ перезагрузки — язык уже в localStorage, onComplete() запустит приложение
    setTimeout(() => {
      overlay.remove();
      if (onComplete) onComplete();
    }, 350);
  }

  render();
}

// Модалка с текстом Terms/Privacy
function showTextModal(title, text) {
  const m = document.createElement("div");
  m.style.cssText = "position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,0.5);display:flex;align-items:flex-end;";
  m.innerHTML = `
    <div style="width:100%;max-height:80vh;overflow-y:auto;background:linear-gradient(160deg,#d4ede8,#e8e0d5);border-radius:24px 24px 0 0;padding:24px 20px 48px;box-sizing:border-box;animation:slideUp 0.3s ease;">
      <style>@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}</style>
      <div style="font-size:18px;font-weight:700;color:#3a3530;margin-bottom:16px;">${title}</div>
      <div style="font-size:14px;color:#666;line-height:1.7;white-space:pre-line;">${text}</div>
      <button onclick="this.closest('div[style*=fixed]').remove()" style="width:100%;padding:14px;border:none;border-radius:14px;margin-top:24px;background:rgba(232,237,230,0.9);box-shadow:5px 5px 10px #b8c4b4,-5px -5px 10px #ffffff;font-size:15px;font-weight:700;color:#7eb8d4;cursor:pointer;">
        ✕
      </button>
    </div>`;
  document.body.appendChild(m);
  m.addEventListener("click", e => { if (e.target === m) m.remove(); });
}
