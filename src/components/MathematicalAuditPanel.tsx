import React from 'react';
import {
  ConstraintViolation,
  EmployeeScheduleRow,
  ObjectiveBreakdown,
  SolverParameters,
} from '../solver/cpsatSolver';

interface MathematicalAuditPanelProps {
  objective: ObjectiveBreakdown;
  rows: EmployeeScheduleRow[];
  violations: ConstraintViolation[];
  params: SolverParameters;
}

export const MathematicalAuditPanel: React.FC<MathematicalAuditPanelProps> = ({
  objective,
  rows,
  violations,
  params,
}) => {
  return (
    <div className="space-y-6">
      {/* Global Objective Z Decomposition */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4 mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Global Objective Function Decomposition (min Z)
            </h2>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              Z = Σ(1000·δ_under + 40·δ_over) + Σ 250·U_i + Σ 120·s_it + Σ(w_aux·x_mid + 500·x_long)
            </p>
          </div>
          <div className="text-right font-mono tabular-nums">
            <span className="text-xs text-slate-500 mr-2">Total Objective Z =</span>
            <span className="text-xl font-bold text-indigo-600">
              {objective.totalZ.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
            <div className="text-xs text-slate-500 font-medium">Under-Staffing (1000·δ_under)</div>
            <div className="text-lg font-mono tabular-nums font-bold text-slate-900 mt-1">
              {objective.understaffCost.toLocaleString()}
            </div>
            <div className="text-[11px] font-mono tabular-nums text-slate-500 mt-1">
              {objective.totalUnderstaffUnits} shift-days below D_jt
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
            <div className="text-xs text-slate-500 font-medium">Over-Staffing (40·δ_over)</div>
            <div className="text-lg font-mono tabular-nums font-bold text-slate-900 mt-1">
              {objective.overstaffCost.toLocaleString()}
            </div>
            <div className="text-[11px] font-mono tabular-nums text-slate-500 mt-1">
              {objective.totalOverstaffUnits} shift-days above D_jt
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
            <div className="text-xs text-slate-500 font-medium">Weekend Equity (250·U_i)</div>
            <div className="text-lg font-mono tabular-nums font-bold text-slate-900 mt-1">
              {objective.weekendEquityCost.toLocaleString()}
            </div>
            <div className="text-[11px] font-mono tabular-nums text-slate-500 mt-1">
              {objective.totalWeekendShortfallUnits} shortfall vs Y_target={Math.max(1, Math.floor(params.numWeeks / 3))}
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
            <div className="text-xs text-slate-500 font-medium">Intra-Week Switch (120·s_it)</div>
            <div className="text-lg font-mono tabular-nums font-bold text-slate-900 mt-1">
              {objective.homogeneityCost.toLocaleString()}
            </div>
            <div className="text-[11px] font-mono tabular-nums text-slate-500 mt-1">
              {objective.totalHomogeneitySwitches} direct M to E transitions
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
            <div className="text-xs text-slate-500 font-medium">Auxiliary Shifts (10–18 / 10–22)</div>
            <div className="text-lg font-mono tabular-nums font-bold text-slate-900 mt-1">
              {objective.auxShiftCost.toLocaleString()}
            </div>
            <div className="text-[11px] font-mono tabular-nums text-slate-500 mt-1">
              {objective.totalAuxMidShifts} bridge · {objective.totalAuxLongShifts} long
            </div>
          </div>
        </div>
      </div>

      {/* Hard Constraint Verification Matrix per Employee */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Staff Member Quota &amp; 50/50 M-T Split Compliance ({rows.length} Employees)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              5 Timeshift Bosses + 12 Normal Employees · 5 workdays / 2 consecutive LIBRE per week.
            </p>
          </div>
          <div className="text-xs font-mono tabular-nums font-semibold text-slate-700">
            Active Violations: {violations.length}
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-mono">
                <th className="py-2.5 px-3">ID</th>
                <th className="py-2.5 px-3">Employee Name</th>
                <th className="py-2.5 px-3">Role Indicator (r_i)</th>
                <th className="py-2.5 px-3 text-right">Morning (M)</th>
                <th className="py-2.5 px-3 text-right">Afternoon (T)</th>
                <th className="py-2.5 px-3 text-right">Total Hours</th>
                <th className="py-2.5 px-3 text-right">LIBRE Days</th>
                <th className="py-2.5 px-3 text-right">Weekends Off</th>
                <th className="py-2.5 px-3 text-right">12h Rest / Contiguous LIBRE</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const isBoss = r.employee.isBoss === 1;
                const cleanRecord =
                  r.clopeningViolations.length === 0 && r.isolatedRestDays.length === 0;
                return (
                  <tr
                    key={r.employee.id}
                    className={`border-b border-slate-200 ${
                      isBoss ? 'bg-emerald-50/50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="py-2 px-3 font-mono tabular-nums text-slate-500">
                      #{String(r.employee.id).padStart(2, '0')}
                    </td>
                    <td className="py-2 px-3 font-bold text-slate-900">
                      {r.employee.name}
                    </td>
                    <td className="py-2 px-3 font-mono tabular-nums">
                      <span className={isBoss ? 'text-emerald-700 font-semibold' : 'text-slate-600'}>
                        {isBoss ? 'Timeshift Boss (r_i = 1)' : 'Normal Staff (r_i = 0)'}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums text-amber-800 font-semibold">
                      {r.morningDaysCount}d
                    </td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums text-indigo-800 font-semibold">
                      {r.eveningDaysCount}d
                    </td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums font-bold text-slate-900">
                      {r.totalHours}h
                    </td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-600">
                      {r.totalRestDays}d
                    </td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums text-emerald-700 font-semibold">
                      {r.weekendsOff}
                    </td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums">
                      {cleanRecord ? (
                        <span className="text-emerald-700 font-semibold">Verified Compliant</span>
                      ) : (
                        <span className="text-rose-600 font-semibold">
                          {r.clopeningViolations.length} Clopening · {r.isolatedRestDays.length} Isolated
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
