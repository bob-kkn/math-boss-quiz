import {
  BONUS_TIER_NUMBER,
  BOSS_STAGE_NUMBER,
  STAGES_PER_TIER,
} from './stageConfig';
import type {
  AnswerMode,
  DifficultyBand,
  Question,
  SkillTag,
} from './types';

interface ContentProfile {
  name: string;
  minTier: number;
  maxTier: number;
  allowedAnswerModes: AnswerMode[];
  forbiddenQuestionPattern?: RegExp;
  minExplanationLength: number;
}

const contentProfiles: ContentProfile[] = [
  {
    name: 'early',
    minTier: 1,
    maxTier: 3,
    allowedAnswerModes: ['multipleChoice', 'trueFalse'],
    forbiddenQuestionPattern: /÷|x\^|log|√|미분|적분|방정식|행렬|확률/,
    minExplanationLength: 12,
  },
  {
    name: 'elementary',
    minTier: 4,
    maxTier: 9,
    allowedAnswerModes: ['multipleChoice', 'numericInput', 'trueFalse'],
    forbiddenQuestionPattern: /x\^|log|√|미분|적분|행렬|P 대 NP/,
    minExplanationLength: 14,
  },
  {
    name: 'middle',
    minTier: 10,
    maxTier: 12,
    allowedAnswerModes: ['multipleChoice', 'numericInput', 'trueFalse'],
    forbiddenQuestionPattern: /미분|적분|행렬|P 대 NP/,
    minExplanationLength: 14,
  },
  {
    name: 'high',
    minTier: 13,
    maxTier: 15,
    allowedAnswerModes: ['multipleChoice', 'numericInput', 'trueFalse'],
    minExplanationLength: 14,
  },
  {
    name: 'university',
    minTier: 16,
    maxTier: 16,
    allowedAnswerModes: ['multipleChoice', 'numericInput', 'trueFalse'],
    minExplanationLength: 14,
  },
  {
    name: 'graduate',
    minTier: 17,
    maxTier: 17,
    allowedAnswerModes: ['multipleChoice', 'numericInput', 'trueFalse'],
    minExplanationLength: 14,
  },
  {
    name: 'bonus',
    minTier: BONUS_TIER_NUMBER,
    maxTier: BONUS_TIER_NUMBER,
    allowedAnswerModes: ['multipleChoice', 'numericInput', 'trueFalse'],
    minExplanationLength: 14,
  },
];

const difficultyLabels: Record<DifficultyBand, string> = {
  intro: '기초',
  practice: '연습',
  application: '응용',
  boss: '보스 심화',
  bonus: '거의 난제',
};

export function getContentProfile(tierNumber: number): ContentProfile {
  const profile = contentProfiles.find(
    (candidate) =>
      tierNumber >= candidate.minTier && tierNumber <= candidate.maxTier,
  );

  if (!profile) {
    throw new Error(`Unknown content profile for tier ${tierNumber}`);
  }

  return profile;
}

export function getAllowedAnswerModesForQuestion(
  question: Question,
): AnswerMode[] {
  if (question.difficultyBand === 'boss') {
    return ['multipleChoice', 'numericInput', 'trueFalse'];
  }

  return getContentProfile(question.tierNumber).allowedAnswerModes;
}

export function getDifficultyBand(
  tierNumber: number,
  stageNumber: number,
): DifficultyBand {
  if (tierNumber === BONUS_TIER_NUMBER) {
    return 'bonus';
  }

  if (stageNumber === BOSS_STAGE_NUMBER) {
    return 'boss';
  }

  if (stageNumber <= 3) {
    return 'intro';
  }

  if (stageNumber <= 7) {
    return 'practice';
  }

  return 'application';
}

export function formatDifficultyBand(band: DifficultyBand): string {
  return difficultyLabels[band];
}

export function inferSkill(topic: string): SkillTag {
  if (/수 세기|감각/.test(topic)) {
    return 'counting';
  }

  if (/덧셈|뺄셈|곱셈|나눗셈|계산|정수|거듭제곱|로그|제곱근/.test(topic)) {
    return 'calculation';
  }

  if (/비교|부등식/.test(topic)) {
    return 'comparison';
  }

  if (/규칙|수열|피보나치/.test(topic)) {
    return 'pattern';
  }

  if (/도형|넓이|그래프/.test(topic)) {
    return 'geometry';
  }

  if (/문장제|생활 문제|응용/.test(topic)) {
    return 'wordProblem';
  }

  if (/문자식|방정식|다항식|인수분해|선형대수|행렬/.test(topic)) {
    return 'algebra';
  }

  if (/함수|최적화/.test(topic)) {
    return 'function';
  }

  if (/확률|통계|정규분포/.test(topic)) {
    return 'probability';
  }

  if (/미분|적분/.test(topic)) {
    return 'calculus';
  }

  if (/참거짓|논리|증명|명제/.test(topic)) {
    return 'logic';
  }

  return 'advanced';
}

export function buildLearningExplanation(
  explanation: string,
  concept: string,
): string {
  const trimmed = explanation.trim();

  if (trimmed.includes('핵심:')) {
    return trimmed;
  }

  return `${trimmed} 핵심: ${concept}을 확인하세요.`;
}

export function validateQuestionContent(question: Question): string[] {
  const profile = getContentProfile(question.tierNumber);
  const expectedDifficulty = getDifficultyBand(
    question.tierNumber,
    question.stageNumber,
  );
  const issues: string[] = [];

  if (!getAllowedAnswerModesForQuestion(question).includes(question.answerMode)) {
    issues.push(`${question.id}: answer mode is not allowed for ${profile.name}`);
  }

  if (
    profile.forbiddenQuestionPattern &&
    profile.forbiddenQuestionPattern.test(question.question)
  ) {
    issues.push(`${question.id}: question uses advanced notation too early`);
  }

  if (question.explanation.trim().length < profile.minExplanationLength) {
    issues.push(`${question.id}: explanation is too short`);
  }

  if (!question.explanation.includes('핵심:')) {
    issues.push(`${question.id}: explanation is missing a concept hint`);
  }

  if (question.concept.trim() === '') {
    issues.push(`${question.id}: concept is empty`);
  }

  if (question.difficultyBand !== expectedDifficulty) {
    issues.push(`${question.id}: difficulty band is incorrect`);
  }

  return issues;
}
