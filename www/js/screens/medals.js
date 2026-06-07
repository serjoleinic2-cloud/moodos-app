// =====================================
// Neyra Medals Screen
// =====================================
import { getAllMedalsWithState } from '../services/medals-engine.js';
import { t } from '../i18n.js';

const CATEGORIES = [
  { key: 'regularity' },
  { key: 'mood' },
  { key: 'practice' },
  { key: 'awareness' },
  { key: 'resilience' },
  { key: 'challenges' },
  { key: 'triggers' },
  { key: 'special' },
];

export function onEnter() {
  const el = document.querySelector('[data-screen="medals"]');
  if (!el) return;
  el.innerHTML = renderMedals();
}

function renderMedals() {
  const medals = getAllMedalsWithState();
  const earnedCount = medals.filter(m => m.earned).length;
  const totalCount = medals.length;

  const categoriesHTML = CATEGORIES.map(cat => {
    const catMedals = medals.filter(m => m.category === cat.key);
    if (!catMedals.length) return '';
    const medalsHTML = catMedals.map(medal => renderMedalCard(medal)).join('');
    return `
      <div class="medals-category">
        <div class="medals-category-label">${t('medals_category_' + cat.key) || cat.key}</div>
        <div class="medals-grid">${medalsHTML}</div>
      </div>
    `;
  }).join('');

  return `
    <style>
      .medals-wrap { padding: 20px 16px 100px; font-family: -apple-system, 'SF Pro Display', sans-serif; overflow-x: hidden; box-sizing: border-box; max-width: 100vw; }
      .medals-header { margin-bottom: 24px; }
      .medals-title { font-size: 22px; font-weight: 700; color: #3d3d3d; margin-bottom: 8px; }
      .medals-progress-bar-wrap { background: rgba(200,210,200,0.4); border-radius: 10px; height: 8px; overflow: hidden; margin-bottom: 4px; }
      .medals-progress-bar-fill { height: 100%; border-radius: 10px; background: linear-gradient(90deg, #4caf87, #7eb8d4); transition: width 0.6s ease; }
      .medals-progress-label { font-size: 12px; color: #aaa; text-align: right; }
      .medals-category { margin-bottom: 28px; }
      .medals-category-label { font-size: 11px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; color: #b0b8c4; margin-bottom: 12px; padding-left: 2px; }
      .medals-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; overflow: hidden; }
      .medal-card { display: flex; flex-direction: column; align-items: center; position: relative; padding: 10px 4px 8px; border-radius: 18px; background: rgba(232,237,230,0.9); box-shadow: 5px 5px 12px #b8c4b4, -5px -5px 12px #ffffff; cursor: default; transition: transform 0.15s; -webkit-tap-highlight-color: transparent; min-height: 100px; justify-content: center; overflow: hidden; min-width: 0; }
      .medal-card.locked { opacity: 0.45; filter: grayscale(1); }
      .medal-card:active { transform: scale(0.96); }
      .medal-emoji { font-size: 36px; margin-bottom: 6px; line-height: 1; }
      .medal-name { font-size: 10px; font-weight: 600; color: #555; text-align: center; line-height: 1.3; word-break: break-word; overflow-wrap: break-word; max-width: 100%; }
      .medal-count-badge { position: absolute; top: 6px; right: 8px; background: linear-gradient(145deg, #9f7aea, #805ad5); color: #fff; font-size: 10px; font-weight: 700; width: 18px; height: 18px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(128,90,213,0.4); }
      .medal-new-badge { position: absolute; top: 6px; left: 8px; background: linear-gradient(145deg, #4caf87, #45a070); color: #fff; font-size: 9px; font-weight: 700; padding: 2px 5px; border-radius: 6px; }
      .medal-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.35); z-index: 300; display: flex; align-items: center; justify-content: center; padding: 24px; }
      .medal-modal { background: linear-gradient(160deg, #d4ede8, #e8e0d5); border-radius: 24px; padding: 32px 24px; text-align: center; max-width: 320px; width: 100%; box-shadow: 0 20px 60px rgba(0,0,0,0.2); animation: popIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
      @keyframes popIn { from { transform: scale(0.7); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      .medal-modal-emoji { font-size: 64px; margin-bottom: 12px; display: block; }
      .medal-modal-name { font-size: 20px; font-weight: 700; color: #3d3d3d; margin-bottom: 6px; }
      .medal-modal-desc { font-size: 14px; color: #888; line-height: 1.5; margin-bottom: 8px; }
      .medal-modal-status { font-size: 13px; font-weight: 600; margin-bottom: 20px; }
      .medal-modal-status.earned { color: #4caf87; }
      .medal-modal-status.locked { color: #bbb; }
      .medal-modal-close { width: 100%; padding: 14px; border: none; border-radius: 16px; background: rgba(232,237,230,0.9); box-shadow: 5px 5px 10px #b8c4b4, -5px -5px 10px #ffffff; font-size: 15px; font-weight: 600; color: #7eb8d4; cursor: pointer; }
    </style>

    <div class="medals-wrap">
      <div class="medals-header">
        <div class="medals-title">🏅 ${t('medals_title') || 'Достижения'}</div>
        <div class="medals-progress-bar-wrap">
          <div class="medals-progress-bar-fill" style="width: ${Math.round(earnedCount / totalCount * 100)}%"></div>
        </div>
        <div class="medals-progress-label">${earnedCount} / ${totalCount}</div>
      </div>
      ${categoriesHTML}
    </div>
  `;
}

function renderMedalCard(medal) {
  const isNew = medal.earned && medal.earnedAt?.length &&
    (Date.now() - medal.earnedAt[medal.earnedAt.length - 1]) < 48 * 3600000;

  return `
    <div class="medal-card ${medal.earned ? 'earned' : 'locked'}"
         data-medal-id="${medal.id}"
         onclick="window.__showMedalModal('${medal.id}')">
      ${medal.earned && medal.count > 1 ? `<div class="medal-count-badge">${medal.count}</div>` : ''}
      ${isNew ? `<div class="medal-new-badge">NEW</div>` : ''}
      <div class="medal-emoji">${medal.emoji}</div>
      <div class="medal-name">${t('medal_' + medal.id) || medal.id}</div>
    </div>
  `;
}

window.__showMedalModal = function(medalId) {
  const medals = getAllMedalsWithState();
  const medal = medals.find(m => m.id === medalId);
  if (!medal) return;

  const existing = document.getElementById('medalModalOverlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'medalModalOverlay';
  overlay.className = 'medal-modal-overlay';
  overlay.innerHTML = `
    <div class="medal-modal">
      <span class="medal-modal-emoji">${medal.emoji}</span>
      <div class="medal-modal-name">${t('medal_' + medal.id) || medal.id}</div>
      <div class="medal-modal-desc">${t('medal_' + medal.id + '_desc') || ''}</div>
      <div class="medal-modal-status ${medal.earned ? 'earned' : 'locked'}">
        ${medal.earned
          ? `✅ ${t('medals_earned') || 'Получено'}${medal.count > 1 ? ' · ' + medal.count + ' ' + (t('medals_times') || 'раз') : ''}`
          : '🔒 ' + (t('medals_locked') || 'Ещё не получено')
        }
      </div>
      ${medal.earned ? `
      <button class="medal-modal-share" id="medalModalShare" style="
        width:100%;padding:14px;border:none;border-radius:16px;
        background:linear-gradient(145deg,#7eb8d4,#6aa8c4);
        color:#fff;font-size:15px;font-weight:700;cursor:pointer;
        margin-bottom:10px;">↗ ${t('medal_share_btn') || 'Поделиться'}</button>
      ` : ''}
      <button class="medal-modal-close" id="medalModalClose">OK</button>
    </div>
  `;
  document.body.appendChild(overlay);

  document.getElementById('medalModalClose').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

  document.getElementById('medalModalShare')?.addEventListener('click', () => {
    const medalName = t('medal_' + medal.id) || medal.id;
    const medalDesc = t('medal_' + medal.id + '_desc') || '';
    const shareText = `${medal.emoji} ${medalName}\n${medalDesc}\n\n— Neyra`;
    const Share = window.Capacitor?.Plugins?.Share;
    if (Share) { Share.share({ title: 'Neyra', text: shareText, dialogTitle: t('medal_share_dialog') || 'Поделиться достижением' }); return; }
    if (navigator.share) { navigator.share({ title: 'Neyra', text: shareText }).catch(() => {}); return; }
    navigator.clipboard?.writeText(shareText).then(() => {
      const toast = document.createElement('div');
      toast.style.cssText = 'position:fixed;bottom:120px;left:50%;transform:translateX(-50%);background:#4caf87;color:#fff;padding:10px 20px;border-radius:14px;font-size:14px;font-weight:600;z-index:9999;';
      toast.textContent = '✓ ' + (t('copied') || 'Скопировано');
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 2000);
    });
  });
};

export function onExit() {}