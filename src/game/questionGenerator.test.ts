import {
  generateAllStageQuestions,
  generateBonusQuestions,
  generateStageQuestions,
  getTotalGeneratedQuestionCount,
} from './questionGenerator';
import {
  BOSS_STAGE_NUMBER,
  QUESTIONS_PER_STAGE,
  STAGES_PER_TIER,
  TIER_COUNT,
  TOTAL_MAIN_QUESTIONS,
  createStageMap,
  createTierMap,
} from './stageConfig';

describe('question generation', () => {
  it('creates 18 tiers', () => {
    expect(createTierMap()).toHaveLength(TIER_COUNT);
  });

  it('creates 10 stages per tier', () => {
    expect(createStageMap(1)).toHaveLength(STAGES_PER_TIER);
  });

  it('creates 8 questions per stage', () => {
    const questionsByStage = generateAllStageQuestions({ seed: 'test' });

    Object.values(questionsByStage).forEach((questions) => {
      expect(questions).toHaveLength(QUESTIONS_PER_STAGE);
    });
  });

  it('reports the full 1440-question structure', () => {
    expect(getTotalGeneratedQuestionCount()).toBe(TOTAL_MAIN_QUESTIONS);
  });

  it('marks every tenth stage as a boss stage', () => {
    const stageNine = generateStageQuestions(4, 9, { seed: 'not-boss' });
    const stageTen = generateStageQuestions(4, BOSS_STAGE_NUMBER, {
      seed: 'boss',
    });

    expect(stageNine.every((question) => !question.isBoss)).toBe(true);
    expect(stageTen.every((question) => question.isBoss)).toBe(true);
  });

  it('creates 80 bonus tier questions', () => {
    expect(generateBonusQuestions({ seed: 'bonus-test' })).toHaveLength(80);
  });

  it('creates unique main question ids', () => {
    const questionsByStage = generateAllStageQuestions({ seed: 'unique' });
    const ids = Object.values(questionsByStage)
      .flat()
      .map((question) => question.id);

    expect(new Set(ids).size).toBe(TOTAL_MAIN_QUESTIONS);
  });

  it('creates complete question content for every generated question', () => {
    const questions = Object.values(
      generateAllStageQuestions({ seed: 'content' }),
    ).flat();

    questions.forEach((question) => {
      expect(question.question.trim()).not.toBe('');
      expect(question.explanation.trim()).not.toBe('');
      expect(question.topic.trim()).not.toBe('');
      expect(question.level.trim()).not.toBe('');
    });
  });

  it('creates valid answer payloads for all answer modes', () => {
    const questions = Object.values(
      generateAllStageQuestions({ seed: 'answers' }),
    ).flat();

    questions.forEach((question) => {
      if (question.answerMode === 'multipleChoice') {
        expect(question.choices).toHaveLength(4);
        expect(new Set(question.choices).size).toBe(4);
        expect(question.choices).toContain(question.answer);
      }

      if (question.answerMode === 'numericInput') {
        expect(typeof question.answer).toBe('number');
      }

      if (question.answerMode === 'trueFalse') {
        expect(typeof question.answer).toBe('boolean');
        expect(question.choices).toBeUndefined();
      }
    });
  });

  it('keeps baby and kindergarten tiers away from advanced notation outside boss stages', () => {
    const earlyText = [1, 2, 3]
      .flatMap((tierNumber) =>
        Array.from({ length: STAGES_PER_TIER - 1 }, (_, index) =>
          generateStageQuestions(tierNumber, index + 1, {
            seed: `early-${tierNumber}-${index + 1}`,
          }),
        ).flat(),
      )
      .map((question) => question.question)
      .join(' ');

    expect(earlyText).not.toMatch(/÷|x\^|log|√|미분|적분|방정식/);
  });

  it('keeps university, graduate, and bonus tiers available at the end', () => {
    const tierLabels = createTierMap().map((tier) => tier.label);

    expect(tierLabels.slice(-3)).toEqual(['대학교', '대학원', '보너스']);
  });
});
