// ============================================================
// letter-overlay.js — UI письма от Нейры
// ============================================================

import { t } from '../i18n.js';
import { getUnreadLetters, markLetterRead, getAllLetters } from '../ai/avatar-letter-engine.js';

// ─── Карточка на главном экране ──────────────────────────────

export function renderLetterCard(container) {
  const existing = container.querySelector('#neyra-letter-card');
  if (existing) existing.remove();

  const unread = getUnreadLetters();
  if (!unread.length) return;

  const letter = unread[0];

  const card = document.createElement('div');
  card.id = 'neyra-letter-card';
  card.style.cssText = `
    margin: 12px 16px 0;
    border-radius: 18px;
    background: linear-gradient(135deg, #f5f0e8, #ede5d0);
    box-shadow: 4px 4px 12px rgba(180,160,120,0.35), -2px -2px 8px rgba(255,255,255,0.8);
    padding: 16px 18px;
    cursor: pointer;
    position: relative;
    overflow: hidden;
    border: 1px solid rgba(210,190,150,0.5);
    animation: letterWiggle 3s ease-in-out infinite;
  `;

  card.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;">
      <div style="font-size:26px;line-height:1;">✉️</div>
      <div style="flex:1;">
        <div style="font-size:13px;font-weight:700;color:#6b5a3e;letter-spacing:0.3px;">${t('letter_card_title')}</div>
        <div style="font-size:12px;color:#9a8060;margin-top:2px;">${t('letter_card_subtitle')}</div>
      </div>
      <div style="
        background: #e07b3a;
        color: white;
        font-size:11px;
        font-weight:700;
        padding:3px 9px;
        border-radius:20px;
        letter-spacing:0.3px;
      ">${t('letter_new_badge')}</div>
    </div>
    <div style="margin-top:10px;height:1px;background:linear-gradient(90deg,rgba(180,150,100,0.3),transparent);"></div>
    <div style="margin-top:8px;font-size:12px;color:#8a7050;font-style:italic;line-height:1.5;overflow:hidden;max-height:36px;">
      ${letter.text.substring(0, 80)}...
    </div>
  `;

  // Стиль анимации
  if (!document.getElementById('letter-card-style')) {
    const style = document.createElement('style');
    style.id = 'letter-card-style';
    style.textContent = `
      @keyframes letterWiggle {
        0%, 100% { transform: rotate(0deg); }
        2%        { transform: rotate(-1.2deg); }
        4%        { transform: rotate(1.2deg); }
        6%        { transform: rotate(-0.8deg); }
        8%        { transform: rotate(0.5deg); }
        10%       { transform: rotate(0deg); }
      }
      @keyframes letterOpen {
        0%   { transform: scale(1); opacity: 1; }
        100% { transform: scale(1.04); opacity: 0; }
      }
      @keyframes overlayIn {
        0%   { transform: translateY(100%); opacity: 0; }
        100% { transform: translateY(0); opacity: 1; }
      }
      @keyframes textReveal {
        0%   { opacity: 0; transform: translateY(6px); }
        100% { opacity: 1; transform: translateY(0); }
      }
      @keyframes sparkle {
        0%   { transform: scale(0) rotate(0deg);   opacity: 1; }
        60%  { transform: scale(1.4) rotate(180deg); opacity: 0.8; }
        100% { transform: scale(0) rotate(360deg); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }

  card.addEventListener('click', () => {
    // Анимация открытия карточки
    card.style.animation = 'letterOpen 0.3s ease forwards';
    _showSparkles(card);
    setTimeout(() => openLetterOverlay(letter), 320);
  });

  container.insertAdjacentElement('afterbegin', card);
}

// ─── Салют при тапе ──────────────────────────────────────────

function _showSparkles(anchor) {
  const rect    = anchor.getBoundingClientRect();
  const colors  = ['#f5c842', '#e07b3a', '#4caf87', '#64b5f6', '#ba68c8', '#ff8a65'];
  const centerX = rect.left + rect.width  / 2;
  const centerY = rect.top  + rect.height / 2;

  for (let i = 0; i < 14; i++) {
    const el = document.createElement('div');
    const angle  = (i / 14) * 360;
    const dist   = 40 + Math.random() * 50;
    const size   = 6 + Math.random() * 8;
    const color  = colors[Math.floor(Math.random() * colors.length)];
    const dx = Math.cos((angle * Math.PI) / 180) * dist;
    const dy = Math.sin((angle * Math.PI) / 180) * dist;

    el.style.cssText = `
      position: fixed;
      left: ${centerX}px;
      top:  ${centerY}px;
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      background: ${color};
      pointer-events: none;
      z-index: 9999;
      transform: translate(-50%, -50%);
      animation: sparkle 0.7s ease forwards;
      animation-delay: ${i * 30}ms;
    `;

    // После анимации перемещаем к конечной точке
    el.style.left = `${centerX + dx}px`;
    el.style.top  = `${centerY + dy}px`;

    document.body.appendChild(el);
    setTimeout(() => el.remove(), 900);
  }
}

// ─── Оверлей письма ──────────────────────────────────────────

export function openLetterOverlay(letter) {
  const existing = document.getElementById('letter-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'letter-overlay';
  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    background: rgba(40,30,20,0.55);
    z-index: 500;
    display: flex;
    align-items: flex-end;
    justify-content: center;
  `;

  const sheet = document.createElement('div');
  sheet.style.cssText = `
    width: 100%;
    max-height: 88vh;
    border-radius: 28px 28px 0 0;
    background: #f7f0e2;
    background-image:
      repeating-linear-gradient(
        0deg,
        transparent,
        transparent 27px,
        rgba(180,160,120,0.18) 27px,
        rgba(180,160,120,0.18) 28px
      );
    box-shadow: 0 -8px 40px rgba(80,60,20,0.25);
    padding: 28px 24px 48px;
    overflow-y: auto;
    animation: overlayIn 0.4s cubic-bezier(0.22,1,0.36,1) forwards;
    position: relative;
  `;

  // Шапка
  const header = document.createElement('div');
  header.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
  `;
  header.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;">
      <div style="font-size:28px;">✉️</div>
      <div>
        <div style="font-size:15px;font-weight:700;color:#5a4020;">${t('letter_card_title')}</div>
        <div style="font-size:11px;color:#9a7a50;margin-top:1px;">${_formatDate(letter.createdAt)}</div>
      </div>
    </div>
    <button id="letterCloseBtn" style="
      background: rgba(180,150,100,0.2);
      border: none;
      border-radius: 50%;
      width: 34px;
      height: 34px;
      font-size: 18px;
      color: #7a6040;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    ">✕</button>
  `;

  // Разделитель
  const divider = document.createElement('div');
  divider.style.cssText = `
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(160,130,80,0.4), transparent);
    margin-bottom: 20px;
  `;

  // Текст письма — анимированный построчно
  const textContainer = document.createElement('div');
  textContainer.style.cssText = `
    font-size: 15px;
    line-height: 1.8;
    color: #4a3820;
    font-family: 'Nunito', serif;
  `;

  sheet.appendChild(header);
  sheet.appendChild(divider);
  sheet.appendChild(textContainer);
  overlay.appendChild(sheet);
  document.body.appendChild(overlay);

  // Закрытие
  header.querySelector('#letterCloseBtn').onclick = () => _closeOverlay(overlay, letter);
  overlay.addEventListener('click', e => {
    if (e.target === overlay) _closeOverlay(overlay, letter);
  });

  // Анимация текста — слово за словом как в книге
  _animateText(textContainer, letter.text);
  markLetterRead(letter.id);
}

// ─── Анимация текста ─────────────────────────────────────────

function _animateText(container, text) {
  const sentences = text.split('. ').filter(s => s.trim());
  let delay = 0;

  sentences.forEach((sentence, i) => {
    const p = document.createElement('p');
    p.style.cssText = `
      margin: 0 0 14px 0;
      opacity: 0;
      animation: textReveal 0.5s ease forwards;
      animation-delay: ${delay}ms;
    `;
    p.textContent = sentence + (i < sentences.length - 1 ? '.' : '');
    container.appendChild(p);
    delay += 350;
  });
}

// ─── Закрытие ────────────────────────────────────────────────

function _closeOverlay(overlay, letter) {
  overlay.style.opacity = '0';
  overlay.style.transition = 'opacity 0.25s ease';
  setTimeout(() => {
    overlay.remove();
    // Обновляем карточку на главном — убираем если прочитано
    const card = document.getElementById('neyra-letter-card');
    if (card) {
      card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      card.style.opacity = '0';
      card.style.transform = 'translateY(-8px)';
      setTimeout(() => card.remove(), 300);
    }
  }, 250);
}

// ─── Просмотр истории писем (без анимации) ───────────────────

export function openLetterHistory() {
  const all = getAllLetters();

  const existing = document.getElementById('letter-history-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'letter-history-overlay';
  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    background: rgba(40,30,20,0.55);
    z-index: 500;
    display: flex;
    align-items: flex-end;
  `;

  const sheet = document.createElement('div');
  sheet.style.cssText = `
    width: 100%;
    max-height: 85vh;
    border-radius: 28px 28px 0 0;
    background: #f7f0e2;
    padding: 24px 20px 48px;
    overflow-y: auto;
    animation: overlayIn 0.35s cubic-bezier(0.22,1,0.36,1) forwards;
  `;

  const triggerIcons = {
    coffee: '☕', walk: '🚶', work: '💼', sport: '🏃',
    social: '💬', sleep: '😴', music: '🎵', food: '🍽️',
    rest: '🛋️', stress: '😤', alcohol: '🍷', nature: '🌿',
    screen: '📱', period: '🌙', creative: '🎨',
  };
  const triggerNames = Object.fromEntries(
    Object.entries(triggerIcons).map(([k, icon]) => [k, `${icon} ${t('event_' + k)}`])
  );

  if (!all.length) {
    sheet.innerHTML = `
      <div style="text-align:center;padding:40px 20px;color:#9a7a50;font-size:15px;">
        ${t('letter_history_empty')}
      </div>
      <div id="histCloseBtn" style="margin-top:16px;padding:14px;border-radius:16px;
        background:rgba(180,150,100,0.2);text-align:center;cursor:pointer;
        color:#7a6040;font-size:15px;">Закрыть</div>
    `;
  } else {
    let html = `<div style="font-size:16px;font-weight:700;color:#5a4020;margin-bottom:16px;">📬 ${t('letter_history_title')}</div>`;
    all.forEach(l => {
      html += `
        <div class="letter-hist-item" data-id="${l.id}" style="
          background: ${l.read ? 'rgba(245,240,228,0.7)' : '#f0e8d0'};
          border-radius: 14px;
          padding: 14px 16px;
          margin-bottom: 10px;
          cursor: pointer;
          border: 1px solid rgba(200,170,110,${l.read ? '0.2' : '0.5'});
          box-shadow: 2px 2px 6px rgba(160,130,80,0.15);
        ">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
            <div style="font-size:13px;font-weight:600;color:#6b5a3e;">
              ${triggerNames[l.trigger] || l.trigger}
            </div>
            <div style="font-size:11px;color:#b09070;">${_formatDate(l.createdAt)}</div>
          </div>
          <div style="font-size:12px;color:#8a7050;line-height:1.5;overflow:hidden;max-height:32px;">
            ${l.text.substring(0, 70)}...
          </div>
        </div>
      `;
    });
    html += `<div id="histCloseBtn" style="margin-top:8px;padding:14px;border-radius:16px;
      background:rgba(180,150,100,0.2);text-align:center;cursor:pointer;
      color:#7a6040;font-size:15px;">Закрыть</div>`;
    sheet.innerHTML = html;

    sheet.querySelectorAll('.letter-hist-item').forEach(item => {
      item.addEventListener('click', () => {
        const id  = parseInt(item.getAttribute('data-id'));
        const letter = all.find(l => l.id === id);
        if (letter) {
          overlay.remove();
          _openLetterReadOnly(letter);
        }
      });
    });
  }

  sheet.querySelector('#histCloseBtn').onclick = () => {
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0.2s';
    setTimeout(() => overlay.remove(), 200);
  };
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

  overlay.appendChild(sheet);
  document.body.appendChild(overlay);
}

// ─── Чтение старого письма без анимации ──────────────────────

function _openLetterReadOnly(letter) {
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position:fixed;inset:0;background:rgba(40,30,20,0.55);
    z-index:500;display:flex;align-items:flex-end;
  `;

  const triggerIcons = {
    coffee: '☕', walk: '🚶', work: '💼', sport: '🏃',
    social: '💬', sleep: '😴', music: '🎵', food: '🍽️',
    rest: '🛋️', stress: '😤', alcohol: '🍷', nature: '🌿',
    screen: '📱', period: '🌙', creative: '🎨',
  };
  const triggerNames = Object.fromEntries(
    Object.entries(triggerIcons).map(([k, icon]) => [k, `${icon} ${t('event_' + k)}`])
  );

  overlay.innerHTML = `
    <div style="
      width:100%;max-height:88vh;border-radius:28px 28px 0 0;
      background:#f7f0e2;
      background-image: repeating-linear-gradient(0deg,transparent,transparent 27px,
        rgba(180,160,120,0.18) 27px,rgba(180,160,120,0.18) 28px);
      padding:28px 24px 48px;overflow-y:auto;
      animation:overlayIn 0.35s cubic-bezier(0.22,1,0.36,1) forwards;
    ">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="font-size:26px;">✉️</div>
          <div>
            <div style="font-size:14px;font-weight:700;color:#5a4020;">
              ${triggerNames[letter.trigger] || 'Письмо'}
            </div>
            <div style="font-size:11px;color:#9a7a50;">${_formatDate(letter.createdAt)}</div>
          </div>
        </div>
        <button id="roCloseBtn" style="background:rgba(180,150,100,0.2);border:none;
          border-radius:50%;width:34px;height:34px;font-size:18px;
          color:#7a6040;cursor:pointer;">✕</button>
      </div>
      <div style="height:1px;background:linear-gradient(90deg,transparent,
        rgba(160,130,80,0.4),transparent);margin-bottom:18px;"></div>
      <div style="font-size:15px;line-height:1.9;color:#4a3820;
        font-family:'Nunito',serif;white-space:pre-line;">
        ${letter.text}
      </div>
    </div>
  `;

  overlay.querySelector('#roCloseBtn').onclick = () => overlay.remove();
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
}

// ─── Утилиты ─────────────────────────────────────────────────

function _formatDate(ts) {
  const lang = localStorage.getItem('app_language') || 'ru';
  const localeMap = { ru: 'ru-RU', en: 'en-GB', es: 'es-ES', uk: 'uk-UA', hi: 'hi-IN' };
  const locale = localeMap[lang] || 'ru-RU';
  const d = new Date(ts);
  return d.toLocaleDateString(locale, { day: 'numeric', month: 'long' });
}
