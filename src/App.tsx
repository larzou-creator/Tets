import React, { useCallback, useMemo, useState } from 'react';
import {
  AbsenceLock,
  buildHorizonCalendar,
  computeMonthHorizonBounds,
  computeSingleDayCoverage,
  convertLeaveRecordsToLocks,
  DEFAULT_SOLVER_PARAMS,
  EmployeeProfile,
  evaluateScheduleMatrix,
  getMonthFirstAndLastIso,
  LeaveRecord,
  MONTH_NAMES_EN,
  PDF_STAFF_ROSTER,
  SHIFT_E,
  SHIFT_M,
  SHIFT_MID,
  ShiftPreference,
  ShiftState,
  SolverParameters,
  SolverSolution,
  solveShiftSchedule,
  STATE_BAJA,
  STATE_OFF,
  STATE_VAC,
  swapEmployeeShiftsOnDay,
} from './solver/cpsatSolver';
import { ScheduleGrid } from './components/ScheduleGrid';
import { EmployeeManagementDashboard } from './components/EmployeeManagementDashboard';
import { exportFullMonthSchedulePdf } from './utils/exportSchedulePdf';
import {
  AppColorTheme,
  DEFAULT_COLOR_THEME,
  getShiftThemeColors,
} from './utils/themeColors';
import {
  AppLanguage,
  I18N_DICTIONARY,
  MONTH_NAMES_ES,
} from './utils/i18n';

type ActiveWorkspaceTab = 'schedule' | 'dashboard';

const INITIAL_OCTOBER_DATES = getMonthFirstAndLastIso(2026, 10);
const INITIAL_APP_PARAMS: SolverParameters = {
  ...DEFAULT_SOLVER_PARAMS,
  customStartDateIso: INITIAL_OCTOBER_DATES.startIso, // 2026-10-01
  customEndDateIso: INITIAL_OCTOBER_DATES.endIso, // 2026-10-31
};

export default function App() {
  const [language, setLanguage] = useState<AppLanguage>('en');
  const i18n = I18N_DICTIONARY[language];

  const [activeTab, setActiveTab] = useState<ActiveWorkspaceTab>('schedule');
  const [employees, setEmployees] = useState<EmployeeProfile[]>(PDF_STAFF_ROSTER);
  const [params, setParams] = useState<SolverParameters>(INITIAL_APP_PARAMS);
  const [leaveRecords, setLeaveRecords] = useState<LeaveRecord[]>([]);
  const [manualLocks, setManualLocks] = useState<AbsenceLock[]>([]);
  const [colorTheme, setColorTheme] = useState<AppColorTheme>(DEFAULT_COLOR_THEME);

  const [solution, setSolution] = useState<SolverSolution>(() =>
    solveShiftSchedule(PDF_STAFF_ROSTER, INITIAL_APP_PARAMS, [])
  );

  // Dismissible alert-danger state when Infeasible or Critical Boss violation occurs
  const [dismissedAlertMessage, setDismissedAlertMessage] = useState<string | null>(null);

  // Filter, Condensed Whole-Month (No Week Gaps), Quick-Paint & Swap Shifts controls
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'BOSS' | 'NORMAL'>('ALL');
  const [weekFilter, setWeekFilter] = useState<number | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeBrush, setActiveBrush] = useState<ShiftState | null>(null);
  const [isSwapMode, setIsSwapMode] = useState<boolean>(false);
  const [swapSource, setSwapSource] = useState<{
    employeeId: number;
    dayIndex: number;
  } | null>(null);
  const [lastSwapEvent, setLastSwapEvent] = useState<{
    empAName: string;
    shiftACode: string;
    empBName: string;
    shiftBCode: string;
    isoDate: string;
  } | null>(null);

  const [isCondensedView, setIsCondensedView] = useState<boolean>(true);
  const [collapsedWeeks, setCollapsedWeeks] = useState<Set<number>>(() => new Set());

  const combinedLocks = useMemo(() => {
    return convertLeaveRecordsToLocks(leaveRecords, solution.days, manualLocks);
  }, [leaveRecords, manualLocks, solution.days]);

  const lockedKeys = useMemo(() => {
    const s = new Set<string>();
    for (const l of combinedLocks) {
      s.add(`${l.employeeId}:${l.dayIndex}`);
    }
    return s;
  }, [combinedLocks]);

  const executeSolver = useCallback(
    (
      nextEmployees: EmployeeProfile[],
      nextParams: SolverParameters,
      nextLeaves: LeaveRecord[],
      nextManualLocks: AbsenceLock[]
    ) => {
      const days = buildHorizonCalendar(nextParams);
      const allLocks = convertLeaveRecordsToLocks(nextLeaves, days, nextManualLocks);
      const nextSol = solveShiftSchedule(nextEmployees, nextParams, allLocks);
      setDismissedAlertMessage(null);
      setSolution(nextSol);
    },
    []
  );

  /**
   * 1. Add a new employee from the Employee Management Dashboard
   */
  const handleAddEmployee = useCallback(
    (name: string, isBoss: 0 | 1, shiftPreference: ShiftPreference) => {
      setEmployees((prev) => {
        const nextId = prev.reduce((max, emp) => Math.max(max, emp.id), 0) + 1;
        const nextEmp: EmployeeProfile = {
          id: nextId,
          name,
          roleTitle: isBoss ? 'Boss' : 'Staff',
          isBoss,
          initialPattern: prev.length % (isBoss ? 3 : 5),
          shiftPreference,
        };
        const updated = [...prev, nextEmp];
        executeSolver(updated, params, leaveRecords, manualLocks);
        return updated;
      });
    },
    [executeSolver, params, leaveRecords, manualLocks]
  );

  /**
   * 2. Edit an employee's name, role, or shiftPreference (Rotating / All-Time M / All-Time T)
   */
  const handleUpdateEmployee = useCallback(
    (
      employeeId: number,
      patch: Partial<Pick<EmployeeProfile, 'name' | 'isBoss' | 'shiftPreference'>>
    ) => {
      setEmployees((prev) => {
        const updated = prev.map((emp) =>
          emp.id === employeeId ? { ...emp, ...patch } : emp
        );
        executeSolver(updated, params, leaveRecords, manualLocks);
        return updated;
      });
    },
    [executeSolver, params, leaveRecords, manualLocks]
  );

  /**
   * 3. Remove an employee from the roster
   */
  const handleRemoveEmployee = useCallback(
    (employeeId: number) => {
      setEmployees((prev) => {
        const updated = prev.filter((e) => e.id !== employeeId);
        const nextLeaves = leaveRecords.filter((l) => l.employeeId !== employeeId);
        const nextManual = manualLocks.filter((l) => l.employeeId !== employeeId);
        setLeaveRecords(nextLeaves);
        setManualLocks(nextManual);
        executeSolver(updated, params, nextLeaves, nextManual);
        return updated;
      });
    },
    [executeSolver, params, leaveRecords, manualLocks]
  );

  /**
   * 4. Bulk set All Normal Staff (or All Staff) to Morning (M), Afternoon (T), or Rotating
   */
  const handleBulkSetShiftPreference = useCallback(
    (pref: ShiftPreference, targetRole: 'NORMAL' | 'ALL') => {
      setEmployees((prev) => {
        const updated = prev.map((emp) => {
          if (targetRole === 'NORMAL' && emp.isBoss === 1) return emp;
          return { ...emp, shiftPreference: pref };
        });
        executeSolver(updated, params, leaveRecords, manualLocks);
        return updated;
      });
    },
    [executeSolver, params, leaveRecords, manualLocks]
  );

  /**
   * 5. Add or Edit a Vacation (VACACIONES) or Medical Leave (BAJA) date-range record
   */
  const handleSaveLeaveRecord = useCallback(
    (record: Omit<LeaveRecord, 'id'>, editId?: string) => {
      setLeaveRecords((prev) => {
        const nextLeaves = editId
          ? prev.map((r) => (r.id === editId ? { ...record, id: editId } : r))
          : [...prev, { ...record, id: `lv-${Date.now()}` }];
        executeSolver(employees, params, nextLeaves, manualLocks);
        return nextLeaves;
      });
    },
    [executeSolver, employees, params, manualLocks]
  );

  /**
   * 6. Delete a Vacation / Baja record
   */
  const handleDeleteLeaveRecord = useCallback(
    (id: string) => {
      setLeaveRecords((prev) => {
        const nextLeaves = prev.filter((r) => r.id !== id);
        executeSolver(employees, params, nextLeaves, manualLocks);
        return nextLeaves;
      });
    },
    [executeSolver, employees, params, manualLocks]
  );

  /**
   * 7. Clear all Leaves & Manual Locks
   */
  const handleClearAllLocksAndLeaves = useCallback(() => {
    setLeaveRecords([]);
    setManualLocks([]);
    setSwapSource(null);
    setLastSwapEvent(null);
    executeSolver(employees, params, [], []);
  }, [executeSolver, employees, params]);

  /**
   * 8A. Generate Shifts Based on Manual Edits (preserves 100% of manualLocks & swapped shifts, adapting the rest of the schedule around them)
   */
  const handleGenerateBasedOnManualEdits = useCallback(() => {
    setParams((prev) => {
      const nextParams: SolverParameters = {
        ...prev,
        variationSeed: (prev.variationSeed || 0) + 1,
      };
      executeSolver(employees, nextParams, leaveRecords, manualLocks);
      return nextParams;
    });
  }, [executeSolver, employees, leaveRecords, manualLocks]);

  /**
   * 8B. Regenerate Different Shifts (fresh schedule across the entire horizon, clearing temporary manual cell locks)
   */
  const handleRegenerateDifferentShifts = useCallback(() => {
    setManualLocks([]);
    setSwapSource(null);
    setLastSwapEvent(null);
    setParams((prev) => {
      const nextParams: SolverParameters = {
        ...prev,
        variationSeed: (prev.variationSeed || 0) + 1,
      };
      executeSolver(employees, nextParams, leaveRecords, []);
      return nextParams;
    });
  }, [executeSolver, employees, leaveRecords]);

  /**
   * 8C. Unlock a single manual cell override
   */
  const handleUnlockCell = useCallback(
    (employeeId: number, dayIndex: number) => {
      setManualLocks((prev) => {
        const nextManual = prev.filter(
          (l) => !(l.employeeId === employeeId && l.dayIndex === dayIndex)
        );
        executeSolver(employees, params, leaveRecords, nextManual);
        return nextManual;
      });
    },
    [executeSolver, employees, params, leaveRecords]
  );

  /**
   * 8D. Clear only manual cell edits (keeping Vacation / Baja records intact)
   */
  const handleClearManualLocks = useCallback(() => {
    setManualLocks([]);
    setSwapSource(null);
    setLastSwapEvent(null);
    executeSolver(employees, params, leaveRecords, []);
  }, [executeSolver, employees, params, leaveRecords]);

  /**
   * 9A. Change Month or Year (automatically sets Start Date = 1st of month, End Date = Last day of month)
   */
  const handleMonthYearChange = useCallback(
    (nextYear: number, nextMonth: number) => {
      const { startIso, endIso } = getMonthFirstAndLastIso(nextYear, nextMonth);
      const bounds = computeMonthHorizonBounds(nextYear, nextMonth, 4);
      const nextParams: SolverParameters = {
        ...params,
        year: nextYear,
        month: nextMonth,
        customStartDateIso: startIso,
        customEndDateIso: endIso,
        startMondayIso: bounds.startMondayIso,
        workMonthStartIso: startIso,
        workMonthEndIso: endIso,
      };
      setParams(nextParams);
      setWeekFilter('ALL');
      setManualLocks([]);
      setSwapSource(null);
      setLastSwapEvent(null);
      executeSolver(employees, nextParams, leaveRecords, []);
    },
    [executeSolver, employees, params, leaveRecords]
  );

  /**
   * 9B. Change Custom Start Date or End Date directly
   */
  const handleCustomDateRangeChange = useCallback(
    (nextStartIso: string, nextEndIso: string) => {
      if (!nextStartIso || !nextEndIso) return;
      const [yStr, mStr] = nextEndIso.split('-');
      const nextYear = Number(yStr) || params.year;
      const nextMonth = Number(mStr) || params.month;
      const nextParams: SolverParameters = {
        ...params,
        year: nextYear,
        month: nextMonth,
        customStartDateIso: nextStartIso,
        customEndDateIso: nextEndIso,
        workMonthStartIso: nextStartIso,
        workMonthEndIso: nextEndIso,
      };
      setParams(nextParams);
      setWeekFilter('ALL');
      setManualLocks([]);
      setSwapSource(null);
      setLastSwapEvent(null);
      executeSolver(employees, nextParams, leaveRecords, []);
    },
    [executeSolver, employees, params, leaveRecords]
  );

  /**
   * 9C. Quick Preset: 25th of Previous Month to 25th of Selected Month
   */
  const handleSet25thTo25thCycle = useCallback(() => {
    const prevDate = new Date(Date.UTC(params.year, params.month - 2, 25));
    const currDate = new Date(Date.UTC(params.year, params.month - 1, 25));
    const toIso = (d: Date) =>
      `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(
        d.getUTCDate()
      ).padStart(2, '0')}`;
    handleCustomDateRangeChange(toIso(prevDate), toIso(currDate));
  }, [params.year, params.month, handleCustomDateRangeChange]);

  /**
   * 10. Toggle collapse/expand on an individual week column
   */
  const handleToggleCollapseWeek = useCallback((weekIndex: number) => {
    setCollapsedWeeks((prev) => {
      const next = new Set(prev);
      if (next.has(weekIndex)) {
        next.delete(weekIndex);
      } else {
        next.add(weekIndex);
      }
      return next;
    });
  }, []);

  /**
   * 11A. Zero-Lag Single-Cell Mutation
   */
  const handleOverrideCell = useCallback(
    (employeeId: number, dayIndex: number, newState: ShiftState, lockCell: boolean) => {
      if (lockCell) {
        setManualLocks((prev) => {
          const filtered = prev.filter(
            (l) => !(l.employeeId === employeeId && l.dayIndex === dayIndex)
          );
          return [
            ...filtered,
            {
              id: `${employeeId}-${dayIndex}-${Date.now()}`,
              employeeId,
              dayIndex,
              state: newState,
              reason: 'Manual Cell Override',
            },
          ];
        });
      }

      setSolution((prev) => {
        const matrix = prev.rows.map((r) =>
          r.employee.id === employeeId
            ? r.shifts.map((s, idx) => (idx === dayIndex ? newState : s))
            : [...r.shifts]
        );

        const singleDayCov = computeSingleDayCoverage(
          matrix,
          employees,
          dayIndex,
          prev.parameters
        );

        const nextDailyCoverage = prev.dailyCoverage.map((cov, idx) =>
          idx === dayIndex ? singleDayCov : cov
        );

        const evalResult = evaluateScheduleMatrix(
          matrix,
          employees,
          prev.days,
          prev.parameters
        );

        const hasBossOrClopeningError = evalResult.violations.some(
          (v) => v.type === 'BOSS_COVERAGE' || v.type === 'CLOPENING'
        );

        if (hasBossOrClopeningError) {
          setDismissedAlertMessage(null);
        }

        return {
          ...prev,
          status: hasBossOrClopeningError ? 'INFEASIBLE' : 'OPTIMAL',
          infeasibilityReason: hasBossOrClopeningError
            ? evalResult.violations[0]?.description
            : undefined,
          rows: evalResult.rows,
          dailyCoverage: nextDailyCoverage,
          objective: evalResult.objective,
          violations: evalResult.violations,
        };
      });
    },
    [employees]
  );

  /**
   * 11B. Swap Shifts Between Two Employees on a Specific Date (automatically locks both cells in manualLocks)
   */
  const handleSwapEmployeesOnDay = useCallback(
    (employeeIdA: number, employeeIdB: number, dayIndex: number) => {
      const swapRes = swapEmployeeShiftsOnDay(
        solution,
        employees,
        manualLocks,
        employeeIdA,
        employeeIdB,
        dayIndex
      );
      if (!swapRes) return;

      const empA = employees.find((e) => e.id === employeeIdA);
      const empB = employees.find((e) => e.id === employeeIdB);
      const dayMeta = solution.days[dayIndex];
      const infoA = getShiftThemeColors(swapRes.shiftA, colorTheme);
      const infoB = getShiftThemeColors(swapRes.shiftB, colorTheme);

      setManualLocks(swapRes.nextManualLocks);
      setSolution(swapRes.nextSolution);
      setSwapSource(null);

      if (swapRes.nextSolution.status === 'INFEASIBLE') {
        setDismissedAlertMessage(null);
      }

      if (empA && empB && dayMeta) {
        setLastSwapEvent({
          empAName: empA.name,
          shiftACode: infoA.code,
          empBName: empB.name,
          shiftBCode: infoB.code,
          isoDate: dayMeta.isoDate,
        });
      }
    },
    [solution, employees, manualLocks, colorTheme]
  );

  /**
   * 11C. Two-Click Toolbar Swap Shifts Cell Handler
   */
  const handleSwapCellClick = useCallback(
    (employeeId: number, dayIndex: number) => {
      if (!swapSource) {
        setSwapSource({ employeeId, dayIndex });
        return;
      }
      if (swapSource.employeeId === employeeId && swapSource.dayIndex === dayIndex) {
        setSwapSource(null);
        return;
      }
      if (swapSource.dayIndex !== dayIndex) {
        // Switch swap origin to the newly clicked date column
        setSwapSource({ employeeId, dayIndex });
        return;
      }
      // Same dayIndex, different employee: perform the shift swap!
      handleSwapEmployeesOnDay(swapSource.employeeId, employeeId, dayIndex);
    },
    [swapSource, handleSwapEmployeesOnDay]
  );

  const handleSimulateInfeasibleConflict = useCallback(() => {
    const bossIds = employees.filter((e) => e.isBoss === 1).map((e) => e.id);
    const conflictLocks: AbsenceLock[] = bossIds.map((empId) => ({
      id: `infeasible-boss-${empId}`,
      employeeId: empId,
      dayIndex: Math.min(4, Math.max(0, solution.days.length - 1)),
      state: STATE_BAJA,
      reason: 'Infeasibility Stress Test (All Bosses BAJA)',
    }));
    setManualLocks(conflictLocks);
    executeSolver(employees, params, leaveRecords, conflictLocks);
  }, [executeSolver, employees, params, leaveRecords, solution.days.length]);

  const handleExportPdf = useCallback(() => {
    exportFullMonthSchedulePdf(solution, colorTheme, language);
  }, [solution, colorTheme, language]);

  const activeAlertText =
    solution.status === 'INFEASIBLE'
      ? solution.infeasibilityReason || i18n.alertDefaultReason
      : null;

  const showInfeasibleAlert =
    activeAlertText !== null && dismissedAlertMessage !== activeAlertText;

  const validCoverageDaysCount = solution.dailyCoverage.filter(
    (c) => c.bossCoverageValid
  ).length;

  const totalScheduledHours = useMemo(
    () => solution.rows.reduce((acc, r) => acc + r.totalHours, 0),
    [solution.rows]
  );

  const bossCount = useMemo(
    () => employees.filter((e) => e.isBoss === 1).length,
    [employees]
  );

  const normalRows = useMemo(
    () => solution.rows.filter((r) => r.employee.isBoss === 0),
    [solution.rows]
  );

  const normalMorningShiftsTotal = useMemo(
    () => normalRows.reduce((acc, r) => acc + r.morningDaysCount, 0),
    [normalRows]
  );

  const normalEveningShiftsTotal = useMemo(
    () => normalRows.reduce((acc, r) => acc + r.eveningDaysCount, 0),
    [normalRows]
  );

  const monthNames = language === 'es' ? MONTH_NAMES_ES : MONTH_NAMES_EN;
  const selectedMonthName = monthNames[params.month - 1] || 'October';
  const startDateIso =
    params.customStartDateIso || solution.days[0]?.isoDate || '2026-10-01';
  const endDateIso =
    params.customEndDateIso ||
    solution.days[solution.days.length - 1]?.isoDate ||
    '2026-10-31';
  const totalWeeksInHorizon =
    (solution.days[solution.days.length - 1]?.weekIndex ?? 0) + 1;

  const swapSourceEmployee = swapSource
    ? employees.find((e) => e.id === swapSource.employeeId)
    : null;
  const swapSourceDay = swapSource ? solution.days[swapSource.dayIndex] : null;
  const swapSourceShiftCode =
    swapSource && swapSourceEmployee
      ? getShiftThemeColors(
          solution.rows.find((r) => r.employee.id === swapSource.employeeId)?.shifts[
            swapSource.dayIndex
          ] || STATE_OFF,
          colorTheme
        ).code
      : '';

  return (
    <div className="min-h-screen w-full bg-[#F4F5FB] text-slate-900 flex flex-col">
      {/* Full-Width Edge-to-Edge Main Container */}
      <main className="flex-1 w-full px-2 py-2 space-y-2">
        {/* Dismissible Alert-Danger Banner when Solver State is INFEASIBLE */}
        {showInfeasibleAlert && (
          <div
            role="alert"
            data-testid="infeasible-alert-banner"
            className="alert alert-danger alert-dismissible rounded-xl bg-rose-50 border border-rose-300 px-3.5 py-2 text-rose-950 flex items-center justify-between gap-4 shadow-2xs"
          >
            <div className="text-xs leading-relaxed">
              <strong className="font-bold text-rose-800 mr-2">
                {i18n.alertConflictTitle}
              </strong>
              <span>{activeAlertText}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {combinedLocks.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllLocksAndLeaves}
                  className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white whitespace-nowrap"
                >
                  {i18n.btnResetLocksAndRepair}
                </button>
              )}
              <button
                type="button"
                onClick={() => setDismissedAlertMessage(activeAlertText)}
                aria-label="Dismiss infeasibility alert"
                className="px-2.5 py-1 rounded-lg bg-white hover:bg-rose-100 border border-rose-300 text-xs font-semibold text-rose-800 whitespace-nowrap"
              >
                {i18n.btnDismissAlert}
              </button>
            </div>
          </div>
        )}

        {/* Full-Width Workspace Card */}
        <div className="w-full bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          {/* Top Accent Bar */}
          <div
            style={{ backgroundColor: colorTheme.accentHex }}
            className="h-1.5 w-full"
          />

          <div className="p-3 space-y-2.5">
            {/* ORGANIZED ROW 1: Single-Line Title + Workspace Tabs on Left | Language Switcher & Action Buttons on Right */}
            <div
              data-testid="top-header-bar"
              className="flex flex-wrap xl:flex-nowrap items-center justify-between gap-2 border-b border-slate-200 pb-2.5"
            >
              <div className="flex flex-wrap xl:flex-nowrap items-center gap-2 min-w-0">
                <div className="flex items-center gap-2 shrink-0">
                  <h1
                    data-testid="app-main-title"
                    className="text-base 2xl:text-lg font-extrabold text-slate-900 tracking-tight whitespace-nowrap"
                  >
                    {i18n.appTitle}
                  </h1>
                  <span
                    style={{
                      backgroundColor: `${colorTheme.accentHex}15`,
                      color: colorTheme.accentHex,
                    }}
                    className="px-1.5 py-0.5 rounded-md text-[10.5px] font-mono font-bold whitespace-nowrap shrink-0"
                  >
                    {startDateIso} → {endDateIso} ({solution.days.length}d)
                  </span>
                </div>

                {/* Primary Workspace Switcher */}
                <div
                  className="inline-flex items-center p-0.5 rounded-lg bg-slate-100 border border-slate-200 shrink-0"
                  role="tablist"
                  aria-label="Switch between Schedule Sheet and Employee Management Dashboard"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'schedule'}
                    onClick={() => setActiveTab('schedule')}
                    data-testid="tab-schedule-sheet"
                    style={
                      activeTab === 'schedule'
                        ? { backgroundColor: colorTheme.accentHex, color: '#ffffff' }
                        : undefined
                    }
                    className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all whitespace-nowrap ${
                      activeTab === 'schedule'
                        ? 'shadow-2xs'
                        : 'text-slate-700 hover:text-slate-900'
                    }`}
                  >
                    {i18n.tabScheduleSheet} ({employees.length})
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'dashboard'}
                    onClick={() => setActiveTab('dashboard')}
                    data-testid="tab-employee-dashboard"
                    style={
                      activeTab === 'dashboard'
                        ? { backgroundColor: colorTheme.accentHex, color: '#ffffff' }
                        : undefined
                    }
                    className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all whitespace-nowrap ${
                      activeTab === 'dashboard'
                        ? 'shadow-2xs'
                        : 'text-slate-700 hover:text-slate-900'
                    }`}
                  >
                    {i18n.tabManageDashboard}
                  </button>
                </div>
              </div>

              {/* Right-Side Primary Action Buttons + Compact Spanish/English Switcher on 1 Line */}
              <div className="flex flex-wrap xl:flex-nowrap items-center gap-1.5 shrink-0">
                {/* Compact Bilingual Language Switcher (EN | ES) */}
                <div
                  className="inline-flex items-center p-0.5 rounded-lg bg-slate-100 border border-slate-300 shrink-0"
                  role="group"
                  aria-label={i18n.langSwitchTooltip}
                >
                  <button
                    type="button"
                    onClick={() => setLanguage('en')}
                    data-testid="lang-en-btn"
                    title="Switch to English"
                    className={`px-2 py-1 rounded-md text-xs font-mono font-bold transition-colors whitespace-nowrap ${
                      language === 'en'
                        ? 'bg-slate-900 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    EN
                  </button>
                  <button
                    type="button"
                    onClick={() => setLanguage('es')}
                    data-testid="lang-es-btn"
                    title="Cambiar a Español"
                    className={`px-2 py-1 rounded-md text-xs font-mono font-bold transition-colors whitespace-nowrap ${
                      language === 'es'
                        ? 'bg-slate-900 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    ES
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleGenerateBasedOnManualEdits}
                  data-testid="generate-from-manual-btn"
                  title={i18n.btnGenerateFromManualTooltip}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold shadow-2xs transition-all whitespace-nowrap flex items-center gap-1.5 border shrink-0 ${
                    manualLocks.length > 0
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-700 ring-2 ring-emerald-500/30'
                      : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-300'
                  }`}
                >
                  <span>{i18n.btnGenerateFromManual}</span>
                  <span
                    data-testid="manual-locks-count-badge"
                    className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-extrabold ${
                      manualLocks.length > 0
                        ? 'bg-white/25 text-white'
                        : 'bg-emerald-200/80 text-emerald-950'
                    }`}
                  >
                    {i18n.lockedCountBadge(manualLocks.length)}
                  </span>
                </button>

                {manualLocks.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearManualLocks}
                    data-testid="clear-manual-locks-btn"
                    title={i18n.btnClearManualTooltip}
                    className="px-2 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
                  >
                    {i18n.btnClearManual(manualLocks.length)}
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleRegenerateDifferentShifts}
                  data-testid="regenerate-shifts-btn"
                  style={{ backgroundColor: colorTheme.accentHex }}
                  title={i18n.btnRegenerateShiftsTooltip}
                  className="px-2.5 py-1.5 rounded-lg hover:opacity-90 text-xs font-bold text-white shadow-2xs transition-opacity whitespace-nowrap shrink-0"
                >
                  {i18n.btnRegenerateShifts}
                </button>

                <button
                  type="button"
                  onClick={handleSimulateInfeasibleConflict}
                  className="px-2 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-xs font-semibold text-rose-700 border border-rose-200 transition-colors whitespace-nowrap shrink-0"
                >
                  {i18n.btnSimulateConflict}
                </button>

                <button
                  type="button"
                  onClick={handleExportPdf}
                  data-testid="export-pdf-btn"
                  className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-xs font-bold text-white shadow-2xs transition-colors whitespace-nowrap shrink-0"
                >
                  {i18n.btnExportPdf}
                </button>
              </div>
            </div>

            {/* ORGANIZED ROW 2: 4-Column Control & KPI Strip */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-2.5">
              {/* Card 1 (5 cols): Schedule Period Selector — Exact Start Day & End Day + Quick Month/Year */}
              <div className="xl:col-span-5 rounded-xl border border-slate-200 bg-slate-50/90 px-3 py-2 flex flex-col justify-between gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold text-slate-500 tracking-wide">
                    {i18n.kpiPeriodTitle}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleMonthYearChange(params.year, params.month)}
                      data-testid="preset-full-month-btn"
                      className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 whitespace-nowrap"
                      title={i18n.presetFullMonthTooltip}
                    >
                      {i18n.presetFullMonth}
                    </button>
                    <button
                      type="button"
                      onClick={handleSet25thTo25thCycle}
                      data-testid="preset-25th-cycle-btn"
                      className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 whitespace-nowrap"
                      title={i18n.preset25thCycleTooltip}
                    >
                      {i18n.preset25thCycle}
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-md px-2 py-0.5">
                    <label
                      htmlFor="horizon-start-date"
                      className="text-[10px] font-bold text-slate-500"
                    >
                      {i18n.labelStart}
                    </label>
                    <input
                      id="horizon-start-date"
                      data-testid="horizon-start-date"
                      type="date"
                      value={startDateIso}
                      onChange={(e) =>
                        handleCustomDateRangeChange(e.target.value, endDateIso)
                      }
                      className="text-xs font-mono font-bold text-slate-900 bg-transparent focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-md px-2 py-0.5">
                    <label
                      htmlFor="horizon-end-date"
                      className="text-[10px] font-bold text-slate-500"
                    >
                      {i18n.labelEnd}
                    </label>
                    <input
                      id="horizon-end-date"
                      data-testid="horizon-end-date"
                      type="date"
                      value={endDateIso}
                      onChange={(e) =>
                        handleCustomDateRangeChange(startDateIso, e.target.value)
                      }
                      className="text-xs font-mono font-bold text-slate-900 bg-transparent focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-md px-1.5 py-0.5 ml-auto">
                    <select
                      id="select-month"
                      aria-label="Select schedule month"
                      value={params.month}
                      onChange={(e) =>
                        handleMonthYearChange(params.year, Number(e.target.value))
                      }
                      className="text-xs font-semibold text-slate-800 bg-transparent focus:outline-none"
                    >
                      {monthNames.map((mName, idx) => (
                        <option key={mName} value={idx + 1}>
                          {mName.slice(0, 3)}
                        </option>
                      ))}
                    </select>
                    <select
                      id="select-year"
                      aria-label="Select schedule year"
                      value={params.year}
                      onChange={(e) =>
                        handleMonthYearChange(Number(e.target.value), params.month)
                      }
                      className="text-xs font-mono font-semibold text-slate-800 bg-transparent focus:outline-none"
                    >
                      {[2025, 2026, 2027, 2028, 2029].map((yr) => (
                        <option key={yr} value={yr}>
                          {yr}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Card 2 (3 cols): Normal Staff M / T Distribution */}
              <div className="xl:col-span-3 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 flex flex-col justify-between">
                <div className="text-[10px] font-bold text-slate-500">
                  {i18n.kpiNormalStaffTitle(normalRows.length)}
                </div>
                <div className="text-base font-extrabold text-amber-700 font-mono tabular-nums">
                  {i18n.kpiMorningAfternoonSummary(
                    normalMorningShiftsTotal,
                    normalEveningShiftsTotal
                  )}
                </div>
                <div className="text-[10.5px] text-slate-500 font-mono tabular-nums">
                  {i18n.kpiActiveLeaveRecords(leaveRecords.length)}
                </div>
              </div>

              {/* Card 3 (2 cols): Hours Scheduled */}
              <div className="xl:col-span-2 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 flex flex-col justify-between">
                <div className="text-[10px] font-bold text-slate-500">
                  {i18n.kpiHoursTitle(
                    selectedMonthName.slice(0, 3).toUpperCase(),
                    params.year
                  )}
                </div>
                <div className="text-base font-extrabold text-slate-900 font-mono tabular-nums">
                  {totalScheduledHours.toLocaleString()} h
                </div>
                <div className="text-[10.5px] text-slate-500 font-mono tabular-nums">
                  {i18n.kpiBossesNormalSummary(bossCount, normalRows.length)}
                </div>
              </div>

              {/* Card 4 (2 cols): Boss Coverage & Statutory Rest */}
              <div className="xl:col-span-2 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 flex flex-col justify-between">
                <div className="text-[10px] font-bold text-slate-500">
                  {i18n.kpiBossCoverageTitle}
                </div>
                <div className="text-base font-extrabold font-mono tabular-nums flex items-center gap-1.5">
                  <span
                    data-testid="solver-status-indicator"
                    className={
                      solution.status === 'OPTIMAL'
                        ? 'text-emerald-600'
                        : 'text-rose-600'
                    }
                  >
                    {solution.status}
                  </span>
                  <span className="text-slate-300">·</span>
                  <span className="text-slate-900 text-xs">
                    {validCoverageDaysCount}/{solution.days.length}d
                  </span>
                </div>
                <div className="text-[10.5px] text-slate-500 font-mono tabular-nums truncate">
                  {colorTheme.name} · #{params.variationSeed + 1}
                </div>
              </div>
            </div>

            {/* TAB 1: SEPARATE EMPLOYEE, VACATION/BAJA & COLOR MANAGEMENT DASHBOARD */}
            {activeTab === 'dashboard' && (
              <EmployeeManagementDashboard
                employees={employees}
                days={solution.days}
                leaveRecords={leaveRecords}
                colorTheme={colorTheme}
                language={language}
                onAddEmployee={handleAddEmployee}
                onUpdateEmployee={handleUpdateEmployee}
                onRemoveEmployee={handleRemoveEmployee}
                onBulkSetShiftPreference={handleBulkSetShiftPreference}
                onSaveLeaveRecord={handleSaveLeaveRecord}
                onDeleteLeaveRecord={handleDeleteLeaveRecord}
                onClearAllLeaves={handleClearAllLocksAndLeaves}
                onChangeColorTheme={setColorTheme}
                onSwitchToSchedule={() => setActiveTab('schedule')}
              />
            )}

            {/* TAB 2: EXCEL-STYLE SCHEDULE SHEET */}
            {activeTab === 'schedule' && (
              <div className="space-y-2">
                {/* ORGANIZED ROW 3: Single-Line Paint Shift, Swap Shifts & View Toolbar */}
                <div
                  data-testid="schedule-toolbar-bar"
                  className="flex flex-wrap xl:flex-nowrap items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5"
                >
                  {/* Left: Quick Paint Shift Brushes + Swap Shifts Mode Toggle on 1 Line */}
                  <div className="flex flex-wrap xl:flex-nowrap items-center gap-1 shrink-0">
                    <span className="text-[10px] font-bold text-slate-500 mr-0.5">
                      {i18n.labelPaintShift}
                    </span>
                    {(
                      [
                        { label: i18n.brushMorning, shift: SHIFT_M, cfg: colorTheme.shifts.morning },
                        { label: i18n.brushBridge, shift: SHIFT_MID, cfg: colorTheme.shifts.bridge },
                        { label: i18n.brushAfternoon, shift: SHIFT_E, cfg: colorTheme.shifts.afternoon },
                        { label: i18n.brushLibre, shift: STATE_OFF, cfg: colorTheme.shifts.rest },
                        { label: i18n.brushVac, shift: STATE_VAC, cfg: colorTheme.shifts.vacation },
                        { label: i18n.brushBaja, shift: STATE_BAJA, cfg: colorTheme.shifts.baja },
                      ] as const
                    ).map((item) => {
                      const active = activeBrush === item.shift;
                      return (
                        <button
                          key={item.shift}
                          type="button"
                          onClick={() => {
                            setIsSwapMode(false);
                            setSwapSource(null);
                            setActiveBrush(active ? null : item.shift);
                          }}
                          style={{
                            backgroundColor: item.cfg.bgHex,
                            color: item.cfg.textHex,
                            borderColor: item.cfg.borderHex,
                          }}
                          className={`px-2 py-0.5 rounded text-[10.5px] font-mono font-semibold border transition-all whitespace-nowrap ${
                            active ? 'ring-2 ring-slate-900 scale-102' : 'hover:opacity-85'
                          }`}
                        >
                          {item.label}
                        </button>
                      );
                    })}
                    {activeBrush && (
                      <button
                        type="button"
                        onClick={() => setActiveBrush(null)}
                        className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-900 text-white whitespace-nowrap"
                      >
                        {i18n.btnDonePainting}
                      </button>
                    )}

                    <span className="text-slate-300 mx-0.5">|</span>

                    {/* Swap Shifts Mode Toggle Button */}
                    <button
                      type="button"
                      data-testid="swap-shifts-mode-btn"
                      onClick={() => {
                        setActiveBrush(null);
                        setIsSwapMode((prev) => {
                          const next = !prev;
                          if (!next) setSwapSource(null);
                          return next;
                        });
                      }}
                      className={`px-2.5 py-0.5 rounded-md text-[10.5px] font-bold border transition-all whitespace-nowrap ${
                        isSwapMode
                          ? 'bg-indigo-600 text-white border-indigo-700 ring-2 ring-indigo-500/30 shadow-2xs'
                          : 'bg-indigo-50 text-indigo-900 border-indigo-300 hover:bg-indigo-100'
                      }`}
                    >
                      {isSwapMode ? i18n.btnSwapShiftsActive : i18n.btnSwapShiftsMode}
                    </button>
                  </div>

                  {/* Right: Role Filter, Week Filter, Condensed Whole-Month (No Gaps) Toggle & Search on 1 Line */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <div
                      className="flex items-center gap-0.5 p-0.5 bg-white border border-slate-200 rounded-lg"
                      role="group"
                      aria-label="Filter employees by role"
                    >
                      <button
                        type="button"
                        onClick={() => setRoleFilter('ALL')}
                        className={`px-2 py-0.5 text-[10.5px] font-semibold rounded transition-colors whitespace-nowrap ${
                          roleFilter === 'ALL'
                            ? 'bg-slate-900 text-white'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {i18n.filterAll(employees.length)}
                      </button>
                      <button
                        type="button"
                        onClick={() => setRoleFilter('BOSS')}
                        className={`px-2 py-0.5 text-[10.5px] font-semibold rounded transition-colors whitespace-nowrap ${
                          roleFilter === 'BOSS'
                            ? 'bg-emerald-700 text-white'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {i18n.filterBosses(bossCount)}
                      </button>
                      <button
                        type="button"
                        onClick={() => setRoleFilter('NORMAL')}
                        className={`px-2 py-0.5 text-[10.5px] font-semibold rounded transition-colors whitespace-nowrap ${
                          roleFilter === 'NORMAL'
                            ? 'bg-slate-900 text-white'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {i18n.filterNormal(normalRows.length)}
                      </button>
                    </div>

                    <div
                      className="flex items-center gap-0.5 p-0.5 bg-white border border-slate-200 rounded-lg"
                      role="group"
                      aria-label="Filter calendar by week"
                    >
                      <button
                        type="button"
                        onClick={() => setWeekFilter('ALL')}
                        className={`px-2 py-0.5 text-[10.5px] font-mono font-semibold rounded transition-colors whitespace-nowrap ${
                          weekFilter === 'ALL'
                            ? 'bg-slate-900 text-white'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {i18n.filterAllMonth}
                      </button>
                      {Array.from({ length: totalWeeksInHorizon }, (_, w) => (
                        <button
                          key={w}
                          type="button"
                          onClick={() => setWeekFilter(w)}
                          className={`px-1.5 py-0.5 text-[10.5px] font-mono font-semibold rounded transition-colors ${
                            weekFilter === w
                              ? 'bg-slate-900 text-white'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          W{w + 1}
                        </button>
                      ))}
                    </div>

                    {/* Condensed View = Whole-Month View Without Gaps Between Weeks */}
                    <div
                      className="flex items-center gap-0.5 p-0.5 bg-white border border-slate-200 rounded-lg"
                      role="group"
                      aria-label="Toggle Split Weeks vs Condensed Whole-Month without week gaps"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setIsCondensedView(false);
                          setCollapsedWeeks(new Set());
                        }}
                        data-testid="daily-view-btn"
                        className={`px-2 py-0.5 text-[10.5px] font-semibold rounded transition-colors whitespace-nowrap ${
                          !isCondensedView
                            ? 'bg-slate-900 text-white'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {i18n.viewSplitWeeks}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsCondensedView(true);
                          setWeekFilter('ALL');
                          setCollapsedWeeks(new Set());
                        }}
                        data-testid="condensed-view-btn"
                        style={
                          isCondensedView
                            ? { backgroundColor: colorTheme.accentHex, color: '#ffffff' }
                            : undefined
                        }
                        className={`px-2 py-0.5 text-[10.5px] font-bold rounded transition-colors whitespace-nowrap ${
                          isCondensedView
                            ? 'text-white'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {i18n.viewWholeMonthNoGaps}
                      </button>
                    </div>

                    <input
                      id="employee-search"
                      type="search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={i18n.searchPlaceholder}
                      className="w-32 rounded-lg bg-white border border-slate-300 px-2 py-0.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Interactive Swap Mode Instruction Strip */}
                {isSwapMode && (
                  <div
                    data-testid="swap-mode-banner"
                    className="flex items-center justify-between gap-2 rounded-lg bg-indigo-50 border border-indigo-200 px-3 py-1.5 text-xs text-indigo-950"
                  >
                    <div className="font-semibold">
                      {swapSource && swapSourceEmployee && swapSourceDay
                        ? i18n.swapStep2Prompt(
                            swapSourceEmployee.name,
                            swapSourceShiftCode,
                            swapSourceDay.isoDate
                          )
                        : i18n.swapStep1Prompt}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsSwapMode(false);
                        setSwapSource(null);
                      }}
                      className="px-2 py-0.5 rounded bg-white hover:bg-indigo-100 border border-indigo-300 text-[11px] font-semibold text-indigo-900 whitespace-nowrap"
                    >
                      {i18n.btnCancelSwap}
                    </button>
                  </div>
                )}

                {/* Swap Completion Confirmation Banner */}
                {lastSwapEvent && (
                  <div
                    data-testid="swap-confirmation-banner"
                    className="flex items-center justify-between gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs text-emerald-950"
                  >
                    <div className="font-mono font-semibold">
                      ↔{' '}
                      {i18n.swapCompletedBanner(
                        lastSwapEvent.empAName,
                        lastSwapEvent.shiftACode,
                        lastSwapEvent.empBName,
                        lastSwapEvent.shiftBCode,
                        lastSwapEvent.isoDate
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setLastSwapEvent(null)}
                      aria-label="Dismiss swap confirmation"
                      className="px-2 py-0.5 rounded bg-white hover:bg-emerald-100 border border-emerald-300 text-xs font-sans font-bold text-emerald-900"
                    >
                      ×
                    </button>
                  </div>
                )}

                {/* Excel-Like Compact Schedule Grid */}
                <ScheduleGrid
                  days={solution.days}
                  rows={solution.rows}
                  dailyCoverage={solution.dailyCoverage}
                  params={solution.parameters}
                  lockedKeys={lockedKeys}
                  roleFilter={roleFilter}
                  searchQuery={searchQuery}
                  weekFilter={weekFilter}
                  activeBrush={activeBrush}
                  isSwapMode={isSwapMode}
                  swapSource={swapSource}
                  isCondensedView={isCondensedView}
                  collapsedWeeks={collapsedWeeks}
                  colorTheme={colorTheme}
                  language={language}
                  onToggleCollapseWeek={handleToggleCollapseWeek}
                  onOverrideCell={handleOverrideCell}
                  onSwapCellClick={handleSwapCellClick}
                  onSwapEmployeesOnDay={handleSwapEmployeesOnDay}
                  onUnlockCell={handleUnlockCell}
                />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
