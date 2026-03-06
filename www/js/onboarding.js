// =====================================
// MoodOS Onboarding
// Первый запуск — до 6 шагов
// =====================================
import {
  saveProfile,
  markOnboardingDone,
  saveMedReminder
} from "./services/user-profile.js";

export function initOnboarding(onComplete) {

  const overlay = document.createElement("div");
  overlay.id = "onboardingOverlay";
  overlay.style.cssText = `
    position:fixed; inset:0; background:#e0e5ec; z-index:9999;
    display:flex; flex-direction:column; align-items:center;
    justify-content:center; padding:24px; box-sizing:border-box;
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

  // ---- ВСЕ ШАГИ ----
  const allSteps = [

    // ШАГ 1 — Приветствие
    {
      id: "welcome",
      skip: () => false,
      render: () => `
        <div class="ob-icon">🌿</div>
        <div class="ob-title">Привет, я MoodOS</div>
        <div class="ob-text">
          Я не буду давать советы которые ты не просил.<br><br>
          Просто буду рядом — помогу замечать что происходит
          и находить то, что реально помогает именно тебе.
        </div>
      `,
      onNext: () => true
    },

    // ШАГ 2 — Базовое состояние
    {
      id: "feeling",
      skip: () => false,
      render: () => `
        <div class="ob-icon">💬</div>
        <div class="ob-title">Как ты себя чувствуешь<br>в последнее время?</div>
        <div class="ob-text" style="margin-bottom:20px;">
          Это поможет мне лучше понимать твои оценки.
        </div>
        <div class="ob-options" id="obOptions_feeling">
          <div class="ob-option" data-value="хорошо">😊 Хорошо — просто хочу следить за собой</div>
          <div class="ob-option" data-value="трудные_дни">🌤 Бывают трудные дни</div>
          <div class="ob-option" data-value="непростой_период">🌧 Сейчас непростой период</div>
          <div class="ob-option" data-value="честно_не_очень">💙 Честно — не очень</div>
        </div>
      `,
      onNext: () => {
        const sel = overlay.querySelector("#obOptions_feeling .ob-option.selected");
        if (!sel) { shakeBtn(); return false; }
        profile.baseFeeling = sel.dataset.value;
        return true;
      }
    },

    // ШАГ 3 — Медикаменты
    {
      id: "meds",
      skip: () => false,
      render: () => `
        <div class="ob-icon">💊</div>
        <div class="ob-title">Кое-что важное</div>
        <div class="ob-text" style="margin-bottom:20px;">
          Некоторые лекарства влияют на то как мы ощущаем мир —
          и это абсолютно нормально. Мне важно это учитывать
          чтобы правильно читать твои данные.<br><br>
          Ты принимаешь что-то регулярно?
        </div>
        <div class="ob-options" id="obOptions_meds">
          <div class="ob-option" data-value="нет">🙅 Нет</div>
          <div class="ob-option" data-value="антидепрессанты">💙 Антидепрессанты</div>
          <div class="ob-option" data-value="седативные">🌙 Седативные / успокоительные</div>
          <div class="ob-option" data-value="другое">💊 Другое</div>
          <div class="ob-option" data-value="не_скажу">🔒 Предпочитаю не говорить</div>
        </div>
      `,
      onNext: () => {
        const sel = overlay.querySelector("#obOptions_meds .ob-option.selected");
        if (!sel) { shakeBtn(); return false; }
        profile.takesMeds = sel.dataset.value;
        return true;
      }
    },

    // ШАГ 4 — Как влияет (только если принимает)
    {
      id: "effect",
      skip: () => profile.takesMeds === "нет" || profile.takesMeds === "не_скажу" || !profile.takesMeds,
      render: () => `
        <div class="ob-icon">🔍</div>
        <div class="ob-title">Как ты себя чувствуешь<br>во время приёма?</div>
        <div class="ob-text" style="margin-bottom:20px;">
          Это поможет мне правильно интерпретировать твои оценки.
        </div>
        <div class="ob-options" id="obOptions_effect">
          <div class="ob-option" data-value="лучше">✨ Стало лучше</div>
          <div class="ob-option" data-value="примерно_так_же">➡️ Примерно так же</div>
          <div class="ob-option" data-value="приглушённость">🔇 Чувствую себя приглушённым</div>
          <div class="ob-option" data-value="побочки">⚡ Есть побочки — терплю</div>
          <div class="ob-option" data-value="адаптация">⏳ Ещё подбираем дозировку</div>
        </div>
      `,
      onNext: () => {
        const sel = overlay.querySelector("#obOptions_effect .ob-option.selected");
        if (!sel) { shakeBtn(); return false; }
        profile.medEffect = sel.dataset.value;
        return true;
      }
    },

    // ШАГ 5 — Напоминалка (только если принимает)
    {
      id: "reminder",
      skip: () => profile.takesMeds === "нет" || profile.takesMeds === "не_скажу" || !profile.takesMeds,
      render: () => `
        <div class="ob-icon">⏰</div>
        <div class="ob-title">Напомнить о приёме?</div>
        <div class="ob-text" style="margin-bottom:20px;">
          Я могу мягко напоминать — без лишнего шума.
        </div>
        <div class="ob-options" id="obOptions_reminder">
          <div class="ob-option" data-value="нет">🙅 Нет, сам помню</div>
          <div class="ob-option" data-value="утро">🌅 Утром (8:00)</div>
          <div class="ob-option" data-value="день">☀️ Днём (13:00)</div>
          <div class="ob-option" data-value="вечер">🌙 Вечером (20:00)</div>
        </div>
      `,
      onNext: () => {
        const sel = overlay.querySelector("#obOptions_reminder .ob-option.selected");
        if (!sel) { shakeBtn(); return false; }
        profile.medReminder = sel.dataset.value;
        const times = { утро: "08:00", день: "13:00", вечер: "20:00" };
        if (times[sel.dataset.value]) saveMedReminder(times[sel.dataset.value]);
        return true;
      }
    },

    // ШАГ 6 — Калибровка
    {
      id: "baseline",
      skip: () => false,
      render: () => `
        <div class="ob-icon">🎯</div>
        <div class="ob-title">Последний шаг</div>
        <div class="ob-text" style="margin-bottom:24px;">
          Передвинь ползунок туда, где ты сейчас.<br>
          Это моя точка отсчёта.
        </div>
        <div style="background:#e0e5ec;border-radius:20px;box-shadow:6px 6px 14px #b8bec7,-6px -6px 14px #ffffff;padding:20px 24px;width:100%;box-sizing:border-box;">
          <div style="display:flex;justify-content:space-between;margin-bottom:12px;">
            <span style="font-size:13px;color:#aaa;">Плохо</span>
            <span id="obSliderVal" style="font-size:20px;font-weight:800;color:#555;">50%</span>
            <span style="font-size:13px;color:#aaa;">Отлично</span>
          </div>
          <input type="range" id="obSlider" min="0" max="100" value="50" style="width:100%;accent-color:#7eb8d4;">
        </div>
        <div style="font-size:13px;color:#aaa;margin-top:16px;text-align:center;line-height:1.6;">
          Если сейчас в целом нормально — оставь как есть
        </div>
      `,
      onMount: () => {
        const s = document.getElementById("obSlider");
        const v = document.getElementById("obSliderVal");
        if (s) s.addEventListener("input", () => { v.textContent = s.value + "%"; });
      },
      onNext: () => {
        const s = document.getElementById("obSlider");
        profile.moodBaseline = s ? Number(s.value) : 50;
        return true;
      }
    }
  ];

  // ---- НАВИГАЦИЯ ----
  // visibleSteps пересчитывается каждый раз свежо
  function getVisible() {
    return allSteps.filter(s => !s.skip());
  }

  let stepIndex = 0; // индекс в visible[]

  function render() {
    const visible = getVisible();
    const total   = visible.length;

    // Защита от выхода за границы
    if (stepIndex < 0) stepIndex = 0;
    if (stepIndex >= total) stepIndex = total - 1;

    const step    = visible[stepIndex];
    const isFirst = stepIndex === 0;
    const isLast  = stepIndex === total - 1;

    overlay.innerHTML = `
      <style>
        .ob-progress { display:flex; gap:6px; margin-bottom:28px; }
        .ob-dot { width:28px; height:4px; border-radius:4px; background:#d0d5de; transition:background 0.3s; }
        .ob-dot.active { background:#7eb8d4; }
        .ob-dot.done   { background:#4caf87; }
        .ob-step-label { font-size:12px; color:#bbb; margin-bottom:16px; letter-spacing:0.5px; }
        .ob-icon  { font-size:44px; margin-bottom:14px; }
        .ob-title { font-size:21px; font-weight:700; color:#3d3d3d; text-align:center; line-height:1.3; margin-bottom:10px; }
        .ob-text  { font-size:15px; color:#777; text-align:center; line-height:1.65; }
        .ob-options { width:100%; display:flex; flex-direction:column; gap:9px; }
        .ob-option {
          padding:13px 16px; border-radius:15px;
          background:#e0e5ec;
          box-shadow:5px 5px 10px #b8bec7,-5px -5px 10px #ffffff;
          font-size:15px; color:#555; cursor:pointer;
          transition:box-shadow 0.2s,color 0.2s;
          -webkit-tap-highlight-color:transparent;
        }
        .ob-option.selected {
          box-shadow:inset 4px 4px 8px #b8bec7,inset -4px -4px 8px #ffffff;
          color:#7eb8d4; font-weight:600;
        }
        .ob-nav { display:flex; gap:12px; margin-top:24px; width:100%; }
        .ob-btn-back {
          flex:1; padding:14px; border:none; border-radius:15px;
          background:#e0e5ec;
          box-shadow:5px 5px 10px #b8bec7,-5px -5px 10px #ffffff;
          font-size:15px; color:#999; cursor:pointer;
          -webkit-tap-highlight-color:transparent;
        }
        .ob-btn-next {
          flex:2; padding:14px; border:none; border-radius:15px;
          background:#e0e5ec;
          box-shadow:5px 5px 10px #b8bec7,-5px -5px 10px #ffffff;
          font-size:15px; font-weight:700; color:#7eb8d4; cursor:pointer;
          -webkit-tap-highlight-color:transparent;
        }
        .ob-btn-next:active { box-shadow:inset 4px 4px 8px #b8bec7,inset -4px -4px 8px #ffffff; }
        .ob-btn-next.shake { animation:obShake 0.35s ease; }
        @keyframes obShake {
          0%,100%{transform:translateX(0)}
          25%{transform:translateX(-6px)}
          75%{transform:translateX(6px)}
        }
        .ob-fade { animation:obFade 0.25s ease; }
        @keyframes obFade {
          from{opacity:0;transform:translateY(10px)}
          to{opacity:1;transform:translateY(0)}
        }
      </style>

      <div class="ob-progress">
        ${Array.from({length: total}, (_, i) =>
          `<div class="ob-dot ${i < stepIndex ? 'done' : i === stepIndex ? 'active' : ''}"></div>`
        ).join('')}
      </div>

      <div class="ob-step-label">Шаг ${stepIndex + 1} из ${total}</div>

      <div class="ob-fade">
        ${step.render()}
      </div>

      <div class="ob-nav">
        ${!isFirst
          ? `<button class="ob-btn-back" id="obBack">← Назад</button>`
          : `<div style="flex:1"></div>`
        }
        <button class="ob-btn-next" id="obNext">
          ${isLast ? '✓ Готово' : 'Далее →'}
        </button>
      </div>
    `;

    // Клики по опциям
    overlay.querySelectorAll(".ob-option").forEach(opt => {
      opt.addEventListener("click", () => {
        overlay.querySelectorAll(".ob-option").forEach(o => o.classList.remove("selected"));
        opt.classList.add("selected");
      });
    });

    // Назад
    document.getElementById("obBack")?.addEventListener("click", () => {
      stepIndex--;
      render();
    });

    // Далее
    document.getElementById("obNext").addEventListener("click", () => {
      const ok = step.onNext ? step.onNext() : true;
      if (!ok) return;

      if (isLast) {
        finish();
      } else {
        stepIndex++;
        // Пересчитываем visible после обновления profile
        // и пропускаем шаги которые теперь skip=true
        let tries = 0;
        while (tries < 10) {
          const newVisible = getVisible();
          if (stepIndex >= newVisible.length) { finish(); return; }
          if (!newVisible[stepIndex].skip()) break;
          stepIndex++;
          tries++;
        }
        render();
      }
    });

    // onMount для слайдера
    if (step.onMount) setTimeout(step.onMount, 50);
  }

  function shakeBtn() {
    const btn = document.getElementById("obNext");
    if (!btn) return;
    btn.classList.remove("shake");
    void btn.offsetWidth;
    btn.classList.add("shake");
  }

  function finish() {
    saveProfile(profile);
    markOnboardingDone();
    overlay.style.transition = "opacity 0.4s ease";
    overlay.style.opacity = "0";
    setTimeout(() => {
      overlay.remove();
      if (onComplete) onComplete();
    }, 400);
  }

  render();
}