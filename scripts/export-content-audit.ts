import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  contentAuditToCsv,
  createContentAuditReport,
} from '../src/game/contentAudit';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputDir = resolve(repoRoot, 'reports');
const jsonPath = resolve(outputDir, 'content-audit.json');
const csvPath = resolve(outputDir, 'content-audit.csv');
const summaryPath = resolve(outputDir, 'content-audit-summary.json');

const report = createContentAuditReport();

await mkdir(outputDir, { recursive: true });
await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await writeFile(summaryPath, `${JSON.stringify(report.summary, null, 2)}\n`, 'utf8');
await writeFile(csvPath, `\uFEFF${contentAuditToCsv(report.records)}`, 'utf8');

console.log(`Content audit exported: ${report.summary.totalQuestions} questions`);
console.log(`- ${jsonPath}`);
console.log(`- ${csvPath}`);
console.log(`- ${summaryPath}`);

if (
  report.summary.totalQuestions !== report.summary.expectedQuestions ||
  report.summary.issueCount > 0 ||
  report.summary.duplicateQuestionCount > 0
) {
  console.error('Content audit found blocking issues.');
  process.exit(1);
}
