import { formatDifficultyBand, validateQuestionContent } from './contentQuality';
import { generateAllStageQuestions } from './questionGenerator';
import {
  TOTAL_GENERATED_QUESTIONS,
  createStageMap,
  createTierMap,
  getStageKey,
} from './stageConfig';
import type { AnswerValue, Question } from './types';

export interface ContentAuditRecord {
  id: string;
  tierNumber: number;
  tierLabel: string;
  stageNumber: number;
  stageLabel: string;
  globalStageNumber: number;
  order: number;
  isBonus: boolean;
  isBoss: boolean;
  answerMode: string;
  difficultyBand: string;
  difficultyLabel: string;
  skill: string;
  topic: string;
  concept: string;
  question: string;
  answer: string;
  choices: string;
  explanation: string;
  issueCount: number;
  issues: string;
}

export interface ContentAuditSummary {
  generatedAt: string;
  totalQuestions: number;
  expectedQuestions: number;
  issueCount: number;
  duplicateQuestionCount: number;
  bossQuestionCount: number;
  bonusQuestionCount: number;
  answerModeCounts: Record<string, number>;
  difficultyCounts: Record<string, number>;
  skillCounts: Record<string, number>;
  tierCounts: Record<string, number>;
}

export interface ContentAuditReport {
  summary: ContentAuditSummary;
  records: ContentAuditRecord[];
}

const csvHeaders: Array<keyof ContentAuditRecord> = [
  'id',
  'tierNumber',
  'tierLabel',
  'stageNumber',
  'stageLabel',
  'globalStageNumber',
  'order',
  'isBonus',
  'isBoss',
  'answerMode',
  'difficultyBand',
  'difficultyLabel',
  'skill',
  'topic',
  'concept',
  'question',
  'answer',
  'choices',
  'explanation',
  'issueCount',
  'issues',
];

function serializeAnswer(value: AnswerValue): string {
  if (typeof value === 'boolean') {
    return value ? 'TRUE' : 'FALSE';
  }

  return String(value);
}

function serializeChoices(question: Question): string {
  if (!question.choices) {
    return '';
  }

  return question.choices.map(serializeAnswer).join(' | ');
}

function incrementCount(counts: Record<string, number>, key: string): void {
  counts[key] = (counts[key] ?? 0) + 1;
}

function csvCell(value: unknown): string {
  const text = String(value ?? '');
  const escaped = text.replace(/"/g, '""');

  return /[",\r\n]/.test(escaped) ? `"${escaped}"` : escaped;
}

export function createContentAuditReport(
  generatedAt = new Date().toISOString(),
): ContentAuditReport {
  const tierMap = createTierMap();
  const allQuestions = generateAllStageQuestions({ seed: 'content-audit' });
  const questionTexts = new Map<string, number>();
  const duplicateQuestionIds = new Set<string>();
  const records: ContentAuditRecord[] = [];

  Object.entries(allQuestions).forEach(([stageKey, questions]) => {
    const [tierNumberText, stageNumberText] = stageKey.split('-');
    const tierNumber = Number(tierNumberText);
    const stageNumber = Number(stageNumberText);
    const tier = tierMap[tierNumber - 1];
    const stage = createStageMap(tierNumber).find(
      (candidate) => candidate.stageNumber === stageNumber,
    );

    questions.forEach((question) => {
      const duplicateCount = questionTexts.get(question.question) ?? 0;
      questionTexts.set(question.question, duplicateCount + 1);

      if (duplicateCount > 0) {
        duplicateQuestionIds.add(question.id);
      }

      const issues = validateQuestionContent(question);

      records.push({
        id: question.id,
        tierNumber,
        tierLabel: tier.label,
        stageNumber,
        stageLabel: stage?.label ?? getStageKey(tierNumber, stageNumber),
        globalStageNumber: question.globalStageNumber,
        order: question.order,
        isBonus: tier.isBonusTier,
        isBoss: question.isBoss,
        answerMode: question.answerMode,
        difficultyBand: question.difficultyBand,
        difficultyLabel: formatDifficultyBand(question.difficultyBand),
        skill: question.skill,
        topic: question.topic,
        concept: question.concept,
        question: question.question,
        answer: serializeAnswer(question.answer),
        choices: serializeChoices(question),
        explanation: question.explanation,
        issueCount: issues.length,
        issues: issues.join(' | '),
      });
    });
  });

  const summary: ContentAuditSummary = {
    generatedAt,
    totalQuestions: records.length,
    expectedQuestions: TOTAL_GENERATED_QUESTIONS,
    issueCount: records.reduce((total, record) => total + record.issueCount, 0),
    duplicateQuestionCount: duplicateQuestionIds.size,
    bossQuestionCount: records.filter((record) => record.isBoss).length,
    bonusQuestionCount: records.filter((record) => record.isBonus).length,
    answerModeCounts: {},
    difficultyCounts: {},
    skillCounts: {},
    tierCounts: {},
  };

  records.forEach((record) => {
    incrementCount(summary.answerModeCounts, record.answerMode);
    incrementCount(summary.difficultyCounts, record.difficultyLabel);
    incrementCount(summary.skillCounts, record.skill);
    incrementCount(summary.tierCounts, record.tierLabel);
  });

  return { summary, records };
}

export function contentAuditToCsv(records: ContentAuditRecord[]): string {
  const lines = [
    csvHeaders.join(','),
    ...records.map((record) =>
      csvHeaders.map((header) => csvCell(record[header])).join(','),
    ),
  ];

  return `${lines.join('\r\n')}\r\n`;
}
