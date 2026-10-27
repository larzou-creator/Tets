import React, { memo, useState } from 'react';
import {
  ALL_STATES,
  computeWeeklyShiftSummary,
  DailyCoverageMetrics,
  DayColumnMeta,
  EmployeeScheduleRow,
  ShiftState,
  SolverParameters,
} from '../solver/cpsatSolver';
import { AppColorTheme, getShiftThemeColors } from '../utils/themeColors';
import { AppLanguage, I18N_DICTIONARY } from '../utils/i18n';

interface ScheduleCellProps {
  employeeId: number;
  employeeName: string;
  isBoss: boolean;
  dayIndex: number;
  isoDate: string;
  shift: ShiftState;
  isLocked: boolean;
  isSwapSource: boolean;
  isSwapTargetCandidate: boolean;
  hasClopening: boolean;
  hasIsolatedRest: boolean;
  isWarmup: boolean;
  isNoGapMonthView: boolean;
  activeBrush: ShiftState | null;
  colorTheme: AppColorTheme;
  lockedTooltipSuffix: string;
  onSelectCell: (
    employeeId: number,
    dayIndex: number,
    rect: DOMRect
  ) => void;
}

const MemoizedScheduleCell = memo(
  function ScheduleCell({
    employeeId,
    employeeName,
    isBoss,
    dayIndex,
    isoDate,
    shift,
    isLocked,
    isSwapSource,
    isSwapTargetCandidate,
    hasClopening,
    hasIsolatedRest,
    isNoGapMonthView,
    colorTheme,
    lockedTooltipSuffix,
    onSelectCell,
  }: ScheduleCellProps) {
    const info = getShiftThemeColors(shift, colorTheme);

    return (
      <td
        style={{
          backgroundColor: isSwapTargetCandidate
            ? '#eef2ff'
            : isBoss
            ? colorTheme.bossRowBgHex
            : colorTheme.normalRowBgHex,
        }}
        className="p-[2px] border-b border-r border-slate-300 text-center align-middle select-none"
      >
        <button
          type="button"
          data-testid={`cell-${employeeId}-${dayIndex}`}
          data-locked={isLocked ? 'true' : 'false'}
          data-swap-source={isSwapSource ? 'true' : 'false'}
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            onSelectCell(employeeId, dayIndex, rect);
          }}
          aria-label={`${employeeName} on ${isoDate}: ${info.timeLabel}${
            isLocked ? lockedTooltipSuffix : ''
          }`}
          title={`${employeeName} · ${isoDate} · ${info.timeLabel}${
            isLocked ? lockedTooltipSuffix : ''
          }`}
          style={{
            backgroundColor: info.colors.bgHex,
            color: info.colors.textHex,
            borderColor: isSwapSource
              ? '#4f46e5'
              : isLocked
              ? '#0f172a'
              : info.colors.borderHex,
          }}
          className={`w-full h-[22px] ${
            isNoGapMonthView ? 'px-0.5 text-[10px]' : 'px-1 text-[10.5px]'
          } rounded-[3px] border font-mono tabular-nums font-semibold leading-none transition-all hover:opacity-85 flex items-center justify-center gap-0.5 whitespace-nowrap ${
            isSwapSource
              ? 'ring-2 ring-indigo-600 shadow-xs'
              : hasClopening
              ? 'ring-2 ring-red-600'
              : hasIsolatedRest
              ? 'ring-1 ring-amber-500'
              : isLocked
              ? 'ring-1 ring-slate-900/75 shadow-2xs'
              : isSwapTargetCandidate
              ? 'ring-1 ring-indigo-400/70'
              : ''
          }`}
        >
          <span>{info.code}</span>
          {isSwapSource && (
            <span
              className="text-[8.5px] text-indigo-700 font-sans font-extrabold leading-none"
              aria-hidden="true"
            >
              ↔
            </span>
          )}
          {!isSwapSource && isLocked && (
            <span
              className="text-[8px] text-rose-700 font-sans font-extrabold leading-none"
              aria-hidden="true"
            >
              •
            </span>
          )}
        </button>
      </td>
    );
  },
  (prev, next) =>
    prev.shift === next.shift &&
    prev.isLocked === next.isLocked &&
    prev.isSwapSource === next.isSwapSource &&
    prev.isSwapTargetCandidate === next.isSwapTargetCandidate &&
    prev.hasClopening === next.hasClopening &&
    prev.hasIsolatedRest === next.hasIsolatedRest &&
    prev.isWarmup === next.isWarmup &&
    prev.isNoGapMonthView === next.isNoGapMonthView &&
    prev.activeBrush === next.activeBrush &&
    prev.colorTheme === next.colorTheme &&
    prev.lockedTooltipSuffix === next.lockedTooltipSuffix &&
    prev.onSelectCell === next.onSelectCell
);

interface ScheduleGridProps {
  days: DayColumnMeta[];
  rows: EmployeeScheduleRow[];
  dailyCoverage: DailyCoverageMetrics[];
  params: SolverParameters;
  lockedKeys: Set<string>;
  roleFilter: 'ALL' | 'BOSS' | 'NORMAL';
  searchQuery: string;
  weekFilter: number | 'ALL';
  activeBrush: ShiftState | null;
  isSwapMode: boolean;
  swapSource: { employeeId: number; dayIndex: number } | null;
  isCondensedView: boolean; // When true: Whole-Month View without gaps between weeks
  collapsedWeeks: Set<number>;
  colorTheme: AppColorTheme;
  language: AppLanguage;
  onToggleCollapseWeek: (weekIndex: number) => void;
  onOverrideCell: (
    employeeId: number,
    dayIndex: number,
    newState: ShiftState,
    lockCell: boolean
  ) => void;
  onSwapCellClick: (employeeId: number, dayIndex: number) => void;
  onSwapEmployeesOnDay: (
    employeeIdA: number,
    employeeIdB: number,
    dayIndex: number
  ) => void;
  onUnlockCell?: (employeeId: number, dayIndex: number) => void;
}

export const ScheduleGrid: React.FC<ScheduleGridProps> = ({
  days,
  rows,
  dailyCoverage,
  lockedKeys,
  roleFilter,
  searchQuery,
  weekFilter,
  activeBrush,
  isSwapMode,
  swapSource,
  isCondensedView,
  collapsedWeeks,
  colorTheme,
  language,
  onToggleCollapseWeek,
  onOverrideCell,
  onSwapCellClick,
  onSwapEmployeesOnDay,
  onUnlockCell,
}) => {
  const i18n = I18N_DICTIONARY[language];

  const [activePopover, setActivePopover] = useState<{
    employeeId: number;
    dayIndex: number;
    top: number;
    left: number;
  } | null>(null);

  const [popoverSwapPartnerId, setPopoverSwapPartnerId] = useState<number>(0);

  const visibleDays = days.filter((d) =>
    weekFilter === 'ALL' ? true : d.weekIndex === weekFilter
  );

  // Group visibleDays into Monday-Sunday weeks
  const weekGroups: Array<{ weekIndex: number; days: DayColumnMeta[] }> = [];
  for (const day of visibleDays) {
    const lastGroup = weekGroups[weekGroups.length - 1];
    if (!lastGroup || lastGroup.weekIndex !== day.weekIndex) {
      weekGroups.push({ weekIndex: day.weekIndex, days: [day] });
    } else {
      lastGroup.days.push(day);
    }
  }

  // Show gaps between weeks ONLY when not in Condensed Whole-Month (No Gaps) mode
  const showWeekGap = !isCondensedView;

  const isWeekCollapsedSummary = (weekIndex: number): boolean =>
    !isCondensedView && collapsedWeeks.has(weekIndex);

  const filteredRows = rows.filter((row) => {
    if (roleFilter === 'BOSS' && row.employee.isBoss !== 1) return false;
    if (roleFilter === 'NORMAL' && row.employee.isBoss !== 0) return false;
    if (
      searchQuery.trim() !== '' &&
      !row.employee.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const handleSelectCell = React.useCallback(
    (employeeId: number, dayIndex: number, rect: DOMRect) => {
      if (isSwapMode) {
        onSwapCellClick(employeeId, dayIndex);
        return;
      }
      if (activeBrush) {
        onOverrideCell(employeeId, dayIndex, activeBrush, true);
        return;
      }
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const popWidth = 248;
      const popHeight = 360;

      const left = Math.min(Math.max(12, rect.left), viewportWidth - popWidth - 16);
      const top =
        rect.bottom + popHeight > viewportHeight
          ? Math.max(12, rect.top - popHeight - 6)
          : rect.bottom + 6;

      const defaultPartner =
        rows.find((r) => r.employee.id !== employeeId)?.employee.id || 0;
      setPopoverSwapPartnerId(defaultPartner);
      setActivePopover({ employeeId, dayIndex, top, left });
    },
    [isSwapMode, onSwapCellClick, activeBrush, onOverrideCell, rows]
  );

  const activeRow = activePopover
    ? rows.find((r) => r.employee.id === activePopover.employeeId)
    : null;
  const activeDay = activePopover ? days[activePopover.dayIndex] : null;
  const activeShift =
    activeRow && activePopover ? activeRow.shifts[activePopover.dayIndex] : null;

  return (
    <div className="relative">
      <div
        className="overflow-auto max-h-[76vh] border border-slate-300 rounded-lg bg-white shadow-2xs"
        data-testid="schedule-grid-viewport"
      >
        <table
          data-testid={isCondensedView ? 'grid-whole-month-no-gaps' : 'grid-split-weeks'}
          className="w-full border-collapse text-left"
        >
          <thead>
            {/* Sticky Row 0: Week Header Banner (Zero gaps between weeks in Condensed Whole-Month mode) */}
            <tr>
              <th
                style={{
                  backgroundColor: colorTheme.headerBgHex,
                  color: colorTheme.headerTextHex,
                }}
                className="sticky top-0 left-0 z-30 border-b border-r border-slate-300 px-2.5 py-1 min-w-[148px] max-w-[148px]"
              >
                <span className="text-[10.5px] font-bold tracking-tight">
                  {isCondensedView
                    ? i18n.gridWholeMonthHeader
                    : i18n.gridHorizonWeeksHeader(weekGroups.length)}
                </span>
              </th>

              {weekGroups.map((wg, wgIdx) => {
                const firstDay = wg.days[0];
                const lastDay = wg.days[wg.days.length - 1];
                const collapsed = isWeekCollapsedSummary(wg.weekIndex);
                const weekColors = [
                  'bg-indigo-100/90 text-indigo-950',
                  'bg-emerald-100/90 text-emerald-950',
                  'bg-amber-100/90 text-amber-950',
                  'bg-sky-100/90 text-sky-950',
                  'bg-purple-100/90 text-purple-950',
                ];
                const bannerStyle = weekColors[wg.weekIndex % weekColors.length];

                return (
                  <React.Fragment key={`wg-banner-${wg.weekIndex}`}>
                    {showWeekGap && wgIdx > 0 && (
                      <th
                        data-testid={`week-gap-${wg.weekIndex}`}
                        className="sticky top-0 z-20 w-2.5 min-w-[10px] bg-slate-200 border-b border-r border-slate-300"
                        aria-hidden="true"
                      />
                    )}
                    <th
                      colSpan={collapsed ? 1 : wg.days.length}
                      data-testid={`week-banner-${wg.weekIndex + 1}`}
                      className={`sticky top-0 z-20 border-b border-r border-slate-300 px-2 py-1 text-[11px] font-bold ${bannerStyle}`}
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="truncate">
                          W{wg.weekIndex + 1}{' '}
                          <span className="font-mono tabular-nums text-[10px] font-medium opacity-80">
                            ({firstDay.dayNumber} {firstDay.monthShortEs}–{lastDay.dayNumber}{' '}
                            {lastDay.monthShortEs})
                          </span>
                        </span>
                        {!isCondensedView && (
                          <button
                            type="button"
                            onClick={() => onToggleCollapseWeek(wg.weekIndex)}
                            className="px-1.5 py-0.2 rounded bg-white/80 hover:bg-white text-[9.5px] font-mono font-semibold text-slate-800 border border-black/10 transition-colors shrink-0"
                          >
                            {collapsed ? i18n.btnExpandWeek : i18n.btnSumWeek}
                          </button>
                        )}
                      </div>
                    </th>
                  </React.Fragment>
                );
              })}
            </tr>

            {/* Sticky Row 1: Date & Day of Week Header */}
            <tr>
              <th
                style={{
                  backgroundColor: colorTheme.headerBgHex,
                  color: colorTheme.headerTextHex,
                }}
                className="sticky top-[26px] left-0 z-30 border-b border-r border-slate-300 px-2.5 py-1 min-w-[148px] max-w-[148px]"
              >
                <div className="text-[11px] font-bold leading-tight">
                  {i18n.gridEmployeeColHeader}
                </div>
              </th>

              {weekGroups.map((wg, wgIdx) => {
                const collapsed = isWeekCollapsedSummary(wg.weekIndex);
                return (
                  <React.Fragment key={`wg-dates-${wg.weekIndex}`}>
                    {showWeekGap && wgIdx > 0 && (
                      <th
                        className="sticky top-[26px] z-20 w-2.5 min-w-[10px] bg-slate-200 border-b border-r border-slate-300"
                        aria-hidden="true"
                      />
                    )}
                    {collapsed ? (
                      <th className="sticky top-[26px] z-20 border-b border-r border-slate-300 bg-slate-50 px-3 py-1 text-center min-w-[180px]">
                        <div className="text-[10px] font-mono font-bold text-slate-800">
                          {i18n.gridWeeklyShiftSummary}
                        </div>
                      </th>
                    ) : (
                      wg.days.map((day) => {
                        const isWeekend = day.dayOfWeek >= 5;
                        const isSwapCol =
                          isSwapMode && swapSource?.dayIndex === day.dayIndex;
                        return (
                          <th
                            key={day.dayIndex}
                            className={`sticky top-[26px] z-20 border-b border-r border-slate-300 ${
                              isCondensedView
                                ? 'px-0.5 py-0.5 min-w-[38px]'
                                : 'px-1 py-1 min-w-[54px]'
                            } text-center ${
                              isSwapCol
                                ? 'bg-indigo-100 text-indigo-950'
                                : day.isWarmup
                                ? 'bg-slate-100 text-slate-400'
                                : isWeekend
                                ? 'bg-indigo-50/60 text-slate-900'
                                : 'bg-slate-50 text-slate-800'
                            }`}
                          >
                            <div className="text-[9.5px] font-semibold text-slate-500 leading-none">
                              {day.dayShortEs}
                            </div>
                            <div className="text-[10.5px] font-mono tabular-nums font-bold leading-tight mt-0.5">
                              {String(day.dayNumber).padStart(2, '0')}
                            </div>
                          </th>
                        );
                      })
                    )}
                  </React.Fragment>
                );
              })}
            </tr>

            {/* Sticky Row 2: Compact Boss Coverage Badge (M:x|T:y) */}
            <tr>
              <th className="sticky top-[55px] left-0 z-30 bg-slate-50 border-b border-r border-slate-300 px-2.5 py-0.5 min-w-[148px] max-w-[148px]">
                <span className="text-[10px] text-slate-600 font-semibold">
                  {i18n.gridBossSplitHeader}
                </span>
              </th>

              {weekGroups.map((wg, wgIdx) => {
                const collapsed = isWeekCollapsedSummary(wg.weekIndex);
                if (collapsed) {
                  const weekCovs = wg.days.map((d) => dailyCoverage[d.dayIndex]);
                  const validDaysInWeek = weekCovs.filter((c) => c.bossCoverageValid).length;
                  const totalWeekM = weekCovs.reduce((acc, c) => acc + c.morningTotal, 0);
                  const totalWeekT = weekCovs.reduce((acc, c) => acc + c.eveningTotal, 0);
                  return (
                    <React.Fragment key={`wg-cov-${wg.weekIndex}`}>
                      {showWeekGap && wgIdx > 0 && (
                        <th
                          className="sticky top-[55px] z-20 w-2.5 min-w-[10px] bg-slate-200 border-b border-r border-slate-300"
                          aria-hidden="true"
                        />
                      )}
                      <th className="sticky top-[55px] z-20 bg-white border-b border-r border-slate-300 px-2 py-0.5 text-center">
                        <span className="text-[9.5px] font-mono font-bold text-emerald-800">
                          {validDaysInWeek}/7d OK · {totalWeekM}M/{totalWeekT}T
                        </span>
                      </th>
                    </React.Fragment>
                  );
                }

                return (
                  <React.Fragment key={`wg-cov-${wg.weekIndex}`}>
                    {showWeekGap && wgIdx > 0 && (
                      <th
                        className="sticky top-[55px] z-20 w-2.5 min-w-[10px] bg-slate-200 border-b border-r border-slate-300"
                        aria-hidden="true"
                      />
                    )}
                    {wg.days.map((day) => {
                      const cov = dailyCoverage[day.dayIndex];
                      const valid = cov.bossCoverageValid;
                      return (
                        <th
                          key={`cov-${day.dayIndex}`}
                          data-testid={`coverage-header-${day.dayIndex}`}
                          className="sticky top-[55px] z-20 bg-white border-b border-r border-slate-300 px-0.5 py-0.5 text-center"
                        >
                          <div
                            className={`text-[9px] font-mono tabular-nums font-bold px-0.5 rounded leading-tight ${
                              valid
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                            title={`Day ${day.isoDate}: ${cov.morningBosses} Morning Boss(es), ${cov.eveningBosses} Afternoon Boss(es)`}
                          >
                            M:{cov.morningBosses}|T:{cov.eveningBosses}
                          </div>
                          <div className="text-[9px] font-mono tabular-nums text-slate-500 leading-tight">
                            {cov.morningTotal}M·{cov.eveningTotal}T
                          </div>
                        </th>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {filteredRows.map((row) => {
              const isBoss = row.employee.isBoss === 1;
              return (
                <tr
                  key={row.employee.id}
                  style={{
                    backgroundColor: isBoss
                      ? colorTheme.bossRowBgHex
                      : colorTheme.normalRowBgHex,
                  }}
                  className="transition-colors hover:brightness-97"
                >
                  {/* Sticky Column 0: ONLY Employee Name, squeezed vertically like an Excel sheet */}
                  <td
                    style={{
                      backgroundColor: isBoss
                        ? colorTheme.bossRowBgHex
                        : colorTheme.normalRowBgHex,
                      color: isBoss
                        ? colorTheme.bossNameTextHex
                        : colorTheme.normalNameTextHex,
                    }}
                    className="sticky left-0 z-10 border-b border-r border-slate-300 px-2.5 py-0.5 h-[26px] min-w-[148px] max-w-[148px] align-middle"
                  >
                    <div
                      data-testid={`employee-name-cell-${row.employee.id}`}
                      className="text-[11.5px] font-bold leading-none truncate"
                      title={row.employee.name}
                    >
                      {row.employee.name}
                    </div>
                  </td>

                  {weekGroups.map((wg, wgIdx) => {
                    const collapsed = isWeekCollapsedSummary(wg.weekIndex);

                    if (collapsed) {
                      const summary = computeWeeklyShiftSummary(
                        row.shifts,
                        wg.weekIndex,
                        wg.days.map((d) => d.dayIndex)
                      );
                      return (
                        <React.Fragment key={`row-${row.employee.id}-wg-${wg.weekIndex}`}>
                          {showWeekGap && wgIdx > 0 && (
                            <td
                              className="w-2.5 min-w-[10px] bg-slate-200 border-b border-r border-slate-300"
                              aria-hidden="true"
                            />
                          )}
                          <td
                            style={{
                              backgroundColor: isBoss
                                ? colorTheme.bossRowBgHex
                                : colorTheme.normalRowBgHex,
                            }}
                            className="px-2 py-0.5 border-b border-r border-slate-300 text-center align-middle"
                          >
                            <div className="flex items-center justify-center flex-wrap gap-1 font-mono tabular-nums text-[10px]">
                              {summary.morningCount > 0 && (
                                <span
                                  style={{
                                    backgroundColor: colorTheme.shifts.morning.bgHex,
                                    color: colorTheme.shifts.morning.textHex,
                                    borderColor: colorTheme.shifts.morning.borderHex,
                                  }}
                                  className="px-1.5 py-0.2 rounded border font-semibold"
                                >
                                  {summary.morningCount}×M
                                </span>
                              )}
                              {summary.bridgeCount > 0 && (
                                <span
                                  style={{
                                    backgroundColor: colorTheme.shifts.bridge.bgHex,
                                    color: colorTheme.shifts.bridge.textHex,
                                    borderColor: colorTheme.shifts.bridge.borderHex,
                                  }}
                                  className="px-1.5 py-0.2 rounded border font-semibold"
                                >
                                  {summary.bridgeCount}×10–18
                                </span>
                              )}
                              {summary.afternoonCount > 0 && (
                                <span
                                  style={{
                                    backgroundColor: colorTheme.shifts.afternoon.bgHex,
                                    color: colorTheme.shifts.afternoon.textHex,
                                    borderColor: colorTheme.shifts.afternoon.borderHex,
                                  }}
                                  className="px-1.5 py-0.2 rounded border font-semibold"
                                >
                                  {summary.afternoonCount}×T
                                </span>
                              )}
                              {summary.restCount > 0 && (
                                <span
                                  style={{
                                    backgroundColor: colorTheme.shifts.rest.bgHex,
                                    color: colorTheme.shifts.rest.textHex,
                                    borderColor: colorTheme.shifts.rest.borderHex,
                                  }}
                                  className="px-1.5 py-0.2 rounded border font-medium"
                                >
                                  {summary.restCount}×LIBRE
                                </span>
                              )}
                              {summary.leaveCount > 0 && (
                                <span
                                  style={{
                                    backgroundColor: colorTheme.shifts.vacation.bgHex,
                                    color: colorTheme.shifts.vacation.textHex,
                                    borderColor: colorTheme.shifts.vacation.borderHex,
                                  }}
                                  className="px-1.5 py-0.2 rounded border font-semibold"
                                >
                                  {summary.leaveCount}×Leave
                                </span>
                              )}
                            </div>
                          </td>
                        </React.Fragment>
                      );
                    }

                    return (
                      <React.Fragment key={`row-${row.employee.id}-wg-${wg.weekIndex}`}>
                        {showWeekGap && wgIdx > 0 && (
                          <td
                            className="w-2.5 min-w-[10px] bg-slate-200 border-b border-r border-slate-300"
                            aria-hidden="true"
                          />
                        )}
                        {wg.days.map((day) => {
                          const t = day.dayIndex;
                          const shift = row.shifts[t];
                          const isLocked = lockedKeys.has(`${row.employee.id}:${t}`);
                          const isSwapSource =
                            isSwapMode &&
                            swapSource?.employeeId === row.employee.id &&
                            swapSource?.dayIndex === t;
                          const isSwapTargetCandidate =
                            isSwapMode &&
                            swapSource !== null &&
                            swapSource.dayIndex === t &&
                            swapSource.employeeId !== row.employee.id;
                          const hasClopening = row.clopeningViolations.includes(t);
                          const hasIsolatedRest = row.isolatedRestDays.includes(t);

                          return (
                            <MemoizedScheduleCell
                              key={`${row.employee.id}-${t}`}
                              employeeId={row.employee.id}
                              employeeName={row.employee.name}
                              isBoss={isBoss}
                              dayIndex={t}
                              isoDate={day.isoDate}
                              shift={shift}
                              isLocked={isLocked}
                              isSwapSource={isSwapSource}
                              isSwapTargetCandidate={isSwapTargetCandidate}
                              hasClopening={hasClopening}
                              hasIsolatedRest={hasIsolatedRest}
                              isWarmup={day.isWarmup}
                              isNoGapMonthView={isCondensedView}
                              activeBrush={activeBrush}
                              colorTheme={colorTheme}
                              lockedTooltipSuffix={i18n.cellLockedTooltipSuffix}
                              onSelectCell={handleSelectCell}
                            />
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Zero-Lag Single-Cell Override & Quick-Swap Popover */}
      {activePopover && activeRow && activeDay && activeShift && (
        <div
          className="fixed inset-0 z-50"
          onClick={() => setActivePopover(null)}
        >
          <div
            className="fixed z-50 w-60 rounded-xl bg-white border border-slate-300 shadow-xl p-2.5 text-slate-900"
            style={{ top: activePopover.top, left: activePopover.left }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Override or Swap Shift Assignment"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-2">
              <div>
                <div className="text-xs font-bold text-slate-900">
                  {activeRow.employee.name}
                </div>
                <div className="text-[10.5px] text-slate-500 font-mono tabular-nums">
                  {activeDay.dayNameEs} · {activeDay.isoDate}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActivePopover(null)}
                className="text-xs font-sans font-bold text-slate-400 hover:text-slate-800 px-1.5 py-0.5 rounded"
                aria-label="Close cell override popover"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-1 gap-1">
              {ALL_STATES.map((st) => {
                const isSelected = st === activeShift;
                return (
                  <button
                    key={st}
                    type="button"
                    data-testid={`popover-shift-${st}`}
                    onClick={() => {
                      onOverrideCell(
                        activePopover.employeeId,
                        activePopover.dayIndex,
                        st,
                        true
                      );
                      setActivePopover(null);
                    }}
                    className={`w-full text-left px-2.5 py-1 rounded-md text-xs font-mono tabular-nums flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'bg-slate-900 text-white font-semibold'
                        : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                    }`}
                  >
                    <span>{st}</span>
                    {isSelected && (
                      <span className="text-[10px]">{i18n.popoverActiveBadge}</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Quick Swap Shift with Another Employee on This Date */}
            <div className="mt-2.5 pt-2 border-t border-slate-200 space-y-1.5">
              <label
                htmlFor="popover-swap-select"
                className="block text-[10px] font-bold text-indigo-900 tracking-tight"
              >
                ↔ {i18n.popoverSwapTitle}
              </label>
              <select
                id="popover-swap-select"
                data-testid="popover-swap-select"
                value={popoverSwapPartnerId}
                onChange={(e) => setPopoverSwapPartnerId(Number(e.target.value))}
                className="w-full rounded-md bg-slate-50 border border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-900 focus:outline-none focus:border-indigo-500"
              >
                {rows
                  .filter((r) => r.employee.id !== activePopover.employeeId)
                  .map((r) => {
                    const partnerShift = r.shifts[activePopover.dayIndex];
                    const partnerInfo = getShiftThemeColors(partnerShift, colorTheme);
                    return (
                      <option key={r.employee.id} value={r.employee.id}>
                        {r.employee.name} ({partnerInfo.code})
                      </option>
                    );
                  })}
              </select>
              <button
                type="button"
                data-testid="popover-swap-confirm-btn"
                onClick={() => {
                  if (popoverSwapPartnerId) {
                    onSwapEmployeesOnDay(
                      activePopover.employeeId,
                      popoverSwapPartnerId,
                      activePopover.dayIndex
                    );
                    setActivePopover(null);
                  }
                }}
                className="w-full text-center px-2.5 py-1 rounded-md text-[11px] font-bold bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
              >
                ↔ {i18n.popoverSwapConfirmBtn}
              </button>
            </div>

            {onUnlockCell &&
              lockedKeys.has(`${activePopover.employeeId}:${activePopover.dayIndex}`) && (
                <div className="mt-2 pt-1.5 border-t border-slate-100">
                  <button
                    type="button"
                    data-testid="popover-unlock-cell-btn"
                    onClick={() => {
                      onUnlockCell(activePopover.employeeId, activePopover.dayIndex);
                      setActivePopover(null);
                    }}
                    className="w-full text-center px-2.5 py-1 rounded-md text-[11px] font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition-colors"
                  >
                    {i18n.popoverUnlockCellBtn}
                  </button>
                </div>
              )}
          </div>
        </div>
      )}
    </div>
  );
};
