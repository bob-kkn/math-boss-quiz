export const STAGE_COUNT = 10;
export const QUESTIONS_PER_STAGE = 8;
export const TOTAL_MAIN_QUESTIONS = STAGE_COUNT * QUESTIONS_PER_STAGE;
export const BONUS_QUESTION_COUNT = 5;
export const FINAL_BOSS_STAGE = 10;

export const stageTopics = [
  '한 자리 덧셈과 뺄셈',
  '두 자리 계산',
  '곱셈 기초',
  '나눗셈 기초',
  '혼합 계산',
  '분수 감각',
  '소수 계산',
  '비율과 규칙',
  '문장제',
  '최종 보스',
];

export function createStageMap() {
  return Array.from({ length: STAGE_COUNT }, (_, index) => {
    const stageNumber = index + 1;

    return {
      stageNumber,
      label: `Stage ${stageNumber}`,
      topic: stageTopics[index],
      questionCount: QUESTIONS_PER_STAGE,
      isFinalStage: stageNumber === FINAL_BOSS_STAGE,
      hasFinalBoss: stageNumber === FINAL_BOSS_STAGE,
      status: stageNumber === 1 ? 'active' : 'locked',
    };
  });
}
