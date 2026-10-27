import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_SOLVER_PARAMS,
  PDF_STAFF_ROSTER,
  SHIFT_M,
  SHIFT_E,
  SHIFT_MID,
  STATE_OFF,
  STATE_VAC,
  STATE_BAJA,
  ACTIVE_SHIFTS,
  solveShiftSchedule,
  computeSingleDayCoverage,
  buildHorizonCalendar,
} from './cpsatSolver';

test('Staff Roster contains 5 Timeshift Bosses (r_i = 1) and strictly 12 Normal Employees (r_i = 0)', () => {
  const bosses = PDF_STAFF_ROSTER.filter((e) => e.isBoss === 1);
  const normal = PDF_STAFF_ROSTER.filter((e) => e.isBoss === 0);
  assert.equal(bosses.length, 5);
  assert.equal(normal.length, 12);
  assert.equal(PDF_STAFF_ROSTER.length, 17);
});

test('12 Normal Employees are split 50/50 in half between Morning (M) and Afternoon (T) each week', () => {
  const solution = solveShiftSchedule(PDF_STAFF_ROSTER, DEFAULT_SOLVER_PARAMS, []);
  assert.equal(solution.status, 'OPTIMAL');

  const normalRows = solution.rows.filter((r) => r.employee.isBoss === 0);
  assert.equal(normalRows.length, 12);

  for (let w = 0; w < DEFAULT_SOLVER_PARAMS.numWeeks; w++) {
    let morningAssignedStaff = 0;
    let afternoonAssignedStaff = 0;

    for (const row of normalRows) {
      const weekSlice = row.shifts.slice(w * 7, (w + 1) * 7);
      // An employee in the Morning half works M (or Mon Bridge 10-18); Afternoon half works E (14-22)
      const hasEvening = weekSlice.includes(SHIFT_E);
      if (hasEvening) {
        afternoonAssignedStaff++;
      } else {
        morningAssignedStaff++;
      }
    }

    assert.equal(
      morningAssignedStaff,
      6,
      `Week ${w}: expected 6 normal employees in Morning half, got ${morningAssignedStaff}`
    );
    assert.equal(
      afternoonAssignedStaff,
      6,
      `Week ${w}: expected 6 normal employees in Afternoon half, got ${afternoonAssignedStaff}`
    );
  }
});

test('CP-SAT Solver achieves OPTIMAL schedule satisfying Boss Coverage (M >= 1, E >= 1) and 5W/2O consecutive rest', () => {
  const solution = solveShiftSchedule(PDF_STAFF_ROSTER, DEFAULT_SOLVER_PARAMS, []);
  assert.equal(solution.status, 'OPTIMAL');

  for (let t = 0; t < solution.days.length; t++) {
    const cov = solution.dailyCoverage[t];
    assert.equal(cov.morningBosses >= 1, true);
    assert.equal(cov.eveningBosses >= 1, true);
    assert.equal(cov.bossCoverageValid, true);
  }

  for (const row of solution.rows) {
    assert.equal(row.clopeningViolations.length, 0);
    assert.equal(row.isolatedRestDays.length, 0);
    for (let w = 0; w < DEFAULT_SOLVER_PARAMS.numWeeks; w++) {
      const weekSlice = row.shifts.slice(w * 7, (w + 1) * 7);
      const activeCount = weekSlice.filter((s) => ACTIVE_SHIFTS.has(s)).length;
      const offCount = weekSlice.filter((s) => s === STATE_OFF).length;
      assert.equal(activeCount, 5);
      assert.equal(offCount, 2);
      const firstOff = weekSlice.indexOf(STATE_OFF);
      const lastOff = weekSlice.lastIndexOf(STATE_OFF);
      assert.equal(lastOff - firstOff, 1);
    }
  }
});

test('Changing year and month updates calendar horizon and Regenerate Different Shifts produces a distinct valid schedule', () => {
  const solSeed0 = solveShiftSchedule(
    PDF_STAFF_ROSTER,
    { ...DEFAULT_SOLVER_PARAMS, year: 2027, month: 3, variationSeed: 0 },
    []
  );
  const solSeed1 = solveShiftSchedule(
    PDF_STAFF_ROSTER,
    { ...DEFAULT_SOLVER_PARAMS, year: 2027, month: 3, variationSeed: 1 },
    []
  );

  assert.equal(solSeed0.status, 'OPTIMAL');
  assert.equal(solSeed1.status, 'OPTIMAL');
  assert.equal(solSeed0.days.some((d) => d.isoDate.startsWith('2027-03')), true);

  // Verify that variationSeed=1 produces different shift assignments than variationSeed=0
  let diffCells = 0;
  for (let i = 0; i < solSeed0.rows.length; i++) {
    for (let t = 0; t < solSeed0.days.length; t++) {
      if (solSeed0.rows[i].shifts[t] !== solSeed1.rows[i].shifts[t]) {
        diffCells++;
      }
    }
  }
  assert.equal(diffCells > 20, true, `Expected >20 changed cells on regenerate, got ${diffCells}`);
});

test('Pre-assigned locks (VACACIONES / BAJA) and single-day coverage recomputation work accurately', () => {
  const validSolution = solveShiftSchedule(PDF_STAFF_ROSTER, DEFAULT_SOLVER_PARAMS, [
    { id: 'lock-1', employeeId: 6, dayIndex: 7, state: STATE_VAC, reason: 'Planned Leave' },
    { id: 'lock-2', employeeId: 6, dayIndex: 8, state: STATE_VAC, reason: 'Planned Leave' },
  ]);
  assert.equal(validSolution.status, 'OPTIMAL');
  const emp6Row = validSolution.rows.find((r) => r.employee.id === 6)!;
  assert.equal(emp6Row.shifts[7], STATE_VAC);
  assert.equal(emp6Row.shifts[8], STATE_VAC);

  const matrix = validSolution.rows.map((r) => [...r.shifts]);
  for (let b = 0; b < 5; b++) {
    matrix[b][10] = STATE_BAJA;
  }
  const day10Cov = computeSingleDayCoverage(matrix, PDF_STAFF_ROSTER, 10, DEFAULT_SOLVER_PARAMS);
  assert.equal(day10Cov.morningBosses, 0);
  assert.equal(day10Cov.eveningBosses, 0);
  assert.equal(day10Cov.bossCoverageValid, false);
});

test('Condensed View computeWeeklyShiftSummary aggregates weekly shift counts accurately and supports adding/removing employees', async () => {
  const { computeWeeklyShiftSummary } = await import('./cpsatSolver');
  const customRoster = [
    ...PDF_STAFF_ROSTER,
    { id: 99, name: 'Carlos Mendoza', roleTitle: 'Shift Specialist', isBoss: 0 as const, initialPattern: 1 },
  ];
  const sol = solveShiftSchedule(customRoster, DEFAULT_SOLVER_PARAMS, []);
  assert.equal(sol.status, 'OPTIMAL');
  assert.equal(sol.rows.length, 18);

  const carlosRow = sol.rows.find((r) => r.employee.id === 99)!;
  const w0Summary = computeWeeklyShiftSummary(carlosRow.shifts, 0);
  assert.equal(w0Summary.activeDays, 5);
  assert.equal(w0Summary.restCount, 2);
  assert.equal(w0Summary.totalHours, 40);
  assert.equal(
    w0Summary.morningCount + w0Summary.afternoonCount + w0Summary.bridgeCount,
    5
  );
});

test('All-time M (FIXED_M), All-time T (FIXED_T), and date-range LeaveRecord (VACACIONES / BAJA) work accurately', async () => {
  const { convertLeaveRecordsToLocks } = await import('./cpsatSolver');
  const modifiedRoster = PDF_STAFF_ROSTER.map((emp) => {
    if (emp.id === 6) return { ...emp, shiftPreference: 'FIXED_M' as const };
    if (emp.id === 7) return { ...emp, shiftPreference: 'FIXED_T' as const };
    return emp;
  });

  const days = buildHorizonCalendar(DEFAULT_SOLVER_PARAMS);
  const leaves = [
    {
      id: 'vac-1',
      employeeId: 8,
      type: 'VACACIONES' as const,
      startDateIso: days[7].isoDate,
      endDateIso: days[9].isoDate,
      note: 'Vacation test',
    },
  ];
  const locks = convertLeaveRecordsToLocks(leaves, days);
  const sol = solveShiftSchedule(modifiedRoster, DEFAULT_SOLVER_PARAMS, locks);
  assert.equal(sol.status, 'OPTIMAL');

  const emp6 = sol.rows.find((r) => r.employee.id === 6)!;
  assert.equal(emp6.shifts.every((s) => s === SHIFT_M || s === STATE_OFF), true);

  const emp7 = sol.rows.find((r) => r.employee.id === 7)!;
  assert.equal(emp7.shifts.every((s) => s === SHIFT_E || s === STATE_OFF), true);

  const emp8 = sol.rows.find((r) => r.employee.id === 8)!;
  assert.equal(emp8.shifts[7], STATE_VAC);
  assert.equal(emp8.shifts[8], STATE_VAC);
  assert.equal(emp8.shifts[9], STATE_VAC);
});

test('Custom Start Day and End Day (e.g. 2026-10-01 to 2026-10-31 and 25th-to-25th) generate exact date horizons with OPTIMAL coverage', () => {
  const octFullMonthSol = solveShiftSchedule(
    PDF_STAFF_ROSTER,
    {
      ...DEFAULT_SOLVER_PARAMS,
      customStartDateIso: '2026-10-01',
      customEndDateIso: '2026-10-31',
    },
    []
  );
  assert.equal(octFullMonthSol.status, 'OPTIMAL');
  assert.equal(octFullMonthSol.days.length, 31);
  assert.equal(octFullMonthSol.days[0].isoDate, '2026-10-01');
  assert.equal(octFullMonthSol.days[30].isoDate, '2026-10-31');

  const payroll25thSol = solveShiftSchedule(
    PDF_STAFF_ROSTER,
    {
      ...DEFAULT_SOLVER_PARAMS,
      customStartDateIso: '2026-09-25',
      customEndDateIso: '2026-10-25',
    },
    []
  );
  assert.equal(payroll25thSol.status, 'OPTIMAL');
  assert.equal(payroll25thSol.days.length, 31);
  assert.equal(payroll25thSol.days[0].isoDate, '2026-09-25');
  assert.equal(payroll25thSol.days[30].isoDate, '2026-10-25');
});

test('Generate Shifts Based on Manual Edits preserves manual Boss edits 100% while adapting weekly pattern and maintaining OPTIMAL coverage', () => {
  const initialSol = solveShiftSchedule(PDF_STAFF_ROSTER, DEFAULT_SOLVER_PARAMS, []);
  assert.equal(initialSol.status, 'OPTIMAL');

  // Suppose user manually changes Boss 1 (Iván Navarro) on day 0 to Afternoon (14:00 a 22:00)
  // and on day 3 to LIBRE (Rest Day), then clicks "Generate Based on Manual Edits"
  const manualEdits = [
    {
      id: 'manual-boss1-d0',
      employeeId: 1,
      dayIndex: 0,
      state: SHIFT_E,
      reason: 'Manual Cell Override',
    },
    {
      id: 'manual-boss1-d3',
      employeeId: 1,
      dayIndex: 3,
      state: STATE_OFF,
      reason: 'Manual Cell Override',
    },
  ];

  const adaptedSol = solveShiftSchedule(
    PDF_STAFF_ROSTER,
    { ...DEFAULT_SOLVER_PARAMS, variationSeed: 1 },
    manualEdits
  );

  assert.equal(adaptedSol.status, 'OPTIMAL');
  const boss1Row = adaptedSol.rows.find((r) => r.employee.id === 1)!;

  // 1. Both manual edits are strictly preserved
  assert.equal(boss1Row.shifts[0], SHIFT_E);
  assert.equal(boss1Row.shifts[3], STATE_OFF);

  // 2. Boss 1's Week 0 was automatically adapted around the manual edits to keep 5 workdays / 2 consecutive LIBRE days and zero clopenings
  const boss1Week0 = boss1Row.shifts.slice(0, 7);
  const offCount = boss1Week0.filter((s) => s === STATE_OFF).length;
  assert.equal(offCount, 2);
  assert.equal(boss1Row.clopeningViolations.length, 0);

  // 3. Every day of the horizon maintains valid Morning & Afternoon Boss coverage
  for (let t = 0; t < adaptedSol.days.length; t++) {
    assert.equal(adaptedSol.dailyCoverage[t].bossCoverageValid, true);
  }
});

test('Swap Shifts function exchanges shifts between two employees on a date, updates manualLocks, and persists across future solver runs', async () => {
  const { swapEmployeeShiftsOnDay } = await import('./cpsatSolver');
  const initialSol = solveShiftSchedule(PDF_STAFF_ROSTER, DEFAULT_SOLVER_PARAMS, []);
  assert.equal(initialSol.status, 'OPTIMAL');

  const dayT = 4; // Friday of Week 0
  const empAId = 1; // Iván Navarro
  const empBId = 2; // Jordan Roman

  const beforeShiftA = initialSol.rows.find((r) => r.employee.id === empAId)!.shifts[dayT];
  const beforeShiftB = initialSol.rows.find((r) => r.employee.id === empBId)!.shifts[dayT];

  const swapResult = swapEmployeeShiftsOnDay(
    initialSol,
    PDF_STAFF_ROSTER,
    [],
    empAId,
    empBId,
    dayT
  );
  assert.notEqual(swapResult, null);

  // 1. Shifts are exchanged on dayT
  const afterRowA = swapResult!.nextSolution.rows.find((r) => r.employee.id === empAId)!;
  const afterRowB = swapResult!.nextSolution.rows.find((r) => r.employee.id === empBId)!;
  assert.equal(afterRowA.shifts[dayT], beforeShiftB);
  assert.equal(afterRowB.shifts[dayT], beforeShiftA);

  // 2. Both swapped cells are stored in nextManualLocks
  assert.equal(swapResult!.nextManualLocks.length, 2);
  const lockA = swapResult!.nextManualLocks.find(
    (l) => l.employeeId === empAId && l.dayIndex === dayT
  );
  const lockB = swapResult!.nextManualLocks.find(
    (l) => l.employeeId === empBId && l.dayIndex === dayT
  );
  assert.equal(lockA?.state, beforeShiftB);
  assert.equal(lockB?.state, beforeShiftA);

  // 3. Running solveShiftSchedule with nextManualLocks preserves both swapped shifts
  const nextSolverRun = solveShiftSchedule(
    PDF_STAFF_ROSTER,
    { ...DEFAULT_SOLVER_PARAMS, variationSeed: 2 },
    swapResult!.nextManualLocks
  );
  assert.equal(nextSolverRun.status, 'OPTIMAL');
  assert.equal(
    nextSolverRun.rows.find((r) => r.employee.id === empAId)!.shifts[dayT],
    beforeShiftB
  );
  assert.equal(
    nextSolverRun.rows.find((r) => r.employee.id === empBId)!.shifts[dayT],
    beforeShiftA
  );
});




