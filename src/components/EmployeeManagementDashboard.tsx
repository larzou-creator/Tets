import React, { useState } from 'react';
import {
  DayColumnMeta,
  EmployeeProfile,
  LeaveRecord,
  ShiftPreference,
} from '../solver/cpsatSolver';
import {
  AppColorTheme,
  THEME_PRESETS,
} from '../utils/themeColors';
import { AppLanguage, I18N_DICTIONARY } from '../utils/i18n';

interface EmployeeManagementDashboardProps {
  employees: EmployeeProfile[];
  days: DayColumnMeta[];
  leaveRecords: LeaveRecord[];
  colorTheme: AppColorTheme;
  language: AppLanguage;
  onAddEmployee: (
    name: string,
    isBoss: 0 | 1,
    shiftPreference: ShiftPreference
  ) => void;
  onUpdateEmployee: (
    employeeId: number,
    patch: Partial<Pick<EmployeeProfile, 'name' | 'isBoss' | 'shiftPreference'>>
  ) => void;
  onRemoveEmployee: (employeeId: number) => void;
  onBulkSetShiftPreference: (pref: ShiftPreference, targetRole: 'NORMAL' | 'ALL') => void;
  onSaveLeaveRecord: (record: Omit<LeaveRecord, 'id'>, editId?: string) => void;
  onDeleteLeaveRecord: (id: string) => void;
  onClearAllLeaves: () => void;
  onChangeColorTheme: (nextTheme: AppColorTheme) => void;
  onSwitchToSchedule: () => void;
}

export const EmployeeManagementDashboard: React.FC<EmployeeManagementDashboardProps> = ({
  employees,
  days,
  leaveRecords,
  colorTheme,
  language,
  onAddEmployee,
  onUpdateEmployee,
  onRemoveEmployee,
  onBulkSetShiftPreference,
  onSaveLeaveRecord,
  onDeleteLeaveRecord,
  onClearAllLeaves,
  onChangeColorTheme,
  onSwitchToSchedule,
}) => {
  const i18n = I18N_DICTIONARY[language];
  const defaultStartIso =
    days.find((d) => d.isTargetMonth)?.isoDate || days[0]?.isoDate || '2026-10-01';
  const defaultEndIso =
    days.find((d, idx) => d.isTargetMonth && idx >= 4)?.isoDate || defaultStartIso;

  // 1. Add Employee Form State
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<'NORMAL' | 'BOSS'>('NORMAL');
  const [newShiftPref, setNewShiftPref] = useState<ShiftPreference>('ROTATING');
  const [rosterFilter, setRosterFilter] = useState('');

  // 2. Add / Edit Vacation (VACACIONES) or Medical Leave (BAJA) Form State
  const [editingLeaveId, setEditingLeaveId] = useState<string | null>(null);
  const [leaveEmployeeId, setLeaveEmployeeId] = useState<number>(
    employees[0]?.id || 1
  );
  const [leaveType, setLeaveType] = useState<'VACACIONES' | 'BAJA'>('VACACIONES');
  const [leaveStartDate, setLeaveStartDate] = useState<string>(defaultStartIso);
  const [leaveEndDate, setLeaveEndDate] = useState<string>(defaultEndIso);
  const [leaveNote, setLeaveNote] = useState<string>('');

  const handleSubmitNewEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;
    onAddEmployee(trimmed, newRole === 'BOSS' ? 1 : 0, newShiftPref);
    setNewName('');
  };

  const handleSubmitLeave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveEmployeeId || !leaveStartDate || !leaveEndDate) return;
    onSaveLeaveRecord(
      {
        employeeId: leaveEmployeeId,
        type: leaveType,
        startDateIso: leaveStartDate,
        endDateIso: leaveEndDate,
        note: leaveNote.trim() || undefined,
      },
      editingLeaveId || undefined
    );
    setEditingLeaveId(null);
    setLeaveNote('');
  };

  const handleStartEditLeave = (rec: LeaveRecord) => {
    setEditingLeaveId(rec.id);
    setLeaveEmployeeId(rec.employeeId);
    setLeaveType(rec.type);
    setLeaveStartDate(rec.startDateIso);
    setLeaveEndDate(rec.endDateIso);
    setLeaveNote(rec.note || '');
  };

  const handleQuickPrepareLeave = (
    empId: number,
    type: 'VACACIONES' | 'BAJA'
  ) => {
    setEditingLeaveId(null);
    setLeaveEmployeeId(empId);
    setLeaveType(type);
    setLeaveStartDate(defaultStartIso);
    setLeaveEndDate(defaultEndIso);
  };

  const filteredEmployees = employees.filter((emp) =>
    rosterFilter.trim() === ''
      ? true
      : emp.name.toLowerCase().includes(rosterFilter.trim().toLowerCase())
  );

  const updateShiftColor = (
    key: keyof AppColorTheme['shifts'],
    field: 'bgHex' | 'textHex' | 'borderHex',
    val: string
  ) => {
    onChangeColorTheme({
      ...colorTheme,
      id: 'custom',
      name: 'Custom App Colors',
      shifts: {
        ...colorTheme.shifts,
        [key]: {
          ...colorTheme.shifts[key],
          [field]: val,
        },
      },
    });
  };

  return (
    <div className="space-y-5" data-testid="employee-management-dashboard">
      {/* Top Banner inside Dashboard with Quick Return to Schedule Sheet */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
        <div>
          <h2 className="text-base font-extrabold text-slate-900">
            {i18n.dashHeaderTitle}
          </h2>
          <p className="text-xs text-slate-500">
            {i18n.dashHeaderSubtitle}
          </p>
        </div>
        <button
          type="button"
          onClick={onSwitchToSchedule}
          data-testid="back-to-schedule-btn"
          style={{ backgroundColor: colorTheme.accentHex }}
          className="px-4 py-2 rounded-lg text-xs font-bold text-white shadow-xs hover:opacity-90 transition-opacity whitespace-nowrap self-start sm:self-auto"
        >
          {i18n.btnBackToSchedule}
        </button>
      </div>

      {/* Main 2-Column Dashboard Grid: Left = Roster + All-Time M/T Controls | Right = Vacation/Baja Date Picker + App Color Editor */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* LEFT COLUMN (7 cols): Employee Roster, Inline Name/Role Edit & All-Time M / T Assignment */}
        <div className="xl:col-span-7 bg-white border border-slate-200 rounded-xl p-4 space-y-4 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">
                {i18n.dashSection1Title(employees.length)}
              </h3>
              <p className="text-[11px] text-slate-500">
                {i18n.dashSection1Subtitle}
              </p>
            </div>

            {/* Bulk All-Time M / All-Time T / Rotating Buttons */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => onBulkSetShiftPreference('FIXED_M', 'NORMAL')}
                data-testid="bulk-all-m-btn"
                className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-100 text-amber-950 border border-amber-300 hover:bg-amber-200 transition-colors"
              >
                {i18n.btnBulkAllM}
              </button>
              <button
                type="button"
                onClick={() => onBulkSetShiftPreference('FIXED_T', 'NORMAL')}
                data-testid="bulk-all-t-btn"
                className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-indigo-100 text-indigo-950 border border-indigo-300 hover:bg-indigo-200 transition-colors"
              >
                {i18n.btnBulkAllT}
              </button>
              <button
                type="button"
                onClick={() => onBulkSetShiftPreference('ROTATING', 'ALL')}
                data-testid="bulk-rotating-btn"
                className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200 transition-colors"
              >
                {i18n.btnBulkRotating}
              </button>
            </div>
          </div>

          {/* Add New Employee Form */}
          <form
            onSubmit={handleSubmitNewEmployee}
            className="grid grid-cols-1 sm:grid-cols-12 gap-2 bg-slate-50 border border-slate-200 rounded-lg p-3"
          >
            <div className="sm:col-span-4">
              <label htmlFor="new-employee-name" className="block text-[10px] font-bold text-slate-600 mb-1">
                {i18n.labelEmployeeName}
              </label>
              <input
                id="new-employee-name"
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={i18n.placeholderEmployeeName}
                className="w-full rounded-md bg-white border border-slate-300 px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="new-employee-role" className="block text-[10px] font-bold text-slate-600 mb-1">
                {i18n.labelGroupRole}
              </label>
              <select
                id="new-employee-role"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as 'NORMAL' | 'BOSS')}
                className="w-full rounded-md bg-white border border-slate-300 px-2 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
              >
                <option value="NORMAL">{i18n.optionNormalStaff}</option>
                <option value="BOSS">{i18n.optionBossGreenRow}</option>
              </select>
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="new-employee-shift-pref" className="block text-[10px] font-bold text-slate-600 mb-1">
                {i18n.labelShiftAssignment}
              </label>
              <select
                id="new-employee-shift-pref"
                value={newShiftPref}
                onChange={(e) => setNewShiftPref(e.target.value as ShiftPreference)}
                className="w-full rounded-md bg-white border border-slate-300 px-2 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
              >
                <option value="ROTATING">{i18n.optionRotating}</option>
                <option value="FIXED_M">{i18n.optionFixedM}</option>
                <option value="FIXED_T">{i18n.optionFixedT}</option>
              </select>
            </div>

            <div className="sm:col-span-2 flex items-end">
              <button
                type="submit"
                data-testid="add-employee-btn"
                style={{ backgroundColor: colorTheme.accentHex }}
                className="w-full py-1.5 px-2.5 rounded-md text-xs font-bold text-white hover:opacity-90 transition-opacity whitespace-nowrap"
              >
                {i18n.btnAddEmployee}
              </button>
            </div>
          </form>

          {/* Search Filter for Employee Table */}
          <div className="flex items-center justify-between gap-2">
            <input
              type="search"
              value={rosterFilter}
              onChange={(e) => setRosterFilter(e.target.value)}
              placeholder={i18n.placeholderFilterRoster}
              className="w-full sm:w-64 rounded-md bg-slate-50 border border-slate-300 px-2.5 py-1 text-xs text-slate-900"
            />
            <span className="text-[11px] text-slate-500 font-mono">
              {i18n.showingCountOfTotal(filteredEmployees.length, employees.length)}
            </span>
          </div>

          {/* Compact Excel-Style Roster Table */}
          <div className="overflow-auto max-h-[420px] border border-slate-200 rounded-lg">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-[11px] font-bold text-slate-700">
                  <th className="py-2 px-2.5">{i18n.colNameEditable}</th>
                  <th className="py-2 px-2 text-center">{i18n.colGroup}</th>
                  <th className="py-2 px-2 text-center">{i18n.colShiftMode}</th>
                  <th className="py-2 px-2 text-right">{i18n.colQuickActions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredEmployees.map((emp) => {
                  const isBoss = emp.isBoss === 1;
                  const pref = emp.shiftPreference || 'ROTATING';
                  return (
                    <tr
                      key={emp.id}
                      style={{
                        backgroundColor: isBoss
                          ? colorTheme.bossRowBgHex
                          : colorTheme.normalRowBgHex,
                      }}
                    >
                      {/* Editable Name Input */}
                      <td className="py-1.5 px-2">
                        <input
                          type="text"
                          aria-label={`Edit name for ${emp.name}`}
                          value={emp.name}
                          onChange={(e) =>
                            onUpdateEmployee(emp.id, { name: e.target.value })
                          }
                          className="w-full rounded bg-white/90 border border-slate-300 px-2 py-1 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                        />
                      </td>

                      {/* Role Toggle */}
                      <td className="py-1.5 px-2 text-center">
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateEmployee(emp.id, {
                              isBoss: isBoss ? 0 : 1,
                            })
                          }
                          className={`px-2 py-0.5 rounded text-[10.5px] font-mono font-bold border ${
                            isBoss
                              ? 'bg-emerald-600 text-white border-emerald-700'
                              : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                          }`}
                        >
                          {isBoss ? i18n.roleBossBadge : i18n.roleNormalBadge}
                        </button>
                      </td>

                      {/* Shift Preference Segmented Control: Rotating vs All-Time M vs All-Time T */}
                      <td className="py-1.5 px-2">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateEmployee(emp.id, {
                                shiftPreference: 'ROTATING',
                              })
                            }
                            data-testid={`pref-rot-${emp.id}`}
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold border transition-colors ${
                              pref === 'ROTATING'
                                ? 'bg-slate-800 text-white border-slate-900'
                                : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                            }`}
                          >
                            {i18n.btnRotateShort}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateEmployee(emp.id, {
                                shiftPreference: 'FIXED_M',
                              })
                            }
                            data-testid={`pref-m-${emp.id}`}
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border transition-colors ${
                              pref === 'FIXED_M'
                                ? 'bg-amber-400 text-amber-950 border-amber-600 ring-1 ring-amber-500'
                                : 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
                            }`}
                          >
                            {i18n.btnAllMShort}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateEmployee(emp.id, {
                                shiftPreference: 'FIXED_T',
                              })
                            }
                            data-testid={`pref-t-${emp.id}`}
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border transition-colors ${
                              pref === 'FIXED_T'
                                ? 'bg-indigo-600 text-white border-indigo-700 ring-1 ring-indigo-500'
                                : 'bg-indigo-50 text-indigo-900 border-indigo-200 hover:bg-indigo-100'
                            }`}
                          >
                            {i18n.btnAllTShort}
                          </button>
                        </div>
                      </td>

                      {/* Quick Leave + Remove Actions */}
                      <td className="py-1.5 px-2 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              handleQuickPrepareLeave(emp.id, 'VACACIONES')
                            }
                            title={`Assign Vacation dates for ${emp.name}`}
                            className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-100 text-purple-900 border border-purple-300 hover:bg-purple-200"
                          >
                            +Vac
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickPrepareLeave(emp.id, 'BAJA')}
                            title={`Assign Medical Leave (Baja) dates for ${emp.name}`}
                            className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-900 border border-red-300 hover:bg-red-200"
                          >
                            +Baja
                          </button>
                          <button
                            type="button"
                            onClick={() => onRemoveEmployee(emp.id)}
                            data-testid={`remove-employee-${emp.id}`}
                            title={`Remove ${emp.name}`}
                            className="px-1.5 py-0.5 rounded text-[10px] font-semibold text-rose-700 hover:bg-rose-100 border border-transparent hover:border-rose-200"
                          >
                            {i18n.btnDeleteEmployee}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT COLUMN (5 cols): Vacation / Baja Date Range Manager + App Color Editor */}
        <div className="xl:col-span-5 space-y-5">
          {/* Card 2: Add / Edit Vacation (VACACIONES) & Medical Leave (BAJA) with Date Pickers */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3.5 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  {i18n.dashSection2Title}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {i18n.dashSection2Subtitle}
                </p>
              </div>
              {leaveRecords.length > 0 && (
                <button
                  type="button"
                  onClick={onClearAllLeaves}
                  className="px-2 py-1 rounded text-[10.5px] font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200"
                >
                  {i18n.btnClearAllLeaves(leaveRecords.length)}
                </button>
              )}
            </div>

            <form
              onSubmit={handleSubmitLeave}
              className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 bg-slate-50 border border-slate-200 rounded-lg p-3"
            >
              <div className="sm:col-span-7">
                <label
                  htmlFor="leave-employee-select"
                  className="block text-[10px] font-bold text-slate-600 mb-1"
                >
                  {i18n.labelSelectEmployee}
                </label>
                <select
                  id="leave-employee-select"
                  value={leaveEmployeeId}
                  onChange={(e) => setLeaveEmployeeId(Number(e.target.value))}
                  className="w-full rounded-md bg-white border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-900"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-5">
                <label
                  htmlFor="leave-type-select"
                  className="block text-[10px] font-bold text-slate-600 mb-1"
                >
                  {i18n.labelLeaveType}
                </label>
                <select
                  id="leave-type-select"
                  value={leaveType}
                  onChange={(e) =>
                    setLeaveType(e.target.value as 'VACACIONES' | 'BAJA')
                  }
                  className="w-full rounded-md bg-white border border-slate-300 px-2.5 py-1.5 text-xs font-bold text-slate-900"
                >
                  <option value="VACACIONES">{i18n.optionVacaciones}</option>
                  <option value="BAJA">{i18n.optionBaja}</option>
                </select>
              </div>

              <div className="sm:col-span-6">
                <label
                  htmlFor="leave-start-date"
                  className="block text-[10px] font-bold text-slate-600 mb-1"
                >
                  {i18n.labelStartDate}
                </label>
                <input
                  id="leave-start-date"
                  type="date"
                  value={leaveStartDate}
                  min={days[0]?.isoDate}
                  max={days[days.length - 1]?.isoDate}
                  onChange={(e) => setLeaveStartDate(e.target.value)}
                  className="w-full rounded-md bg-white border border-slate-300 px-2.5 py-1.5 text-xs font-mono text-slate-900"
                />
              </div>

              <div className="sm:col-span-6">
                <label
                  htmlFor="leave-end-date"
                  className="block text-[10px] font-bold text-slate-600 mb-1"
                >
                  {i18n.labelEndDate}
                </label>
                <input
                  id="leave-end-date"
                  type="date"
                  value={leaveEndDate}
                  min={days[0]?.isoDate}
                  max={days[days.length - 1]?.isoDate}
                  onChange={(e) => setLeaveEndDate(e.target.value)}
                  className="w-full rounded-md bg-white border border-slate-300 px-2.5 py-1.5 text-xs font-mono text-slate-900"
                />
              </div>

              <div className="sm:col-span-8">
                <label
                  htmlFor="leave-note-input"
                  className="block text-[10px] font-bold text-slate-600 mb-1"
                >
                  {i18n.labelNoteOptional}
                </label>
                <input
                  id="leave-note-input"
                  type="text"
                  value={leaveNote}
                  onChange={(e) => setLeaveNote(e.target.value)}
                  placeholder={i18n.placeholderLeaveNote}
                  className="w-full rounded-md bg-white border border-slate-300 px-2.5 py-1.5 text-xs text-slate-900"
                />
              </div>

              <div className="sm:col-span-4 flex items-end gap-1.5">
                <button
                  type="submit"
                  data-testid="save-leave-btn"
                  style={{ backgroundColor: colorTheme.accentHex }}
                  className="w-full py-1.5 px-2.5 rounded-md text-xs font-bold text-white hover:opacity-90 transition-opacity whitespace-nowrap"
                >
                  {editingLeaveId ? i18n.btnUpdateLeave : i18n.btnSaveLeave}
                </button>
                {editingLeaveId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingLeaveId(null);
                      setLeaveNote('');
                    }}
                    className="py-1.5 px-2 rounded-md text-xs font-semibold bg-slate-200 text-slate-700 hover:bg-slate-300"
                  >
                    {i18n.btnCancelEdit}
                  </button>
                )}
              </div>
            </form>

            {/* Scheduled Vacations & Baja List */}
            <div className="space-y-1.5 max-h-48 overflow-auto">
              {leaveRecords.length === 0 ? (
                <div className="text-xs text-slate-400 text-center py-3 border border-dashed border-slate-200 rounded-lg">
                  {i18n.emptyLeavesText}
                </div>
              ) : (
                leaveRecords.map((rec) => {
                  const emp = employees.find((e) => e.id === rec.employeeId);
                  const isVac = rec.type === 'VACACIONES';
                  return (
                    <div
                      key={rec.id}
                      data-testid={`leave-record-${rec.id}`}
                      className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-slate-50/70 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold border ${
                              isVac
                                ? 'bg-purple-100 text-purple-900 border-purple-300'
                                : 'bg-red-100 text-red-900 border-red-300'
                            }`}
                          >
                            {rec.type}
                          </span>
                          <span className="font-bold text-slate-900 truncate">
                            {emp?.name || `Employee #${rec.employeeId}`}
                          </span>
                        </div>
                        <div className="text-[11px] font-mono text-slate-600 mt-0.5">
                          {rec.startDateIso} → {rec.endDateIso}
                          {rec.note ? ` · ${rec.note}` : ''}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleStartEditLeave(rec)}
                          data-testid={`edit-leave-${rec.id}`}
                          className="px-2 py-1 rounded text-[10.5px] font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-100"
                        >
                          {i18n.btnEditLeave}
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteLeaveRecord(rec.id)}
                          data-testid={`delete-leave-${rec.id}`}
                          className="px-2 py-1 rounded text-[10.5px] font-semibold bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100"
                        >
                          {i18n.btnRemoveLeave}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Card 3: Edit the Color of the App (Theme Presets + Shift & Row Color Pickers) */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3.5 shadow-2xs">
            <div className="border-b border-slate-200 pb-2.5">
              <h3 className="text-sm font-extrabold text-slate-900">
                {i18n.dashSection3Title}
              </h3>
              <p className="text-[11px] text-slate-500">
                {i18n.dashSection3Subtitle}
              </p>
            </div>

            {/* Theme Presets */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {THEME_PRESETS.map((preset) => {
                const isSelected = colorTheme.id === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => onChangeColorTheme(preset)}
                    data-testid={`theme-preset-${preset.id}`}
                    className={`p-2 rounded-lg border text-left transition-all ${
                      isSelected
                        ? 'border-slate-900 ring-2 ring-slate-900/20 bg-slate-50'
                        : 'border-slate-200 hover:border-slate-400 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-1 mb-1">
                      <span
                        className="w-3 h-3 rounded-full border border-black/15"
                        style={{ backgroundColor: preset.accentHex }}
                      />
                      <span
                        className="w-3 h-3 rounded-full border border-black/15"
                        style={{ backgroundColor: preset.shifts.morning.bgHex }}
                      />
                      <span
                        className="w-3 h-3 rounded-full border border-black/15"
                        style={{ backgroundColor: preset.shifts.afternoon.bgHex }}
                      />
                      <span
                        className="w-3 h-3 rounded-full border border-black/15"
                        style={{ backgroundColor: preset.bossRowBgHex }}
                      />
                    </div>
                    <div className="text-[11px] font-bold text-slate-800 truncate">
                      {preset.name}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Individual Color Pickers */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
              <label className="flex items-center justify-between gap-2 p-2 rounded-lg border border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-700">
                <span>{i18n.colorAppAccent}</span>
                <input
                  type="color"
                  aria-label="App Accent Color"
                  value={colorTheme.accentHex}
                  onChange={(e) =>
                    onChangeColorTheme({
                      ...colorTheme,
                      id: 'custom',
                      name: 'Custom App Colors',
                      accentHex: e.target.value,
                    })
                  }
                  className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                />
              </label>

              <label className="flex items-center justify-between gap-2 p-2 rounded-lg border border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-700">
                <span>{i18n.colorBossRowFill}</span>
                <input
                  type="color"
                  aria-label="Boss Row Highlight Color"
                  value={colorTheme.bossRowBgHex}
                  onChange={(e) =>
                    onChangeColorTheme({
                      ...colorTheme,
                      id: 'custom',
                      name: 'Custom App Colors',
                      bossRowBgHex: e.target.value,
                    })
                  }
                  className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                />
              </label>

              <label className="flex items-center justify-between gap-2 p-2 rounded-lg border border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-700">
                <span>{i18n.colorMorningShift}</span>
                <input
                  type="color"
                  aria-label="Morning Shift Background Color"
                  value={colorTheme.shifts.morning.bgHex}
                  onChange={(e) =>
                    updateShiftColor('morning', 'bgHex', e.target.value)
                  }
                  className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                />
              </label>

              <label className="flex items-center justify-between gap-2 p-2 rounded-lg border border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-700">
                <span>{i18n.colorAfternoonShift}</span>
                <input
                  type="color"
                  aria-label="Afternoon Shift Background Color"
                  value={colorTheme.shifts.afternoon.bgHex}
                  onChange={(e) =>
                    updateShiftColor('afternoon', 'bgHex', e.target.value)
                  }
                  className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                />
              </label>

              <label className="flex items-center justify-between gap-2 p-2 rounded-lg border border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-700">
                <span>{i18n.colorLibreBg}</span>
                <input
                  type="color"
                  data-testid="color-picker-libre-bg"
                  aria-label="Libre Days Background Color"
                  value={colorTheme.shifts.rest.bgHex}
                  onChange={(e) =>
                    updateShiftColor('rest', 'bgHex', e.target.value)
                  }
                  className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                />
              </label>

              <label className="flex items-center justify-between gap-2 p-2 rounded-lg border border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-700">
                <span>{i18n.colorLibreText}</span>
                <input
                  type="color"
                  data-testid="color-picker-libre-text"
                  aria-label="Libre Days Text Color"
                  value={colorTheme.shifts.rest.textHex}
                  onChange={(e) =>
                    updateShiftColor('rest', 'textHex', e.target.value)
                  }
                  className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                />
              </label>

              <label className="flex items-center justify-between gap-2 p-2 rounded-lg border border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-700">
                <span>{i18n.colorBridgeShift}</span>
                <input
                  type="color"
                  aria-label="Bridge Shift Background Color"
                  value={colorTheme.shifts.bridge.bgHex}
                  onChange={(e) =>
                    updateShiftColor('bridge', 'bgHex', e.target.value)
                  }
                  className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                />
              </label>

              <label className="flex items-center justify-between gap-2 p-2 rounded-lg border border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-700">
                <span>{i18n.colorVacationCell}</span>
                <input
                  type="color"
                  aria-label="Vacation Cell Background Color"
                  value={colorTheme.shifts.vacation.bgHex}
                  onChange={(e) =>
                    updateShiftColor('vacation', 'bgHex', e.target.value)
                  }
                  className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                />
              </label>

              <label className="flex items-center justify-between gap-2 p-2 rounded-lg border border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-700">
                <span>{i18n.colorBajaCell}</span>
                <input
                  type="color"
                  aria-label="Baja Cell Background Color"
                  value={colorTheme.shifts.baja.bgHex}
                  onChange={(e) =>
                    updateShiftColor('baja', 'bgHex', e.target.value)
                  }
                  className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                />
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
