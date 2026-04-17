import type { GamePhase, StageConfig, StageStatus } from './types';

export const STAGE_COUNT = 13;
export const QUESTIONS_PER_STAGE = 8;
export const TOTAL_MAIN_QUESTIONS = STAGE_COUNT * QUESTIONS_PER_STAGE;
export const BONUS_QUESTION_COUNT = 5;
export const FINAL_BOSS_STAGE = 13;

const stageBlueprints = [
  ['유치원', '수 감각과 모양'],
  ['초1', '한 자리 덧셈과 뺄셈'],
  ['초2', '두 자리 수와 구구단'],
  ['초3', '곱셈과 나눗셈'],
  ['초4', '큰 수와 분수 기초'],
  ['초5', '약수, 배수와 분수 계산'],
  ['초6', '비율, 소수와 입체도형'],
  ['중1', '정수와 문자식'],
  ['중2', '연립방정식과 함수'],
  ['중3', '제곱근과 이차식'],
  ['고1', '다항식과 방정식'],
  ['고2', '함수와 확률 기초'],
  ['고3', '수열과 미적분 핵심'],
] as const;

function getStatus(
  stageNumber: number,
  currentStageNumber: number,
  phase: GamePhase,
): StageStatus {
  if (phase === 'bonus' || phase === 'bonusCleared') {
    return 'completed';
  }

  if (stageNumber < currentStageNumber) {
    return 'completed';
  }

  if (stageNumber === currentStageNumber) {
    return phase === 'stageCleared' || phase === 'gameCleared'
      ? 'completed'
      : 'active';
  }

  return 'locked';
}

export function createStageMap(
  currentStageNumber = 1,
  phase: GamePhase = 'main',
): StageConfig[] {
  return stageBlueprints.map(([gradeLabel, topic], index) => {
    const stageNumber = index + 1;

    return {
      stageNumber,
      label: `Stage ${stageNumber}`,
      gradeLabel,
      topic,
      questionCount: QUESTIONS_PER_STAGE,
      isFinalStage: stageNumber === FINAL_BOSS_STAGE,
      hasFinalBoss: stageNumber === FINAL_BOSS_STAGE,
      status: getStatus(stageNumber, currentStageNumber, phase),
    };
  });
}

export function getStageConfig(stageNumber: number): StageConfig {
  const stage = createStageMap(stageNumber).find(
    (item) => item.stageNumber === stageNumber,
  );

  if (!stage) {
    throw new Error(`Unknown stage number: ${stageNumber}`);
  }

  return stage;
}
