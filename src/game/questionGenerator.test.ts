import {
  generateAllStageQuestions,
  generateBonusQuestions,
  generateStageQuestions,
  getTotalGeneratedQuestionCount,
} from './questionGenerator';
import {
  BONUS_QUESTION_COUNT,
  FINAL_BOSS_STAGE,
  QUESTIONS_PER_STAGE,
  STAGE_COUNT,
  TOTAL_MAIN_QUESTIONS,
  createStageMap,
} from './stageConfig';

describe('question generation', () => {
  it('creates 13 stages', () => {
    expect(createStageMap()).toHaveLength(STAGE_COUNT);
  });

  it('creates 8 questions per stage', () => {
    const questionsByStage = generateAllStageQuestions({ seed: 'test' });

    Object.values(questionsByStage).forEach((questions) => {
      expect(questions).toHaveLength(QUESTIONS_PER_STAGE);
    });
  });

  it('reports 104 main questions', () => {
    expect(getTotalGeneratedQuestionCount()).toBe(TOTAL_MAIN_QUESTIONS);
  });

  it('marks only stage 13 question 8 as the final boss', () => {
    const bossFlags = Array.from({ length: STAGE_COUNT }, (_, index) => {
      const stageNumber = index + 1;
      return generateStageQuestions(stageNumber, {
        seed: `boss-${stageNumber}`,
      }).map((question) => ({
        id: question.id,
        isBoss: question.isBoss,
      }));
    }).flat();

    const bosses = bossFlags.filter((question) => question.isBoss);

    expect(bosses).toEqual([
      {
        id: `stage-${FINAL_BOSS_STAGE}-question-${QUESTIONS_PER_STAGE}`,
        isBoss: true,
      },
    ]);
  });

  it('creates 5 bonus questions', () => {
    expect(generateBonusQuestions({ seed: 'bonus-test' })).toHaveLength(
      BONUS_QUESTION_COUNT,
    );
  });

  it('creates unique main question ids', () => {
    const questionsByStage = generateAllStageQuestions({ seed: 'unique' });
    const ids = Object.values(questionsByStage)
      .flat()
      .map((question) => question.id);

    expect(new Set(ids).size).toBe(TOTAL_MAIN_QUESTIONS);
  });

  it('creates complete question content for every generated question', () => {
    const mainQuestions = Object.values(
      generateAllStageQuestions({ seed: 'content' }),
    ).flat();
    const bonusQuestions = generateBonusQuestions({ seed: 'content-bonus' });

    [...mainQuestions, ...bonusQuestions].forEach((question) => {
      expect(question.question.trim()).not.toBe('');
      expect(question.explanation.trim()).not.toBe('');
      expect(question.topic.trim()).not.toBe('');
      expect(question.level.trim()).not.toBe('');
    });
  });

  it('creates valid answer payloads for all answer modes', () => {
    const questions = [
      ...Object.values(generateAllStageQuestions({ seed: 'answers' })).flat(),
      ...generateBonusQuestions({ seed: 'answers-bonus' }),
    ];

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

  it('keeps lower elementary stages away from advanced notation', () => {
    const lowerElementaryText = [2, 3]
      .flatMap((stageNumber) =>
        generateStageQuestions(stageNumber, {
          seed: `lower-${stageNumber}`,
        }),
      )
      .map((question) => question.question)
      .join(' ');

    expect(lowerElementaryText).not.toMatch(/÷|x\^|log|√|미분|적분|방정식/);
  });

  it('keeps high school calculus content in the final stage only', () => {
    const highOneAndTwoText = [11, 12]
      .flatMap((stageNumber) =>
        generateStageQuestions(stageNumber, {
          seed: `high-${stageNumber}`,
        }),
      )
      .map((question) => `${question.topic} ${question.question}`)
      .join(' ');
    const highThreeText = generateStageQuestions(13, { seed: 'high-13' })
      .map((question) => `${question.topic} ${question.question}`)
      .join(' ');

    expect(highOneAndTwoText).not.toMatch(/미분|적분|f′/);
    expect(highThreeText).toMatch(/미분|적분|f′/);
  });
});
