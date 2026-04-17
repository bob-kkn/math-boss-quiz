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
});
