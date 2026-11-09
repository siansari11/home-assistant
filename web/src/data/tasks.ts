import type { Task } from '../types';

const now = Date.now();

function task(
  id: string,
  title: string,
  status: Task['status'],
  nextStep: string,
  dueDate: string | null,
): Task {
  return { id, title, status, nextStep, dueDate, updatedAt: now };
}

/** Personal tasks seeded from the status board (lane mine, not code). */
export function seedTasks(): Task[] {
  return [
    task('pflegegrad', 'Pflegegrad Widerspruch reasons (AOK)', 'waiting', 'Fill gaps; get André, Erik, doctor statements; keep Pflegetagebuch', '2026-11-16'),
    task('werder', 'Pflegestützpunkt Werder appointment', 'waiting', 'Go to Werder Tue 27.10', '2026-10-27'),
    task('aok-deadline', 'AOK: confirm 16.11 deadline in writing', 'waiting', "Send Frau Steiner's email so a draft can be made", null),
    task('doctolib', 'Video consultation with R. Henneberg (Doctolib)', 'waiting', '2026-10-27 12:40', '2026-10-27'),
    task('bundid', 'BundID: new message in your inbox', 'waiting', 'Log in with eID and read it', null),
    task('mercer', 'Mercer / ERGO BU claim', 'waiting', 'Fill ERGO questionnaire, send with reports by registered mail, ask for ERGO terms', null),
    task('gdb', 'GdB Verschlimmerungsantrag', 'waiting', 'Collect newer diagnoses, then draft', null),
    task('tax-2025', 'Tax return 2025', 'waiting', 'Gather statements (severance, Krankengeld, ALG1)', '2026-12-31'),
    task('bayerische-anfechtung', 'Bayerische: Anfechtung of accidental Kündigung', 'in_progress', 'Chase if no reply by 09.11', '2026-11-09'),
    task('bayerische-letter', 'Bayerische letter by Einschreiben', 'in_progress', 'Print, sign, send with Rückschein', '2026-10-26'),
    task('alg-court', 'ALG court case (Sozialgericht Berlin)', 'in_progress', 'Extension to 23.11; wait for court', '2026-11-23'),
    task('amazon-returns', 'Amazon returns: 5 smartwatches', 'in_progress', 'Wait for refunds; keep emails', null),
    task('operation', 'Operation', 'waiting', 'Status unknown; tell Grok Bot', null),
    task('drv', 'DRV internship (Deutsche Bank 2027)', 'waiting', 'Review and send drafted email', null),
    task('finops', 'Study: FinOps Practitioner', 'in_progress', '', null),
    task('itil', 'Study: ITIL 4 Foundation', 'waiting', 'Start when ready', null),
  ];
}
