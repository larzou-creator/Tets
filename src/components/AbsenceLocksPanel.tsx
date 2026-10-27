import React, { useState } from 'react';
import {
  AbsenceLock,
  DayColumnMeta,
  EmployeeProfile,
  SHIFT_E,
  SHIFT_M,
  SHIFT_MID,
  ShiftState,
  SolverParameters,
  STATE_BAJA,
  STATE_OFF,
  STATE_VAC,
} from '../solver/cpsatSolver';

interface AbsenceLocksPanelProps {
  employees: EmployeeProfile[];
  days: DayColumnMeta[];
  locks: AbsenceLock[];
  params: SolverParameters;
  onAddLock: (lock: AbsenceLock) => void;
  onRemoveLock: (id: string) => void;
  onClearLocks: () => void;
  onUpdateParams: (newParams: SolverParameters) => void;
  onRunSolver: () => void;
  onSimulateInfeasibleConflict: () => void;
}

export const AbsenceLocksPanel: React.FC<AbsenceLocksPanelProps> = ({
  employees,
  days,
  locks,
  params,
  onAddLock,
  onRemoveLock,
  onClearLocks,
  onUpdateParams,
  onRunSolver,
  onSimulateInfeasibleConflict,
}) => {
  const [selectedEmpId, setSelectedEmpId] = useState<number>(employees[5]?.id ?? 6);
  const [startDayIdx, setStartDayIdx] = useState<number>(0);
  const [endDayIdx, setEndDayIdx] = useState<number>(1);
  const [lockState, setLockState] = useState<ShiftState>(STATE_VAC);
  const [reason, setReason] = useState<string>('Approved Annual Leave');
  const [formError, setFormError] = useState<string | null>(null);

  const handleAddRangeLock = (e: React.FormEvent) => {
    e.preventDefault();
    if (endDayIdx < startDayIdx) {
      setFormError('End date must be on or after the start date.');
      return;
    }
    setFormError(null);
    for (let d = startDayIdx; d <= endDayIdx; d++) {
      onAddLock({
        id: `${selectedEmpId}-${d}-${Date.now()}-${d}`,
        employeeId: selectedEmpId,
        dayIndex: d,
        state: lockState,
        reason: reason.trim() || 'Fixed Lock',
      });
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left 7 Columns: Pre-Assigned Absences (VACACIONES / BAJA / Shift Locks) */}
      <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Time Off &amp; Fixed Shift Locks
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Lock <code className="text-slate-700 font-semibold">VACACIONES</code> or{' '}
              <code className="text-slate-700 font-semibold">BAJA</code> prior to schedule optimization.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onSimulateInfeasibleConflict}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors whitespace-nowrap"
            >
              Test Infeasible Boss Lock
            </button>
            {locks.length > 0 && (
              <button
                type="button"
                onClick={onClearLocks}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors whitespace-nowrap"
              >
                Clear All ({locks.length})
              </button>
            )}
          </div>
        </div>

        <form onSubmit={handleAddRangeLock} className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div>
            <label
              htmlFor="lock-employee"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Employee
            </label>
            <select
              id="lock-employee"
              value={selectedEmpId}
              onChange={(e) => setSelectedEmpId(Number(e.target.value))}
              className="w-full rounded-lg bg-slate-50 border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
            >
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.isBoss ? 'Timeshift Boss' : 'Normal Staff'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="lock-state"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Locked State (j ∈ J)
            </label>
            <select
              id="lock-state"
              value={lockState}
              onChange={(e) => setLockState(e.target.value as ShiftState)}
              className="w-full rounded-lg bg-slate-50 border border-slate-300 px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-indigo-500"
            >
              <option value={STATE_VAC}>VACACIONES (Planned Leave · 0h)</option>
              <option value={STATE_BAJA}>BAJA (Medical Leave · 0h)</option>
              <option value={STATE_OFF}>LIBRE (Rest Day · 0h)</option>
              <option value={SHIFT_M}>07:00 a 15:00 (Morning · 8h)</option>
              <option value={SHIFT_E}>14:00 a 22:00 (Afternoon · 8h)</option>
              <option value={SHIFT_MID}>10:00 a 18:00 (Monday Bridge · 8h)</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="lock-start-day"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Start Day
            </label>
            <select
              id="lock-start-day"
              value={startDayIdx}
              onChange={(e) => {
                const val = Number(e.target.value);
                setStartDayIdx(val);
                if (endDayIdx < val) setEndDayIdx(val);
              }}
              className="w-full rounded-lg bg-slate-50 border border-slate-300 px-3 py-2 text-xs font-mono tabular-nums text-slate-900 focus:outline-none focus:border-indigo-500"
            >
              {days.map((d) => (
                <option key={d.dayIndex} value={d.dayIndex}>
                  {d.isoDate} ({d.dayShortEs})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="lock-end-day"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              End Day (Inclusive)
            </label>
            <select
              id="lock-end-day"
              value={endDayIdx}
              onChange={(e) => setEndDayIdx(Number(e.target.value))}
              className="w-full rounded-lg bg-slate-50 border border-slate-300 px-3 py-2 text-xs font-mono tabular-nums text-slate-900 focus:outline-none focus:border-indigo-500"
            >
              {days.map((d) => (
                <option key={d.dayIndex} value={d.dayIndex}>
                  {d.isoDate} ({d.dayShortEs})
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2 flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
            <div className="flex-1">
              <label
                htmlFor="lock-reason"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Annotation / Reason
              </label>
              <input
                id="lock-reason"
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., Approved vacation request"
                className="w-full rounded-lg bg-slate-50 border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-colors whitespace-nowrap shrink-0"
            >
              Add Time Off Lock
            </button>
          </div>

          {formError && (
            <div className="sm:col-span-2 text-xs text-rose-600">
              {formError}
            </div>
          )}
        </form>

        {/* Active Locks Table */}
        <div className="border-t border-slate-200 pt-4">
          <div className="text-xs font-bold text-slate-700 mb-2">
            Active Requests &amp; Locks ({locks.length})
          </div>
          {locks.length === 0 ? (
            <div className="text-xs text-slate-500 py-6 text-center bg-slate-50 rounded-lg border border-slate-200">
              No pre-assigned VACACIONES, BAJA, or manual shift locks active.
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <th className="py-2 px-3">Employee</th>
                    <th className="py-2 px-3">Date</th>
                    <th className="py-2 px-3">Locked State</th>
                    <th className="py-2 px-3">Reason</th>
                    <th className="py-2 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {locks.map((l) => {
                    const emp = employees.find((e) => e.id === l.employeeId);
                    const day = days[l.dayIndex];
                    return (
                      <tr
                        key={l.id}
                        className="border-b border-slate-200 hover:bg-slate-50"
                      >
                        <td className="py-2 px-3 font-semibold text-slate-800">
                          {emp?.name ?? `ID ${l.employeeId}`}
                          {emp?.isBoss === 1 && (
                            <span className="ml-1.5 text-[10px] text-emerald-700 font-mono">
                              BOSS
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 font-mono tabular-nums text-slate-600">
                          {day?.isoDate} ({day?.dayShortEs})
                        </td>
                        <td className="py-2 px-3 font-mono tabular-nums font-semibold text-indigo-700">
                          {l.state}
                        </td>
                        <td className="py-2 px-3 text-slate-500 truncate max-w-[150px]">
                          {l.reason || 'Manual lock'}
                        </td>
                        <td className="py-2 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => onRemoveLock(l.id)}
                            aria-label={`Remove lock for ${emp?.name ?? l.employeeId} on ${day?.isoDate}`}
                            className="text-xs text-rose-600 hover:text-rose-800 font-semibold"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Right 5 Columns: Demand & Objective Cost Function Parameters */}
      <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="border-b border-slate-200 pb-4 mb-4">
          <h2 className="text-base font-bold text-slate-900">
            Staffing Rules &amp; Cost Parameters
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure target daily Morning/Afternoon headcount and optimization weights.
          </p>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="param-demand-m"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Target Morning (D_M,t)
              </label>
              <input
                id="param-demand-m"
                type="number"
                min={1}
                max={20}
                value={params.demandMorning}
                onChange={(e) =>
                  onUpdateParams({
                    ...params,
                    demandMorning: Math.max(1, Number(e.target.value)),
                  })
                }
                className="w-full rounded-lg bg-slate-50 border border-slate-300 px-3 py-2 text-xs font-mono tabular-nums text-slate-900"
              />
            </div>

            <div>
              <label
                htmlFor="param-demand-e"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Target Afternoon (D_E,t)
              </label>
              <input
                id="param-demand-e"
                type="number"
                min={1}
                max={20}
                value={params.demandEvening}
                onChange={(e) =>
                  onUpdateParams({
                    ...params,
                    demandEvening: Math.max(1, Number(e.target.value)),
                  })
                }
                className="w-full rounded-lg bg-slate-50 border border-slate-300 px-3 py-2 text-xs font-mono tabular-nums text-slate-900"
              />
            </div>

            <div>
              <label
                htmlFor="param-boss-m"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Min Morning Bosses
              </label>
              <input
                id="param-boss-m"
                type="number"
                min={1}
                max={4}
                value={params.minBossMorning}
                onChange={(e) =>
                  onUpdateParams({
                    ...params,
                    minBossMorning: Math.max(1, Number(e.target.value)),
                  })
                }
                className="w-full rounded-lg bg-slate-50 border border-slate-300 px-3 py-2 text-xs font-mono tabular-nums text-slate-900"
              />
            </div>

            <div>
              <label
                htmlFor="param-boss-e"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Min Afternoon Bosses
              </label>
              <input
                id="param-boss-e"
                type="number"
                min={1}
                max={4}
                value={params.minBossEvening}
                onChange={(e) =>
                  onUpdateParams({
                    ...params,
                    minBossEvening: Math.max(1, Number(e.target.value)),
                  })
                }
                className="w-full rounded-lg bg-slate-50 border border-slate-300 px-3 py-2 text-xs font-mono tabular-nums text-slate-900"
              />
            </div>

            <div>
              <label
                htmlFor="param-w-under"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Under-Staff Penalty (δ_under)
              </label>
              <input
                id="param-w-under"
                type="number"
                min={0}
                step={50}
                value={params.weightUnderstaff}
                onChange={(e) =>
                  onUpdateParams({
                    ...params,
                    weightUnderstaff: Math.max(0, Number(e.target.value)),
                  })
                }
                className="w-full rounded-lg bg-slate-50 border border-slate-300 px-3 py-2 text-xs font-mono tabular-nums text-slate-900"
              />
            </div>

            <div>
              <label
                htmlFor="param-w-over"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Over-Staff Penalty (δ_over)
              </label>
              <input
                id="param-w-over"
                type="number"
                min={0}
                step={10}
                value={params.weightOverstaff}
                onChange={(e) =>
                  onUpdateParams({
                    ...params,
                    weightOverstaff: Math.max(0, Number(e.target.value)),
                  })
                }
                className="w-full rounded-lg bg-slate-50 border border-slate-300 px-3 py-2 text-xs font-mono tabular-nums text-slate-900"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={onRunSolver}
            className="w-full py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-colors"
          >
            Apply Rules &amp; Re-Solve Schedule
          </button>
        </div>
      </div>
    </div>
  );
};
