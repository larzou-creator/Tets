"""
FastAPI Backend for the Time Shift / Scheduling Optimization System
===================================================================
Exposes REST API endpoints and renders the Argon Dashboard Bootstrap 5 template.
"""

from __future__ import annotations
from datetime import date
from typing import List, Optional
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel, Field

from solver import (
    AbsenceLock,
    DEFAULT_EMPLOYEES,
    ShiftSchedulingSolver,
    SolverConfig,
)

app = FastAPI(
    title="Time Shift CP-SAT Scheduling System",
    description="Operations Research Shift Scheduling Engine powered by Google OR-Tools CP-SAT and FastAPI",
    version="1.0.0",
)

templates = Jinja2Templates(directory="templates")


class LockPayload(BaseModel):
    employee_id: int = Field(..., description="Employee ID (1..32)")
    day_index: int = Field(..., ge=0, description="0-based day index in planning horizon")
    state: str = Field(..., description="Assigned shift or leave state (e.g., VACACIONES, BAJA)")


class SolveRequest(BaseModel):
    num_weeks: int = Field(default=5, ge=1, le=12)
    start_monday: str = Field(default="2026-09-21")
    demand_morning: int = Field(default=11, ge=1, le=30)
    demand_evening: int = Field(default=9, ge=1, le=30)
    min_boss_morning: int = Field(default=1, ge=1, le=5)
    min_boss_evening: int = Field(default=1, ge=1, le=5)
    locks: List[LockPayload] = Field(default_factory=list)


class CellOverrideRequest(BaseModel):
    employee_id: int
    day_index: int
    new_state: str
    current_day_assignments: dict[int, str]


@app.get("/", response_class=HTMLResponse)
async def render_schedule_dashboard(request: Request) -> HTMLResponse:
    """Renders the Argon Dashboard 5 scheduling grid interface."""
    try:
        solver = ShiftSchedulingSolver()
        initial_solution = solver.solve()
        return templates.TemplateResponse(
            "schedule.html",
            {
                "request": request,
                "solution": initial_solution,
                "employees": DEFAULT_EMPLOYEES,
            },
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to render schedule: {str(exc)}")


@app.post("/api/solve")
async def solve_schedule(payload: SolveRequest) -> JSONResponse:
    """
    Executes the Google OR-Tools CP-SAT mathematical model with the provided
    demand parameters and pre-assigned VACACIONES / BAJA / shift locks.
    Returns status='INFEASIBLE' if constraints are mathematically impossible.
    """
    try:
        parsed_monday = date.fromisoformat(payload.start_monday)
        config = SolverConfig(
            num_weeks=payload.num_weeks,
            start_monday=parsed_monday,
            demand_morning=payload.demand_morning,
            demand_evening=payload.demand_evening,
            min_boss_morning=payload.min_boss_morning,
            min_boss_evening=payload.min_boss_evening,
        )
        locks = [
            AbsenceLock(
                employee_id=item.employee_id,
                day_index=item.day_index,
                state=item.state,
            )
            for item in payload.locks
        ]
        solver = ShiftSchedulingSolver(
            employees=list(DEFAULT_EMPLOYEES),
            config=config,
            locks=locks,
        )
        result = solver.solve()
        return JSONResponse(content=result, status_code=200)
    except ValueError as val_err:
        return JSONResponse(
            content={"status": "ERROR", "message": f"Invalid parameter format: {str(val_err)}"},
            status_code=400,
        )
    except Exception as exc:
        return JSONResponse(
            content={"status": "ERROR", "message": f"Solver runtime exception: {str(exc)}"},
            status_code=500,
        )


@app.post("/api/override-cell")
async def override_single_cell(payload: CellOverrideRequest) -> JSONResponse:
    """
    Zero-lag single-cell mutation endpoint: updates a single (employee_id, day_index)
    cell and recomputes only that single day's Boss Coverage badge (M:x | T:y).
    """
    try:
        boss_ids = {emp.id for emp in DEFAULT_EMPLOYEES if emp.is_boss == 1}
        updated_assignments = dict(payload.current_day_assignments)
        updated_assignments[payload.employee_id] = payload.new_state

        morning_bosses = sum(
            1
            for emp_id, shift in updated_assignments.items()
            if int(emp_id) in boss_ids and shift == "07:00 a 15:00"
        )
        evening_bosses = sum(
            1
            for emp_id, shift in updated_assignments.items()
            if int(emp_id) in boss_ids and shift == "14:00 a 22:00"
        )
        valid_coverage = morning_bosses >= 1 and evening_bosses >= 1

        return JSONResponse(
            content={
                "status": "OK" if valid_coverage else "INFEASIBLE",
                "day_index": payload.day_index,
                "employee_id": payload.employee_id,
                "new_state": payload.new_state,
                "morning_bosses": morning_bosses,
                "evening_bosses": evening_bosses,
                "badge_text": f"M:{morning_bosses} | T:{evening_bosses}",
                "valid_coverage": valid_coverage,
            }
        )
    except Exception as exc:
        return JSONResponse(
            content={"status": "ERROR", "message": str(exc)},
            status_code=500,
        )
