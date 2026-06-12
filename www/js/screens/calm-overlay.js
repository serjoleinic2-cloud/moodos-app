import { getCalmIndex, getCalmLabel, getCalmHistory, getCalmPatterns, getPastRecovery } from "../services/calm-engine.js";
import { isPremium } from "../services/user-profile.js";
import { showPremiumModal } from "../premium-modal.js";
import { t } from "../i18n.js";

export function showCalmOverlay() {
  const existing = document.getElementById('calmOverlay');
  if (existing) existing.remove();

  const index    = getCalmIndex();
  const label    = getCalmLabel(index);
  const patterns = getCalmPatterns();
  const recovery = getPastRecovery();
  const premium  = isPremium();

  const ringColor = label === 'high' ? '#4caf87'
    : label === 'medium' ? '#f0c040'
    : '#f07a40';

  const displayVal = index !== null ? index : '—';

  function getSupportPhrase() {
    if (index === null) return t('calm_no_data_phrase') || 'Продолжай отслеживать — скоро появятся наблюдения.';
    if (label === 'high')    return t('calm_phrase_high')    || 'Внутри — тихо. Ты в хорошем балансе.';
    if (label === 'medium')  return t('calm_phrase_medium')  || 'Небольшое напряжение — это нормально. Ты справляешься.';
    if (label === 'low')     return t('calm_phrase_low')     || 'Последние дни были насыщенными. Это нормальная реакция — дай себе паузу.';
    return t('calm_phrase_very_low') || 'Сейчас непросто. Ты уже замечаешь это — и это важный шаг.';
  }

  function renderPatterns() {
    const rows = [];
    patterns.calm.forEach(p => {
      rows.push(`<div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--calm-border);">
        <span style="font-size:18px;">🟢</span>
        <div style="flex:1;font-size:13px;color:var(--calm-text);">${t('event_' + p.trigger) || p.trigger}</div>
        <div style="font-size:12px;font-weight:700;color:#4caf87;">${p.rate}%</div>
      </div>`);
    });
    patterns.anxiety.forEach(p => {
      rows.push(`<div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--calm-border);">
        <span style="font-size:18px;">🔴</span>
        <div style="flex:1;font-size:13px;color:var(--calm-text);">${t('event_' + p.trigger) || p.trigger}</div>
        <div style="font-size:12px;font-weight:700;color:#f07a40;">${p.rate}%</div>
      </div>`);
    });
    if (rows.length === 0) return `<div style="font-size:13px;color:var(--calm-muted);text-align:center;padding:16px 0;">${t('calm_no_patterns') || 'Паттерны появятся после нескольких недель записей'}</div>`;
    return rows.join('');
  }

  function renderRecovery() {
    if (!recovery) return '';
    const days = recovery.avgHours >= 24 ? Math.round(recovery.avgHours / 24) + ' ' + (t('days_together_5') || 'дней') : recovery.avgHours + ' ' + (t('hours_short') || 'ч.');
    return `<div style="margin:16px 0;padding:16px;border-radius:16px;background:rgba(76,175,135,0.15);border:1px solid rgba(76,175,135,0.25);">
      <div style="font-size:12px;letter-spacing:0.8px;text-transform:uppercase;color:#4caf87;margin-bottom:6px;">${t('calm_past_recovery_title') || 'Ты уже справлялся'}</div>
      <div style="font-size:14px;color:var(--calm-text);line-height:1.5;">${t('calm_past_recovery_text') ? t('calm_past_recovery_text').replace('{n}', recovery.count).replace('{d}', days) : 'Ты выходил из похожих состояний ' + recovery.count + ' раз(а). Среднее время восстановления: ' + days + '.'}</div>
    </div>`;
  }

  function renderChart() {
    if (!premium) {
      return `<div style="margin:16px 0;padding:20px;border-radius:16px;background:rgba(159,122,234,0.12);border:1px solid rgba(159,122,234,0.25);text-align:center;">
        <div style="font-size:24px;margin-bottom:8px;">📈</div>
        <div style="font-size:14px;font-weight:600;color:#9f7aea;margin-bottom:6px;">${t('calm_chart_premium_title') || 'График спокойствия'}</div>
        <div style="font-size:12px;color:var(--calm-muted);margin-bottom:14px;">${t('calm_chart_premium_desc') || '30 / 90 / 365 дней — в Premium'}</div>
        <button id="calmPremiumBtn" style="padding:10px 24px;border:none;border-radius:12px;background:linear-gradient(145deg,#9f7aea,#805ad5);color:#fff;font-size:13px;font-weight:600;cursor:pointer;">${t('premium_try_btn') || 'Активировать Premium'}</button>
      </div>`;
    }

    const chartData  = getCalmHistory(30);
    const hasValues  = chartData.some(d => d.value !== null);
    if (!hasValues) return '';

    return `<div style="margin:16px 0;">
      <div style="font-size:12px;letter-spacing:0.8px;text-transform:uppercase;color:var(--calm-muted);margin-bottom:10px;">${t('calm_chart_title') || 'Спокойствие за 30 дней'}</div>
      <canvas id="calmChart" style="width:100%;height:80px;"></canvas>
    </div>`;
  }

  const overlay = document.createElement('div');
  overlay.id = 'calmOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:1500;overflow-y:auto;';

  overlay.innerHTML = `
    <div id="calmInner" style="
      min-height:100%;
      padding:env(safe-area-inset-top,24px) 20px calc(env(safe-area-inset-bottom,24px) + 24px) 20px;
      box-sizing:border-box;
    ">

      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;">
        <div style="font-size:18px;font-weight:700;color:var(--calm-title);">${t('calm_overlay_title') || 'Карта спокойствия'}</div>
        <button id="calmClose" style="background:rgba(128,128,128,0.15);border:none;border-radius:12px;color:var(--calm-title);font-size:13px;padding:8px 14px;cursor:pointer;">✕</button>
      </div>

      <div style="display:flex;align-items:center;gap:20px;margin-bottom:20px;">
        <div style="position:relative;flex-shrink:0;">
          <svg width="90" height="90" viewBox="0 0 90 90">
            <circle cx="45" cy="45" r="38" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="8"/>
            <circle cx="45" cy="45" r="38" fill="none" stroke="${ringColor}" stroke-width="8"
              stroke-dasharray="${index !== null ? Math.round(2 * Math.PI * 38 * index / 100) : 0} 999"
              stroke-linecap="round"
              transform="rotate(-90 45 45)"/>
            <text x="45" y="50" text-anchor="middle" font-size="22" font-weight="700" fill="#fff">${displayVal}</text>
          </svg>
        </div>
        <div style="flex:1;">
          <div style="font-size:13px;color:var(--calm-muted);margin-bottom:6px;letter-spacing:0.5px;">${t('calm_not_medical') || 'На основе паттернов · не медицинский показатель'}</div>
          <div style="font-size:14px;color:var(--calm-text);line-height:1.5;">${getSupportPhrase()}</div>
        </div>
      </div>

      ${renderRecovery()}

      ${renderChart()}

      <div style="margin:16px 0;">
        <div style="font-size:12px;letter-spacing:0.8px;text-transform:uppercase;color:var(--calm-muted);margin-bottom:10px;">${t('calm_patterns_title') || 'Что влияет на твоё состояние'}</div>
        <div style="font-size:11px;color:var(--calm-muted);margin-bottom:10px;opacity:0.7;">${t('calm_patterns_hint') || 'На основе записей за последние 30 дней'}</div>
        ${renderPatterns()}
      </div>

      <div style="margin-top:24px;padding:14px;border-radius:12px;background:var(--calm-block-bg);font-size:12px;color:var(--calm-muted);line-height:1.5;text-align:center;">
        ${t('calm_disclaimer') || 'Это не медицинский диагноз. Если тревога мешает жизни — поговори со специалистом.'}
      </div>

    </div>
  `;

  document.body.appendChild(overlay);

  // Адаптируем цвета к текущей теме
  const isDark = document.body.getAttribute('data-theme') === 'deep-ocean';
  const inner  = document.getElementById('calmInner');
  if (isDark) {
    inner.style.background  = 'linear-gradient(160deg,#0d2137 0%,#1a3a5c 50%,#0d2137 100%)';
    inner.style.setProperty('--calm-text', 'rgba(255,255,255,0.9)');
    inner.style.setProperty('--calm-muted', 'rgba(255,255,255,0.5)');
    inner.style.setProperty('--calm-title', '#ffffff');
    inner.style.setProperty('--calm-border', 'rgba(255,255,255,0.1)');
    inner.style.setProperty('--calm-block-bg', 'rgba(255,255,255,0.05)');
  } else {
    inner.style.background  = 'linear-gradient(160deg,#d4ede8 0%,#e8e0d5 100%)';
    inner.style.setProperty('--calm-text', '#3a3530');
    inner.style.setProperty('--calm-muted', '#999');
    inner.style.setProperty('--calm-title', '#3a3530');
    inner.style.setProperty('--calm-border', 'rgba(0,0,0,0.08)');
    inner.style.setProperty('--calm-block-bg', 'rgba(232,237,230,0.98)');
  }

  document.getElementById('calmClose')?.addEventListener('click', () => overlay.remove());

  document.getElementById('calmPremiumBtn')?.addEventListener('click', () => {
    showPremiumModal({
      title: t('calm_chart_premium_title') || 'График спокойствия',
      desc:  t('calm_chart_premium_desc')  || 'Динамика за 30 / 90 / 365 дней доступна в Premium'
    });
  });

  if (premium) {
    const canvas = document.getElementById('calmChart');
    if (canvas) {
      const chartData = getCalmHistory(30);
      const values    = chartData.map(d => d.value);
      _drawCalmChart(canvas, values);
    }
  }
}

function _drawCalmChart(canvas, values) {
  const dpr = window.devicePixelRatio || 1;
  const w   = canvas.offsetWidth  || 300;
  const h   = canvas.offsetHeight || 80;
  canvas.width  = w * dpr;
  canvas.height = h * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const valid  = values.filter(v => v !== null);
  if (valid.length < 2) return;

  const min    = Math.min(...valid);
  const max    = Math.max(...valid);
  const range  = Math.max(max - min, 10);
  const padX   = 4;
  const padY   = 6;
  const drawW  = w - padX * 2;
  const drawH  = h - padY * 2;

  const points = [];
  let xi = 0;
  values.forEach((v, i) => {
    if (v === null) { xi++; return; }
    const x = padX + (i / (values.length - 1)) * drawW;
    const y = padY + drawH - ((v - min) / range) * drawH;
    points.push({ x, y });
    xi++;
  });

  if (points.length < 2) return;

  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0,   'rgba(76,175,135,0.4)');
  grad.addColorStop(1,   'rgba(76,175,135,0.0)');

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    const cp = (points[i].x + points[i-1].x) / 2;
    ctx.bezierCurveTo(cp, points[i-1].y, cp, points[i].y, points[i].x, points[i].y);
  }
  ctx.lineTo(points[points.length-1].x, h);
  ctx.lineTo(points[0].x, h);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    const cp = (points[i].x + points[i-1].x) / 2;
    ctx.bezierCurveTo(cp, points[i-1].y, cp, points[i].y, points[i].x, points[i].y);
  }
  ctx.strokeStyle = '#4caf87';
  ctx.lineWidth   = 2;
  ctx.stroke();
}
