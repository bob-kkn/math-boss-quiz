import {
  contentAuditToCsv,
  createContentAuditReport,
} from './contentAudit';
import { TOTAL_GENERATED_QUESTIONS } from './stageConfig';

describe('content audit report', () => {
  it('creates one audit record for every generated question', () => {
    const report = createContentAuditReport('2026-04-18T00:00:00.000Z');

    expect(report.summary.generatedAt).toBe('2026-04-18T00:00:00.000Z');
    expect(report.summary.totalQuestions).toBe(TOTAL_GENERATED_QUESTIONS);
    expect(report.summary.expectedQuestions).toBe(TOTAL_GENERATED_QUESTIONS);
    expect(report.summary.issueCount).toBe(0);
    expect(report.summary.duplicateQuestionCount).toBe(0);
    expect(report.summary.bossQuestionCount).toBe(136);
    expect(report.summary.bonusQuestionCount).toBe(10);
    expect(report.records).toHaveLength(TOTAL_GENERATED_QUESTIONS);
  });

  it('includes reviewer-friendly labels and answer fields', () => {
    const report = createContentAuditReport('2026-04-18T00:00:00.000Z');
    const firstRecord = report.records[0];

    expect(firstRecord.tierLabel).toBe('아기');
    expect(firstRecord.stageLabel).toBe('1스테이지');
    expect(firstRecord.difficultyLabel).toBe('기초');
    expect(firstRecord.question).not.toBe('');
    expect(firstRecord.answer).not.toBe('');
    expect(firstRecord.explanation).toContain('핵심:');
  });

  it('serializes audit records as escaped CSV', () => {
    const report = createContentAuditReport('2026-04-18T00:00:00.000Z');
    const csv = contentAuditToCsv(report.records.slice(0, 2));

    expect(csv).toContain('id,tierNumber,tierLabel');
    expect(csv.split('\r\n')).toHaveLength(4);
    expect(csv).toContain('tier-1-stage-1-question-1');
  });
});
