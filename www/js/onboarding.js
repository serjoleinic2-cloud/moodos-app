// =====================================
// Neyra Onboarding v5 — i18n + Terms + default EN
// =====================================
import { saveProfile, markOnboardingDone } from "./services/user-profile.js";
import { addReminder } from "./services/reminders-service.js";
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
        overlay.querySelector("#readTermsBtn").addEventListener("click", () => showTextModal(t("terms_read_terms"), "terms"));
        overlay.querySelector("#readPrivacyBtn").addEventListener("click", () => showTextModal(t("terms_read_privacy"), "privacy"));
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

    // ШАГ 5.5: ЗАПРОС РАЗРЕШЕНИЯ НА УВЕДОМЛЕНИЯ
    {
      id: "notif_permission",
      shouldSkip: () => !profile.takesMeds || profile.takesMeds === "нет" || profile.takesMeds === "не_скажу",
      render: () => `
        <div style="font-size:52px;margin-bottom:20px;">🔔</div>
        <div style="font-size:22px;font-weight:700;color:#3a3530;margin-bottom:10px;line-height:1.3;">${t("ob_notif_title")}</div>
        <div style="font-size:15px;color:#777;line-height:1.65;margin-bottom:20px;">${t("ob_notif_sub")}</div>
        <div style="font-size:13px;color:#bbb;">${t("ob_notif_hint")}</div>
      `,
      needsChoice: false,
      onMount() {
        try {
          const LN = window.Capacitor?.Plugins?.LocalNotifications;
          if (LN) {
            LN.requestPermissions().then(result => {
              console.log('[onboarding] notification permission:', result.display);
            }).catch(e => console.warn('[onboarding] permission request failed:', e));
          }
        } catch(e) {}
      },
      onNext: () => true
    },

    // ШАГ 6: НАСТРОЙКА НАПОМИНАНИЯ О ЛЕКАРСТВЕ
    {
      id: "reminder",
      shouldSkip: () => !profile.takesMeds || profile.takesMeds === "нет" || profile.takesMeds === "не_скажу",
      _reminders: [],
      _editingId: null,
      _editSelectedDays: [],
      render() {
        const DAYS = ['пн','вт','ср','чт','пт','сб','вс'];
        const DAYS_LABELS = [t('dow_mon'),t('dow_tue'),t('dow_wed'),t('dow_thu'),t('dow_fri'),t('dow_sat'),t('dow_sun')];

        const listHTML = this._reminders.length === 0
          ? `<div style="text-align:center;color:#bbb;padding:16px;font-size:13px;">${t('reminder_empty') || 'Нет напоминаний'}<br>${t('reminder_empty_hint') || 'Добавьте первое 👇'}</div>`
          : this._reminders.map(r => `
              <div data-ob-card="${r.id}" style="background:rgba(220,228,218,0.7);border-radius:14px;padding:12px 14px;margin-bottom:8px;display:flex;align-items:center;justify-content:space-between;box-sizing:border-box;">
                <div style="flex:1;min-width:0;">
                  <div style="display:flex;align-items:center;gap:6px;">
                    <span style="font-size:20px;font-weight:700;color:#3a3530;">${r.time}</span>
                    <span style="font-size:13px;color:#805ad5;font-weight:700;word-break:break-word;">${r.medName || t('reminder_medicine_default')}</span>
                  </div>
                  <div style="display:flex;gap:3px;margin-top:6px;flex-wrap:wrap;">
                    ${DAYS.map((d,i) => `<div style="width:22px;height:22px;border-radius:50%;${r.days.includes(d) ? 'background:linear-gradient(145deg,#7eb8d4,#6aa5c0);color:#fff;' : 'background:rgba(200,200,200,0.3);color:#ccc;'}display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:600;">${DAYS_LABELS[i]}</div>`).join('')}
                  </div>
                </div>
                <div style="display:flex;gap:6px;align-items:center;flex-shrink:0;margin-left:8px;">
                  <div data-ob-edit="${r.id}" style="width:28px;height:28px;border-radius:50%;background:rgba(159,122,234,0.15);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:13px;">✏️</div>
                  <div data-ob-delete="${r.id}" style="width:28px;height:28px;border-radius:50%;background:rgba(224,85,85,0.15);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:13px;color:#e05555;">✕</div>
                </div>
              </div>
            `).join('');

        const addFormHTML = `
          <div id="obAddForm" style="background:rgba(220,228,218,0.7);border-radius:14px;padding:14px;margin-bottom:12px;display:none;">
            <input id="obMedName" type="text" placeholder="${t('reminder_med_placeholder')}" style="width:100%;padding:11px 13px;border:none;border-radius:11px;background:rgba(255,255,255,0.8);box-shadow:inset 3px 3px 6px #b8c4b4,inset -3px -3px 6px #fff;font-size:14px;color:#333;box-sizing:border-box;margin-bottom:10px;">
            <input id="obMedTime" type="time" value="08:00" style="width:100%;padding:11px 13px;border:none;border-radius:11px;background:rgba(255,255,255,0.8);box-shadow:inset 3px 3px 6px #b8c4b4,inset -3px -3px 6px #fff;font-size:18px;font-weight:700;color:#3d3d3d;box-sizing:border-box;margin-bottom:10px;">
            <div style="font-size:11px;color:#aaa;margin-bottom:6px;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;">${t('reminder_days')}</div>
            <div id="obAddDaysRow" style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:12px;">
              ${DAYS.map((d,i) => `<div class="ob-add-day" data-day="${d}" style="width:34px;height:34px;border-radius:50%;background:rgba(232,237,230,0.9);box-shadow:3px 3px 7px #b8c4b4,-3px -3px 7px #fff;color:#888;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;cursor:pointer;-webkit-tap-highlight-color:transparent;">${DAYS_LABELS[i]}</div>`).join('')}
            </div>
            <button id="obSaveNewBtn" style="width:100%;padding:12px;border:none;border-radius:12px;background:linear-gradient(145deg,#4caf87,#45a070);color:#fff;font-size:14px;font-weight:700;cursor:pointer;">${t('save')}</button>
          </div>
        `;

        const editFormHTML = `<div id="obEditForm" style="display:none;"></div>`;

        return `
          <div style="font-size:44px;margin-bottom:12px;">⏰</div>
          <div style="font-size:20px;font-weight:700;color:#3a3530;margin-bottom:6px;line-height:1.3;">${t("ob_reminder_title")}</div>
          <div style="font-size:13px;color:#aaa;margin-bottom:16px;">${t("ob_reminder_sub")}</div>
          <div style="width:100%;background:rgba(232,237,230,0.9);border-radius:16px;padding:14px;box-shadow:4px 4px 9px #b8c4b4,-4px -4px 9px #fff;box-sizing:border-box;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
              <div style="font-size:13px;font-weight:700;color:#888;">${t('settings_med_reminders_label')}</div>
              <button id="obToggleAddForm" style="padding:7px 13px;border:none;border-radius:10px;background:linear-gradient(145deg,#9f7aea,#805ad5);color:#fff;font-size:12px;font-weight:700;cursor:pointer;">${t('reminder_add_btn') || '+ Добавить'}</button>
            </div>
            ${addFormHTML}
            ${editFormHTML}
            <div id="obReminderList">${listHTML}</div>
            <div style="font-size:11px;color:#bbb;margin-top:10px;text-align:center;">${t('ob_reminder_skip_hint')}</div>
          </div>
        `;
      },
      needsChoice: false,
      _selectedDays: [],
      onMount() {
        this._selectedDays = [];

        const DAYS = ['пн','вт','ср','чт','пт','сб','вс'];
        const DAYS_LABELS = [t('dow_mon'),t('dow_tue'),t('dow_wed'),t('dow_thu'),t('dow_fri'),t('dow_sat'),t('dow_sun')];

        const step = this;

        overlay.querySelector('#obToggleAddForm').addEventListener('click', () => {
          const form = overlay.querySelector('#obAddForm');
          form.style.display = form.style.display === 'none' ? 'block' : 'none';
        });

        overlay.querySelectorAll('.ob-add-day').forEach(btn => {
          btn.addEventListener('click', () => {
            const day = btn.dataset.day;
            if (step._selectedDays.includes(day)) {
              step._selectedDays = step._selectedDays.filter(d => d !== day);
              btn.style.background = 'rgba(232,237,230,0.9)';
              btn.style.color = '#888';
              btn.style.boxShadow = '3px 3px 7px #b8c4b4,-3px -3px 7px #fff';
            } else {
              step._selectedDays.push(day);
              btn.style.background = 'linear-gradient(145deg,#7eb8d4,#6aa5c0)';
              btn.style.color = '#fff';
              btn.style.boxShadow = 'inset 2px 2px 5px rgba(0,0,0,0.1)';
            }
          });
        });

        overlay.querySelector('#obSaveNewBtn').addEventListener('click', () => {
          const medName = overlay.querySelector('#obMedName').value.trim();
          const time = overlay.querySelector('#obMedTime').value || '08:00';
          if (!medName) {
            overlay.querySelector('#obMedName').style.boxShadow = 'inset 3px 3px 6px #e8a0a0,inset -3px -3px 6px #fff';
            return;
          }
          if (step._selectedDays.length === 0) return;

          const id = Date.now();
          step._reminders.push({ id, time, medName, days: [...step._selectedDays], active: true });

          overlay.querySelector('#obMedName').value = '';
          overlay.querySelector('#obMedTime').value = '08:00';
          step._selectedDays = [];
          overlay.querySelector('#obAddForm').style.display = 'none';

          rerenderList();
        });

        overlay.querySelector('#obReminderList').addEventListener('click', e => {
          const editEl = e.target.closest('[data-ob-edit]');
          const deleteEl = e.target.closest('[data-ob-delete]');

          if (deleteEl) {
            const id = Number(deleteEl.dataset.obDelete);
            step._reminders = step._reminders.filter(r => r.id !== id);
            rerenderList();
            return;
          }

          if (editEl) {
            const id = Number(editEl.dataset.obEdit);
            const reminder = step._reminders.find(r => r.id === id);
            if (!reminder) return;
            step._editingId = id;
            step._editSelectedDays = [...reminder.days];

            // Скрыть карточку редактируемого элемента
            const card = overlay.querySelector(`[data-ob-card="${id}"]`);
            if (card) card.style.display = 'none';

            const editForm = overlay.querySelector('#obEditForm');
            editForm.style.display = 'block';
            editForm.innerHTML = `
              <div style="background:rgba(220,228,218,0.7);border-radius:14px;padding:14px;margin-bottom:12px;">
                <div style="font-size:13px;font-weight:700;color:#3d3d3d;margin-bottom:10px;">${t('reminder_edit_title')}</div>
                <input id="obEditMedName" type="text" value="${reminder.medName || ''}" placeholder="${t('reminder_med_placeholder')}" style="width:100%;padding:11px 13px;border:none;border-radius:11px;background:rgba(255,255,255,0.8);box-shadow:inset 3px 3px 6px #b8c4b4,inset -3px -3px 6px #fff;font-size:14px;color:#333;box-sizing:border-box;margin-bottom:10px;">
                <input id="obEditMedTime" type="time" value="${reminder.time}" style="width:100%;padding:11px 13px;border:none;border-radius:11px;background:rgba(255,255,255,0.8);box-shadow:inset 3px 3px 6px #b8c4b4,inset -3px -3px 6px #fff;font-size:18px;font-weight:700;color:#3d3d3d;box-sizing:border-box;margin-bottom:10px;">
                <div style="font-size:11px;color:#aaa;margin-bottom:6px;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;">${t('reminder_days')}</div>
                <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:12px;">
                  ${DAYS.map((d,i) => {
                    const sel = reminder.days.includes(d);
                    return `<div class="ob-edit-day" data-day="${d}" style="width:34px;height:34px;border-radius:50%;${sel ? 'background:linear-gradient(145deg,#7eb8d4,#6aa5c0);color:#fff;box-shadow:inset 2px 2px 5px rgba(0,0,0,0.1);' : 'background:rgba(232,237,230,0.9);color:#888;box-shadow:3px 3px 7px #b8c4b4,-3px -3px 7px #fff;'}display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;cursor:pointer;-webkit-tap-highlight-color:transparent;">${DAYS_LABELS[i]}</div>`;
                  }).join('')}
                </div>
                <button id="obUpdateBtn" style="width:100%;padding:12px;border:none;border-radius:12px;background:linear-gradient(145deg,#9f7aea,#805ad5);color:#fff;font-size:14px;font-weight:700;cursor:pointer;margin-bottom:6px;">${t('save')}</button>
                <button id="obCancelEditBtn" style="width:100%;padding:11px;border:none;border-radius:12px;background:rgba(200,200,200,0.4);color:#666;font-size:13px;font-weight:600;cursor:pointer;">${t('cancel')}</button>
              </div>
            `;

            editForm.querySelectorAll('.ob-edit-day').forEach(btn => {
              btn.addEventListener('click', () => {
                const day = btn.dataset.day;
                if (step._editSelectedDays.includes(day)) {
                  step._editSelectedDays = step._editSelectedDays.filter(d => d !== day);
                  btn.style.background = 'rgba(232,237,230,0.9)';
                  btn.style.color = '#888';
                  btn.style.boxShadow = '3px 3px 7px #b8c4b4,-3px -3px 7px #fff';
                } else {
                  step._editSelectedDays.push(day);
                  btn.style.background = 'linear-gradient(145deg,#7eb8d4,#6aa5c0)';
                  btn.style.color = '#fff';
                  btn.style.boxShadow = 'inset 2px 2px 5px rgba(0,0,0,0.1)';
                }
              });
            });

            editForm.querySelector('#obUpdateBtn').addEventListener('click', () => {
              const medName = overlay.querySelector('#obEditMedName').value.trim();
              const time = overlay.querySelector('#obEditMedTime').value || '08:00';
              if (!medName) {
                overlay.querySelector('#obEditMedName').style.boxShadow = 'inset 3px 3px 6px #e8a0a0,inset -3px -3px 6px #fff';
                return;
              }
              if (step._editSelectedDays.length === 0) return;
              const r = step._reminders.find(r => r.id === step._editingId);
              if (r) { r.medName = medName; r.time = time; r.days = [...step._editSelectedDays]; }
              step._editingId = null;
              editForm.style.display = 'none';
              editForm.innerHTML = '';
              rerenderList();
            });

            editForm.querySelector('#obCancelEditBtn').addEventListener('click', () => {
              step._editingId = null;
              editForm.style.display = 'none';
              editForm.innerHTML = '';
              rerenderList();
            });
          }
        });

        function rerenderList() {
          const Days = ['пн','вт','ср','чт','пт','сб','вс'];
          const DaysLabels = [t('dow_mon'),t('dow_tue'),t('dow_wed'),t('dow_thu'),t('dow_fri'),t('dow_sat'),t('dow_sun')];
          const listEl = overlay.querySelector('#obReminderList');
          if (!listEl) return;
          listEl.innerHTML = step._reminders.length === 0
            ? `<div style="text-align:center;color:#bbb;padding:16px;font-size:13px;">${t('reminder_empty') || 'Нет напоминаний'}<br>${t('reminder_empty_hint') || 'Добавьте первое 👇'}</div>`
            : step._reminders.map(r => `
                <div data-ob-card="${r.id}" style="background:rgba(220,228,218,0.7);border-radius:14px;padding:12px 14px;margin-bottom:8px;display:flex;align-items:center;justify-content:space-between;box-sizing:border-box;">
                  <div style="flex:1;min-width:0;">
                    <div style="display:flex;align-items:center;gap:6px;">
                      <span style="font-size:20px;font-weight:700;color:#3a3530;">${r.time}</span>
                      <span style="font-size:13px;color:#805ad5;font-weight:700;word-break:break-word;">${r.medName || t('reminder_medicine_default')}</span>
                    </div>
                    <div style="display:flex;gap:3px;margin-top:6px;flex-wrap:wrap;">
                      ${Days.map((d,i) => `<div style="width:22px;height:22px;border-radius:50%;${r.days.includes(d) ? 'background:linear-gradient(145deg,#7eb8d4,#6aa5c0);color:#fff;' : 'background:rgba(200,200,200,0.3);color:#ccc;'}display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:600;">${DaysLabels[i]}</div>`).join('')}
                    </div>
                  </div>
                  <div style="display:flex;gap:6px;align-items:center;flex-shrink:0;margin-left:8px;">
                    <div data-ob-edit="${r.id}" style="width:28px;height:28px;border-radius:50%;background:rgba(159,122,234,0.15);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:13px;">✏️</div>
                    <div data-ob-delete="${r.id}" style="width:28px;height:28px;border-radius:50%;background:rgba(224,85,85,0.15);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:13px;color:#e05555;">✕</div>
                  </div>
                </div>
              `).join('');
        }
      },
      onNext() {
        if (this._reminders.length > 0) {
          profile.medReminder = this._reminders[0].time;
          this._reminders.forEach(r => {
            addReminder({ time: r.time, medName: r.medName, days: r.days });
          });
        } else {
          profile.medReminder = null;
        }
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

    if (step.onMount) setTimeout(() => step.onMount(), 30);
  }

  function finish() {
    saveProfile(profile);
    markOnboardingDone();
    overlay.style.transition = "opacity 0.35s ease";
    overlay.style.opacity = "0";
    setTimeout(() => {
      overlay.remove();
      window.location.reload();
    }, 350);
  }

  render();
}

// Показ Terms/Privacy из HTML файлов
async function showTextModal(title, type) {
  const file = type === 'terms' ? 'docs/terms.html' : 'docs/privacy.html';
  const m = document.createElement("div");
  m.style.cssText = "position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,0.5);display:flex;align-items:flex-end;";
  
  try {
    const res = await fetch(file);
    const html = await res.text();
    let content = html.replace(/<body[^>]*>|<\/body>|<html[^>]*>|<\/html>|<head>[\s\S]*<\/head>/gi, "");
    
    m.innerHTML = `
      <div style="width:100%;max-height:80vh;overflow-y:auto;background:linear-gradient(160deg,#d4ede8,#e8e0d5);border-radius:24px 24px 0 0;padding:24px 20px 48px;box-sizing:border-box;animation:slideUp 0.3s ease;">
        <style>@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}</style>
        <div style="font-size:18px;font-weight:700;color:#3a3530;margin-bottom:16px;">${title}</div>
        <div style="font-size:14px;color:#666;line-height:1.7;">${content}</div>
        <button onclick="this.closest('div[style*=fixed]').remove()" style="width:100%;padding:14px;border:none;border-radius:14px;margin-top:24px;background:rgba(232,237,230,0.9);box-shadow:5px 5px 10px #b8c4b4,-5px -5px 10px #ffffff;font-size:15px;font-weight:700;color:#7eb8d4;cursor:pointer;">
          ✕
        </button>
      </div>`;
  } catch (e) {
    m.innerHTML = `
      <div style="width:100%;max-height:80vh;overflow-y:auto;background:linear-gradient(160deg,#d4ede8,#e8e0d5);border-radius:24px 24px 0 0;padding:24px 20px 48px;box-sizing:border-box;animation:slideUp 0.3s ease;">
        <style>@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}</style>
        <div style="font-size:18px;font-weight:700;color:#3a3530;margin-bottom:16px;">${title}</div>
        <div style="font-size:14px;color:#666;">Loading...</div>
        <button onclick="this.closest('div[style*=fixed]').remove()" style="width:100%;padding:14px;border:none;border-radius:14px;margin-top:24px;background:rgba(232,237,230,0.9);box-shadow:5px 5px 10px #b8c4b4,-5px -5px 10px #ffffff;font-size:15px;font-weight:700;color:#7eb8d4;cursor:pointer;">
          ✕
        </button>
      </div>`;
  }
  
  document.body.appendChild(m);
  m.addEventListener("click", e => { if (e.target === m) m.remove(); });
}
