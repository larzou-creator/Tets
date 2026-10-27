import {
  SHIFT_E,
  SHIFT_EARLY,
  SHIFT_LONG,
  SHIFT_M,
  SHIFT_MID,
  ShiftState,
  STATE_BAJA,
  STATE_OFF,
  STATE_VAC,
} from '../solver/cpsatSolver';

export interface ShiftColorConfig {
  bgHex: string;
  textHex: string;
  borderHex: string;
}

export interface AppColorTheme {
  id: string;
  name: string;
  accentHex: string;
  headerBgHex: string;
  headerTextHex: string;
  bossRowBgHex: string;
  bossNameTextHex: string;
  normalRowBgHex: string;
  normalNameTextHex: string;
  shifts: {
    morning: ShiftColorConfig;
    afternoon: ShiftColorConfig;
    bridge: ShiftColorConfig;
    rest: ShiftColorConfig;
    vacation: ShiftColorConfig;
    baja: ShiftColorConfig;
  };
}

export const THEME_PRESETS: AppColorTheme[] = [
  {
    id: 'excel-classic',
    name: 'Excel Classic Sheet',
    accentHex: '#107c41',
    headerBgHex: '#f1f5f9',
    headerTextHex: '#0f172a',
    bossRowBgHex: '#dcfce7',
    bossNameTextHex: '#064e3b',
    normalRowBgHex: '#ffffff',
    normalNameTextHex: '#1e293b',
    shifts: {
      morning: { bgHex: '#fef3c7', textHex: '#78350f', borderHex: '#fcd34d' },
      afternoon: { bgHex: '#e0e7ff', textHex: '#312e81', borderHex: '#a5b4fc' },
      bridge: { bgHex: '#d1fae5', textHex: '#064e3b', borderHex: '#6ee7b7' },
      rest: { bgHex: '#f1f5f9', textHex: '#64748b', borderHex: '#cbd5e1' },
      vacation: { bgHex: '#f3e8ff', textHex: '#581c87', borderHex: '#d8b4fe' },
      baja: { bgHex: '#fee2e2', textHex: '#7f1d1d', borderHex: '#fca5a5' },
    },
  },
  {
    id: 'indigo-modern',
    name: 'Indigo Workspace',
    accentHex: '#4f46e5',
    headerBgHex: '#eef2ff',
    headerTextHex: '#1e1b4b',
    bossRowBgHex: '#ecfdf5',
    bossNameTextHex: '#065f46',
    normalRowBgHex: '#ffffff',
    normalNameTextHex: '#0f172a',
    shifts: {
      morning: { bgHex: '#fef08a', textHex: '#713f12', borderHex: '#facc15' },
      afternoon: { bgHex: '#dbeafe', textHex: '#1e3a8a', borderHex: '#93c5fd' },
      bridge: { bgHex: '#ccfbf1', textHex: '#134e4a', borderHex: '#5eead4' },
      rest: { bgHex: '#f8fafc', textHex: '#94a3b8', borderHex: '#e2e8f0' },
      vacation: { bgHex: '#fae8ff', textHex: '#701a75', borderHex: '#f0abfc' },
      baja: { bgHex: '#ffe4e6', textHex: '#881337', borderHex: '#fda4af' },
    },
  },
  {
    id: 'ocean-contrast',
    name: 'High-Contrast Ocean',
    accentHex: '#0284c7',
    headerBgHex: '#e0f2fe',
    headerTextHex: '#0c4a6e',
    bossRowBgHex: '#d1fae5',
    bossNameTextHex: '#064e3b',
    normalRowBgHex: '#ffffff',
    normalNameTextHex: '#0f172a',
    shifts: {
      morning: { bgHex: '#ffedd5', textHex: '#7c2d12', borderHex: '#fdba74' },
      afternoon: { bgHex: '#e0f2fe', textHex: '#0c4a6e', borderHex: '#7dd3fc' },
      bridge: { bgHex: '#dcfce7', textHex: '#14532d', borderHex: '#86efac' },
      rest: { bgHex: '#f1f5f9', textHex: '#64748b', borderHex: '#cbd5e1' },
      vacation: { bgHex: '#ede9fe', textHex: '#4c1d95', borderHex: '#c4b5fd' },
      baja: { bgHex: '#fee2e2', textHex: '#991b1b', borderHex: '#fca5a5' },
    },
  },
  {
    id: 'warm-slate',
    name: 'Warm Minimal',
    accentHex: '#d97706',
    headerBgHex: '#f5f5f4',
    headerTextHex: '#1c1917',
    bossRowBgHex: '#ecfccb',
    bossNameTextHex: '#365314',
    normalRowBgHex: '#ffffff',
    normalNameTextHex: '#292524',
    shifts: {
      morning: { bgHex: '#fef9c3', textHex: '#713f12', borderHex: '#fde047' },
      afternoon: { bgHex: '#f3e8ff', textHex: '#4c1d95', borderHex: '#d8b4fe' },
      bridge: { bgHex: '#cffafe', textHex: '#164e63', borderHex: '#67e8f9' },
      rest: { bgHex: '#f5f5f4', textHex: '#78716c', borderHex: '#d6d3d1' },
      vacation: { bgHex: '#fce7f3', textHex: '#831843', borderHex: '#f9a8d4' },
      baja: { bgHex: '#fee2e2', textHex: '#7f1d1d', borderHex: '#fca5a5' },
    },
  },
];

export const DEFAULT_COLOR_THEME: AppColorTheme = THEME_PRESETS[0];

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    return { r: isNaN(r) ? 240 : r, g: isNaN(g) ? 240 : g, b: isNaN(b) ? 240 : b };
  }
  const num = parseInt(clean, 16);
  if (isNaN(num)) return { r: 240, g: 240, b: 240 };
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

export function getShiftThemeColors(
  shift: ShiftState,
  theme: AppColorTheme
): {
  code: string;
  timeLabel: string;
  colors: ShiftColorConfig;
} {
  switch (shift) {
    case SHIFT_M:
      return {
        code: '07–15',
        timeLabel: '07:00 a 15:00 (Morning · M)',
        colors: theme.shifts.morning,
      };
    case SHIFT_E:
      return {
        code: '14–22',
        timeLabel: '14:00 a 22:00 (Afternoon · T)',
        colors: theme.shifts.afternoon,
      };
    case SHIFT_MID:
      return {
        code: '10–18',
        timeLabel: '10:00 a 18:00 (Bridge)',
        colors: theme.shifts.bridge,
      };
    case SHIFT_EARLY:
      return {
        code: '06–14',
        timeLabel: '06:00 a 14:00 (Early)',
        colors: theme.shifts.morning,
      };
    case SHIFT_LONG:
      return {
        code: '10–22',
        timeLabel: '10:00 a 22:00 (12h Long)',
        colors: theme.shifts.afternoon,
      };
    case STATE_OFF:
      return {
        code: 'LIBRE',
        timeLabel: 'LIBRE (Rest Day)',
        colors: theme.shifts.rest,
      };
    case STATE_VAC:
      return {
        code: 'VAC',
        timeLabel: 'VACACIONES (Planned Vacation)',
        colors: theme.shifts.vacation,
      };
    case STATE_BAJA:
      return {
        code: 'BAJA',
        timeLabel: 'BAJA (Medical Leave)',
        colors: theme.shifts.baja,
      };
  }
}
