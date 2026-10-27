"""
Hybrid Cyclic-Template & Constraint Programming (CP-SAT) Scheduling Engine
==========================================================================
Implements the exact mathematical formulation for the 25th-to-25th Time Shift
Scheduling System using Google OR-Tools (`ortools.sat.python.cp_model`).

Enforces:
1. Minimum Timeshift Boss Coverage: sum(r_i * x_{i,j,t}) >= 1 for j in {M, E}, all t in T
2. Single State Exclusivity: sum_{j in J} x_{i,j,t} == 1
3. Pre-Assigned Absences (Fixed Locks): x_{i,V,t} = 1 (VACACIONES), x_{i,B,t} = 1 (BAJA)
4. Weekly 5-Work / 2-Consecutive-Rest Quota per Monday-Sunday week W_k
5. Contiguous 2-Day Rest Block (no isolated 1-day LIBRE cells: x_{i,O,t} - x_{i,O,t-1} - x_{i,O,t+1} <= 0)
6. 12-Hour Statutory Rest (Clopening Ban & Monday 10:00-18:00 Bridge Rule)
7. Staggered Backward-Sliding Days Off & No Identical Consecutive Weekly Off-Pairs
8. Global Objective Function Z minimizing under/over-staffing, weekend shortfall,
   intra-week M->E switches, and auxiliary shifts.
"""

from __future__ import annotations
from dataclasses import dataclass, field
from datetime import date, timedelta
from typing import Dict, List, Optional, Tuple
from ortools.sat.python import cp_model


# Shift State Definitions (J = J_active U J_inactive)
SHIFT_M = "07:00 a 15:00"        # Core Morning (8h)
SHIFT_E = "14:00 a 22:00"        # Core Evening (8h)
SHIFT_MID = "10:00 a 18:00"      # Auxiliary Monday Bridge (8h)
SHIFT_EARLY = "06:00 a 14:00"    # Auxiliary Early Morning (8h)
SHIFT_LONG = "10:00 a 22:00"     # Auxiliary Emergency Long (12h)
STATE_OFF = "LIBRE"              # Inactive Rest Day (0h)
STATE_VAC = "VACACIONES"         # Inactive Planned Leave (0h)
STATE_BAJA = "BAJA"              # Inactive Medical Leave (0h)

ALL_STATES: List[str] = [
    SHIFT_M,
    SHIFT_E,
    SHIFT_MID,
    SHIFT_EARLY,
    SHIFT_LONG,
    STATE_OFF,
    STATE_VAC,
    STATE_BAJA,
]

ACTIVE_SHIFTS: List[str] = [
    SHIFT_M,
    SHIFT_E,
    SHIFT_MID,
    SHIFT_EARLY,
    SHIFT_LONG,
]

INACTIVE_STATES: List[str] = [
    STATE_OFF,
    STATE_VAC,
    STATE_BAJA,
]

# Consecutive 2-day rest pairs inside a Monday(0)..Sunday(6) week
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
    triad_group: int = 0  # Initial cyclic pattern index (0, 1, 2)


@dataclass
class AbsenceLock:
    employee_id: int
    day_index: int
    state: str  # "VACACIONES" or "BAJA" or manual shift lock


@dataclass
class SolverConfig:
    num_weeks: int = 5  # Full Monday-Sunday weeks covering the 25th-to-25th work month + warm-up
    start_monday: date = field(default_factory=lambda: date(2026, 9, 21))
    demand_morning: int = 11   # D_{M,t} = 11
    demand_evening: int = 9    # D_{E,t} = 9
    min_boss_morning: int = 1  # Hard constraint: >= 1 Boss on Morning
    min_boss_evening: int = 1  # Hard constraint: >= 1 Boss on Evening
    max_boss_per_shift: int = 2
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
    # Timeshift Bosses (r_i = 1, Green Rows)
    Employee(1, "Iván Navarro", 1, 0),
    Employee(2, "Jordan Roman", 1, 0),
    Employee(3, "Alin Roman", 1, 1),
    Employee(4, "Jaime Hidalgo", 1, 1),
    Employee(5, "Melissa Alijas", 1, 2),
    # 12 Normal Employees (r_i = 0, Split 50/50 between Morning M and Afternoon T)
    Employee(6, "Daniel Rodriguez", 0, 0),
    Employee(7, "Achraf Naour", 0, 1),
    Employee(8, "Acraf El Harrack", 0, 2),
    Employee(9, "Alejandro", 0, 3),
    Employee(10, "Alexandra", 0, 4),
    Employee(11, "Antonio Giménez", 0, 0),
    Employee(12, "Antonio Reque", 0, 1),
    Employee(13, "Catalina", 0, 2),
    Employee(14, "Homero", 0, 3),
    Employee(15, "Jairo Canelon", 0, 4),
    Employee(16, "Jener", 0, 0),
    Employee(17, "Joan", 0, 2),
]


class ShiftSchedulingSolver:
    """
    Production OR-Tools CP-SAT solver implementing the mathematical model
    extracted from the Time Shift Scheduling PDF specification.
    """

    def __init__(
        self,
        employees: Optional[List[Employee]] = None,
        config: Optional[SolverConfig] = None,
        locks: Optional[List[AbsenceLock]] = None,
    ) -> None:
        self.employees: List[Employee] = employees or list(DEFAULT_EMPLOYEES)
        self.config: SolverConfig = config or SolverConfig()
        self.locks: List[AbsenceLock] = locks or []
        self.horizon_days: int = self.config.num_weeks * 7

    def solve(self) -> Dict:
        model = cp_model.CpModel()
        num_emp = len(self.employees)
        D = self.horizon_days
        W = self.config.num_weeks

        # ------------------------------------------------------------------
        # 1. DECISION VARIABLES
        # ------------------------------------------------------------------
        # x[i, j, t] in {0, 1}: 1 if employee i is assigned to state j on day t
        x: Dict[Tuple[int, str, int], cp_model.IntVar] = {}
        for i_idx in range(num_emp):
            for t in range(D):
                for j in ALL_STATES:
                    x[(i_idx, j, t)] = model.NewBoolVar(f"x_e{i_idx}_{j}_d{t}")

        # y[i, w] in {0, 1}: 1 if employee i has both Saturday and Sunday LIBRE in week w
        y: Dict[Tuple[int, int], cp_model.IntVar] = {}
        # off_pair_var[i, w, p] in {0, 1}: 1 if employee i takes consecutive off pair p in week w
        off_pair_var: Dict[Tuple[int, int, int], cp_model.IntVar] = {}
        for i_idx in range(num_emp):
            for w in range(W):
                y[(i_idx, w)] = model.NewBoolVar(f"y_e{i_idx}_w{w}")
                for p_idx in range(len(CONSECUTIVE_OFF_PAIRS)):
                    off_pair_var[(i_idx, w, p_idx)] = model.NewBoolVar(
                        f"offpair_e{i_idx}_w{w}_p{p_idx}"
                    )

        # ------------------------------------------------------------------
        # 2. PRE-ASSIGNED ABSENCES & LOCKS (HARD CONSTRAINTS)
        # ------------------------------------------------------------------
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

        # For any (emp, day) without an explicit VACACIONES or BAJA lock, forbid VACACIONES and BAJA
        locked_vac_baja_set = {
            (
                next(idx for idx, e in enumerate(self.employees) if e.id == l.employee_id),
                l.day_index,
                l.state,
            )
            for l in self.locks
            if l.state in (STATE_VAC, STATE_BAJA)
            and any(e.id == l.employee_id for e in self.employees)
        }
        for i_idx in range(num_emp):
            for t in range(D):
                if (i_idx, t, STATE_VAC) not in locked_vac_baja_set:
                    model.Add(x[(i_idx, STATE_VAC, t)] == 0)
                if (i_idx, t, STATE_BAJA) not in locked_vac_baja_set:
                    model.Add(x[(i_idx, STATE_BAJA, t)] == 0)

        # ------------------------------------------------------------------
        # 3. SINGLE STATE EXCLUSIVITY
        # sum_{j in J} x_{i,j,t} == 1  for all i in I, t in T
        # ------------------------------------------------------------------
        for i_idx in range(num_emp):
            for t in range(D):
                model.Add(sum(x[(i_idx, j, t)] for j in ALL_STATES) == 1)

        # ------------------------------------------------------------------
        # 4. [CRITICAL RULE] MINIMUM TIMESHIFT BOSS COVERAGE
        # sum_{i in I} r_i * x_{i,j,t} >= 1  for all j in {M, E}, all t in T
        # ------------------------------------------------------------------
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

        # ------------------------------------------------------------------
        # 5. WEEKLY WORKDAY & REST QUOTA (5 WORKDAYS / 2 CONSECUTIVE REST DAYS)
        # & STAGGERED BACKWARD-SLIDING DAYS OFF
        # ------------------------------------------------------------------
        for i_idx in range(num_emp):
            for w in range(W):
                week_days = [w * 7 + d for d in range(7)]
                leave_locks = locked_days_by_emp_week.get((i_idx, w), [])
                num_leave = len(leave_locks)

                if num_leave == 0:
                    # Strictly 5 active shifts and strictly 2 consecutive LIBRE days
                    model.Add(
                        sum(x[(i_idx, j, t)] for t in week_days for j in ACTIVE_SHIFTS) == 5
                    )
                    model.Add(sum(x[(i_idx, STATE_OFF, t)] for t in week_days) == 2)

                    # Must select exactly one consecutive 2-day off pair inside Monday..Sunday
                    model.Add(
                        sum(
                            off_pair_var[(i_idx, w, p_idx)]
                            for p_idx in range(len(CONSECUTIVE_OFF_PAIRS))
                        )
                        == 1
                    )
                    for p_idx, (d1, d2) in enumerate(CONSECUTIVE_OFF_PAIRS):
                        t1 = w * 7 + d1
                        t2 = w * 7 + d2
                        model.Add(x[(i_idx, STATE_OFF, t1)] == 1).OnlyEnforceIf(
                            off_pair_var[(i_idx, w, p_idx)]
                        )
                        model.Add(x[(i_idx, STATE_OFF, t2)] == 1).OnlyEnforceIf(
                            off_pair_var[(i_idx, w, p_idx)]
                        )
                else:
                    # Proportional scaling when employee has partial/full week VACACIONES or BAJA
                    remaining_days = 7 - num_leave
                    target_off = 2 if remaining_days >= 5 else (1 if remaining_days >= 3 else 0)
                    target_work = remaining_days - target_off
                    model.Add(
                        sum(x[(i_idx, j, t)] for t in week_days for j in ACTIVE_SHIFTS)
                        == target_work
                    )
                    model.Add(sum(x[(i_idx, STATE_OFF, t)] for t in week_days) == target_off)
                    for p_idx in range(len(CONSECUTIVE_OFF_PAIRS)):
                        model.Add(off_pair_var[(i_idx, w, p_idx)] == 0)

                # Bind weekend indicator y_{i,w} <=> Saturday (day 5) and Sunday (day 6) are LIBRE
                sat_t = w * 7 + 5
                sun_t = w * 7 + 6
                model.AddBoolAnd(
                    [x[(i_idx, STATE_OFF, sat_t)], x[(i_idx, STATE_OFF, sun_t)]]
                ).OnlyEnforceIf(y[(i_idx, w)])
                model.AddBoolOr(
                    [
                        x[(i_idx, STATE_OFF, sat_t)].Not(),
                        x[(i_idx, STATE_OFF, sun_t)].Not(),
                    ]
                ).OnlyEnforceIf(y[(i_idx, w)].Not())

        # Contiguous 2-Day Rest Block & Boundary Guard:
        # 1) x_{i,O,t} - x_{i,O,t-1} - x_{i,O,t+1} <= 0 for interior days without leave
        # 2) Forbid Sat/Sun (pair 5) in week w followed by Mon/Tue (pair 0) in week w+1 (prevents 4 days off)
        # 3) No employee can repeat the exact same off_pair in week w and week w+1
        for i_idx in range(num_emp):
            for w in range(W - 1):
                if (
                    not locked_days_by_emp_week.get((i_idx, w))
                    and not locked_days_by_emp_week.get((i_idx, w + 1))
                ):
                    # Forbid Sat/Sun (p=5) followed by Mon/Tue (p=0)
                    model.AddImplication(
                        off_pair_var[(i_idx, w, 5)],
                        off_pair_var[(i_idx, w + 1, 0)].Not(),
                    )
                    # Forbid repeating the exact same off_pair in two consecutive weeks
                    for p_idx in range(len(CONSECUTIVE_OFF_PAIRS)):
                        model.AddImplication(
                            off_pair_var[(i_idx, w, p_idx)],
                            off_pair_var[(i_idx, w + 1, p_idx)].Not(),
                        )

            # Interior contiguous rest inequality across the full horizon
            for t in range(1, D - 1):
                w = t // 7
                if not locked_days_by_emp_week.get((i_idx, w)):
                    model.Add(
                        x[(i_idx, STATE_OFF, t)]
                        - x[(i_idx, STATE_OFF, t - 1)]
                        - x[(i_idx, STATE_OFF, t + 1)]
                        <= 0
                    )

        # ------------------------------------------------------------------
        # 6. 12-HOUR STATUTORY REST (CLOPENING BAN & MONDAY BRIDGE RULE)
        # x_{i,E,t} + x_{i,L_long,t} + x_{i,M,t+1} + x_{i,M_early,t+1} <= 1
        # ------------------------------------------------------------------
        for i_idx in range(num_emp):
            for t in range(D - 1):
                model.Add(
                    x[(i_idx, SHIFT_E, t)]
                    + x[(i_idx, SHIFT_LONG, t)]
                    + x[(i_idx, SHIFT_M, t + 1)]
                    + x[(i_idx, SHIFT_EARLY, t + 1)]
                    <= 1
                )

        # ------------------------------------------------------------------
        # 7. SOFT CONSTRAINTS & GLOBAL OBJECTIVE FUNCTION Z
        # ------------------------------------------------------------------
        objective_terms = []

        # 7a. Target Headcount Balancing:
        # sum_{i in I} x_{i,j,t} + delta^-_{j,t} - delta^+_{j,t} = D_{j,t}
        delta_under: Dict[Tuple[str, int], cp_model.IntVar] = {}
        delta_over: Dict[Tuple[str, int], cp_model.IntVar] = {}
        for t in range(D):
            for j, demand in [
                (SHIFT_M, self.config.demand_morning),
                (SHIFT_E, self.config.demand_evening),
            ]:
                du = model.NewIntVar(0, num_emp, f"delta_under_{j}_d{t}")
                do = model.NewIntVar(0, num_emp, f"delta_over_{j}_d{t}")
                delta_under[(j, t)] = du
                delta_over[(j, t)] = do
                model.Add(
                    sum(x[(i_idx, j, t)] for i_idx in range(num_emp)) + du - do == demand
                )
                objective_terms.append(self.config.weight_understaff * du)
                objective_terms.append(self.config.weight_overstaff * do)

        # 7b. Intra-Week Shift Homogeneity:
        # x_{i,M,t} + x_{i,E,t+1} - 1 <= s_{i,t}
        s_vars: Dict[Tuple[int, int], cp_model.IntVar] = {}
        for i_idx in range(num_emp):
            for t in range(D - 1):
                s_it = model.NewBoolVar(f"s_e{i_idx}_d{t}")
                s_vars[(i_idx, t)] = s_it
                model.Add(
                    x[(i_idx, SHIFT_M, t)] + x[(i_idx, SHIFT_E, t + 1)] - 1 <= s_it
                )
                objective_terms.append(self.config.weight_homogeneity * s_it)

        # 7c. Cyclic Rotation & Weekend Equity:
        # Y_bar - sum_{w in W} y_{i,w} <= U_i, where Y_bar = floor(|W| / 3)
        y_bar = max(1, W // 3)
        u_vars: Dict[int, cp_model.IntVar] = {}
        for i_idx in range(num_emp):
            u_i = model.NewIntVar(0, W, f"U_e{i_idx}")
            u_vars[i_idx] = u_i
            model.Add(y_bar - sum(y[(i_idx, w)] for w in range(W)) <= u_i)
            objective_terms.append(self.config.weight_weekend_equity * u_i)

        # 7d. Auxiliary Shift Minimization
        for i_idx in range(num_emp):
            for t in range(D):
                is_monday = (t % 7) == 0
                w_aux = (
                    self.config.weight_aux_mid_monday
                    if is_monday
                    else self.config.weight_aux_mid_other
                )
                objective_terms.append(w_aux * x[(i_idx, SHIFT_MID, t)])
                objective_terms.append(
                    self.config.weight_aux_long * x[(i_idx, SHIFT_LONG, t)]
                )
                objective_terms.append(
                    self.config.weight_aux_early * x[(i_idx, SHIFT_EARLY, t)]
                )

        model.Minimize(sum(objective_terms))

        # ------------------------------------------------------------------
        # 8. SOLVE WITH CP-SAT
        # ------------------------------------------------------------------
        solver = cp_model.CpSolver()
        solver.parameters.max_time_in_seconds = self.config.max_time_seconds
        solver.parameters.num_search_workers = 8
        status = solver.Solve(model)

        if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
            return {
                "status": "INFEASIBLE",
                "status_code": int(status),
                "message": (
                    "CP-SAT Solver determined the current combination of hard constraints "
                    "and pre-assigned locks is mathematically INFEASIBLE. Verify that at "
                    "least 2 Timeshift Bosses remain available each day and that locked "
                    "shifts do not violate the 12-hour rest or 5-work/2-off rules."
                ),
            }

        # Extract schedule matrix & metrics
        dates = [
            (self.config.start_monday + timedelta(days=t)).isoformat()
            for t in range(D)
        ]
        schedule_rows = []
        for i_idx, emp in enumerate(self.employees):
            emp_shifts = []
            for t in range(D):
                assigned = STATE_OFF
                for j in ALL_STATES:
                    if solver.Value(x[(i_idx, j, t)]) == 1:
                        assigned = j
                        break
                emp_shifts.append(assigned)
            weekends_off = sum(solver.Value(y[(i_idx, w)]) for w in range(W))
            schedule_rows.append(
                {
                    "employee_id": emp.id,
                    "name": emp.name,
                    "is_boss": emp.is_boss,
                    "role_label": "Timeshift Boss" if emp.is_boss == 1 else "Normal Employee",
                    "shifts": emp_shifts,
                    "weekends_off": weekends_off,
                    "weekend_shortfall": solver.Value(u_vars[i_idx]),
                }
            )

        daily_coverage = []
        for t in range(D):
            m_total = sum(
                solver.Value(x[(i_idx, SHIFT_M, t)]) for i_idx in range(num_emp)
            )
            e_total = sum(
                solver.Value(x[(i_idx, SHIFT_E, t)]) for i_idx in range(num_emp)
            )
            m_boss = sum(
                solver.Value(x[(i_idx, SHIFT_M, t)]) for i_idx in boss_indices
            )
            e_boss = sum(
                solver.Value(x[(i_idx, SHIFT_E, t)]) for i_idx in boss_indices
            )
            daily_coverage.append(
                {
                    "day_index": t,
                    "date": dates[t],
                    "morning_total": m_total,
                    "evening_total": e_total,
                    "morning_bosses": m_boss,
                    "evening_bosses": e_boss,
                    "under_m": solver.Value(delta_under[(SHIFT_M, t)]),
                    "over_m": solver.Value(delta_over[(SHIFT_M, t)]),
                    "under_e": solver.Value(delta_under[(SHIFT_E, t)]),
                    "over_e": solver.Value(delta_over[(SHIFT_E, t)]),
                }
            )

        return {
            "status": "OPTIMAL" if status == cp_model.OPTIMAL else "FEASIBLE",
            "objective_value": float(solver.ObjectiveValue()),
            "solve_time_ms": round(solver.WallTime() * 1000, 2),
            "dates": dates,
            "schedule": schedule_rows,
            "daily_coverage": daily_coverage,
        }


if __name__ == "__main__":
    engine = ShiftSchedulingSolver()
    result = engine.solve()
    print(f"Solver Status: {result['status']} | Objective Z = {result.get('objective_value')}")
