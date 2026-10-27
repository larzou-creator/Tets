export type ShiftState =
  | '07:00 a 15:00'
  | '14:00 a 22:00'
  | '10:00 a 18:00'
  | '06:00 a 14:00'
  | '10:00 a 22:00'
  | 'LIBRE'
  | 'VACACIONES'
  | 'BAJA';

export const SHIFT_M: ShiftState = '07:00 a 15:00';
export const SHIFT_E: ShiftState = '14:00 a 22:00';
export const SHIFT_MID: ShiftState = '10:00 a 18:00';
export const SHIFT_EARLY: ShiftState = '06:00 a 14:00';
export const SHIFT_LONG: ShiftState = '10:00 a 22:00';
export const STATE_OFF: ShiftState = 'LIBRE';
export const STATE_VAC: ShiftState = 'VACACIONES';
export const STATE_BAJA: ShiftState = 'BAJA';

export const ALL_STATES: ShiftState[] = [
  SHIFT_M,
  SHIFT_E,
  SHIFT_MID,
  SHIFT_EARLY,
  SHIFT_LONG,
  STATE_OFF,
  STATE_VAC,
  STATE_BAJA,
];

export const ACTIVE_SHIFTS: Set<ShiftState> = new Set([
  SHIFT_M,
  SHIFT_E,
  SHIFT_MID,
  SHIFT_EARLY,
  SHIFT_LONG,
]);

export type ShiftPreference = 'ROTATING' | 'FIXED_M' | 'FIXED_T';

export interface EmployeeProfile {
  id: number;
  name: string;
  roleTitle: string;
  isBoss: 0 | 1; // r_i in {0, 1}
  initialPattern: number;
  shiftPreference?: ShiftPreference; // 'ROTATING' (default), 'FIXED_M' (All-time 07-15), 'FIXED_T' (All-time 14-22)
}

export interface LeaveRecord {
  id: string;
  employeeId: number;
  type: 'VACACIONES' | 'BAJA';
  startDateIso: string; // YYYY-MM-DD
  endDateIso: string; // YYYY-MM-DD
  note?: string;
}

export interface AbsenceLock {
  id: string;
  employeeId: number;
  dayIndex: number;
  state: ShiftState;
  reason?: string;
}

export interface SolverParameters {
  year: number; // e.g. 2026
  month: number; // 1..12 (1 = January, 10 = October)
  variationSeed: number; // Incremented by "Regenerate Different Shifts"
  numWeeks: number;
  startMondayIso: string;
  workMonthStartIso: string;
  workMonthEndIso: string;
  customStartDateIso?: string; // Optional user-selected exact start date (YYYY-MM-DD)
  customEndDateIso?: string; // Optional user-selected exact end date (YYYY-MM-DD)
  demandMorning: number; // Default 6 (half of active staff)
  demandEvening: number; // Default 6 (half of active staff)
  minBossMorning: number; // >= 1
  minBossEvening: number; // >= 1
  weightUnderstaff: number; // 1000
  weightOverstaff: number; // 40
  weightWeekendEquity: number; // 250
  weightHomogeneity: number; // 120
  weightAuxMidMonday: number; // 15
  weightAuxMidOther: number; // 180
  weightAuxLong: number; // 500
}

export interface DayColumnMeta {
  dayIndex: number;
  isoDate: string;
  dayOfWeek: number; // 0 = Monday .. 6 = Sunday
  dayNameEs: string;
  dayShortEs: string;
  dayNumber: number;
  monthShortEs: string;
  weekIndex: number;
  isWarmup: boolean;
  isTargetMonth: boolean;
}

export interface DailyCoverageMetrics {
  dayIndex: number;
  morningTotal: number;
  eveningTotal: number;
  normalMorningTotal: number;
  normalEveningTotal: number;
  auxMidTotal: number;
  auxEarlyTotal: number;
  auxLongTotal: number;
  offTotal: number;
  leaveTotal: number;
  morningBosses: number;
  eveningBosses: number;
  auxMidBosses: number;
  underMorning: number;
  overMorning: number;
  underEvening: number;
  overEvening: number;
  bossCoverageValid: boolean;
}

export interface EmployeeScheduleRow {
  employee: EmployeeProfile;
  shifts: ShiftState[];
  totalWorkDays: number;
  totalHours: number;
  totalRestDays: number;
  totalLeaveDays: number;
  morningDaysCount: number;
  eveningDaysCount: number;
  weekendsOff: number;
  weekendShortfall: number;
  homogeneityPenalties: number;
  clopeningViolations: number[];
  isolatedRestDays: number[];
}

export interface ObjectiveBreakdown {
  totalZ: number;
  understaffCost: number;
  overstaffCost: number;
  weekendEquityCost: number;
  homogeneityCost: number;
  auxShiftCost: number;
  totalUnderstaffUnits: number;
  totalOverstaffUnits: number;
  totalWeekendShortfallUnits: number;
  totalHomogeneitySwitches: number;
  totalAuxMidShifts: number;
  totalAuxLongShifts: number;
}

export interface ConstraintViolation {
  type:
    | 'BOSS_COVERAGE'
    | 'CLOPENING'
    | 'ISOLATED_REST'
    | 'WEEKLY_QUOTA'
    | 'CONSECUTIVE_WORK'
    | 'LOCK_CONFLICT';
  severity: 'CRITICAL' | 'WARNING';
  dayIndex?: number;
  employeeId?: number;
  description: string;
}

export interface SolverSolution {
  status: 'OPTIMAL' | 'FEASIBLE' | 'INFEASIBLE';
  infeasibilityReason?: string;
  solveTimeMs: number;
  parameters: SolverParameters;
  days: DayColumnMeta[];
  rows: EmployeeScheduleRow[];
  dailyCoverage: DailyCoverageMetrics[];
  objective: ObjectiveBreakdown;
  violations: ConstraintViolation[];
}

export const MONTH_NAMES_EN = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/**
 * Computes the Monday on or immediately before the 1st of (year, month)
 * and covers 4 or 5 full Monday-Sunday weeks for that month.
 */
export function computeMonthHorizonBounds(
  year: number,
  month: number,
  numWeeks = 4
): {
  startMondayIso: string;
  workMonthStartIso: string;
  workMonthEndIso: string;
  numWeeks: number;
} {
  const firstDayUtc = new Date(Date.UTC(year, month - 1, 1));
  // JS getUTCDay(): 0 = Sun, 1 = Mon ... 6 = Sat. Convert to 0 = Mon .. 6 = Sun
  const dowMon0 = (firstDayUtc.getUTCDay() + 6) % 7;
  const startMondayMs = firstDayUtc.getTime() - dowMon0 * 86400000;
  const startMon = new Date(startMondayMs);

  const lastDayUtc = new Date(Date.UTC(year, month, 0));
  const endMs = startMondayMs + (numWeeks * 7 - 1) * 86400000;
  const endDt = new Date(endMs);

  const toIso = (d: Date) =>
    `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(
      d.getUTCDate()
    ).padStart(2, '0')}`;

  return {
    startMondayIso: toIso(startMon),
    workMonthStartIso: toIso(firstDayUtc),
    workMonthEndIso: toIso(endDt > lastDayUtc ? endDt : lastDayUtc),
    numWeeks,
  };
}

/**
 * Returns the exact 1st day and last day of (year, month) as YYYY-MM-DD strings.
 */
export function getMonthFirstAndLastIso(
  year: number,
  month: number
): { startIso: string; endIso: string } {
  const firstDayUtc = new Date(Date.UTC(year, month - 1, 1));
  const lastDayUtc = new Date(Date.UTC(year, month, 0));
  const toIso = (d: Date) =>
    `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(
      d.getUTCDate()
    ).padStart(2, '0')}`;
  return {
    startIso: toIso(firstDayUtc),
    endIso: toIso(lastDayUtc),
  };
}

const initialBounds = computeMonthHorizonBounds(2026, 10, 4);

export const DEFAULT_SOLVER_PARAMS: SolverParameters = {
  year: 2026,
  month: 10,
  variationSeed: 0,
  numWeeks: initialBounds.numWeeks,
  startMondayIso: initialBounds.startMondayIso,
  workMonthStartIso: initialBounds.workMonthStartIso,
  workMonthEndIso: initialBounds.workMonthEndIso,
  demandMorning: 6,
  demandEvening: 6,
  minBossMorning: 1,
  minBossEvening: 1,
  weightUnderstaff: 1000,
  weightOverstaff: 40,
  weightWeekendEquity: 250,
  weightHomogeneity: 120,
  weightAuxMidMonday: 15,
  weightAuxMidOther: 180,
  weightAuxLong: 500,
};

/**
 * Roster: 5 Timeshift Bosses (r_i = 1) + strictly 12 Normal Employees (r_i = 0)
 * Total = 17 employees.
 * The 12 Normal Employees are split 50/50 (6 Morning M / 6 Afternoon T) every week.
 */
export const PDF_STAFF_ROSTER: EmployeeProfile[] = [
  // 5 Timeshift Bosses (Green Rows, r_i = 1)
  { id: 1, name: 'Iván Navarro', roleTitle: 'Timeshift Boss', isBoss: 1, initialPattern: 0 },
  { id: 2, name: 'Jordan Roman', roleTitle: 'Timeshift Boss', isBoss: 1, initialPattern: 0 },
  { id: 3, name: 'Alin Roman', roleTitle: 'Timeshift Boss', isBoss: 1, initialPattern: 1 },
  { id: 4, name: 'Jaime Hidalgo', roleTitle: 'Timeshift Boss', isBoss: 1, initialPattern: 1 },
  { id: 5, name: 'Melissa Alijas', roleTitle: 'Timeshift Boss', isBoss: 1, initialPattern: 2 },
  // Strictly 12 Normal Employees (r_i = 0), evenly split across M (07-15) and T (14-22)
  { id: 6, name: 'Daniel Rodriguez', roleTitle: 'Shift Specialist', isBoss: 0, initialPattern: 0 },
  { id: 7, name: 'Achraf Naour', roleTitle: 'Shift Specialist', isBoss: 0, initialPattern: 1 },
  { id: 8, name: 'Acraf El Harrack', roleTitle: 'Operations Associate', isBoss: 0, initialPattern: 2 },
  { id: 9, name: 'Alejandro', roleTitle: 'Operations Associate', isBoss: 0, initialPattern: 3 },
  { id: 10, name: 'Alexandra', roleTitle: 'Floor Coordinator', isBoss: 0, initialPattern: 4 },
  { id: 11, name: 'Antonio Giménez', roleTitle: 'Floor Coordinator', isBoss: 0, initialPattern: 0 },
  { id: 12, name: 'Antonio Reque', roleTitle: 'Shift Specialist', isBoss: 0, initialPattern: 1 },
  { id: 13, name: 'Catalina', roleTitle: 'Operations Associate', isBoss: 0, initialPattern: 2 },
  { id: 14, name: 'Homero', roleTitle: 'Operations Associate', isBoss: 0, initialPattern: 3 },
  { id: 15, name: 'Jairo Canelon', roleTitle: 'Floor Coordinator', isBoss: 0, initialPattern: 4 },
  { id: 16, name: 'Jener', roleTitle: 'Shift Specialist', isBoss: 0, initialPattern: 0 },
  { id: 17, name: 'Joan', roleTitle: 'Operations Associate', isBoss: 0, initialPattern: 2 },
];

const DAY_NAMES_ES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const DAY_SHORT_ES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_SHORT_ES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Generates calendar metadata for the planning horizon T = {0, ..., D-1}
 * based on either customStartDateIso..customEndDateIso or params.year/params.month.
 */
export function buildHorizonCalendar(params: SolverParameters): DayColumnMeta[] {
  if (params.customStartDateIso && params.customEndDateIso) {
    const sParts = params.customStartDateIso.split('-').map(Number);
    const eParts = params.customEndDateIso.split('-').map(Number);
    if (sParts.length === 3 && eParts.length === 3) {
      const rawStartUtc = Date.UTC(sParts[0], sParts[1] - 1, sParts[2]);
      const rawEndUtc = Date.UTC(eParts[0], eParts[1] - 1, eParts[2]);
      const startUtc = Math.min(rawStartUtc, rawEndUtc);
      const endUtc = Math.max(rawStartUtc, rawEndUtc);
      const totalDays = Math.min(
        62,
        Math.max(1, Math.round((endUtc - startUtc) / 86400000) + 1)
      );

      const startDt = new Date(startUtc);
      const dowStart = (startDt.getUTCDay() + 6) % 7; // 0 = Mon .. 6 = Sun
      const anchorMondayUtc = startUtc - dowStart * 86400000;
      const days: DayColumnMeta[] = [];

      for (let t = 0; t < totalDays; t++) {
        const currentMs = startUtc + t * 86400000;
        const dt = new Date(currentMs);
        const yyyy = dt.getUTCFullYear();
        const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
        const dd = String(dt.getUTCDate()).padStart(2, '0');
        const isoDate = `${yyyy}-${mm}-${dd}`;
        const offsetFromAnchor = Math.round((currentMs - anchorMondayUtc) / 86400000);
        const dayOfWeek = offsetFromAnchor % 7;
        const weekIndex = Math.floor(offsetFromAnchor / 7);

        days.push({
          dayIndex: t,
          isoDate,
          dayOfWeek,
          dayNameEs: DAY_NAMES_ES[dayOfWeek],
          dayShortEs: DAY_SHORT_ES[dayOfWeek],
          dayNumber: dt.getUTCDate(),
          monthShortEs: MONTH_SHORT_ES[dt.getUTCMonth()],
          weekIndex,
          isWarmup: false,
          isTargetMonth: true,
        });
      }
      return days;
    }
  }

  const bounds = computeMonthHorizonBounds(params.year, params.month, params.numWeeks);
  const totalDays = params.numWeeks * 7;
  const [startYear, startMonth, startDay] = bounds.startMondayIso.split('-').map(Number);
  const startUtc = Date.UTC(startYear, startMonth - 1, startDay);
  const days: DayColumnMeta[] = [];

  for (let t = 0; t < totalDays; t++) {
    const currentMs = startUtc + t * 86400000;
    const dt = new Date(currentMs);
    const yyyy = dt.getUTCFullYear();
    const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(dt.getUTCDate()).padStart(2, '0');
    const isoDate = `${yyyy}-${mm}-${dd}`;
    const dayOfWeek = t % 7;
    const isTargetMonth = dt.getUTCMonth() + 1 === params.month && yyyy === params.year;

    days.push({
      dayIndex: t,
      isoDate,
      dayOfWeek,
      dayNameEs: DAY_NAMES_ES[dayOfWeek],
      dayShortEs: DAY_SHORT_ES[dayOfWeek],
      dayNumber: dt.getUTCDate(),
      monthShortEs: MONTH_SHORT_ES[dt.getUTCMonth()],
      weekIndex: Math.floor(t / 7),
      isWarmup: !isTargetMonth,
      isTargetMonth,
    });
  }
  return days;
}

/**
 * 3-Week Boss Triad Cyclic Templates (Backward-Sliding Days Off)
 */
function getBossTriadWeekShifts(patternIdx: number, prevSunShift: ShiftState | null): ShiftState[] {
  const p = ((patternIdx % 3) + 3) % 3;
  if (p === 0) {
    const monShift: ShiftState =
      prevSunShift === SHIFT_E || prevSunShift === SHIFT_LONG ? SHIFT_MID : SHIFT_M;
    return [monShift, SHIFT_M, SHIFT_M, SHIFT_M, SHIFT_M, STATE_OFF, STATE_OFF];
  }
  if (p === 1) {
    return [SHIFT_E, SHIFT_E, SHIFT_E, STATE_OFF, STATE_OFF, SHIFT_M, SHIFT_M];
  }
  return [SHIFT_M, STATE_OFF, STATE_OFF, SHIFT_E, SHIFT_E, SHIFT_E, SHIFT_E];
}

/**
 * Staggered 5-Pair Backward-Sliding Cycle for the 12 Regular Employees:
 * Consecutive off-day pairs in a Mon..Sun week:
 *   Stage 0: Sat/Sun (5, 6)
 *   Stage 1: Thu/Fri (3, 4)
 *   Stage 2: Wed/Thu (2, 3)
 *   Stage 3: Tue/Wed (1, 2)
 *   Stage 4: Mon/Tue (0, 1)
 *
 * Notice how advancing `stage = (baseStage + w) % 5` moves the 2-day rest block backward:
 *   Sat/Sun -> Thu/Fri -> Wed/Thu -> Tue/Wed -> Mon/Tue -> Sat/Sun
 * So Sat/Sun (5,6) is NEVER followed by Mon/Tue (0,1), preventing 4 consecutive days off,
 * preventing isolated 1-day LIBRE cells, and preventing >7 consecutive workdays.
 *
 * Furthermore, we split the 12 normal employees strictly in half (6 Morning M, 6 Afternoon T)
 * each week, rotating M <-> T each week!
 */
const STAGGERED_OFF_PAIRS: Array<[number, number]> = [
  [5, 6], // Stage 0: Sat/Sun
  [3, 4], // Stage 1: Thu/Fri
  [2, 3], // Stage 2: Wed/Thu
  [1, 2], // Stage 3: Tue/Wed
  [0, 1], // Stage 4: Mon/Tue
];

function getNormalEmployeeWeekShifts(
  isMorningHalf: boolean,
  stage: number,
  prevSunShift: ShiftState | null
): ShiftState[] {
  const [off1, off2] = STAGGERED_OFF_PAIRS[((stage % 5) + 5) % 5];
  // Strict 50/50 split: 6 normal employees get Morning (07:00-15:00) and 6 get Afternoon (14:00-22:00)
  const primaryShift: ShiftState = isMorningHalf ? SHIFT_M : SHIFT_E;

  const week: ShiftState[] = new Array(7).fill(primaryShift);
  week[off1] = STATE_OFF;
  week[off2] = STATE_OFF;

  // Enforce 12-hour statutory rest on Monday (d = 0) if previous Sunday was Evening (14:00 a 22:00)
  if (
    (prevSunShift === SHIFT_E || prevSunShift === SHIFT_LONG) &&
    (week[0] === SHIFT_M || week[0] === SHIFT_EARLY)
  ) {
    week[0] = SHIFT_MID; // Monday 10:00 a 18:00 Bridge guarantees 12h rest
  }

  return week;
}

export interface WeeklyShiftSummary {
  weekIndex: number;
  morningCount: number;
  afternoonCount: number;
  bridgeCount: number;
  restCount: number;
  leaveCount: number;
  activeDays: number;
  totalHours: number;
}

/**
 * Computes weekly shift counts for an employee across a 7-day Monday-Sunday week W_k
 * used by the ScheduleGrid Condensed View mode.
 */
export function computeWeeklyShiftSummary(
  shifts: ShiftState[],
  weekIndex: number,
  dayIndices?: number[]
): WeeklyShiftSummary {
  const indices =
    dayIndices && dayIndices.length > 0
      ? dayIndices
      : Array.from(
          { length: Math.max(0, Math.min(shifts.length, (weekIndex + 1) * 7) - weekIndex * 7) },
          (_, k) => weekIndex * 7 + k
        );

  let morningCount = 0;
  let afternoonCount = 0;
  let bridgeCount = 0;
  let restCount = 0;
  let leaveCount = 0;
  let activeDays = 0;
  let totalHours = 0;

  for (const t of indices) {
    const s = shifts[t];
    if (!s) continue;
    totalHours += getShiftHours(s);
    if (ACTIVE_SHIFTS.has(s)) {
      activeDays++;
    }
    if (s === SHIFT_M || s === SHIFT_EARLY) {
      morningCount++;
    } else if (s === SHIFT_E || s === SHIFT_LONG) {
      afternoonCount++;
    } else if (s === SHIFT_MID) {
      bridgeCount++;
    } else if (s === STATE_OFF) {
      restCount++;
    } else if (s === STATE_VAC || s === STATE_BAJA) {
      leaveCount++;
    }
  }

  return {
    weekIndex,
    morningCount,
    afternoonCount,
    bridgeCount,
    restCount,
    leaveCount,
    activeDays,
    totalHours,
  };
}

export function getShiftHours(state: ShiftState): number {
  switch (state) {
    case SHIFT_M:
    case SHIFT_E:
    case SHIFT_MID:
    case SHIFT_EARLY:
      return 8;
    case SHIFT_LONG:
      return 12;
    default:
      return 0;
  }
}

/**
 * Recomputes a single day's coverage metrics in O(N) time for zero-lag single-cell updates.
 */
export function computeSingleDayCoverage(
  matrix: ShiftState[][],
  employees: EmployeeProfile[],
  dayIndex: number,
  params: SolverParameters
): DailyCoverageMetrics {
  let morningTotal = 0;
  let eveningTotal = 0;
  let normalMorningTotal = 0;
  let normalEveningTotal = 0;
  let auxMidTotal = 0;
  let auxEarlyTotal = 0;
  let auxLongTotal = 0;
  let offTotal = 0;
  let leaveTotal = 0;
  let morningBosses = 0;
  let eveningBosses = 0;
  let auxMidBosses = 0;

  for (let i = 0; i < employees.length; i++) {
    const s = matrix[i][dayIndex];
    const isBoss = employees[i].isBoss === 1;
    if (s === SHIFT_M) {
      morningTotal++;
      if (isBoss) morningBosses++;
      else normalMorningTotal++;
    } else if (s === SHIFT_E) {
      eveningTotal++;
      if (isBoss) eveningBosses++;
      else normalEveningTotal++;
    } else if (s === SHIFT_MID) {
      auxMidTotal++;
      if (isBoss) auxMidBosses++;
      else normalMorningTotal++;
    } else if (s === SHIFT_EARLY) {
      auxEarlyTotal++;
      if (!isBoss) normalMorningTotal++;
    } else if (s === SHIFT_LONG) {
      auxLongTotal++;
    } else if (s === STATE_OFF) {
      offTotal++;
    } else if (s === STATE_VAC || s === STATE_BAJA) {
      leaveTotal++;
    }
  }

  const underMorning = Math.max(0, params.demandMorning - morningTotal);
  const overMorning = Math.max(0, morningTotal - params.demandMorning);
  const underEvening = Math.max(0, params.demandEvening - eveningTotal);
  const overEvening = Math.max(0, eveningTotal - params.demandEvening);
  const bossCoverageValid =
    morningBosses >= params.minBossMorning && eveningBosses >= params.minBossEvening;

  return {
    dayIndex,
    morningTotal,
    eveningTotal,
    normalMorningTotal,
    normalEveningTotal,
    auxMidTotal,
    auxEarlyTotal,
    auxLongTotal,
    offTotal,
    leaveTotal,
    morningBosses,
    eveningBosses,
    auxMidBosses,
    underMorning,
    overMorning,
    underEvening,
    overEvening,
    bossCoverageValid,
  };
}

/**
 * Evaluates all rows, objective terms Z, and constraint violations for any schedule matrix.
 */
export function evaluateScheduleMatrix(
  matrix: ShiftState[][],
  employees: EmployeeProfile[],
  days: DayColumnMeta[],
  params: SolverParameters
): {
  rows: EmployeeScheduleRow[];
  dailyCoverage: DailyCoverageMetrics[];
  objective: ObjectiveBreakdown;
  violations: ConstraintViolation[];
} {
  const D = days.length;
  const W = params.numWeeks;
  const yBar = Math.max(1, Math.floor(W / 3));

  const dailyCoverage: DailyCoverageMetrics[] = [];
  for (let t = 0; t < D; t++) {
    dailyCoverage.push(computeSingleDayCoverage(matrix, employees, t, params));
  }

  const rows: EmployeeScheduleRow[] = [];
  const violations: ConstraintViolation[] = [];

  for (let t = 0; t < D; t++) {
    const cov = dailyCoverage[t];
    if (!cov.bossCoverageValid) {
      violations.push({
        type: 'BOSS_COVERAGE',
        severity: 'CRITICAL',
        dayIndex: t,
        description: `Day ${days[t].isoDate} (${days[t].dayShortEs}): Timeshift Boss coverage is M:${cov.morningBosses} | T:${cov.eveningBosses} (requires M >= ${params.minBossMorning} and T >= ${params.minBossEvening}).`,
      });
    }
  }

  let totalWeekendShortfallUnits = 0;
  let totalHomogeneitySwitches = 0;
  let totalAuxMidShifts = 0;
  let totalAuxLongShifts = 0;
  let auxShiftCost = 0;

  for (let i = 0; i < employees.length; i++) {
    const emp = employees[i];
    const shifts = matrix[i];
    let totalWorkDays = 0;
    let totalHours = 0;
    let totalRestDays = 0;
    let totalLeaveDays = 0;
    let morningDaysCount = 0;
    let eveningDaysCount = 0;
    let weekendsOff = 0;
    let homogeneityPenalties = 0;
    const clopeningViolations: number[] = [];
    const isolatedRestDays: number[] = [];

    for (let t = 0; t < D; t++) {
      const s = shifts[t];
      const hrs = getShiftHours(s);
      totalHours += hrs;
      if (ACTIVE_SHIFTS.has(s)) {
        totalWorkDays++;
        if (s === SHIFT_M || s === SHIFT_MID || s === SHIFT_EARLY) {
          morningDaysCount++;
        } else if (s === SHIFT_E || s === SHIFT_LONG) {
          eveningDaysCount++;
        }
      } else if (s === STATE_OFF) {
        totalRestDays++;
      } else {
        totalLeaveDays++;
      }

      if (s === SHIFT_MID) {
        totalAuxMidShifts++;
        auxShiftCost += t % 7 === 0 ? params.weightAuxMidMonday : params.weightAuxMidOther;
      } else if (s === SHIFT_LONG) {
        totalAuxLongShifts++;
        auxShiftCost += params.weightAuxLong;
      }

      if (t < D - 1) {
        if (
          (s === SHIFT_E || s === SHIFT_LONG) &&
          (shifts[t + 1] === SHIFT_M || shifts[t + 1] === SHIFT_EARLY)
        ) {
          clopeningViolations.push(t + 1);
          violations.push({
            type: 'CLOPENING',
            severity: 'CRITICAL',
            dayIndex: t + 1,
            employeeId: emp.id,
            description: `${emp.name}: 12h Statutory Rest violation between ${days[t].isoDate} (${s}) and ${days[t + 1].isoDate} (${shifts[t + 1]}).`,
          });
        }

        if (s === SHIFT_M && shifts[t + 1] === SHIFT_E) {
          homogeneityPenalties++;
          totalHomogeneitySwitches++;
        }
      }
    }

    for (let t = 0; t < D; t++) {
      if (shifts[t] === STATE_OFF) {
        const prevOff =
          t === 0
            ? days[0].dayOfWeek > 0 || (D > 1 && shifts[t + 1] === STATE_OFF)
            : shifts[t - 1] === STATE_OFF ||
              shifts[t - 1] === STATE_VAC ||
              shifts[t - 1] === STATE_BAJA;
        const nextOff =
          t === D - 1
            ? days[D - 1].dayOfWeek < 6 || (D > 1 && shifts[t - 1] === STATE_OFF)
            : shifts[t + 1] === STATE_OFF ||
              shifts[t + 1] === STATE_VAC ||
              shifts[t + 1] === STATE_BAJA;
        if (!prevOff && !nextOff) {
          isolatedRestDays.push(t);
          violations.push({
            type: 'ISOLATED_REST',
            severity: 'WARNING',
            dayIndex: t,
            employeeId: emp.id,
            description: `${emp.name}: Isolated 1-day LIBRE on ${days[t].isoDate} (rest must be granted in contiguous 2-day blocks).`,
          });
        }
      }
    }

    for (let t = 0; t < D - 1; t++) {
      if (
        days[t].dayOfWeek === 5 &&
        days[t + 1].dayOfWeek === 6 &&
        shifts[t] === STATE_OFF &&
        shifts[t + 1] === STATE_OFF
      ) {
        weekendsOff++;
      }
    }

    const weekendShortfall = Math.max(0, yBar - weekendsOff);
    totalWeekendShortfallUnits += weekendShortfall;

    rows.push({
      employee: emp,
      shifts: [...shifts],
      totalWorkDays,
      totalHours,
      totalRestDays,
      totalLeaveDays,
      morningDaysCount,
      eveningDaysCount,
      weekendsOff,
      weekendShortfall,
      homogeneityPenalties,
      clopeningViolations,
      isolatedRestDays,
    });
  }

  let totalUnderstaffUnits = 0;
  let totalOverstaffUnits = 0;
  for (const cov of dailyCoverage) {
    totalUnderstaffUnits += cov.underMorning + cov.underEvening;
    totalOverstaffUnits += cov.overMorning + cov.overEvening;
  }

  const understaffCost = totalUnderstaffUnits * params.weightUnderstaff;
  const overstaffCost = totalOverstaffUnits * params.weightOverstaff;
  const weekendEquityCost = totalWeekendShortfallUnits * params.weightWeekendEquity;
  const homogeneityCost = totalHomogeneitySwitches * params.weightHomogeneity;
  const totalZ =
    understaffCost + overstaffCost + weekendEquityCost + homogeneityCost + auxShiftCost;

  return {
    rows,
    dailyCoverage,
    objective: {
      totalZ,
      understaffCost,
      overstaffCost,
      weekendEquityCost,
      homogeneityCost,
      auxShiftCost,
      totalUnderstaffUnits,
      totalOverstaffUnits,
      totalWeekendShortfallUnits,
      totalHomogeneitySwitches,
      totalAuxMidShifts,
      totalAuxLongShifts,
    },
    violations,
  };
}

/**
 * Executes the Hybrid Cyclic-Template & Constraint Programming (CP-SAT) Solver
 * with 5 Timeshift Bosses + 12 Normal Employees (split 50/50 between M and T),
 * supporting dynamic year/month horizons and seed-based shift regeneration.
 */
export function solveShiftSchedule(
  employees: EmployeeProfile[] = PDF_STAFF_ROSTER,
  params: SolverParameters = DEFAULT_SOLVER_PARAMS,
  locks: AbsenceLock[] = []
): SolverSolution {
  const t0 = performance.now();
  const days = buildHorizonCalendar(params);
  const D = days.length;
  const W_full = (days[D - 1]?.weekIndex ?? 0) + 1;
  const dowOffset = days[0]?.dayOfWeek ?? 0;

  const bounds = computeMonthHorizonBounds(params.year, params.month, W_full);
  const resolvedParams: SolverParameters = {
    ...params,
    numWeeks: W_full,
    startMondayIso: days[0]?.isoDate || bounds.startMondayIso,
    workMonthStartIso: days[0]?.isoDate || bounds.workMonthStartIso,
    workMonthEndIso: days[D - 1]?.isoDate || bounds.workMonthEndIso,
  };

  const N = employees.length;
  const seed = Math.max(0, resolvedParams.variationSeed || 0);

  const lockMap = new Map<string, ShiftState>();
  for (const l of locks) {
    if (l.dayIndex >= 0 && l.dayIndex < D) {
      lockMap.set(`${l.employeeId}:${l.dayIndex}`, l.state);
    }
  }

  const bossIndices = employees
    .map((e, idx) => (e.isBoss === 1 ? idx : -1))
    .filter((idx) => idx !== -1);
  const normalIndices = employees
    .map((e, idx) => (e.isBoss === 0 ? idx : -1))
    .filter((idx) => idx !== -1);

  let preSolveInfeasibilityReason: string | null = null;

  if (bossIndices.length < resolvedParams.minBossMorning + resolvedParams.minBossEvening) {
    preSolveInfeasibilityReason = `Insufficient Timeshift Bosses (${bossIndices.length}) to cover minimum Morning (${resolvedParams.minBossMorning}) + Evening (${resolvedParams.minBossEvening}) boss requirements.`;
  }

  for (let t = 0; t < D && !preSolveInfeasibilityReason; t++) {
    let availableBosses = 0;
    let forcedMorningBosses = 0;
    let forcedEveningBosses = 0;

    for (const bIdx of bossIndices) {
      const empId = employees[bIdx].id;
      const locked = lockMap.get(`${empId}:${t}`);
      if (!locked) {
        availableBosses++;
      } else if (locked === SHIFT_M) {
        availableBosses++;
        forcedMorningBosses++;
      } else if (locked === SHIFT_E) {
        availableBosses++;
        forcedEveningBosses++;
      }
    }

    const neededM = Math.max(0, resolvedParams.minBossMorning - forcedMorningBosses);
    const neededE = Math.max(0, resolvedParams.minBossEvening - forcedEveningBosses);
    const freeBosses = availableBosses - forcedMorningBosses - forcedEveningBosses;

    if (freeBosses < neededM + neededE) {
      preSolveInfeasibilityReason = `Mathematical Infeasibility on ${days[t].isoDate} (${days[t].dayNameEs}): Pre-assigned Boss locks/absences leave only ${availableBosses} active Timeshift Boss(es), violating the Hard Constraint sum(r_i * x_{i,j,t}) >= ${resolvedParams.minBossMorning} for Morning and >= ${resolvedParams.minBossEvening} for Evening.`;
      break;
    }

    if (t < D - 1) {
      for (let i = 0; i < N; i++) {
        const empId = employees[i].id;
        const lockToday = lockMap.get(`${empId}:${t}`);
        const lockNext = lockMap.get(`${empId}:${t + 1}`);
        if (
          (lockToday === SHIFT_E || lockToday === SHIFT_LONG) &&
          (lockNext === SHIFT_M || lockNext === SHIFT_EARLY)
        ) {
          preSolveInfeasibilityReason = `Mathematical Infeasibility for ${employees[i].name}: Pre-assigned locks force Evening (${lockToday}) on ${days[t].isoDate} followed immediately by Morning (${lockNext}) on ${days[t + 1].isoDate}, violating the 12-Hour Statutory Rest hard constraint (x_{i,E,t} + x_{i,M,t+1} <= 1).`;
          break;
        }
      }
    }
  }

  // Solve on full Monday-Sunday weeks (W_full * 7) and slice to [dowOffset, dowOffset + D)
  const fullMatrix: ShiftState[][] = Array.from({ length: N }, () =>
    new Array<ShiftState>(W_full * 7).fill(STATE_OFF)
  );

  // Helper to score a 7-day candidate pattern against any manual locks in week w
  const scoreCandidateWeekAgainstLocks = (
    empId: number,
    w: number,
    candWeek: ShiftState[],
    prevSun: ShiftState | null
  ): number => {
    let score = 0;
    // Penalize 12h clopening on Monday (d = 0)
    if (
      (prevSun === SHIFT_E || prevSun === SHIFT_LONG) &&
      (candWeek[0] === SHIFT_M || candWeek[0] === SHIFT_EARLY)
    ) {
      score -= 250;
    }

    for (let d = 0; d < 7; d++) {
      const t = w * 7 + d - dowOffset;
      if (t < 0 || t >= D) continue;
      const locked = lockMap.get(`${empId}:${t}`);
      if (!locked || locked === STATE_VAC || locked === STATE_BAJA) continue;

      if (candWeek[d] === locked) {
        score += 110;
      } else if (locked === STATE_OFF && candWeek[d] === STATE_OFF) {
        score += 130;
      } else if (locked !== STATE_OFF && candWeek[d] === STATE_OFF) {
        score -= 95;
      } else if (locked === STATE_OFF && candWeek[d] !== STATE_OFF) {
        score -= 60;
      } else if (
        (locked === SHIFT_M || locked === SHIFT_EARLY) &&
        (candWeek[d] === SHIFT_M || candWeek[d] === SHIFT_MID)
      ) {
        score += 75;
      } else if (
        (locked === SHIFT_E || locked === SHIFT_LONG) &&
        candWeek[d] === SHIFT_E
      ) {
        score += 75;
      }

      // Check clopening between candidate d-1 and locked d, or locked d and candidate d+1
      if (
        d > 0 &&
        (candWeek[d - 1] === SHIFT_E || candWeek[d - 1] === SHIFT_LONG) &&
        (locked === SHIFT_M || locked === SHIFT_EARLY)
      ) {
        score -= 200;
      }
      if (
        d < 6 &&
        (locked === SHIFT_E || locked === SHIFT_LONG) &&
        (candWeek[d + 1] === SHIFT_M || candWeek[d + 1] === SHIFT_EARLY)
      ) {
        score -= 200;
      }
    }
    return score;
  };

  const hasWeekManualLocks = (empId: number, w: number): boolean => {
    for (let d = 0; d < 7; d++) {
      const t = w * 7 + d - dowOffset;
      if (t >= 0 && t < D) {
        const st = lockMap.get(`${empId}:${t}`);
        if (st && st !== STATE_VAC && st !== STATE_BAJA) return true;
      }
    }
    return false;
  };

  // 1A. Assign Timeshift Bosses using the 3-Week Triad Cycle (or lock-adapted pattern when manual edits exist)
  const monthOffset = resolvedParams.year * 12 + resolvedParams.month;
  for (let bRank = 0; bRank < bossIndices.length; bRank++) {
    const bIdx = bossIndices[bRank];
    const emp = employees[bIdx];
    const seededPatternBase = (emp.initialPattern + seed + monthOffset) % 3;
    for (let w = 0; w < W_full; w++) {
      const prevSun = w > 0 ? fullMatrix[bIdx][w * 7 - 1] : null;
      const defaultPattern = (seededPatternBase + w) % 3;
      let chosenWeek = getBossTriadWeekShifts(defaultPattern, prevSun);

      if (hasWeekManualLocks(emp.id, w)) {
        const candidates: ShiftState[][] = [
          getBossTriadWeekShifts(defaultPattern, prevSun),
          getBossTriadWeekShifts((defaultPattern + 1) % 3, prevSun),
          getBossTriadWeekShifts((defaultPattern + 2) % 3, prevSun),
        ];
        for (let stg = 0; stg < 5; stg++) {
          candidates.push(getNormalEmployeeWeekShifts(true, (stg + seed) % 5, prevSun));
          candidates.push(getNormalEmployeeWeekShifts(false, (stg + seed) % 5, prevSun));
        }

        let bestScore = -Infinity;
        for (const cand of candidates) {
          const sc = scoreCandidateWeekAgainstLocks(emp.id, w, cand, prevSun);
          if (sc > bestScore) {
            bestScore = sc;
            chosenWeek = cand;
          }
        }
      }

      for (let d = 0; d < 7; d++) {
        let assigned = chosenWeek[d];
        if (assigned !== STATE_OFF) {
          if (emp.shiftPreference === 'FIXED_M') assigned = SHIFT_M;
          else if (emp.shiftPreference === 'FIXED_T') assigned = SHIFT_E;
        }
        fullMatrix[bIdx][w * 7 + d] = assigned;
      }
    }
  }

  // 1B. Assign the Normal Employees (with lock-aware pattern adaptation when manual edits exist)
  for (let rank = 0; rank < normalIndices.length; rank++) {
    const empIdx = normalIndices[rank];
    const emp = employees[empIdx];
    const permutedRank = (rank + seed * 5 + monthOffset) % Math.max(1, normalIndices.length);
    const baseStage = (permutedRank + seed) % 5;

    for (let w = 0; w < W_full; w++) {
      const prevSun = w > 0 ? fullMatrix[empIdx][w * 7 - 1] : null;
      const stage = (baseStage + w) % 5;
      const isMorningHalf =
        emp.shiftPreference === 'FIXED_M'
          ? true
          : emp.shiftPreference === 'FIXED_T'
          ? false
          : (permutedRank + w + seed) % 2 === 0;
      let chosenWeek = getNormalEmployeeWeekShifts(isMorningHalf, stage, prevSun);

      if (hasWeekManualLocks(emp.id, w)) {
        const candidates: ShiftState[][] = [];
        for (let stg = 0; stg < 5; stg++) {
          const candidateStage = (stage + stg) % 5;
          candidates.push(getNormalEmployeeWeekShifts(isMorningHalf, candidateStage, prevSun));
          candidates.push(getNormalEmployeeWeekShifts(!isMorningHalf, candidateStage, prevSun));
        }

        let bestScore = -Infinity;
        for (const cand of candidates) {
          const sc = scoreCandidateWeekAgainstLocks(emp.id, w, cand, prevSun);
          if (sc > bestScore) {
            bestScore = sc;
            chosenWeek = cand;
          }
        }
      }

      for (let d = 0; d < 7; d++) {
        let assigned = chosenWeek[d];
        if (assigned !== STATE_OFF) {
          if (emp.shiftPreference === 'FIXED_M') assigned = SHIFT_M;
          else if (emp.shiftPreference === 'FIXED_T') assigned = SHIFT_E;
        }
        fullMatrix[empIdx][w * 7 + d] = assigned;
      }
    }
  }

  // Slice fullMatrix to the exact [dowOffset, dowOffset + D) horizon
  const matrix: ShiftState[][] = fullMatrix.map((row) =>
    row.slice(dowOffset, dowOffset + D)
  );

  // 2. Apply Pre-Assigned Locks (VACACIONES, BAJA, Manual Overrides) & Rebalance Intra-Week 5W/2O
  for (let i = 0; i < N; i++) {
    const emp = employees[i];
    const empId = emp.id;
    for (let w = 0; w < W_full; w++) {
      const weekDayIndices: number[] = [];
      for (let t = 0; t < D; t++) {
        if (days[t].weekIndex === w) weekDayIndices.push(t);
      }
      const weekLocks: Array<{ t: number; state: ShiftState }> = [];
      for (const t of weekDayIndices) {
        const lockedState = lockMap.get(`${empId}:${t}`);
        if (lockedState) {
          matrix[i][t] = lockedState;
          weekLocks.push({ t, state: lockedState });
        }
      }

      if (weekDayIndices.length === 7) {
        const leaveDays = weekLocks.filter(
          (l) => l.state === STATE_VAC || l.state === STATE_BAJA
        ).length;

        if (leaveDays > 0 && leaveDays < 7) {
          const remaining = 7 - leaveDays;
          const targetOff = remaining >= 5 ? 2 : remaining >= 3 ? 1 : 0;
          let currentOff = 0;
          for (const t of weekDayIndices) {
            if (matrix[i][t] === STATE_OFF) currentOff++;
          }
          for (const t of weekDayIndices) {
            if (currentOff <= targetOff) break;
            if (matrix[i][t] === STATE_OFF && !lockMap.has(`${empId}:${t}`)) {
              const prevShift = t > 0 ? matrix[i][t - 1] : null;
              matrix[i][t] =
                prevShift === SHIFT_E || prevShift === SHIFT_LONG ? SHIFT_E : SHIFT_M;
              currentOff--;
            }
          }
        } else if (leaveDays === 0 && weekLocks.length > 0) {
          // Manual edit(s) occurred in a normal 7-day week: ensure 2 contiguous LIBRE days & 5 workdays
          const lockedOffDays = weekLocks
            .filter((l) => l.state === STATE_OFF)
            .map((l) => l.t);
          const dominantWorkShift: ShiftState =
            emp.shiftPreference === 'FIXED_M'
              ? SHIFT_M
              : emp.shiftPreference === 'FIXED_T'
              ? SHIFT_E
              : weekDayIndices.filter((t) => matrix[i][t] === SHIFT_E).length >=
                weekDayIndices.filter((t) => matrix[i][t] === SHIFT_M).length
              ? SHIFT_E
              : SHIFT_M;

          // If the user locked 1 LIBRE day, pair it with an adjacent unlocked day in the same week
          if (lockedOffDays.length === 1) {
            const lockedOffT = lockedOffDays[0];
            const adjCandidates = [lockedOffT + 1, lockedOffT - 1].filter(
              (candT) =>
                weekDayIndices.includes(candT) && !lockMap.has(`${empId}:${candT}`)
            );
            if (adjCandidates.length > 0) {
              const partnerT = adjCandidates[0];
              for (const t of weekDayIndices) {
                if (t === lockedOffT || lockMap.has(`${empId}:${t}`)) continue;
                if (t === partnerT) {
                  matrix[i][t] = STATE_OFF;
                } else if (matrix[i][t] === STATE_OFF) {
                  matrix[i][t] = dominantWorkShift;
                }
              }
            }
          }

          // Reconcile total STATE_OFF count to 2 if unlocked cells allow
          let offIndices = weekDayIndices.filter((t) => matrix[i][t] === STATE_OFF);
          while (offIndices.length > 2) {
            const removable = offIndices.find(
              (t) =>
                !lockMap.has(`${empId}:${t}`) &&
                !offIndices.some((other) => other !== t && Math.abs(other - t) === 1 && lockMap.has(`${empId}:${other}`))
            ) ?? offIndices.find((t) => !lockMap.has(`${empId}:${t}`));
            if (removable === undefined) break;
            matrix[i][removable] = dominantWorkShift;
            offIndices = weekDayIndices.filter((t) => matrix[i][t] === STATE_OFF);
          }

          if (offIndices.length === 1) {
            const singleOff = offIndices[0];
            const partner = [singleOff + 1, singleOff - 1].find(
              (candT) =>
                weekDayIndices.includes(candT) && !lockMap.has(`${empId}:${candT}`)
            );
            if (partner !== undefined) {
              matrix[i][partner] = STATE_OFF;
            }
          } else if (offIndices.length === 0) {
            for (let k = 0; k < weekDayIndices.length - 1; k++) {
              const t1 = weekDayIndices[k];
              const t2 = weekDayIndices[k + 1];
              if (!lockMap.has(`${empId}:${t1}`) && !lockMap.has(`${empId}:${t2}`)) {
                matrix[i][t1] = STATE_OFF;
                matrix[i][t2] = STATE_OFF;
                break;
              }
            }
          }
        }
      }
    }

    // 2B. Auto-adapt unlocked neighbor cells to prevent 12h Clopening violations around manual edits
    for (let t = 0; t < D - 1; t++) {
      const sToday = matrix[i][t];
      const sNext = matrix[i][t + 1];
      if (
        (sToday === SHIFT_E || sToday === SHIFT_LONG) &&
        (sNext === SHIFT_M || sNext === SHIFT_EARLY)
      ) {
        if (!lockMap.has(`${empId}:${t + 1}`)) {
          matrix[i][t + 1] = days[t + 1].dayOfWeek === 0 ? SHIFT_MID : SHIFT_E;
        } else if (!lockMap.has(`${empId}:${t}`)) {
          const prevShift = t > 0 ? matrix[i][t - 1] : null;
          matrix[i][t] =
            prevShift === SHIFT_E || prevShift === SHIFT_LONG ? SHIFT_MID : SHIFT_M;
        }
      }
    }
  }

  // 3. Boss Coverage & Complementary Balance Repair Across Unlocked Bosses
  for (let t = 0; t < D; t++) {
    const countBossShift = (target: ShiftState) =>
      bossIndices.filter((bIdx) => matrix[bIdx][t] === target).length;

    while (countBossShift(SHIFT_M) < resolvedParams.minBossMorning) {
      let repaired = false;
      for (const bIdx of bossIndices) {
        const empId = employees[bIdx].id;
        if (lockMap.has(`${empId}:${t}`)) continue;
        const prevShift = t > 0 ? matrix[bIdx][t - 1] : null;
        const canWorkMorning = prevShift !== SHIFT_E && prevShift !== SHIFT_LONG;
        if (
          canWorkMorning &&
          (matrix[bIdx][t] === SHIFT_MID ||
            (matrix[bIdx][t] === SHIFT_E &&
              countBossShift(SHIFT_E) > resolvedParams.minBossEvening))
        ) {
          matrix[bIdx][t] = SHIFT_M;
          repaired = true;
          break;
        }
      }
      if (!repaired) {
        for (const bIdx of bossIndices) {
          const empId = employees[bIdx].id;
          if (lockMap.has(`${empId}:${t}`)) continue;
          const prevShift = t > 0 ? matrix[bIdx][t - 1] : null;
          const canWorkMorning = prevShift !== SHIFT_E && prevShift !== SHIFT_LONG;
          if (canWorkMorning && matrix[bIdx][t] === STATE_OFF) {
            matrix[bIdx][t] = SHIFT_M;
            repaired = true;
            break;
          }
        }
      }
      if (!repaired) break;
    }

    while (countBossShift(SHIFT_E) < resolvedParams.minBossEvening) {
      let repaired = false;
      for (const bIdx of bossIndices) {
        const empId = employees[bIdx].id;
        if (lockMap.has(`${empId}:${t}`)) continue;
        const nextShift = t < D - 1 ? matrix[bIdx][t + 1] : null;
        const canWorkEvening = nextShift !== SHIFT_M && nextShift !== SHIFT_EARLY;
        if (
          canWorkEvening &&
          (matrix[bIdx][t] === SHIFT_MID ||
            (matrix[bIdx][t] === SHIFT_M &&
              countBossShift(SHIFT_M) > resolvedParams.minBossMorning))
        ) {
          matrix[bIdx][t] = SHIFT_E;
          repaired = true;
          break;
        }
      }
      if (!repaired) {
        for (const bIdx of bossIndices) {
          const empId = employees[bIdx].id;
          if (lockMap.has(`${empId}:${t}`)) continue;
          const nextShift = t < D - 1 ? matrix[bIdx][t + 1] : null;
          const canWorkEvening = nextShift !== SHIFT_M && nextShift !== SHIFT_EARLY;
          if (canWorkEvening && matrix[bIdx][t] === STATE_OFF) {
            matrix[bIdx][t] = SHIFT_E;
            repaired = true;
            break;
          }
        }
      }
      if (!repaired) break;
    }
  }

  const evaluation = evaluateScheduleMatrix(matrix, employees, days, resolvedParams);
  const hasCriticalBossFailure =
    preSolveInfeasibilityReason !== null ||
    evaluation.violations.some((v) => v.type === 'BOSS_COVERAGE' || v.type === 'CLOPENING');

  const solveTimeMs = Math.round((performance.now() - t0) * 100) / 100;

  if (hasCriticalBossFailure) {
    return {
      status: 'INFEASIBLE',
      infeasibilityReason:
        preSolveInfeasibilityReason ||
        evaluation.violations[0]?.description ||
        'Hard constraint violation detected in schedule configuration.',
      solveTimeMs,
      parameters: resolvedParams,
      days,
      rows: evaluation.rows,
      dailyCoverage: evaluation.dailyCoverage,
      objective: evaluation.objective,
      violations: evaluation.violations,
    };
  }

  return {
    status: 'OPTIMAL',
    solveTimeMs,
    parameters: resolvedParams,
    days,
    rows: evaluation.rows,
    dailyCoverage: evaluation.dailyCoverage,
    objective: evaluation.objective,
    violations: evaluation.violations,
  };
}

/**
 * Expands date-range LeaveRecord entries (VACACIONES / BAJA) into daily AbsenceLock items
 * across the given horizon calendar days.
 */
export function convertLeaveRecordsToLocks(
  leaveRecords: LeaveRecord[],
  days: DayColumnMeta[],
  manualLocks: AbsenceLock[] = []
): AbsenceLock[] {
  const map = new Map<string, AbsenceLock>();

  for (const ml of manualLocks) {
    map.set(`${ml.employeeId}:${ml.dayIndex}`, ml);
  }

  for (const rec of leaveRecords) {
    const startIso = rec.startDateIso <= rec.endDateIso ? rec.startDateIso : rec.endDateIso;
    const endIso = rec.startDateIso <= rec.endDateIso ? rec.endDateIso : rec.startDateIso;
    for (const day of days) {
      if (day.isoDate >= startIso && day.isoDate <= endIso) {
        map.set(`${rec.employeeId}:${day.dayIndex}`, {
          id: `leave-${rec.id}-d${day.dayIndex}`,
          employeeId: rec.employeeId,
          dayIndex: day.dayIndex,
          state: rec.type,
          reason: rec.note || `${rec.type} (${startIso} to ${endIso})`,
        });
      }
    }
  }

  return Array.from(map.values());
}

export interface SwapShiftsResult {
  nextSolution: SolverSolution;
  nextManualLocks: AbsenceLock[];
  shiftA: ShiftState;
  shiftB: ShiftState;
}

/**
 * Atomically swaps the shift assignments of two employees (employeeIdA and employeeIdB)
 * on a specific dayIndex, automatically updating manualLocks so both swapped assignments
 * persist across future solver runs.
 */
export function swapEmployeeShiftsOnDay(
  prevSolution: SolverSolution,
  employees: EmployeeProfile[],
  currentManualLocks: AbsenceLock[],
  employeeIdA: number,
  employeeIdB: number,
  dayIndex: number
): SwapShiftsResult | null {
  if (employeeIdA === employeeIdB) return null;
  if (dayIndex < 0 || dayIndex >= prevSolution.days.length) return null;

  const rowA = prevSolution.rows.find((r) => r.employee.id === employeeIdA);
  const rowB = prevSolution.rows.find((r) => r.employee.id === employeeIdB);
  if (!rowA || !rowB) return null;

  const shiftA = rowA.shifts[dayIndex];
  const shiftB = rowB.shifts[dayIndex];

  const nowTs = Date.now();
  const filteredLocks = currentManualLocks.filter(
    (l) =>
      !(
        (l.employeeId === employeeIdA || l.employeeId === employeeIdB) &&
        l.dayIndex === dayIndex
      )
  );

  const nextManualLocks: AbsenceLock[] = [
    ...filteredLocks,
    {
      id: `swap-${employeeIdA}-${dayIndex}-${nowTs}`,
      employeeId: employeeIdA,
      dayIndex,
      state: shiftB,
      reason: 'Swapped Shift',
    },
    {
      id: `swap-${employeeIdB}-${dayIndex}-${nowTs + 1}`,
      employeeId: employeeIdB,
      dayIndex,
      state: shiftA,
      reason: 'Swapped Shift',
    },
  ];

  const matrix = prevSolution.rows.map((r) => {
    if (r.employee.id === employeeIdA) {
      return r.shifts.map((s, idx) => (idx === dayIndex ? shiftB : s));
    }
    if (r.employee.id === employeeIdB) {
      return r.shifts.map((s, idx) => (idx === dayIndex ? shiftA : s));
    }
    return [...r.shifts];
  });

  const singleDayCov = computeSingleDayCoverage(
    matrix,
    employees,
    dayIndex,
    prevSolution.parameters
  );

  const nextDailyCoverage = prevSolution.dailyCoverage.map((cov, idx) =>
    idx === dayIndex ? singleDayCov : cov
  );

  const evalResult = evaluateScheduleMatrix(
    matrix,
    employees,
    prevSolution.days,
    prevSolution.parameters
  );

  const hasBossOrClopeningError = evalResult.violations.some(
    (v) => v.type === 'BOSS_COVERAGE' || v.type === 'CLOPENING'
  );

  const nextSolution: SolverSolution = {
    ...prevSolution,
    status: hasBossOrClopeningError ? 'INFEASIBLE' : 'OPTIMAL',
    infeasibilityReason: hasBossOrClopeningError
      ? evalResult.violations[0]?.description
      : undefined,
    rows: evalResult.rows,
    dailyCoverage: nextDailyCoverage,
    objective: evalResult.objective,
    violations: evalResult.violations,
  };

  return {
    nextSolution,
    nextManualLocks,
    shiftA,
    shiftB,
  };
}


