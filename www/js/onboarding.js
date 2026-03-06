// =====================================
// MoodOS Onboarding v3 — без багов
// =====================================
import { saveProfile, markOnboardingDone, saveMedReminder } from "./services/user-profile.js";

export function initOnboarding(onComplete) {

  const overlay = document.createElement("div");
  overlay.id = "onboardingOverlay";
  overlay.style.cssText = `
    position:fixed; inset:0; background:#e0e5ec; z-index:9999;
    display:flex; flex-direction:column; align-items:center;
    justify-content:center; text-align:center;
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

  // ---- ВСЕ ШАГИ — просто массив ----
  // skip() вызывается в момент перехода — не заранее
  const allSteps = [
    {
      id: "welcome",
      render: () => `
        <div style="font-size:52px;margin-bottom:20px;">🌿</div>
        <div style="font-size:22px;font-weight:700;color:#3d3d3d;margin-bottom:16px;line-height:1.3;">Привет, я MoodOS</div>
        <div style="font-size:15px;color:#777;line-height:1.65;">
          Я не буду давать советы которые ты не просил.<br><br>
          Просто буду рядом — помогу замечать что происходит
          и находить то, что реально помогает именно тебе.
        </div>
      `,
      needsChoice: false,
      onNext: () => { return true; }
    },
    {
      id: "feeling",
      render: () => `
        <div style="font-size:52px;margin-bottom:20px;">💬</div>
        <div style="font-size:22px;font-weight:700;color:#3d3d3d;margin-bottom:10px;line-height:1.3;">Как ты себя чувствуешь<br>в последнее время?</div>
        <div style="font-size:14px;color:#aaa;margin-bottom:20px;">Это поможет мне лучше понимать твои оценки</div>
        <div id="opts" style="width:100%;display:flex;flex-direction:column;gap:9px;">
          <div class="ob-opt" data-v="хорошо">😊 Хорошо — просто хочу следить за собой</div>
          <div class="ob-opt" data-v="трудные_дни">🌤 Бывают трудные дни</div>
          <div class="ob-opt" data-v="непростой_период">🌧 Сейчас непростой период</div>
          <div class="ob-opt" data-v="честно_не_очень">💙 Честно — не очень</div>
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
    {
      id: "meds",
      render: () => `
        <div style="font-size:52px;margin-bottom:20px;">💊</div>
        <div style="font-size:22px;font-weight:700;color:#3d3d3d;margin-bottom:10px;line-height:1.3;">Кое-что важное</div>
        <div style="font-size:14px;color:#aaa;margin-bottom:20px;line-height:1.55;">
          Некоторые лекарства влияют на восприятие мира.<br>
          Мне важно это учитывать.<br>
          Ты принимаешь что-то регулярно?
        </div>
        <div id="opts" style="width:100%;display:flex;flex-direction:column;gap:9px;">
          <div class="ob-opt" data-v="нет">🙅 Нет</div>
          <div class="ob-opt" data-v="антидепрессанты">💙 Антидепрессанты</div>
          <div class="ob-opt" data-v="седативные">🌙 Седативные / успокоительные</div>
          <div class="ob-opt" data-v="другое">💊 Другое</div>
          <div class="ob-opt" data-v="не_скажу">🔒 Предпочитаю не говорить</div>
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
    {
      id: "effect",
      shouldSkip: () => !profile.takesMeds || profile.takesMeds === "нет" || profile.takesMeds === "не_скажу",
      render: () => `
        <div style="font-size:52px;margin-bottom:20px;">🔍</div>
        <div style="font-size:22px;font-weight:700;color:#3d3d3d;margin-bottom:10px;line-height:1.3;">Как ты себя чувствуешь<br>во время приёма?</div>
        <div style="font-size:14px;color:#aaa;margin-bottom:20px;">Помогает правильно читать твои оценки</div>
        <div id="opts" style="width:100%;display:flex;flex-direction:column;gap:9px;">
          <div class="ob-opt" data-v="лучше">✨ Стало лучше</div>
          <div class="ob-opt" data-v="примерно_так_же">➡️ Примерно так же</div>
          <div class="ob-opt" data-v="приглушённость">🔇 Чувствую себя приглушённым</div>
          <div class="ob-opt" data-v="побочки">⚡ Есть побочки — терплю</div>
          <div class="ob-opt" data-v="адаптация">⏳ Ещё подбираем дозировку</div>
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
    {
      id: "reminder",
      shouldSkip: () => !profile.takesMeds || profile.takesMeds === "нет" || profile.takesMeds === "не_скажу",
      render: () => `
        <div style="font-size:52px;margin-bottom:20px;">⏰</div>
        <div style="font-size:22px;font-weight:700;color:#3d3d3d;margin-bottom:10px;line-height:1.3;">Напомнить о приёме?</div>
        <div style="font-size:14px;color:#aaa;margin-bottom:20px;">Мягко, без лишнего шума</div>
        <div id="opts" style="width:100%;display:flex;flex-direction:column;gap:9px;">
          <div class="ob-opt" data-v="нет">🙅 Нет, сам помню</div>
          <div class="ob-opt" data-v="утро">🌅 Утром (8:00)</div>
          <div class="ob-opt" data-v="день">☀️ Днём (13:00)</div>
          <div class="ob-opt" data-v="вечер">🌙 Вечером (20:00)</div>
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
    {
      id: "baseline",
      render: () => `
        <div style="font-size:52px;margin-bottom:20px;">🎯</div>
        <div style="font-size:22px;font-weight:700;color:#3d3d3d;margin-bottom:10px;line-height:1.3;">Последний шаг</div>
        <div style="font-size:14px;color:#aaa;margin-bottom:24px;line-height:1.55;">
          Передвинь ползунок туда, где ты сейчас.<br>
          Это моя точка отсчёта.
        </div>
        <div style="background:#e0e5ec;border-radius:20px;
          box-shadow:6px 6px 14px #b8bec7,-6px -6px 14px #ffffff;
          padding:20px 24px;width:100%;box-sizing:border-box;">
          <div style="display:flex;justify-content:space-between;margin-bottom:12px;">
            <span style="font-size:13px;color:#aaa;">Плохо</span>
            <span id="sliderVal" style="font-size:22px;font-weight:800;color:#555;">50%</span>
            <span style="font-size:13px;color:#aaa;">Отлично</span>
          </div>
          <input type="range" id="baseSlider" min="0" max="100" value="50"
            style="width:100%;accent-color:#7eb8d4;">
        </div>
        <div style="font-size:13px;color:#bbb;margin-top:14px;">
          Если сейчас нормально — оставь как есть
        </div>
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

  // ---- НАВИГАЦИЯ ----
  // visibleIndexes — список индексов в allSteps которые НЕ скипаются
  // пересчитываем каждый раз после выбора
  let pos = 0; // позиция в visibleIndexes

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
          background:#e0e5ec;
          box-shadow:5px 5px 10px #b8bec7,-5px -5px 10px #ffffff;
          font-size:15px; color:#555; cursor:pointer;
          transition:box-shadow 0.15s,color 0.15s;
          -webkit-tap-highlight-color:transparent;
        }
        .ob-opt.sel {
          box-shadow:inset 4px 4px 8px #b8bec7,inset -4px -4px 8px #ffffff;
          color:#7eb8d4; font-weight:600;
        }
        .ob-nav { display:flex; gap:12px; margin-top:24px; width:100%; }
        .ob-back {
          flex:1; padding:14px; border:none; border-radius:15px;
          background:#e0e5ec;
          box-shadow:5px 5px 10px #b8bec7,-5px -5px 10px #ffffff;
          font-size:15px; color:#aaa; cursor:pointer;
          -webkit-tap-highlight-color:transparent;
        }
        .ob-next {
          flex:2; padding:14px; border:none; border-radius:15px;
          background:#e0e5ec;
          box-shadow:5px 5px 10px #b8bec7,-5px -5px 10px #ffffff;
          font-size:15px; font-weight:700; color:#7eb8d4; cursor:pointer;
          -webkit-tap-highlight-color:transparent;
        }
        .ob-next:active { box-shadow:inset 4px 4px 8px #b8bec7,inset -4px -4px 8px #ffffff; }
        .ob-next.shake  { animation:obShake 0.35s ease; }
        @keyframes obShake {
          0%,100%{ transform:translateX(0) }
          25%    { transform:translateX(-6px) }
          75%    { transform:translateX(6px) }
        }
      </style>

      <div class="ob-progress">
        ${Array.from({length:total},(_,i) =>
          `<div class="ob-dot ${i<pos?'done':i===pos?'active':''}"></div>`
        ).join('')}
      </div>

      <div class="ob-step-lbl">Шаг ${pos+1} из ${total}</div>

      <div class="ob-content">${step.render()}</div>

      <div class="ob-nav">
        ${!isFirst
          ? `<button class="ob-back" id="obBack">← Назад</button>`
          : `<div style="flex:1"></div>`}
        <button class="ob-next" id="obNext">${isLast ? '✓ Готово' : 'Далее →'}</button>
      </div>
    `;

    // Опции
    overlay.querySelectorAll(".ob-opt").forEach(o => {
      o.onclick = () => {
        overlay.querySelectorAll(".ob-opt").forEach(x => x.classList.remove("sel"));
        o.classList.add("sel");
      };
    });

    // Назад
    document.getElementById("obBack")?.addEventListener("click", () => {
      pos--;
      render();
    });

    // Далее
    document.getElementById("obNext").addEventListener("click", () => {
      // Сначала вызываем onNext текущего шага
      const ok = step.onNext ? step.onNext() : true;
      if (!ok) {
        // Тряска если не выбрано
        const btn = document.getElementById("obNext");
        if (btn) { btn.classList.remove("shake"); void btn.offsetWidth; btn.classList.add("shake"); }
        return;
      }

      if (isLast) {
        finish();
        return;
      }

      pos++;
      // После обновления profile пересчитываем visible
      // и пропускаем позиции которые теперь shouldSkip
      const newVisible = getVisible();
      while (pos < newVisible.length && newVisible[pos].step.shouldSkip && newVisible[pos].step.shouldSkip()) {
        pos++;
      }
      if (pos >= newVisible.length) { finish(); return; }

      render();
    });

    // onMount (слайдер)
    if (step.onMount) setTimeout(step.onMount, 30);
  }

  function finish() {
    saveProfile(profile);
    markOnboardingDone();
    overlay.style.transition = "opacity 0.35s ease";
    overlay.style.opacity = "0";
    setTimeout(() => { overlay.remove(); if (onComplete) onComplete(); }, 350);
  }

  render();
}