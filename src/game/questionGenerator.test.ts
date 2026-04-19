import {
  generateAllStageQuestions,
  generateBonusQuestions,
  generateStageQuestions,
  getTotalGeneratedQuestionCount,
} from './questionGenerator';
import {
  formatDifficultyBand,
  getAllowedAnswerModesForQuestion,
  getDifficultyBand,
  validateQuestionContent,
} from './contentQuality';
import {
  BOSS_STAGE_NUMBER,
  BONUS_TIER_NUMBER,
  FINAL_MAIN_TIER,
  QUESTIONS_PER_STAGE,
  STAGES_PER_TIER,
  TIER_COUNT,
  TOTAL_BONUS_QUESTIONS,
  TOTAL_GENERATED_QUESTIONS,
  TOTAL_MAIN_QUESTIONS,
  createStageMap,
  createTierMap,
} from './stageConfig';

describe('question generation', () => {
  it('creates 18 tiers', () => {
    expect(createTierMap()).toHaveLength(TIER_COUNT);
  });

  it('creates 10 stages per main tier and 1 bonus stage', () => {
    expect(createStageMap(1)).toHaveLength(STAGES_PER_TIER);
    expect(createStageMap(BONUS_TIER_NUMBER)).toHaveLength(1);
  });

  it('creates 8 questions per main stage and 10 bonus questions', () => {
    const questionsByStage = generateAllStageQuestions({ seed: 'test' });

    Object.entries(questionsByStage).forEach(([stageKey, questions]) => {
      expect(questions).toHaveLength(
        stageKey === `${BONUS_TIER_NUMBER}-1`
          ? TOTAL_BONUS_QUESTIONS
          : QUESTIONS_PER_STAGE,
      );
    });
  });

  it('reports the full generated question structure', () => {
    expect(TOTAL_MAIN_QUESTIONS).toBe(1360);
    expect(getTotalGeneratedQuestionCount()).toBe(TOTAL_GENERATED_QUESTIONS);
  });

  it('marks every tenth stage as a boss stage', () => {
    const stageNine = generateStageQuestions(4, 9, { seed: 'not-boss' });
    const stageTen = generateStageQuestions(4, BOSS_STAGE_NUMBER, {
      seed: 'boss',
    });

    expect(stageNine.every((question) => !question.isBoss)).toBe(true);
    expect(stageTen.every((question) => question.isBoss)).toBe(true);
  });

  it('creates one 10-question bonus stage', () => {
    expect(generateBonusQuestions({ seed: 'bonus-test' })).toHaveLength(
      TOTAL_BONUS_QUESTIONS,
    );
  });

  it('creates unique main question ids', () => {
    const questionsByStage = generateAllStageQuestions({ seed: 'unique' });
    const ids = Object.values(questionsByStage)
      .flat()
      .map((question) => question.id);

    expect(new Set(ids).size).toBe(TOTAL_GENERATED_QUESTIONS);
  });

  it('creates unique visible question text', () => {
    const questions = Object.values(
      generateAllStageQuestions({ seed: 'unique-text' }),
    ).flat();
    const questionText = questions.map((question) => question.question);

    expect(new Set(questionText).size).toBe(TOTAL_GENERATED_QUESTIONS);
    questionText.forEach((question) => {
      expect(question).not.toMatch(/^\S+ \d+스테이지 \d+번\./);
    });
  });

  it('does not prefix visible question text with tier labels', () => {
    const questions = Object.values(
      generateAllStageQuestions({ seed: 'no-tier-prefix' }),
    ).flat();
    const escapedTierLabels = createTierMap()
      .map((tier) => tier.label)
      .sort((left, right) => right.length - left.length)
      .map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const tierPrefixPattern = new RegExp(
      `^(${escapedTierLabels.join('|')})(\\s|\\d|:|：)`,
    );

    questions.forEach((question) => {
      expect(question.question).not.toMatch(tierPrefixPattern);
    });
  });

  it('creates complete question content for every generated question', () => {
    const questions = Object.values(
      generateAllStageQuestions({ seed: 'content' }),
    ).flat();

    questions.forEach((question) => {
      expect(question.question.trim()).not.toBe('');
      expect(question.explanation.trim()).not.toBe('');
      expect(question.topic.trim()).not.toBe('');
      expect(question.concept.trim()).not.toBe('');
      expect(question.skill.trim()).not.toBe('');
      expect(formatDifficultyBand(question.difficultyBand)).not.toBe('');
      expect(question.level.trim()).not.toBe('');
    });
  });

  it('passes the content quality audit for every generated question', () => {
    const questions = Object.values(
      generateAllStageQuestions({ seed: 'quality' }),
    ).flat();
    const issues = questions.flatMap(validateQuestionContent);

    expect(issues).toEqual([]);
  });

  it('uses the expected difficulty bands across a main tier', () => {
    expect(getDifficultyBand(4, 1)).toBe('intro');
    expect(getDifficultyBand(4, 4)).toBe('practice');
    expect(getDifficultyBand(4, 8)).toBe('application');
    expect(getDifficultyBand(4, BOSS_STAGE_NUMBER)).toBe('boss');
    expect(getDifficultyBand(BONUS_TIER_NUMBER, 1)).toBe('bonus');
  });

  it('keeps generated answer modes inside each tier content profile', () => {
    const questions = Object.values(
      generateAllStageQuestions({ seed: 'answer-mode-profile' }),
    ).flat();

    questions.forEach((question) => {
      expect(getAllowedAnswerModesForQuestion(question)).toContain(
        question.answerMode,
      );
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
    const finalMainBoss = generateStageQuestions(
      FINAL_MAIN_TIER,
      BOSS_STAGE_NUMBER,
      { seed: 'main-final-boss' },
    );
    const bonusStage = generateBonusQuestions({ seed: 'bonus-end' });

    expect(tierLabels.slice(-3)).toEqual(['대학교', '대학원', '보너스']);
    expect(finalMainBoss.every((question) => question.isBoss)).toBe(true);
    expect(bonusStage.every((question) => !question.isBoss)).toBe(true);
  });
});
