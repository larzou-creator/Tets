# Swap Shifts Workflow & Bilingual (ES / EN) Localization

This update introduces an interactive **Swap Shifts** capability that exchanges shift assignments between two employees on any selected date while automatically locking both cells for future solver runs, alongside a full **Spanish / English (`ES ↔ EN`)** language switcher across the schedule grid, management dashboard, alerts, and exported PDF.

### User Review & Critical Decisions

> [!IMPORTANT]
> The following product and UX choices incorporate your confirmed selections from the clarification step, plus our recommended default for role-validation behavior.

- **Confirmed Decision 1 — Dual Swap Interaction Mode**: Users can swap shifts using **both** (a) a dedicated **Swap Shifts Mode** button in the schedule toolbar (click Employee A on Day $t$, then click Employee B on Day $t$) and (b) a **Swap With Employee...** selector directly inside the single-cell override popover.
- **Confirmed Decision 2 — Full-Application Bilingual (`ES` / `EN`) Scope**: A one-click language toggle in the top action bar switches all UI labels, KPI cards, buttons, popovers, the Employee/Vacation/Color Management Dashboard, conflict alerts, and the exported A3 PDF headers between **Spanish (`ES`)** and **English (`EN`)**.
- **Recommended Default — Unrestricted Swap Pairings with Instant Coverage Audit**: Any two employees can swap shifts on a given date; the engine immediately recomputes daily Boss coverage ($M \ge 1, T \ge 1$) and 12-hour statutory rest (clopenings), displaying a clear warning banner if a cross-role swap leaves a shift without a Boss.

---

### 1. Overview & Core Concept

- **What It Does**:
  1. **Swap Shifts (`Swap Shifts` / `Intercambiar Turnos`)**: Allows managers to select two employees on a specific date and atomically exchange their assigned shifts ($s_{A,t} \leftrightarrow s_{B,t}$). Both swapped cells are automatically written into `manualLocks` so subsequent clicks on **Generate Based on Manual Edits** preserve the swapped assignments and adapt surrounding days around them.
  2. **Spanish / English Language Toggle (`ES | EN`)**: Provides instant bilingual switching between Spanish and English across the entire workforce scheduling workspace and PDF export.
- **Target Audience / Persona**: Operations managers, store supervisors, and HR schedulers managing bilingual or Spanish-speaking teams who need rapid peer-to-peer shift trades without losing mathematical solver guarantees.
- **Key Value**: Eliminates manual two-step edits when two employees agree to trade shifts on a specific day, guarantees the trade remains anchored during schedule re-optimization, and makes the entire application natively accessible in both Spanish and English.

---

### 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Toolbar "Swap Shifts" Two-Click Flow**:
     - The user clicks the **Swap Shifts (`Intercambiar Turnos`)** button in the schedule toolbar.
     - Clicking the first cell `(Employee A, Day t)` highlights that cell as the swap source (`ring-2 ring-indigo-600`) and highlights the column for `Day t` so the user can easily pick the second employee on that same date (if the user clicks a cell on a different date, the selection smoothly updates to the new date or swaps on the target date).
     - Clicking the second employee's cell on `Day t` immediately swaps their two shifts, locks both cells (`•` lock indicator), and shows a brief confirmation banner (`Swapped Iván Navarro (07-15) ↔ Jordan Roman (14-22) on 2026-10-05`).
  2. **Cell Popover Quick-Swap Flow**:
     - Clicking any cell in normal mode opens the cell override popover.
     - Below the shift state buttons, a **Swap Shift on This Date (`Intercambiar en esta fecha`)** dropdown lists all other employees with their current shift on that day (e.g., `Jordan Roman — 14-22`). Selecting an employee immediately executes the swap and locks both cells.
  3. **Bilingual `ES / EN` Switcher**:
     - A segmented `ES | EN` toggle button in the top header bar switches the active locale between Spanish and English with zero page reload and zero layout shift.
- **Visual Identity & Theme**:
  - *Aesthetic Direction*: Crisp, high-density enterprise scheduling spreadsheet (Agendrix / Homebase / Deputy aesthetic) with clean 1px structural borders (`#E2E8F0`) on a `#F4F5FB` canvas.
  - *Color Palette & Mood*: Uses the active `AppColorTheme` tokens alongside high-contrast Indigo (`#4F46E5`) for active Swap Mode selection rings and Emerald (`#059669`) for lock-aware solver actions.
  - *Typography & Hierarchy*: Geometric sans-serif UI labels paired with strict monospace tabular numerals (`font-mono tabular-nums`) on all shift codes, dates, counters, and coverage badges so Spanish and English labels maintain identical vertical alignment.
  - *Component Styling & Layout*: Single-line toolbar buttons (`whitespace-nowrap shrink-0`) so longer Spanish translations never wrap awkwardly or break the header rhythm.
- **Interactive Feedback & Motion**:
  - Active swap source cell displays an unmistakable indigo focus ring and a dismissible status pill in the toolbar showing who is currently selected for swapping (`Selected: Iván Navarro · 05 Oct — Click 2nd employee on 05 Oct to swap`).
  - Instant toast/status feedback upon completing a swap, with automatic lock counter increment (`+2 locked`).

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Atomic Dual-Lock Persistence on Swap**
  - *Chosen Approach*: When Employee A (shift $S_1$) and Employee B (shift $S_2$) swap on Day $t$, the handler atomically assigns $S_2$ to Employee A and $S_1$ to Employee B, and upserts two `AbsenceLock` records (`reason: 'Swapped Shift'`) into `manualLocks`.
  - *Why*: Ensures that clicking **Generate Based on Manual Edits** honors both sides of the trade and automatically rebalances both employees' remaining unlocked days in that week (5 workdays / 2 consecutive `LIBRE` days and 12h rest compliance).
  - *Alternatives Considered*: Mutating only the display matrix without adding `manualLocks` was rejected because running the solver again would overwrite the trade.
- **Decision 2: Centralized Dictionary Localization (`ES` / `EN`)**
  - *Chosen Approach*: A typed localization dictionary (`Language = 'en' | 'es'`) passed to the main workspace, schedule grid, management dashboard, and PDF exporter.
  - *Why*: Guarantees instant, synchronous switching across every label, tooltip, alert message, and generated PDF header without external network requests or layout flicker.

---

### 4. Technical Architecture & Data Strategy *(Technical Reference)*

- **Architecture & Component Diagram**:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    App Root State (React Workspace)                     │
│  • language: 'en' | 'es' (Bilingual I18n Dictionary)                    │
│  • manualLocks: AbsenceLock[] (Includes single overrides & swapped pair)│
│  • swapModeActive: boolean & swapSource: { employeeId, dayIndex } | null│
└───────────────┬─────────────────────────────────────────┬───────────────┘
                │                                         │
                ▼                                         ▼
┌───────────────────────────────────────┐ ┌───────────────────────────────┐
│        ScheduleGrid Workspace         │ │ EmployeeManagementDashboard   │
│  • Toolbar Swap Mode Toggle & Banner  │ │  • Translated Roster Controls │
│  • 2-Click Cell Swap Handler          │ │  • Translated Vacaciones/Baja │
│  • Cell Popover "Swap With" Selector  │ │  • Translated Color Customizer│
└───────────────┬───────────────────────┘ └───────────────┬───────────────┘
                │                                         │
                ▼                                         ▼
┌───────────────────────────────────────┐ ┌───────────────────────────────┐
│     CP-SAT Shift Solver & Evaluator   │ │   A3 Landscape PDF Exporter   │
│  • handleSwapShifts(empA, empB, dayT) │ │  • Localized Month & Headers  │
│  • Upserts 2 locks into manualLocks   │ │  • Localized Shift Legend     │
│  • Re-evaluates coverage & clopenings │ │  • Preserves AppColorTheme    │
└───────────────────────────────────────┘ └───────────────────────────────┘
```

- **Data Model & State**:
  - `language: 'en' | 'es'`: Controls all UI copy, month names, day headers, and PDF export strings.
  - `swapSource: { employeeId: number; dayIndex: number } | null`: Tracks the first selected employee/day when Swap Mode is active.
  - `lastSwapNotice: string | null`: Displays a concise confirmation message showing the completed swap pair and date.
- **Interactive Component & State Mapping**:
  - `handleSwapShifts(employeeIdA, employeeIdB, dayIndex)`:
    1. Reads current shifts $s_A = \text{row}_A.\text{shifts}[t]$ and $s_B = \text{row}_B.\text{shifts}[t]$.
    2. Updates `manualLocks` by replacing any existing locks at `(employeeIdA, dayIndex)` and `(employeeIdB, dayIndex)` with `{ employeeId: employeeIdA, dayIndex, state: s_B, reason: 'Swapped Shift' }` and `{ employeeId: employeeIdB, dayIndex, state: s_A, reason: 'Swapped Shift' }`.
    3. Recomputes the schedule matrix, `computeSingleDayCoverage` for `dayIndex`, and `evaluateScheduleMatrix` so coverage badges and violation alerts update in zero-lag real time.
    4. Clears `swapSource` and sets `lastSwapNotice`.
