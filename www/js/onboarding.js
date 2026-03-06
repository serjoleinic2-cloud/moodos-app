// =====================================
// MoodOS Onboarding
// Первый запуск — 6 шагов
// =====================================
import {
  saveProfile,
  markOnboardingDone,
  saveMedReminder
} from "./services/user-profile.js";

export function initOnboarding(onComplete) {

  // Создаём оверлей поверх всего
  const overlay = document.createElement("div");
  overlay.id = "onboardingOverlay";
  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    background: #e0e5ec;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 28px 24px;
    box-sizing: border-box;
    font-family: -apple-system, 'SF Pro Display', sans-serif;
    overflow-y: auto;
    text-align: center;
  `;
  document.body.appendChild(overlay);

  // Данные которые собираем
  const profile = {
    baseFeeling: null,
    takesMeds:   null,
    medType:     null,
    medEffect:   null,
    medReminder: null,
    moodBaseline: 50,
    createdAt:   Date.now()
  };

  // Текущий шаг
  let currentStep = 0;

  // ---- ШАГИ ----
  const steps = [

    // ШАГ 1 — Приветствие
    {
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
      render: () => `
        <div class="ob-icon">💬</div>
        <div class="ob-title">Как ты себя чувствуешь<br>в последнее время?</div>
        <div class="ob-text" style="margin-bottom:20px;">
          Это поможет мне лучше понимать твои оценки.
        </div>
        <div class="ob-options" id="obOptions2">
          <div class="ob-option" data-value="хорошо">
            😊 Хорошо — просто хочу следить за собой
          </div>
          <div class="ob-option" data-value="трудные_дни">
            🌤 Бывают трудные дни
          </div>
          <div class="ob-option" data-value="непростой_период">
            🌧 Сейчас непростой период
          </div>
          <div class="ob-option" data-value="честно_не_очень">
            💙 Честно — не очень
          </div>
        </div>
      `,
      onNext: () => {
        const selected = document.querySelector("#obOptions2 .ob-option.selected");
        if (!selected) { shakeNextBtn(); return false; }
        profile.baseFeeling = selected.dataset.value;
        return true;
      }
    },

    // ШАГ 3 — Медикаменты
    {
      render: () => `
        <div class="ob-icon">💊</div>
        <div class="ob-title">Кое-что важное</div>
        <div class="ob-text" style="margin-bottom:20px;">
          Некоторые лекарства влияют на то как мы ощущаем мир —
          и это абсолютно нормально. Мне важно это учитывать
          чтобы правильно читать твои данные.
          <br><br>
          Ты принимаешь что-то регулярно?
        </div>
        <div class="ob-options" id="obOptions3">
          <div class="ob-option" data-value="нет">
            🙅 Нет
          </div>
          <div class="ob-option" data-value="антидепрессанты">
            💙 Антидепрессанты
          </div>
          <div class="ob-option" data-value="седативные">
            🌙 Седативные / успокоительные
          </div>
          <div class="ob-option" data-value="другое">
            💊 Другое
          </div>
          <div class="ob-option" data-value="не_скажу">
            🔒 Предпочитаю не говорить
          </div>
        </div>
      `,
      onNext: () => {
        const selected = document.querySelector("#obOptions3 .ob-option.selected");
        if (!selected) { shakeNextBtn(); return false; }
        profile.takesMeds = selected.dataset.value;
        return true;
      }
    },

    // ШАГ 4 — Как влияет (только если принимает)
    {
      skip: () => profile.takesMeds === "нет" || profile.takesMeds === "не_скажу",
      render: () => `
        <div class="ob-icon">🔍</div>
        <div class="ob-title">Как ты себя чувствуешь<br>во время приёма?</div>
        <div class="ob-text" style="margin-bottom:20px;">
          Это поможет мне правильно интерпретировать
          твои оценки настроения.
        </div>
        <div class="ob-options" id="obOptions4">
          <div class="ob-option" data-value="лучше">
            ✨ Стало лучше
          </div>
          <div class="ob-option" data-value="примерно_так_же">
            ➡️ Примерно так же
          </div>
          <div class="ob-option" data-value="приглушённость">
            🔇 Чувствую себя приглушённым
          </div>
          <div class="ob-option" data-value="побочки">
            ⚡ Есть побочки — терплю
          </div>
          <div class="ob-option" data-value="адаптация">
            ⏳ Ещё подбираем дозировку
          </div>
        </div>
      `,
      onNext: () => {
        const selected = document.querySelector("#obOptions4 .ob-option.selected");
        if (!selected) { shakeNextBtn(); return false; }
        profile.medEffect = selected.dataset.value;
        return true;
      }
    },

    // ШАГ 5 — Напоминалка (только если принимает)
    {
      skip: () => profile.takesMeds === "нет" || profile.takesMeds === "не_скажу",
      render: () => `
        <div class="ob-icon">⏰</div>
        <div class="ob-title">Напомнить о приёме?</div>
        <div class="ob-text" style="margin-bottom:20px;">
          Я могу мягко напоминать — без лишнего шума.
        </div>
        <div class="ob-options" id="obOptions5">
          <div class="ob-option" data-value="нет">
            🙅 Нет, сам помню
          </div>
          <div class="ob-option" data-value="утро">
            🌅 Утром (8:00)
          </div>
          <div class="ob-option" data-value="день">
            ☀️ Днём (13:00)
          </div>
          <div class="ob-option" data-value="вечер">
            🌙 Вечером (20:00)
          </div>
        </div>
      `,
      onNext: () => {
        const selected = document.querySelector("#obOptions5 .ob-option.selected");
        if (!selected) { shakeNextBtn(); return false; }
        profile.medReminder = selected.dataset.value;

        const times = { утро: "08:00", день: "13:00", вечер: "20:00" };
        if (times[selected.dataset.value]) {
          saveMedReminder(times[selected.dataset.value]);
        }
        return true;
      }
    },

    // ШАГ 6 — Калибровка слайдера
    {
      render: () => `
        <div class="ob-icon">🎯</div>
        <div class="ob-title">Последний шаг</div>
        <div class="ob-text" style="margin-bottom:24px;">
          Передвинь ползунок туда, где ты сейчас.<br>
          Это моя точка отсчёта — я буду считать
          изменения именно от неё.
        </div>
        <div style="
          background: #e0e5ec;
          border-radius: 20px;
          box-shadow: 6px 6px 14px #b8bec7, -6px -6px 14px #ffffff;
          padding: 20px 24px;
          width: 100%;
          box-sizing: border-box;
        ">
          <div style="display:flex; justify-content:space-between; margin-bottom:12px;">
            <span style="font-size:13px; color:#aaa;">Плохо</span>
            <span id="obSliderVal" style="font-size:20px; font-weight:800; color:#555;">50%</span>
            <span style="font-size:13px; color:#aaa;">Отлично</span>
          </div>
          <input type="range" id="obSlider" min="0" max="100" value="50"
            style="width:100%; accent-color:#7eb8d4;">
        </div>
        <div style="font-size:13px; color:#aaa; margin-top:16px; text-align:center; line-height:1.6;">
          Если тебе сейчас в целом нормально — оставь как есть
        </div>
      `,
      onMount: () => {
        const slider = document.getElementById("obSlider");
        const val    = document.getElementById("obSliderVal");
        if (slider) {
          slider.addEventListener("input", () => {
            val.textContent = slider.value + "%";
          });
        }
      },
      onNext: () => {
        const slider = document.getElementById("obSlider");
        profile.moodBaseline = slider ? Number(slider.value) : 50;
        return true;
      }
    }

  ];

  // ---- РЕНДЕР ----
  function getVisibleSteps() {
    return steps.filter(s => !s.skip || !s.skip());
  }

  function render() {
    const visible = getVisibleSteps();
    const total   = visible.length;
    const step    = visible[currentStep];
    const isFirst = currentStep === 0;
    const isLast  = currentStep === total - 1;

    overlay.innerHTML = `
      <style>
        .ob-progress {
          display: flex;
          gap: 6px;
          margin-bottom: 32px;
        }
        .ob-dot {
          width: 28px; height: 4px;
          border-radius: 4px;
          background: #d0d5de;
          transition: background 0.3s;
        }
        .ob-dot.active {
          background: #7eb8d4;
        }
        .ob-dot.done {
          background: #4caf87;
        }
        .ob-step-label {
          font-size: 12px; color: #bbb;
          margin-bottom: 20px;
          letter-spacing: 0.5px;
        }
        .ob-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }
        .ob-title {
          font-size: 22px; font-weight: 700;
          color: #3d3d3d; text-align: center;
          line-height: 1.3; margin-bottom: 12px;
        }
        .ob-text {
          font-size: 15px; color: #777;
          text-align: center; line-height: 1.65;
        }
        .ob-options {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .ob-option {
          padding: 14px 18px;
          border-radius: 16px;
          background: #e0e5ec;
          box-shadow: 5px 5px 10px #b8bec7, -5px -5px 10px #ffffff;
          font-size: 15px; color: #555;
          cursor: pointer;
          transition: box-shadow 0.2s, color 0.2s;
          -webkit-tap-highlight-color: transparent;
        }
        .ob-option.selected {
          box-shadow: inset 4px 4px 8px #b8bec7, inset -4px -4px 8px #ffffff;
          color: #7eb8d4;
          font-weight: 600;
        }
        .ob-nav {
          display: flex;
          gap: 12px;
          margin-top: 28px;
          width: 100%;
        }
        .ob-btn-back {
          flex: 1;
          padding: 14px;
          border: none; border-radius: 16px;
          background: #e0e5ec;
          box-shadow: 5px 5px 10px #b8bec7, -5px -5px 10px #ffffff;
          font-size: 15px; color: #999;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
        }
        .ob-btn-next {
          flex: 2;
          padding: 14px;
          border: none; border-radius: 16px;
          background: #e0e5ec;
          box-shadow: 5px 5px 10px #b8bec7, -5px -5px 10px #ffffff;
          font-size: 15px; font-weight: 700; color: #7eb8d4;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
          transition: box-shadow 0.15s;
        }
        .ob-btn-next:active {
          box-shadow: inset 4px 4px 8px #b8bec7, inset -4px -4px 8px #ffffff;
        }
        .ob-btn-next.shake {
          animation: obShake 0.35s ease;
        }
        @keyframes obShake {
          0%,100% { transform: translateX(0); }
          20%      { transform: translateX(-6px); }
          40%      { transform: translateX(6px); }
          60%      { transform: translateX(-4px); }
          80%      { transform: translateX(4px); }
        }
        #onboardingOverlay > * {
          animation: obFadeIn 0.3s ease;
        }
        @keyframes obFadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      </style>

      <!-- Прогресс-точки -->
      <div class="ob-progress">
        ${Array.from({length: total}, (_, i) => `
          <div class="ob-dot ${i < currentStep ? 'done' : i === currentStep ? 'active' : ''}"></div>
        `).join('')}
      </div>

      <!-- Счётчик -->
      <div class="ob-step-label">Шаг ${currentStep + 1} из ${total}</div>

      <!-- Контент шага -->
      ${step.render()}

      <!-- Кнопки -->
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

    // Вешаем события на опции
    overlay.querySelectorAll(".ob-option").forEach(opt => {
      opt.addEventListener("click", () => {
        overlay.querySelectorAll(".ob-option").forEach(o => o.classList.remove("selected"));
        opt.classList.add("selected");
      });
    });

    // Кнопка Назад
    const backBtn = document.getElementById("obBack");
    if (backBtn) {
      backBtn.addEventListener("click", () => {
        currentStep--;
        // Пропускаем скипнутые шаги назад
        while (currentStep > 0 && steps[currentStep].skip && steps[currentStep].skip()) {
          currentStep--;
        }
        render();
      });
    }

    // Кнопка Далее
    document.getElementById("obNext").addEventListener("click", () => {
      const ok = step.onNext ? step.onNext() : true;
      if (!ok) return;

      if (isLast) {
        finish();
      } else {
        currentStep++;
        // Пропускаем скипнутые шаги вперёд
        while (currentStep < visible.length - 1 && steps[currentStep].skip && steps[currentStep].skip()) {
          currentStep++;
        }
        render();
      }
    });

    // onMount — для слайдера на последнем шаге
    if (step.onMount) setTimeout(step.onMount, 50);
  }

  function shakeNextBtn() {
    const btn = document.getElementById("obNext");
    if (!btn) return;
    btn.classList.remove("shake");
    void btn.offsetWidth;
    btn.classList.add("shake");
  }

  function finish() {
    saveProfile(profile);
    markOnboardingDone();

    // Анимация закрытия
    overlay.style.transition = "opacity 0.4s ease";
    overlay.style.opacity    = "0";
    setTimeout(() => {
      overlay.remove();
      if (onComplete) onComplete();
    }, 400);
  }

  render();
}