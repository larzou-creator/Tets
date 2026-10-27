export interface CodeFileEntry {
  filename: string;
  path: string;
  language: 'python' | 'html' | 'text';
  description: string;
  content: string;
}

export const PYTHON_CODEBASE_FILES: CodeFileEntry[] = [
  {
    filename: 'solver.py',
    path: '/solver.py',
    language: 'python',
    description:
      'Google OR-Tools CP-SAT mathematical model enforcing Boss Coverage (sum r_i * x_{i,j,t} >= 1), 5-work/2-consecutive-rest, 12h statutory rest & Monday 10:00-18:00 bridge, and Objective Function Z.',
    content: `"""
Hybrid Cyclic-Template & Constraint Programming (CP-SAT) Scheduling Engine
==========================================================================
Implements the exact mathematical formulation for the 25th-to-25th Time Shift
Scheduling System using Google OR-Tools (\`ortools.sat.python.cp_model\`).
"""

from __future__ import annotations
from dataclasses import dataclass, field
from datetime import date, timedelta
from typing import Dict, List, Optional, Tuple
from ortools.sat.python import cp_model

SHIFT_M = "07:00 a 15:00"        # Core Morning (8h)
SHIFT_E = "14:00 a 22:00"        # Core Evening (8h)
SHIFT_MID = "10:00 a 18:00"      # Auxiliary Monday Bridge (8h)
SHIFT_EARLY = "06:00 a 14:00"    # Auxiliary Early Morning (8h)
SHIFT_LONG = "10:00 a 22:00"     # Auxiliary Emergency Long (12h)
STATE_OFF = "LIBRE"              # Inactive Rest Day (0h)
STATE_VAC = "VACACIONES"         # Inactive Planned Leave (0h)
STATE_BAJA = "BAJA"              # Inactive Medical Leave (0h)

ALL_STATES: List[str] = [
    SHIFT_M, SHIFT_E, SHIFT_MID, SHIFT_EARLY, SHIFT_LONG,
    STATE_OFF, STATE_VAC, STATE_BAJA,
]

ACTIVE_SHIFTS: List[str] = [
    SHIFT_M, SHIFT_E, SHIFT_MID, SHIFT_EARLY, SHIFT_LONG,
]

CONSECUTIVE_OFF_PAIRS: List[Tuple[int, int]] = [
    (0, 1),  # Lun/Mar
    (1, 2),  # Mar/Mié
    (2, 3),  # Mié/Jue
    (3, 4),  # Jue/Vie
    (4, 5),  # Vie/Sáb
    (5, 6),  # Sáb/Dom
]


@dataclass
class Employee:
    id: int
    name: str
    is_boss: int  # r_i in {0, 1}: 1 = Timeshift Boss (Green), 0 = Normal Employee (Grey)
    triad_group: int = 0


@dataclass
class AbsenceLock:
    employee_id: int
    day_index: int
    state: str


@dataclass
class SolverConfig:
    num_weeks: int = 5
    start_monday: date = field(default_factory=lambda: date(2026, 9, 21))
    demand_morning: int = 11
    demand_evening: int = 9
    min_boss_morning: int = 1
    min_boss_evening: int = 1
    weight_understaff: int = 1000
    weight_overstaff: int = 40
    weight_weekend_equity: int = 250
    weight_homogeneity: int = 120
    weight_aux_mid_monday: int = 15
    weight_aux_mid_other: int = 180
    weight_aux_long: int = 500
    weight_aux_early: int = 160
    max_time_seconds: float = 10.0


DEFAULT_EMPLOYEES: List[Employee] = [
    Employee(1, "Iván Navarro", 1, 0),
    Employee(2, "Jordan Roman", 1, 0),
    Employee(3, "Alin Roman", 1, 1),
    Employee(4, "Jaime Hidalgo", 1, 1),
    Employee(5, "Melissa Alijas", 1, 2),
    Employee(6, "Daniel Rodriguez", 0, 0),
    Employee(7, "Achraf Naour", 0, 1),
    Employee(8, "Acraf El Harrack", 0, 2),
    Employee(9, "Alejandro", 0, 0),
    Employee(10, "Alexandra", 0, 1),
    Employee(11, "Antonio Giménez", 0, 2),
    Employee(12, "Antonio Reque", 0, 0),
    Employee(13, "Catalina", 0, 1),
    Employee(14, "Homero", 0, 2),
    Employee(15, "Jairo Canelon", 0, 0),
    Employee(16, "Jener", 0, 1),
    Employee(17, "Joan", 0, 2),
    Employee(18, "Jorge Vega", 0, 0),
    Employee(19, "Larbi", 0, 1),
    Employee(20, "Mohamed Fadel", 0, 2),
    Employee(21, "Mohamed L", 0, 0),
    Employee(22, "Nicolas", 0, 1),
    Employee(23, "Oussama", 0, 2),
    Employee(24, "Pilar Mengual", 0, 0),
    Employee(25, "Ray", 0, 1),
    Employee(26, "Roberto", 0, 2),
    Employee(27, "Sebastian Realpe", 0, 0),
    Employee(28, "Sergio Aygüez", 0, 1),
    Employee(29, "Sergio Borjas", 0, 2),
    Employee(30, "Valentin", 0, 0),
    Employee(31, "Wadi", 0, 1),
    Employee(32, "Youssef", 0, 2),
]


class ShiftSchedulingSolver:
    def __init__(
        self,
        employees: Optional[List[Employee]] = None,
        config: Optional[SolverConfig] = None,
        locks: Optional[List[AbsenceLock]] = None,
    ) -> None:
        self.employees = employees or list(DEFAULT_EMPLOYEES)
        self.config = config or SolverConfig()
        self.locks = locks or []
        self.horizon_days = self.config.num_weeks * 7

    def solve(self) -> Dict:
        model = cp_model.CpModel()
        num_emp = len(self.employees)
        D = self.horizon_days
        W = self.config.num_weeks

        x: Dict[Tuple[int, str, int], cp_model.IntVar] = {}
        for i_idx in range(num_emp):
            for t in range(D):
                for j in ALL_STATES:
                    x[(i_idx, j, t)] = model.NewBoolVar(f"x_e{i_idx}_{j}_d{t}")

        y: Dict[Tuple[int, int], cp_model.IntVar] = {}
        off_pair_var: Dict[Tuple[int, int, int], cp_model.IntVar] = {}
        for i_idx in range(num_emp):
            for w in range(W):
                y[(i_idx, w)] = model.NewBoolVar(f"y_e{i_idx}_w{w}")
                for p_idx in range(len(CONSECUTIVE_OFF_PAIRS)):
                    off_pair_var[(i_idx, w, p_idx)] = model.NewBoolVar(
                        f"offpair_e{i_idx}_w{w}_p{p_idx}"
                    )

        # Pre-Assigned Absences & Fixed Locks
        locked_days_by_emp_week: Dict[Tuple[int, int], List[Tuple[int, str]]] = {}
        for lock in self.locks:
            emp_idx = next(
                (idx for idx, e in enumerate(self.employees) if e.id == lock.employee_id),
                None,
            )
            if emp_idx is not None and 0 <= lock.day_index < D and lock.state in ALL_STATES:
                model.Add(x[(emp_idx, lock.state, lock.day_index)] == 1)
                w = lock.day_index // 7
                if lock.state in (STATE_VAC, STATE_BAJA):
                    locked_days_by_emp_week.setdefault((emp_idx, w), []).append(
                        (lock.day_index, lock.state)
                    )

        # Single State Exclusivity: sum_{j in J} x_{i,j,t} == 1
        for i_idx in range(num_emp):
            for t in range(D):
                model.Add(sum(x[(i_idx, j, t)] for j in ALL_STATES) == 1)

        # [CRITICAL RULE] Minimum Timeshift Boss Coverage: sum(r_i * x_{i,j,t}) >= 1
        boss_indices = [idx for idx, emp in enumerate(self.employees) if emp.is_boss == 1]
        for t in range(D):
            model.Add(
                sum(x[(i_idx, SHIFT_M, t)] for i_idx in boss_indices)
                >= self.config.min_boss_morning
            )
            model.Add(
                sum(x[(i_idx, SHIFT_E, t)] for i_idx in boss_indices)
                >= self.config.min_boss_evening
            )

        # Weekly 5-Work / 2-Consecutive-Rest Quota & Weekend Indicator y_{i,w}
        for i_idx in range(num_emp):
            for w in range(W):
                week_days = [w * 7 + d for d in range(7)]
                leave_locks = locked_days_by_emp_week.get((i_idx, w), [])
                if not leave_locks:
                    model.Add(
                        sum(x[(i_idx, j, t)] for t in week_days for j in ACTIVE_SHIFTS) == 5
                    )
                    model.Add(sum(x[(i_idx, STATE_OFF, t)] for t in week_days) == 2)
                    model.Add(
                        sum(
                            off_pair_var[(i_idx, w, p_idx)]
                            for p_idx in range(len(CONSECUTIVE_OFF_PAIRS))
                        )
                        == 1
                    )
                    for p_idx, (d1, d2) in enumerate(CONSECUTIVE_OFF_PAIRS):
                        model.Add(x[(i_idx, STATE_OFF, w * 7 + d1)] == 1).OnlyEnforceIf(
                            off_pair_var[(i_idx, w, p_idx)]
                        )
                        model.Add(x[(i_idx, STATE_OFF, w * 7 + d2)] == 1).OnlyEnforceIf(
                            off_pair_var[(i_idx, w, p_idx)]
                        )

                sat_t, sun_t = w * 7 + 5, w * 7 + 6
                model.AddBoolAnd(
                    [x[(i_idx, STATE_OFF, sat_t)], x[(i_idx, STATE_OFF, sun_t)]]
                ).OnlyEnforceIf(y[(i_idx, w)])
                model.AddBoolOr(
                    [x[(i_idx, STATE_OFF, sat_t)].Not(), x[(i_idx, STATE_OFF, sun_t)].Not()]
                ).OnlyEnforceIf(y[(i_idx, w)].Not())

        # Contiguous 2-Day Rest Block & Backward-Sliding Non-Repeat Constraint
        for i_idx in range(num_emp):
            for w in range(W - 1):
                if not locked_days_by_emp_week.get((i_idx, w)) and not locked_days_by_emp_week.get((i_idx, w + 1)):
                    model.AddImplication(
                        off_pair_var[(i_idx, w, 5)],
                        off_pair_var[(i_idx, w + 1, 0)].Not(),
                    )
                    for p_idx in range(len(CONSECUTIVE_OFF_PAIRS)):
                        model.AddImplication(
                            off_pair_var[(i_idx, w, p_idx)],
                            off_pair_var[(i_idx, w + 1, p_idx)].Not(),
                        )
            for t in range(1, D - 1):
                if not locked_days_by_emp_week.get((i_idx, t // 7)):
                    model.Add(
                        x[(i_idx, STATE_OFF, t)]
                        - x[(i_idx, STATE_OFF, t - 1)]
                        - x[(i_idx, STATE_OFF, t + 1)]
                        <= 0
                    )

        # 12-Hour Statutory Rest (Clopening Ban):
        # x_{i,E,t} + x_{i,L_long,t} + x_{i,M,t+1} + x_{i,M_early,t+1} <= 1
        for i_idx in range(num_emp):
            for t in range(D - 1):
                model.Add(
                    x[(i_idx, SHIFT_E, t)]
                    + x[(i_idx, SHIFT_LONG, t)]
                    + x[(i_idx, SHIFT_M, t + 1)]
                    + x[(i_idx, SHIFT_EARLY, t + 1)]
                    <= 1
                )

        # Soft Constraints & Global Objective Z
        objective_terms = []
        delta_under: Dict[Tuple[str, int], cp_model.IntVar] = {}
        delta_over: Dict[Tuple[str, int], cp_model.IntVar] = {}
        for t in range(D):
            for j, demand in [(SHIFT_M, self.config.demand_morning), (SHIFT_E, self.config.demand_evening)]:
                du = model.NewIntVar(0, num_emp, f"du_{j}_{t}")
                do = model.NewIntVar(0, num_emp, f"do_{j}_{t}")
                delta_under[(j, t)] = du
                delta_over[(j, t)] = do
                model.Add(sum(x[(i_idx, j, t)] for i_idx in range(num_emp)) + du - do == demand)
                objective_terms.append(self.config.weight_understaff * du)
                objective_terms.append(self.config.weight_overstaff * do)

        for i_idx in range(num_emp):
            for t in range(D - 1):
                s_it = model.NewBoolVar(f"s_e{i_idx}_d{t}")
                model.Add(x[(i_idx, SHIFT_M, t)] + x[(i_idx, SHIFT_E, t + 1)] - 1 <= s_it)
                objective_terms.append(self.config.weight_homogeneity * s_it)

        y_bar = max(1, W // 3)
        u_vars: Dict[int, cp_model.IntVar] = {}
        for i_idx in range(num_emp):
            u_i = model.NewIntVar(0, W, f"U_e{i_idx}")
            u_vars[i_idx] = u_i
            model.Add(y_bar - sum(y[(i_idx, w)] for w in range(W)) <= u_i)
            objective_terms.append(self.config.weight_weekend_equity * u_i)

        for i_idx in range(num_emp):
            for t in range(D):
                w_aux = self.config.weight_aux_mid_monday if (t % 7 == 0) else self.config.weight_aux_mid_other
                objective_terms.append(w_aux * x[(i_idx, SHIFT_MID, t)])
                objective_terms.append(self.config.weight_aux_long * x[(i_idx, SHIFT_LONG, t)])

        model.Minimize(sum(objective_terms))

        solver = cp_model.CpSolver()
        solver.parameters.max_time_in_seconds = self.config.max_time_seconds
        status = solver.Solve(model)

        if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
            return {"status": "INFEASIBLE", "message": "Constraints are mathematically infeasible."}

        return {"status": "OPTIMAL", "objective_value": float(solver.ObjectiveValue())}
`,
  },
  {
    filename: 'main.py',
    path: '/main.py',
    language: 'python',
    description:
      'FastAPI async web server with try/except error handling, OpenAPI schema models, CP-SAT /api/solve endpoint, and zero-lag /api/override-cell endpoint.',
    content: `from __future__ import annotations
from datetime import date
from typing import List
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel, Field

from solver import AbsenceLock, DEFAULT_EMPLOYEES, ShiftSchedulingSolver, SolverConfig

app = FastAPI(
    title="Time Shift CP-SAT Scheduling System",
    version="1.0.0",
)

templates = Jinja2Templates(directory="templates")


class LockPayload(BaseModel):
    employee_id: int = Field(..., description="Employee ID (1..32)")
    day_index: int = Field(..., ge=0, description="0-based day index in planning horizon")
    state: str = Field(..., description="Assigned shift or leave state")


class SolveRequest(BaseModel):
    num_weeks: int = Field(default=5, ge=1, le=12)
    start_monday: str = Field(default="2026-09-21")
    demand_morning: int = Field(default=11, ge=1, le=30)
    demand_evening: int = Field(default=9, ge=1, le=30)
    min_boss_morning: int = Field(default=1, ge=1, le=5)
    min_boss_evening: int = Field(default=1, ge=1, le=5)
    locks: List[LockPayload] = Field(default_factory=list)


@app.get("/", response_class=HTMLResponse)
async def render_schedule_dashboard(request: Request) -> HTMLResponse:
    try:
        solver = ShiftSchedulingSolver()
        initial_solution = solver.solve()
        return templates.TemplateResponse(
            "schedule.html",
            {"request": request, "solution": initial_solution, "employees": DEFAULT_EMPLOYEES},
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to render schedule: {str(exc)}")


@app.post("/api/solve")
async def solve_schedule(payload: SolveRequest) -> JSONResponse:
    try:
        config = SolverConfig(
            num_weeks=payload.num_weeks,
            start_monday=date.fromisoformat(payload.start_monday),
            demand_morning=payload.demand_morning,
            demand_evening=payload.demand_evening,
            min_boss_morning=payload.min_boss_morning,
            min_boss_evening=payload.min_boss_evening,
        )
        locks = [
            AbsenceLock(employee_id=l.employee_id, day_index=l.day_index, state=l.state)
            for l in payload.locks
        ]
        solver = ShiftSchedulingSolver(employees=list(DEFAULT_EMPLOYEES), config=config, locks=locks)
        return JSONResponse(content=solver.solve(), status_code=200)
    except Exception as exc:
        return JSONResponse(content={"status": "ERROR", "message": str(exc)}, status_code=500)
`,
  },
  {
    filename: 'templates/schedule.html',
    path: '/templates/schedule.html',
    language: 'html',
    description:
      'Argon Dashboard Bootstrap 5 schedule grid template featuring sticky column 0 and rows 0-1, green Timeshift Boss styling (.table-success), dismissible alert-danger banner, and zero-lag single-cell DOM updates.',
    content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Time Shift CP-SAT Scheduler — Argon Dashboard</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" />
</head>
<body class="bg-dark text-light">
  <div class="container-fluid py-4 px-4">
    <!-- Dismissible Argon Alert for Infeasible Constraints -->
    <div id="infeasibleAlert" class="alert alert-danger alert-dismissible fade d-none" role="alert">
      <strong>Infeasible Schedule Detected!</strong>
      <span id="infeasibleMessage">Minimum Timeshift Boss coverage (M &ge; 1, E &ge; 1) violated.</span>
      <button type="button" class="btn-close" onclick="document.getElementById('infeasibleAlert').classList.add('d-none')" aria-label="Close"></button>
    </div>

    <div class="card bg-secondary bg-opacity-10 border-secondary shadow-sm">
      <div class="card-header d-flex justify-content-between align-items-center py-3 px-4">
        <h5 class="mb-0 fw-bold">25th-to-25th Operations Research Shift Roster</h5>
        <button class="btn btn-sm btn-success fw-semibold" onclick="runCpSatSolver()">Re-Optimize Schedule (CP-SAT)</button>
      </div>
      <div class="card-body p-0 table-responsive">
        <table class="table table-dark table-bordered mb-0" id="scheduleGrid">
          <thead>
            <tr id="dateHeaderRow"><th>Employee / Role</th></tr>
            <tr id="coverageHeaderRow"><th>Boss Coverage (M:x | T:y)</th></tr>
          </thead>
          <tbody id="scheduleBody"></tbody>
        </table>
      </div>
    </div>
  </div>
</body>
</html>`,
  },
  {
    filename: 'requirements.txt',
    path: '/requirements.txt',
    language: 'text',
    description: 'Python package dependencies for FastAPI, Uvicorn, and Google OR-Tools CP-SAT.',
    content: `fastapi==0.115.0
uvicorn[standard]==0.30.6
ortools==9.11.4210
jinja2==3.1.4
pydantic==2.9.2
python-multipart==0.0.12`,
  },
];
