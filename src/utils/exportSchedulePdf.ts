import { jsPDF } from 'jspdf';
import {
  MONTH_NAMES_EN,
  SHIFT_E,
  SHIFT_M,
  SHIFT_MID,
  ShiftState,
  SolverSolution,
  STATE_BAJA,
  STATE_OFF,
  STATE_VAC,
} from '../solver/cpsatSolver';
import {
  AppColorTheme,
  DEFAULT_COLOR_THEME,
  getShiftThemeColors,
  hexToRgb,
} from './themeColors';
import {
  AppLanguage,
  I18N_DICTIONARY,
  MONTH_NAMES_ES,
} from './i18n';

interface RgbColor {
  r: number;
  g: number;
  b: number;
}

const WEEK_BANNER_COLORS: Array<{ fill: RgbColor; text: RgbColor }> = [
  { fill: { r: 224, g: 231, b: 255 }, text: { r: 30, g: 27, b: 75 } }, // Indigo
  { fill: { r: 209, g: 250, b: 229 }, text: { r: 6, g: 78, b: 59 } }, // Emerald
  { fill: { r: 254, g: 243, b: 199 }, text: { r: 120, g: 53, b: 15 } }, // Amber
  { fill: { r: 224, g: 242, b: 254 }, text: { r: 12, g: 74, b: 110 } }, // Sky
  { fill: { r: 243, g: 232, b: 255 }, text: { r: 88, g: 28, b: 135 } }, // Purple
];

/**
 * Generates and downloads a full-month A3 Landscape PDF using the active AppColorTheme and language.
 */
export function exportFullMonthSchedulePdf(
  solution: SolverSolution,
  colorTheme: AppColorTheme = DEFAULT_COLOR_THEME,
  language: AppLanguage = 'en'
): void {
  const t = I18N_DICTIONARY[language];
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a3', // 420mm x 297mm landscape fits all 28-35 days of the full month on 1 page cleanly
  });

  const pageWidth = 420;
  const pageHeight = 297;
  const marginX = 8;
  const marginY = 8;

  // Page Background (#F4F5FB)
  doc.setFillColor(244, 245, 251);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Main Card Container (#FFFFFF)
  const cardWidth = pageWidth - marginX * 2;
  const cardHeight = pageHeight - marginY * 2;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(marginX, marginY, cardWidth, cardHeight, 2.5, 2.5, 'FD');

  // Top Accent Bar using colorTheme.accentHex
  const accentRgb = hexToRgb(colorTheme.accentHex);
  doc.setFillColor(accentRgb.r, accentRgb.g, accentRgb.b);
  doc.rect(marginX, marginY, cardWidth, 2.2, 'F');

  const monthNames = language === 'es' ? MONTH_NAMES_ES : MONTH_NAMES_EN;
  const monthName = monthNames[solution.parameters.month - 1] || 'October';
  const year = solution.parameters.year;

  // Header Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(accentRgb.r, accentRgb.g, accentRgb.b);
  doc.text(
    t.pdfTopKicker(monthName.toUpperCase(), year),
    marginX + 6,
    marginY + 8.5
  );

  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text(t.appTitle, marginX + 6, marginY + 15);

  // Right Header Legend Pills
  const legendItems: Array<{ label: string; shift: ShiftState }> = [
    { label: t.pdfLegendMorning, shift: SHIFT_M },
    { label: t.pdfLegendBridge, shift: SHIFT_MID },
    { label: t.pdfLegendAfternoon, shift: SHIFT_E },
    { label: t.pdfLegendRest, shift: STATE_OFF },
    { label: t.pdfLegendVacation, shift: STATE_VAC },
    { label: t.pdfLegendBaja, shift: STATE_BAJA },
  ];
  let legendX = pageWidth - marginX - 188;
  legendItems.forEach((item) => {
    const info = getShiftThemeColors(item.shift, colorTheme);
    const fill = hexToRgb(info.colors.bgHex);
    const border = hexToRgb(info.colors.borderHex);
    const text = hexToRgb(info.colors.textHex);
    doc.setFillColor(fill.r, fill.g, fill.b);
    doc.setDrawColor(border.r, border.g, border.b);
    doc.roundedRect(legendX, marginY + 7.5, 29, 6, 1.2, 1.2, 'FD');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(text.r, text.g, text.b);
    doc.text(item.label, legendX + 14.5, marginY + 11.6, { align: 'center' });
    legendX += 30.8;
  });

  // Table Geometry Calculation (Whole-Month Continuous Excel Sheet without gaps)
  const tableStartY = marginY + 19.5;
  const nameColWidth = 42;
  const days = solution.days;
  const numWeeks = solution.parameters.numWeeks;
  const availableDaysWidth = cardWidth - 12 - nameColWidth;
  const dayColWidth = availableDaysWidth / days.length;

  const startX = marginX + 6;
  let curY = tableStartY;

  const headerBg = hexToRgb(colorTheme.headerBgHex);
  const headerText = hexToRgb(colorTheme.headerTextHex);

  // Row 0: Week Group Banner Headers (continuous without gaps)
  const weekRowH = 6.5;
  doc.setFillColor(headerBg.r, headerBg.g, headerBg.b);
  doc.setDrawColor(203, 213, 225);
  doc.rect(startX, curY, nameColWidth, weekRowH, 'FD');
  doc.setFontSize(7.2);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(headerText.r, headerText.g, headerText.b);
  doc.text(t.pdfWholeMonthWeeks(numWeeks), startX + 2.5, curY + 4.4);

  for (let w = 0; w < numWeeks; w++) {
    const wDays = days.filter((d) => d.weekIndex === w);
    if (wDays.length === 0) continue;
    const wStartX = startX + nameColWidth + wDays[0].dayIndex * dayColWidth;
    const wWidth = wDays.length * dayColWidth;
    const wc = WEEK_BANNER_COLORS[w % WEEK_BANNER_COLORS.length];

    doc.setFillColor(wc.fill.r, wc.fill.g, wc.fill.b);
    doc.setDrawColor(203, 213, 225);
    doc.rect(wStartX, curY, wWidth, weekRowH, 'FD');
    doc.setTextColor(wc.text.r, wc.text.g, wc.text.b);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    const firstD = wDays[0];
    const lastD = wDays[wDays.length - 1];
    doc.text(
      `W${w + 1} (${firstD.dayNumber} ${firstD.monthShortEs} - ${lastD.dayNumber} ${lastD.monthShortEs})`,
      wStartX + wWidth / 2,
      curY + 4.4,
      { align: 'center' }
    );
  }
  curY += weekRowH;

  // Row 1: Date & Day-of-Week Header
  const dateRowH = 8.5;
  doc.setFillColor(headerBg.r, headerBg.g, headerBg.b);
  doc.setDrawColor(203, 213, 225);
  doc.rect(startX, curY, nameColWidth, dateRowH, 'FD');
  doc.setTextColor(headerText.r, headerText.g, headerText.b);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text(t.gridEmployeeColHeader, startX + 2.5, curY + 5.4);

  days.forEach((d) => {
    const cellX = startX + nameColWidth + d.dayIndex * dayColWidth;

    if (d.dayOfWeek >= 5) {
      doc.setFillColor(238, 242, 255);
    } else {
      doc.setFillColor(248, 250, 252);
    }
    doc.setDrawColor(203, 213, 225);
    doc.rect(cellX, curY, dayColWidth, dateRowH, 'FD');

    doc.setFontSize(6.2);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(d.dayShortEs, cellX + dayColWidth / 2, curY + 3.4, { align: 'center' });

    doc.setFontSize(7.2);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(
      `${String(d.dayNumber).padStart(2, '0')} ${d.monthShortEs}`,
      cellX + dayColWidth / 2,
      curY + 7.1,
      { align: 'center' }
    );
  });
  curY += dateRowH;

  // Row 2: Daily Boss Coverage (M:x | T:y) & M/T Staff Split
  const covRowH = 7.8;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.rect(startX, curY, nameColWidth, covRowH, 'FD');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text(t.gridBossSplitHeader, startX + 2.5, curY + 5);

  days.forEach((d) => {
    const cov = solution.dailyCoverage[d.dayIndex];
    const cellX = startX + nameColWidth + d.dayIndex * dayColWidth;

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(203, 213, 225);
    doc.rect(cellX, curY, dayColWidth, covRowH, 'FD');

    if (cov.bossCoverageValid) {
      doc.setFillColor(209, 250, 229);
      doc.setTextColor(6, 95, 70);
    } else {
      doc.setFillColor(254, 226, 226);
      doc.setTextColor(153, 27, 27);
    }
    doc.roundedRect(cellX + 0.6, curY + 0.7, dayColWidth - 1.2, 3.5, 0.7, 0.7, 'F');
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.text(
      `M:${cov.morningBosses}|T:${cov.eveningBosses}`,
      cellX + dayColWidth / 2,
      curY + 3.2,
      { align: 'center' }
    );

    doc.setFontSize(5.6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(
      `${cov.morningTotal}M·${cov.eveningTotal}T`,
      cellX + dayColWidth / 2,
      curY + 6.7,
      { align: 'center' }
    );
  });
  curY += covRowH;

  // Compact Excel Employee Rows (ONLY Employee Name in Column 0)
  const maxBodyHeight = pageHeight - marginY - curY - 6;
  const empRowH = Math.min(9.2, Math.max(6.5, maxBodyHeight / Math.max(1, solution.rows.length)));

  const bossRowBg = hexToRgb(colorTheme.bossRowBgHex);
  const bossNameText = hexToRgb(colorTheme.bossNameTextHex);
  const normalRowBg = hexToRgb(colorTheme.normalRowBgHex);
  const normalNameText = hexToRgb(colorTheme.normalNameTextHex);

  solution.rows.forEach((row) => {
    const isBoss = row.employee.isBoss === 1;
    if (isBoss) {
      doc.setFillColor(bossRowBg.r, bossRowBg.g, bossRowBg.b);
    } else {
      doc.setFillColor(normalRowBg.r, normalRowBg.g, normalRowBg.b);
    }
    doc.setDrawColor(203, 213, 225);
    doc.rect(startX, curY, nameColWidth, empRowH, 'FD');

    // Only Employee Name, no role subtitle
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    if (isBoss) {
      doc.setTextColor(bossNameText.r, bossNameText.g, bossNameText.b);
    } else {
      doc.setTextColor(normalNameText.r, normalNameText.g, normalNameText.b);
    }
    doc.text(row.employee.name, startX + 2.5, curY + empRowH * 0.62);

    days.forEach((d) => {
      const shift = row.shifts[d.dayIndex];
      const cellX = startX + nameColWidth + d.dayIndex * dayColWidth;

      if (isBoss) {
        doc.setFillColor(bossRowBg.r, bossRowBg.g, bossRowBg.b);
      } else {
        doc.setFillColor(normalRowBg.r, normalRowBg.g, normalRowBg.b);
      }
      doc.setDrawColor(203, 213, 225);
      doc.rect(cellX, curY, dayColWidth, empRowH, 'FD');

      const info = getShiftThemeColors(shift, colorTheme);
      const fill = hexToRgb(info.colors.bgHex);
      const border = hexToRgb(info.colors.borderHex);
      const text = hexToRgb(info.colors.textHex);

      doc.setFillColor(fill.r, fill.g, fill.b);
      doc.setDrawColor(border.r, border.g, border.b);
      doc.roundedRect(
        cellX + 0.6,
        curY + 0.8,
        dayColWidth - 1.2,
        empRowH - 1.6,
        0.8,
        0.8,
        'FD'
      );

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.4);
      doc.setTextColor(text.r, text.g, text.b);
      const pdfCode = info.code.replace('–', '-');
      doc.text(pdfCode, cellX + dayColWidth / 2, curY + empRowH * 0.64, {
        align: 'center',
      });
    });

    curY += empRowH;
  });

  doc.save(
    `employee_shift_schedule_${monthName.toLowerCase()}_${year}.pdf`
  );
}
