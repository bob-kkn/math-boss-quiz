import type { GamePhase, ProgressStatus, StageConfig, TierConfig } from './types';

export const TIER_COUNT = 18;
export const STAGES_PER_TIER = 10;
export const QUESTIONS_PER_STAGE = 8;
export const TOTAL_STAGE_COUNT = TIER_COUNT * STAGES_PER_TIER;
export const TOTAL_MAIN_QUESTIONS = TOTAL_STAGE_COUNT * QUESTIONS_PER_STAGE;
export const FINAL_TIER = TIER_COUNT;
export const BOSS_STAGE_NUMBER = STAGES_PER_TIER;
export const BONUS_TIER_NUMBER = TIER_COUNT;

const tierBlueprints = [
  ['아기', '수 감각과 사물 인식'],
  ['어린이집', '놀이 수학과 비교'],
  ['유치원', '수 세기와 모양'],
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
  ['대학교', '대학 기초수학'],
  ['대학원', '고급 수학 개념'],
  ['보너스', '거의 난제'],
] as const;

export function getStageKey(tierNumber: number, stageNumber: number): string {
  return `${tierNumber}-${stageNumber}`;
}

export function getGlobalStageNumber(
  tierNumber: number,
  stageNumber: number,
): number {
  return (tierNumber - 1) * STAGES_PER_TIER + stageNumber;
}

export function isBossStage(stageNumber: number): boolean {
  return stageNumber === BOSS_STAGE_NUMBER;
}

function getTierStatus(
  tierNumber: number,
  currentTierNumber: number,
  phase: GamePhase,
): ProgressStatus {
  if (phase === 'gameCleared') {
    return 'completed';
  }

  if (tierNumber < currentTierNumber) {
    return 'completed';
  }

  if (tierNumber === currentTierNumber) {
    return phase === 'tierCleared' ? 'completed' : 'active';
  }

  return 'locked';
}

function getStageStatus(
  stageNumber: number,
  currentStageNumber: number,
  phase: GamePhase,
): ProgressStatus {
  if (phase === 'gameCleared' || phase === 'tierCleared') {
    return 'completed';
  }

  if (stageNumber < currentStageNumber) {
    return 'completed';
  }

  if (stageNumber === currentStageNumber) {
    return phase === 'stageCleared' ? 'completed' : 'active';
  }

  return 'locked';
}

export function createTierMap(
  currentTierNumber = 1,
  phase: GamePhase = 'main',
): TierConfig[] {
  return tierBlueprints.map(([label, topic], index) => {
    const tierNumber = index + 1;

    return {
      tierNumber,
      label,
      topic,
      status: getTierStatus(tierNumber, currentTierNumber, phase),
      isBonusTier: tierNumber === BONUS_TIER_NUMBER,
    };
  });
}

export function createStageMap(
  tierNumber = 1,
  currentStageNumber = 1,
  phase: GamePhase = 'main',
): StageConfig[] {
  const tier = getTierConfig(tierNumber);

  return Array.from({ length: STAGES_PER_TIER }, (_, index) => {
    const stageNumber = index + 1;
    const bossStage = isBossStage(stageNumber);

    return {
      tierNumber,
      stageNumber,
      globalStageNumber: getGlobalStageNumber(tierNumber, stageNumber),
      label: `${stageNumber}스테이지`,
      topic: bossStage ? `${tier.label} 보스전` : `${tier.topic} ${stageNumber}`,
      questionCount: QUESTIONS_PER_STAGE,
      isBossStage: bossStage,
      status: getStageStatus(stageNumber, currentStageNumber, phase),
    };
  });
}

export function getTierConfig(tierNumber: number): TierConfig {
  const tier = createTierMap(tierNumber).find(
    (item) => item.tierNumber === tierNumber,
  );

  if (!tier) {
    throw new Error(`Unknown tier number: ${tierNumber}`);
  }

  return tier;
}

export function getStageConfig(
  tierNumber: number,
  stageNumber: number,
): StageConfig {
  const stage = createStageMap(tierNumber, stageNumber).find(
    (item) => item.stageNumber === stageNumber,
  );

  if (!stage) {
    throw new Error(`Unknown stage: tier ${tierNumber}, stage ${stageNumber}`);
  }

  return stage;
}
