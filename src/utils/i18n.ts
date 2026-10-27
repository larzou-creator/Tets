export type AppLanguage = 'en' | 'es';

export const MONTH_NAMES_ES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

export interface I18nStrings {
  // Header & Workspace Tabs
  appTitle: string;
  tabScheduleSheet: string;
  tabManageDashboard: string;
  langSwitchButtonLabel: string;
  langSwitchTooltip: string;

  // Top Action Buttons
  btnGenerateFromManual: string;
  btnGenerateFromManualTooltip: string;
  lockedCountBadge: (count: number) => string;
  btnClearManual: (count: number) => string;
  btnClearManualTooltip: string;
  btnRegenerateShifts: string;
  btnRegenerateShiftsTooltip: string;
  btnSimulateConflict: string;
  btnExportPdf: string;

  // Infeasible Alert Banner
  alertConflictTitle: string;
  alertDefaultReason: string;
  btnResetLocksAndRepair: string;
  btnDismissAlert: string;

  // KPI & Control Row
  kpiPeriodTitle: string;
  presetFullMonth: string;
  presetFullMonthTooltip: string;
  preset25thCycle: string;
  preset25thCycleTooltip: string;
  labelStart: string;
  labelEnd: string;
  kpiNormalStaffTitle: (count: number) => string;
  kpiMorningAfternoonSummary: (m: number, t: number) => string;
  kpiActiveLeaveRecords: (count: number) => string;
  kpiHoursTitle: (monthShort: string, year: number) => string;
  kpiBossesNormalSummary: (bosses: number, normal: number) => string;
  kpiBossCoverageTitle: string;

  // Paint & Swap Toolbar
  labelPaintShift: string;
  brushMorning: string;
  brushBridge: string;
  brushAfternoon: string;
  brushLibre: string;
  brushVac: string;
  brushBaja: string;
  btnDonePainting: string;
  btnSwapShiftsMode: string;
  btnSwapShiftsActive: string;
  swapStep1Prompt: string;
  swapStep2Prompt: (empName: string, shiftCode: string, isoDate: string) => string;
  btnCancelSwap: string;
  swapCompletedBanner: (
    empA: string,
    shiftA: string,
    empB: string,
    shiftB: string,
    isoDate: string
  ) => string;

  // Grid Filters & View Mode
  filterAll: (count: number) => string;
  filterBosses: (count: number) => string;
  filterNormal: (count: number) => string;
  filterAllMonth: string;
  viewSplitWeeks: string;
  viewWholeMonthNoGaps: string;
  searchPlaceholder: string;

  // Schedule Grid Headers & Popover
  gridWholeMonthHeader: string;
  gridHorizonWeeksHeader: (weeks: number) => string;
  btnExpandWeek: string;
  btnSumWeek: string;
  gridEmployeeColHeader: string;
  gridWeeklyShiftSummary: string;
  gridBossSplitHeader: string;
  popoverActiveBadge: string;
  popoverSwapTitle: string;
  popoverSwapSelectPlaceholder: string;
  popoverSwapConfirmBtn: string;
  popoverUnlockCellBtn: string;
  cellLockedTooltipSuffix: string;
  cellSwapSourceBadge: string;

  // Employee Management Dashboard
  dashHeaderTitle: string;
  dashHeaderSubtitle: string;
  btnBackToSchedule: string;
  dashSection1Title: (count: number) => string;
  dashSection1Subtitle: string;
  btnBulkAllM: string;
  btnBulkAllT: string;
  btnBulkRotating: string;
  labelEmployeeName: string;
  placeholderEmployeeName: string;
  labelGroupRole: string;
  optionNormalStaff: string;
  optionBossGreenRow: string;
  labelShiftAssignment: string;
  optionRotating: string;
  optionFixedM: string;
  optionFixedT: string;
  btnAddEmployee: string;
  placeholderFilterRoster: string;
  showingCountOfTotal: (shown: number, total: number) => string;
  colNameEditable: string;
  colGroup: string;
  colShiftMode: string;
  colQuickActions: string;
  roleBossBadge: string;
  roleNormalBadge: string;
  btnRotateShort: string;
  btnAllMShort: string;
  btnAllTShort: string;
  btnDeleteEmployee: string;

  // Section 2: Vacations & Baja
  dashSection2Title: string;
  dashSection2Subtitle: string;
  btnClearAllLeaves: (count: number) => string;
  labelSelectEmployee: string;
  labelLeaveType: string;
  optionVacaciones: string;
  optionBaja: string;
  labelStartDate: string;
  labelEndDate: string;
  labelNoteOptional: string;
  placeholderLeaveNote: string;
  btnUpdateLeave: string;
  btnSaveLeave: string;
  btnCancelEdit: string;
  emptyLeavesText: string;
  btnEditLeave: string;
  btnRemoveLeave: string;

  // Section 3: App Colors
  dashSection3Title: string;
  dashSection3Subtitle: string;
  colorAppAccent: string;
  colorBossRowFill: string;
  colorMorningShift: string;
  colorAfternoonShift: string;
  colorLibreBg: string;
  colorLibreText: string;
  colorBridgeShift: string;
  colorVacationCell: string;
  colorBajaCell: string;

  // PDF Export
  pdfTopKicker: (monthUpper: string, year: number) => string;
  pdfLegendMorning: string;
  pdfLegendBridge: string;
  pdfLegendAfternoon: string;
  pdfLegendRest: string;
  pdfLegendVacation: string;
  pdfLegendBaja: string;
  pdfWholeMonthWeeks: (weeks: number) => string;
}

export const I18N_DICTIONARY: Record<AppLanguage, I18nStrings> = {
  en: {
    appTitle: 'Dashboard for managing employees',
    tabScheduleSheet: 'Schedule',
    tabManageDashboard: 'Manage Staff & Colors',
    langSwitchButtonLabel: 'Español (ES)',
    langSwitchTooltip: 'Switch application language between Spanish and English',

    btnGenerateFromManual: 'Generate Based on Manual Edits',
    btnGenerateFromManualTooltip:
      'Generate new shifts adapted around your manual cell edits and shift swaps without overwriting any locked changes',
    lockedCountBadge: (count) => `${count} locked`,
    btnClearManual: (count) => `Clear Manual (${count})`,
    btnClearManualTooltip: 'Clear manual cell locks and restore automatic schedule',
    btnRegenerateShifts: 'Regenerate Different Shifts',
    btnRegenerateShiftsTooltip: 'Regenerate a completely fresh shift schedule across the entire month',
    btnSimulateConflict: 'Simulate Conflict',
    btnExportPdf: 'Export Full Month PDF',

    alertConflictTitle: 'Schedule Conflict Detected (INFEASIBLE) —',
    alertDefaultReason:
      'CP-SAT Solver detected an infeasible constraint state (minimum Boss coverage M >= 1, E >= 1 or 12-hour statutory rest violated).',
    btnResetLocksAndRepair: 'Reset Locks & Repair',
    btnDismissAlert: 'Dismiss',

    kpiPeriodTitle: 'SCHEDULE PERIOD (START DAY & END DAY)',
    presetFullMonth: '1st–End of Month',
    presetFullMonthTooltip: 'Set Start Day to 1st of month and End Day to last day of month',
    preset25thCycle: '25th–25th Cycle',
    preset25thCycleTooltip:
      'Set Start Day to 25th of previous month and End Day to 25th of selected month',
    labelStart: 'Start:',
    labelEnd: 'End:',
    kpiNormalStaffTitle: (count) => `NORMAL STAFF M / T (${count} STAFF)`,
    kpiMorningAfternoonSummary: (m, t) => `${m} Morning · ${t} Afternoon`,
    kpiActiveLeaveRecords: (count) => `${count} active Vacation / Baja record(s)`,
    kpiHoursTitle: (monthShort, year) => `HOURS (${monthShort} ${year})`,
    kpiBossesNormalSummary: (bosses, normal) => `${bosses} Bosses · ${normal} Normal`,
    kpiBossCoverageTitle: 'BOSS COVERAGE & REST',

    labelPaintShift: 'PAINT SHIFT:',
    brushMorning: '07–15 M',
    brushBridge: '10–18 Bridge',
    brushAfternoon: '14–22 T',
    brushLibre: 'LIBRE',
    brushVac: 'VAC',
    brushBaja: 'BAJA',
    btnDonePainting: 'Done',
    btnSwapShiftsMode: '↔ Swap Shifts',
    btnSwapShiftsActive: '↔ Swap Mode Active',
    swapStep1Prompt:
      'Swap Mode: Click the 1st employee cell on the date you want to swap.',
    swapStep2Prompt: (empName, shiftCode, isoDate) =>
      `Selected ${empName} (${shiftCode}) on ${isoDate} — Now click a 2nd employee on ${isoDate} to swap shifts & lock both.`,
    btnCancelSwap: 'Cancel Swap',
    swapCompletedBanner: (empA, shiftA, empB, shiftB, isoDate) =>
      `Swapped shifts on ${isoDate}: ${empA} (${shiftA} → ${shiftB}) ↔ ${empB} (${shiftB} → ${shiftA}) · Both cells locked`,

    filterAll: (count) => `All (${count})`,
    filterBosses: (count) => `Bosses (${count})`,
    filterNormal: (count) => `Normal (${count})`,
    filterAllMonth: 'All-Month',
    viewSplitWeeks: 'Split Weeks',
    viewWholeMonthNoGaps: 'Whole-Month (No Gaps)',
    searchPlaceholder: 'Search name...',

    gridWholeMonthHeader: 'Whole-Month (No Gaps)',
    gridHorizonWeeksHeader: (weeks) => `Horizon (${weeks} Weeks)`,
    btnExpandWeek: 'Expand',
    btnSumWeek: 'Sum',
    gridEmployeeColHeader: 'Employee',
    gridWeeklyShiftSummary: 'Weekly Shift Summary',
    gridBossSplitHeader: 'Boss (M|T) · Split',
    popoverActiveBadge: 'Active',
    popoverSwapTitle: 'Swap Shift on This Date',
    popoverSwapSelectPlaceholder: 'Select employee to swap...',
    popoverSwapConfirmBtn: 'Swap & Lock',
    popoverUnlockCellBtn: 'Unlock Manual Edit',
    cellLockedTooltipSuffix: ' (Manual Edit Locked — preserved when generating shifts)',
    cellSwapSourceBadge: 'SWAP',

    dashHeaderTitle: 'Employee, Vacation / Baja & App Color Management Dashboard',
    dashHeaderSubtitle:
      'Add or edit employees, lock all-time Morning (M) or Afternoon (T) shifts, assign VACACIONES or BAJA date ranges, and customize app colors.',
    btnBackToSchedule: 'View Schedule Sheet →',
    dashSection1Title: (count) => `1. Staff Roster & Shift Mode (${count} Employees)`,
    dashSection1Subtitle:
      'Edit names directly, switch Boss/Normal role, or set any employee to All-Time Morning (M) or All-Time Afternoon (T).',
    btnBulkAllM: 'All Normal → M (07–15)',
    btnBulkAllT: 'All Normal → T (14–22)',
    btnBulkRotating: 'Reset 50/50 Rotating',
    labelEmployeeName: 'Employee Name',
    placeholderEmployeeName: 'e.g. Lucas Fernández',
    labelGroupRole: 'Group / Role',
    optionNormalStaff: 'Normal Staff',
    optionBossGreenRow: 'Boss (Green Row)',
    labelShiftAssignment: 'Shift Assignment',
    optionRotating: 'Rotating (M ↔ T)',
    optionFixedM: 'All-Time M (07–15)',
    optionFixedT: 'All-Time T (14–22)',
    btnAddEmployee: '+ Add',
    placeholderFilterRoster: 'Filter employees by name...',
    showingCountOfTotal: (shown, total) => `Showing ${shown} of ${total}`,
    colNameEditable: 'Name (Editable)',
    colGroup: 'Group',
    colShiftMode: 'Shift Mode (Rotate / All-Time M / T)',
    colQuickActions: 'Quick Actions',
    roleBossBadge: 'BOSS',
    roleNormalBadge: 'NORMAL',
    btnRotateShort: 'Rotate',
    btnAllMShort: 'All M (07–15)',
    btnAllTShort: 'All T (14–22)',
    btnDeleteEmployee: 'Delete',

    dashSection2Title: '2. Vacation (VACACIONES) & Medical Leave (BAJA)',
    dashSection2Subtitle:
      'Choose employee, leave type, and exact start/end dates. Edit or remove anytime.',
    btnClearAllLeaves: (count) => `Clear All (${count})`,
    labelSelectEmployee: 'Select Employee',
    labelLeaveType: 'Leave Type',
    optionVacaciones: 'VACACIONES (Vacation)',
    optionBaja: 'BAJA (Medical Leave)',
    labelStartDate: 'Start Date',
    labelEndDate: 'End Date',
    labelNoteOptional: 'Note (Optional)',
    placeholderLeaveNote: 'e.g. Annual family vacation / Medical certificate',
    btnUpdateLeave: 'Update Leave',
    btnSaveLeave: '+ Save Leave',
    btnCancelEdit: 'Cancel',
    emptyLeavesText:
      'No VACACIONES or BAJA scheduled yet. Select an employee and dates above to add one.',
    btnEditLeave: 'Edit',
    btnRemoveLeave: 'Remove',

    dashSection3Title: '3. Customize App & PDF Schedule Colors',
    dashSection3Subtitle:
      'Choose a theme preset or fine-tune any shift/row color. Changes apply to both the Excel grid and exported PDF.',
    colorAppAccent: 'App Accent',
    colorBossRowFill: 'Boss Row Fill',
    colorMorningShift: 'Morning (07–15)',
    colorAfternoonShift: 'Afternoon (14–22)',
    colorLibreBg: 'Libre Days (LIBRE)',
    colorLibreText: 'Libre Text Color',
    colorBridgeShift: 'Bridge (10–18)',
    colorVacationCell: 'Vacation (VAC)',
    colorBajaCell: 'Medical (BAJA)',

    pdfTopKicker: (monthUpper, year) => `ALL-IN-ONE STAFF SCHEDULE  ·  ${monthUpper} ${year}`,
    pdfLegendMorning: 'Morning 07-15',
    pdfLegendBridge: 'Bridge 10-18',
    pdfLegendAfternoon: 'Afternoon 14-22',
    pdfLegendRest: 'Rest LIBRE',
    pdfLegendVacation: 'Vacation VAC',
    pdfLegendBaja: 'Medical BAJA',
    pdfWholeMonthWeeks: (weeks) => `Whole-Month (${weeks} Weeks)`,
  },
  es: {
    appTitle: 'Panel de gestión de empleados',
    tabScheduleSheet: 'Cuadrante',
    tabManageDashboard: 'Empleados y Colores',
    langSwitchButtonLabel: 'EN',
    langSwitchTooltip: 'Cambiar el idioma de la aplicación entre Español e Inglés',

    btnGenerateFromManual: 'Generar con Cambios',
    btnGenerateFromManualTooltip:
      'Genera nuevos turnos adaptados a tus ediciones manuales e intercambios sin sobrescribir los cambios bloqueados',
    lockedCountBadge: (count) => `${count} fijados`,
    btnClearManual: (count) => `Borrar (${count})`,
    btnClearManualTooltip: 'Borrar los bloqueos manuales y restaurar el horario automático',
    btnRegenerateShifts: 'Regenerar Turnos',
    btnRegenerateShiftsTooltip: 'Regenerar un horario completamente nuevo para todo el mes',
    btnSimulateConflict: 'Simular Conflicto',
    btnExportPdf: 'Exportar PDF',

    alertConflictTitle: 'Conflicto de Horario Detectado (INVIABLE) —',
    alertDefaultReason:
      'El solver CP-SAT detectó una restricción inviable (cobertura mínima de Encargados M >= 1, T >= 1 o descanso legal de 12 horas incumplido).',
    btnResetLocksAndRepair: 'Restablecer Bloqueos y Reparar',
    btnDismissAlert: 'Cerrar',

    kpiPeriodTitle: 'PERIODO DEL HORARIO (DÍA INICIO Y DÍA FIN)',
    presetFullMonth: '1º–Fin de Mes',
    presetFullMonthTooltip: 'Fijar Día de Inicio al 1º del mes y Día Fin al último día del mes',
    preset25thCycle: 'Ciclo 25 a 25',
    preset25thCycleTooltip:
      'Fijar Día de Inicio al 25 del mes anterior y Día Fin al 25 del mes seleccionado',
    labelStart: 'Inicio:',
    labelEnd: 'Fin:',
    kpiNormalStaffTitle: (count) => `PERSONAL NORMAL M / T (${count} EMPLEADOS)`,
    kpiMorningAfternoonSummary: (m, t) => `${m} Mañana · ${t} Tarde`,
    kpiActiveLeaveRecords: (count) => `${count} registro(s) de Vacaciones / Baja activos`,
    kpiHoursTitle: (monthShort, year) => `HORAS (${monthShort} ${year})`,
    kpiBossesNormalSummary: (bosses, normal) => `${bosses} Encargados · ${normal} Personal`,
    kpiBossCoverageTitle: 'COBERTURA ENCARGADOS Y DESCANSO',

    labelPaintShift: 'PINTAR:',
    brushMorning: '07–15 M',
    brushBridge: '10–18 Puente',
    brushAfternoon: '14–22 T',
    brushLibre: 'LIBRE',
    brushVac: 'VAC',
    brushBaja: 'BAJA',
    btnDonePainting: 'Listo',
    btnSwapShiftsMode: '↔ Intercambiar',
    btnSwapShiftsActive: '↔ Intercambio Activo',
    swapStep1Prompt:
      'Modo Intercambio: Haz clic en la celda del 1er empleado en la fecha que deseas intercambiar.',
    swapStep2Prompt: (empName, shiftCode, isoDate) =>
      `Seleccionado ${empName} (${shiftCode}) el ${isoDate} — Ahora haz clic en el 2º empleado el ${isoDate} para intercambiar y fijar ambos.`,
    btnCancelSwap: 'Cancelar Intercambio',
    swapCompletedBanner: (empA, shiftA, empB, shiftB, isoDate) =>
      `Turnos intercambiados el ${isoDate}: ${empA} (${shiftA} → ${shiftB}) ↔ ${empB} (${shiftB} → ${shiftA}) · Ambas celdas fijadas`,

    filterAll: (count) => `Todos (${count})`,
    filterBosses: (count) => `Encarg. (${count})`,
    filterNormal: (count) => `Personal (${count})`,
    filterAllMonth: 'Todo',
    viewSplitWeeks: 'Por Semanas',
    viewWholeMonthNoGaps: 'Mes (Sin Huecos)',
    searchPlaceholder: 'Buscar...',

    gridWholeMonthHeader: 'Mes (Sin Huecos)',
    gridHorizonWeeksHeader: (weeks) => `Horizonte (${weeks} Semanas)`,
    btnExpandWeek: 'Expandir',
    btnSumWeek: 'Resumir',
    gridEmployeeColHeader: 'Empleado',
    gridWeeklyShiftSummary: 'Resumen Semanal de Turnos',
    gridBossSplitHeader: 'Encarg. (M|T) · Total',
    popoverActiveBadge: 'Activo',
    popoverSwapTitle: 'Intercambiar Turno en Esta Fecha',
    popoverSwapSelectPlaceholder: 'Elegir empleado para intercambiar...',
    popoverSwapConfirmBtn: 'Intercambiar y Fijar',
    popoverUnlockCellBtn: 'Desbloquear Edición Manual',
    cellLockedTooltipSuffix: ' (Edición Manual Fijada — se conserva al generar turnos)',
    cellSwapSourceBadge: 'CAMBIO',

    dashHeaderTitle: 'Panel de Gestión de Empleados, Vacaciones / Baja y Colores',
    dashHeaderSubtitle:
      'Añade o edita empleados, fija turnos permanentes de Mañana (M) o Tarde (T), asigna fechas de VACACIONES o BAJA y personaliza los colores.',
    btnBackToSchedule: 'Ver Cuadrante de Turnos →',
    dashSection1Title: (count) => `1. Plantilla de Personal y Modo de Turno (${count} Empleados)`,
    dashSection1Subtitle:
      'Edita nombres directamente, cambia el rol Encargado/Personal o asigna Mañana fija (M) o Tarde fija (T).',
    btnBulkAllM: 'Todo Personal → M (07–15)',
    btnBulkAllT: 'Todo Personal → T (14–22)',
    btnBulkRotating: 'Restablecer Rotación 50/50',
    labelEmployeeName: 'Nombre del Empleado',
    placeholderEmployeeName: 'ej. Lucas Fernández',
    labelGroupRole: 'Grupo / Rol',
    optionNormalStaff: 'Personal Normal',
    optionBossGreenRow: 'Encargado (Fila Verde)',
    labelShiftAssignment: 'Asignación de Turno',
    optionRotating: 'Rotativo (M ↔ T)',
    optionFixedM: 'Siempre Mañana M (07–15)',
    optionFixedT: 'Siempre Tarde T (14–22)',
    btnAddEmployee: '+ Añadir',
    placeholderFilterRoster: 'Filtrar empleados por nombre...',
    showingCountOfTotal: (shown, total) => `Mostrando ${shown} de ${total}`,
    colNameEditable: 'Nombre (Editable)',
    colGroup: 'Grupo',
    colShiftMode: 'Modo de Turno (Rotativo / Fijo M / T)',
    colQuickActions: 'Acciones Rápidas',
    roleBossBadge: 'ENCARGADO',
    roleNormalBadge: 'PERSONAL',
    btnRotateShort: 'Rotar',
    btnAllMShort: 'Fijo M (07–15)',
    btnAllTShort: 'Fijo T (14–22)',
    btnDeleteEmployee: 'Eliminar',

    dashSection2Title: '2. Vacaciones (VACACIONES) y Baja Médica (BAJA)',
    dashSection2Subtitle:
      'Selecciona empleado, tipo de ausencia y fechas exactas de inicio y fin. Edita o elimina en cualquier momento.',
    btnClearAllLeaves: (count) => `Borrar Todo (${count})`,
    labelSelectEmployee: 'Seleccionar Empleado',
    labelLeaveType: 'Tipo de Ausencia',
    optionVacaciones: 'VACACIONES (Vacaciones)',
    optionBaja: 'BAJA (Baja Médica)',
    labelStartDate: 'Fecha de Inicio',
    labelEndDate: 'Fecha de Fin',
    labelNoteOptional: 'Nota (Opcional)',
    placeholderLeaveNote: 'ej. Vacaciones anuales / Certificado médico',
    btnUpdateLeave: 'Actualizar Ausencia',
    btnSaveLeave: '+ Guardar Ausencia',
    btnCancelEdit: 'Cancelar',
    emptyLeavesText:
      'No hay VACACIONES ni BAJA programadas. Selecciona un empleado y fechas arriba para añadir una.',
    btnEditLeave: 'Editar',
    btnRemoveLeave: 'Quitar',

    dashSection3Title: '3. Personalizar Colores de la App y PDF',
    dashSection3Subtitle:
      'Elige un tema predefinido o ajusta el color de cualquier turno o fila. Los cambios se aplican al cuadrante y al PDF.',
    colorAppAccent: 'Color Principal',
    colorBossRowFill: 'Fondo Fila Encargado',
    colorMorningShift: 'Mañana (07–15)',
    colorAfternoonShift: 'Tarde (14–22)',
    colorLibreBg: 'Días Libres (LIBRE)',
    colorLibreText: 'Texto Día Libre',
    colorBridgeShift: 'Puente (10–18)',
    colorVacationCell: 'Vacaciones (VAC)',
    colorBajaCell: 'Baja Médica (BAJA)',

    pdfTopKicker: (monthUpper, year) => `CUADRANTE MENSUAL DE TURNOS  ·  ${monthUpper} ${year}`,
    pdfLegendMorning: 'Mañana 07-15',
    pdfLegendBridge: 'Puente 10-18',
    pdfLegendAfternoon: 'Tarde 14-22',
    pdfLegendRest: 'Libre LIBRE',
    pdfLegendVacation: 'Vacaciones VAC',
    pdfLegendBaja: 'Baja BAJA',
    pdfWholeMonthWeeks: (weeks) => `Mes Completo (${weeks} Semanas)`,
  },
};
