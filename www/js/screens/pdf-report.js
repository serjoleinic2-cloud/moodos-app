// =====================================
// MoodOS PDF Report Generator
// Генерация отчёта для врача
// =====================================
import { getMoodHistory } from "../services/memory.js";
import { getSessionHistory } from "../services/memory.js";
import { getProfile } from "../services/user-profile.js";

const MED_LABELS = {
  "нет":             "Не принимает",
  "антидепрессанты": "Антидепрессанты",
  "седативные":      "Седативные / успокоительные",
  "другое":          "Другое",
  "не_скажу":        "Не указано",
};

const EFFECT_LABELS = {
  "лучше":           "Стало лучше",
  "примерно_так_же": "Примерно так же",
  "приглушённость":  "Чувствует приглушённость",
  "побочки":         "Есть побочные эффекты",
  "адаптация":       "Подбор дозировки",
};

const STATE_LABELS = {
  "HIGH":     "Отличное",
  "GOOD":     "Хорошее",
  "NEUTRAL":  "Нейтральное",
  "STRESSED": "Напряжение",
  "LOW":      "Сниженное",
};

const SESSION_LABELS = {
  "breathing":    "Дыхание",
  "meditation":   "Медитация",
  "visual-focus": "Зрительный якорь",
  "mind-dump":    "Выгрузка мыслей",
  "tap-calm":     "Тактильная разрядка",
};

export function showPdfReportModal() {
  const existing = document.getElementById("pdfReportOverlay");
  if (existing) existing.remove();

  // Определяем диапазон по умолчанию — последние 30 дней
  const now   = new Date();
  const from  = new Date(now); from.setDate(from.getDate() - 30);
  const toStr   = now.toISOString().slice(0,10);
  const fromStr = from.toISOString().slice(0,10);

  const overlay = document.createElement("div");
  overlay.id = "pdfReportOverlay";
  overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:300;display:flex;align-items:flex-end;";

  overlay.innerHTML = `
    <div style="
      width:100%;background:linear-gradient(160deg,#d4ede8,#e8e0d5);
      border-radius:24px 24px 0 0;padding:24px 20px 48px;
      box-sizing:border-box;animation:slideUp 0.35s ease;
    ">
      <style>@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}</style>
      <div style="font-size:19px;font-weight:700;color:#3a3530;margin-bottom:6px;">📄 Отчёт для врача</div>
      <div style="font-size:13px;color:#aaa;margin-bottom:22px;">PDF с данными за выбранный период</div>

      <div style="display:flex;gap:12px;margin-bottom:16px;">
        <div style="flex:1;">
          <div style="font-size:11px;color:#aaa;font-weight:600;letter-spacing:1px;text-transform:uppercase;margin-bottom:6px;">С</div>
          <input type="date" id="pdfFrom" value="${fromStr}" style="
            width:100%;padding:12px 14px;border:none;border-radius:14px;
            background:#e8ede8;box-shadow:inset 3px 3px 6px #c4c9c2,inset -3px -3px 6px #ffffff;
            font-size:15px;color:#555;outline:none;box-sizing:border-box;">
        </div>
        <div style="flex:1;">
          <div style="font-size:11px;color:#aaa;font-weight:600;letter-spacing:1px;text-transform:uppercase;margin-bottom:6px;">По</div>
          <input type="date" id="pdfTo" value="${toStr}" style="
            width:100%;padding:12px 14px;border:none;border-radius:14px;
            background:#e8ede8;box-shadow:inset 3px 3px 6px #c4c9c2,inset -3px -3px 6px #ffffff;
            font-size:15px;color:#555;outline:none;box-sizing:border-box;">
        </div>
      </div>

      <div id="pdfStatus" style="font-size:13px;color:#888;margin-bottom:16px;min-height:18px;"></div>

      <button id="pdfGenBtn" style="
        width:100%;padding:15px;border:none;border-radius:16px;
        background:rgba(232,237,230,0.9);
        box-shadow:6px 6px 14px #b8c4b4,-6px -6px 14px #ffffff;
        font-size:16px;font-weight:700;color:#4caf87;cursor:pointer;margin-bottom:10px;">
        Сформировать PDF
      </button>
      <div id="pdfCancelBtn" style="
        width:100%;padding:12px;text-align:center;
        font-size:14px;color:#bbb;cursor:pointer;">Отмена</div>
    </div>`;

  document.body.appendChild(overlay);

  overlay.querySelector("#pdfGenBtn").addEventListener("click", async () => {
    const fromVal = overlay.querySelector("#pdfFrom").value;
    const toVal   = overlay.querySelector("#pdfTo").value;
    if (!fromVal || !toVal) {
      overlay.querySelector("#pdfStatus").textContent = "Выберите период";
      return;
    }
    overlay.querySelector("#pdfStatus").textContent = "Формирую PDF...";
    overlay.querySelector("#pdfGenBtn").disabled = true;
    try {
      await generatePdf(fromVal, toVal);
      overlay.querySelector("#pdfStatus").textContent = "✅ PDF сохранён";
      setTimeout(() => overlay.remove(), 1500);
    } catch(e) {
      overlay.querySelector("#pdfStatus").textContent = "Ошибка: " + e.message;
      overlay.querySelector("#pdfGenBtn").disabled = false;
    }
  });

  overlay.querySelector("#pdfCancelBtn").addEventListener("click", () => overlay.remove());
  overlay.addEventListener("click", e => { if (e.target === overlay) overlay.remove(); });
}

async function generatePdf(fromStr, toStr) {
  // Загружаем jsPDF динамически
  if (!window.jspdf) {
    await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation:"portrait", unit:"mm", format:"a4" });

  const fromDate = new Date(fromStr + "T00:00:00");
  const toDate   = new Date(toStr   + "T23:59:59");

  // Фильтруем данные по периоду
  const moodHistory = getMoodHistory().filter(e => {
    const t = new Date(e.time);
    return t >= fromDate && t <= toDate;
  });
  const sessions = getSessionHistory().filter(e => {
    const t = new Date(e.timestamp);
    return t >= fromDate && t <= toDate;
  });
  const profile = getProfile();

  const PAGE_W = 210;
  const MARGIN = 18;
  const CONTENT_W = PAGE_W - MARGIN * 2;
  let y = MARGIN;

  // ---- Цвета ----
  const C_DARK   = [45, 45, 45];
  const C_GRAY   = [120, 120, 120];
  const C_LIGHT  = [180, 180, 180];
  const C_GREEN  = [76, 175, 135];
  const C_ORANGE = [240, 165, 0];
  const C_RED    = [224, 85, 85];
  const C_LINE   = [210, 215, 208];

  function setFont(size, style="normal", color=C_DARK) {
    doc.setFontSize(size);
    doc.setFont("helvetica", style);
    doc.setTextColor(...color);
  }

  function line(yPos) {
    doc.setDrawColor(...C_LINE);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, yPos, PAGE_W - MARGIN, yPos);
  }

  function checkPage(needed=10) {
    if (y + needed > 280) {
      doc.addPage();
      y = MARGIN;
    }
  }

  function moodColor(v) {
    if (v >= 70) return C_GREEN;
    if (v >= 40) return C_ORANGE;
    return C_RED;
  }

  function formatDate(d) {
    return new Date(d).toLocaleDateString("ru-RU", {day:"2-digit",month:"long",year:"numeric"});
  }
  function formatDateShort(d) {
    return new Date(d).toLocaleDateString("ru-RU", {day:"2-digit",month:"2-digit"});
  }
  function formatDateTime(d) {
    const dt = new Date(d);
    return dt.toLocaleDateString("ru-RU",{day:"2-digit",month:"2-digit"}) + " " +
           dt.toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"});
  }

  // ===== ШАПКА =====
  doc.setFillColor(232, 237, 230);
  doc.roundedRect(MARGIN - 4, y - 4, CONTENT_W + 8, 28, 4, 4, "F");
  setFont(18, "bold", C_GREEN);
  doc.text("MoodOS", MARGIN, y + 8);
  setFont(10, "normal", C_GRAY);
  doc.text("Отчёт об эмоциональном состоянии", MARGIN, y + 15);
  setFont(9, "normal", C_LIGHT);
  doc.text(`Период: ${formatDate(fromDate)} — ${formatDate(toDate)}`, MARGIN, y + 21);
  doc.text(`Сформирован: ${new Date().toLocaleDateString("ru-RU")}`, PAGE_W - MARGIN, y + 21, {align:"right"});
  y += 34;

  // ===== ДАННЫЕ ОБ АППАРАТЕ =====
  if (profile) {
    checkPage(30);
    setFont(11, "bold", C_DARK);
    doc.text("Информация о пациенте", MARGIN, y); y += 7;
    line(y); y += 5;

    const medLabel    = MED_LABELS[profile.takesMeds] || "Не указано";
    const effectLabel = EFFECT_LABELS[profile.medEffect] || "—";

    setFont(9, "normal", C_GRAY);
    doc.text("Приём препаратов:", MARGIN, y);
    setFont(9, "bold", C_DARK);
    doc.text(medLabel, MARGIN + 42, y); y += 6;

    if (profile.takesMeds && profile.takesMeds !== "нет" && profile.takesMeds !== "не_скажу") {
      setFont(9, "normal", C_GRAY);
      doc.text("Эффект от препарата:", MARGIN, y);
      setFont(9, "bold", C_DARK);
      doc.text(effectLabel, MARGIN + 42, y); y += 6;
    }

    setFont(9, "normal", C_GRAY);
    doc.text("Базовое состояние:", MARGIN, y);
    setFont(9, "bold", C_DARK);
    doc.text((profile.moodBaseline ?? 50) + "%", MARGIN + 42, y); y += 10;
  }

  // ===== СТАТИСТИКА ЗА ПЕРИОД =====
  checkPage(40);
  setFont(11, "bold", C_DARK);
  doc.text("Статистика за период", MARGIN, y); y += 7;
  line(y); y += 6;

  if (moodHistory.length === 0) {
    setFont(9, "normal", C_GRAY);
    doc.text("Нет данных за выбранный период.", MARGIN, y); y += 10;
  } else {
    const values   = moodHistory.map(e => e.value);
    const avg      = Math.round(values.reduce((a,b)=>a+b,0) / values.length);
    const minVal   = Math.min(...values);
    const maxVal   = Math.max(...values);

    // Устойчивость
    let stability = 100;
    if (values.length > 1) {
      const diffs = values.slice(1).map((v,i) => Math.abs(v - values[i]));
      const avgDiff = diffs.reduce((a,b)=>a+b,0) / diffs.length;
      stability = Math.max(0, Math.round(100 - avgDiff * 2));
    }

    // Сетка 2×2
    const BOX_W = (CONTENT_W - 6) / 2;
    const BOX_H = 18;
    const boxes = [
      { label: "Среднее настроение", value: avg + "%",       color: moodColor(avg) },
      { label: "Устойчивость",       value: stability + "%", color: moodColor(stability) },
      { label: "Минимум",            value: minVal + "%",    color: moodColor(minVal) },
      { label: "Максимум",           value: maxVal + "%",    color: moodColor(maxVal) },
    ];

    boxes.forEach((box, i) => {
      const bx = MARGIN + (i % 2) * (BOX_W + 6);
      const by = y + Math.floor(i / 2) * (BOX_H + 4);
      doc.setFillColor(240, 244, 238);
      doc.roundedRect(bx, by, BOX_W, BOX_H, 3, 3, "F");
      setFont(8, "normal", C_GRAY);
      doc.text(box.label, bx + 4, by + 6);
      setFont(13, "bold", box.color);
      doc.text(box.value, bx + 4, by + 14);
    });
    y += BOX_H * 2 + 12;

    setFont(9, "normal", C_GRAY);
    doc.text(`Всего записей: ${moodHistory.length}`, MARGIN, y); y += 10;

    // ===== МИНИ-ГРАФИК =====
    checkPage(50);
    setFont(11, "bold", C_DARK);
    doc.text("График настроения", MARGIN, y); y += 7;
    line(y); y += 4;

    const CHART_H = 35;
    const CHART_W = CONTENT_W;
    const cx = MARGIN, cy = y;

    // Фон графика
    doc.setFillColor(240, 244, 238);
    doc.roundedRect(cx, cy, CHART_W, CHART_H, 3, 3, "F");

    // Сетка Y
    doc.setDrawColor(...C_LINE);
    doc.setLineWidth(0.2);
    [0, 25, 50, 75, 100].forEach(pct => {
      const gy = cy + CHART_H - (pct / 100 * CHART_H);
      doc.line(cx, gy, cx + CHART_W, gy);
      setFont(6, "normal", C_LIGHT);
      doc.text(pct + "%", cx - 1, gy + 1, {align:"right"});
    });

    // Линия настроения
    const sorted = moodHistory.slice().sort((a,b) => new Date(a.time) - new Date(b.time));
    if (sorted.length > 1) {
      const pts = sorted.map((e, i) => ({
        x: cx + (i / (sorted.length - 1)) * CHART_W,
        y: cy + CHART_H - (e.value / 100 * CHART_H)
      }));

      doc.setDrawColor(...C_GREEN);
      doc.setLineWidth(0.8);
      for (let i = 1; i < pts.length; i++) {
        doc.line(pts[i-1].x, pts[i-1].y, pts[i].x, pts[i].y);
      }

      // Точки
      doc.setFillColor(...C_GREEN);
      pts.forEach(p => {
        doc.circle(p.x, p.y, 0.8, "F");
      });
    }

    y += CHART_H + 10;
  }

  // ===== ПРАКТИКИ =====
  if (sessions.length > 0) {
    checkPage(20);
    setFont(11, "bold", C_DARK);
    doc.text("Использованные практики", MARGIN, y); y += 7;
    line(y); y += 5;

    // Группируем по типу
    const byType = {};
    sessions.forEach(s => {
      const t = s.type || "other";
      if (!byType[t]) byType[t] = { count:0, positive:0, totalLift:0 };
      byType[t].count++;
      if (s.result === "positive") byType[t].positive++;
      if (s.moodBefore != null && s.moodAfter != null) {
        byType[t].totalLift += (s.moodAfter - s.moodBefore);
      }
    });

    Object.entries(byType).forEach(([type, data]) => {
      checkPage(10);
      const label = SESSION_LABELS[type] || type;
      const pct   = Math.round(data.positive / data.count * 100);
      const lift  = data.count > 0 ? Math.round(data.totalLift / data.count) : 0;

      setFont(9, "bold", C_DARK);
      doc.text(label, MARGIN, y);
      setFont(9, "normal", C_GRAY);
      doc.text(`${data.count} сессий · Эффективность: ${pct}% · Ср. прирост: ${lift > 0 ? "+" : ""}${lift}%`,
        MARGIN + 38, y);
      y += 7;
    });
    y += 4;
  }

  // ===== ТАБЛИЦА ЗАПИСЕЙ =====
  checkPage(20);
  setFont(11, "bold", C_DARK);
  doc.text("Журнал настроения", MARGIN, y); y += 7;
  line(y); y += 5;

  if (moodHistory.length === 0) {
    setFont(9, "normal", C_GRAY);
    doc.text("Нет данных за выбранный период.", MARGIN, y); y += 10;
  } else {
    // Заголовок таблицы
    doc.setFillColor(225, 232, 222);
    doc.rect(MARGIN, y - 3, CONTENT_W, 8, "F");
    setFont(8, "bold", C_GRAY);
    doc.text("Дата и время",    MARGIN + 2,  y + 3);
    doc.text("Настроение",      MARGIN + 42, y + 3);
    doc.text("Состояние",       MARGIN + 70, y + 3);
    y += 9;

    const sorted = moodHistory.slice().sort((a,b) => new Date(b.time) - new Date(a.time));
    sorted.forEach((e, i) => {
      checkPage(8);
      if (i % 2 === 0) {
        doc.setFillColor(246, 249, 244);
        doc.rect(MARGIN, y - 3, CONTENT_W, 7, "F");
      }
      setFont(8, "normal", C_DARK);
      doc.text(formatDateTime(e.time), MARGIN + 2, y + 2);
      setFont(8, "bold", moodColor(e.value));
      doc.text(e.value + "%", MARGIN + 42, y + 2);
      setFont(8, "normal", C_GRAY);
      doc.text(STATE_LABELS[e.state] || "—", MARGIN + 70, y + 2);
      y += 7;
    });
    y += 6;
  }

  // ===== ПОДВАЛ =====
  checkPage(20);
  line(y); y += 5;
  setFont(8, "normal", C_LIGHT);
  doc.text("Отчёт сформирован приложением MoodOS. Данные предназначены для обсуждения с врачом.", MARGIN, y, {maxWidth: CONTENT_W});
  y += 5;
  doc.text("Не является медицинским заключением.", MARGIN, y);

  // Сохраняем
  const fileName = `MoodOS_${fromStr}_${toStr}.pdf`;
  doc.save(fileName);
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement("script");
    s.src = src; s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });
}
