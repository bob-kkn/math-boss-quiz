import {
  BOSS_STAGE_NUMBER,
  FINAL_MAIN_TIER,
  FINAL_TIER,
  getQuestionCountForStage,
  getStageKey,
  getStageCountForTier,
} from './stageConfig';
import type {
  AnswerValue,
  GameState,
  PlayerAnswer,
  Question,
  StageResult,
} from './types';

export const BOSS_MAX_HP = 6;
export const PLAYER_MAX_HP = 3;

export type GameAction =
  | { type: 'selectAnswer'; answer: PlayerAnswer }
  | { type: 'submitAnswer'; question: Question }
  | { type: 'goNext' }
  | { type: 'retryBoss' }
  | { type: 'restart' }
  | { type: 'debugJumpToFinalBoss' }
  | { type: 'debugOpenBonus' };

export function createInitialGameState(): GameState {
  return {
    tierNumber: 1,
    stageNumber: 1,
    questionIndex: 0,
    selectedAnswer: null,
    hasSubmitted: false,
    lastAnswerCorrect: null,
    phase: 'main',
    score: 0,
    combo: 0,
    bestCombo: 0,
    stageCorrectCount: 0,
    stageStartScore: 0,
    bossHp: BOSS_MAX_HP,
    playerHp: PLAYER_MAX_HP,
    stageResults: {},
  };
}

function normalizeAnswer(value: AnswerValue): string {
  return String(value).trim().toLowerCase();
}

export function isAnswerCorrect(
  question: Question,
  selectedAnswer: PlayerAnswer,
): boolean {
  if (selectedAnswer === null) {
    return false;
  }

  if (question.answerMode === 'numericInput') {
    const selectedNumber = Number(selectedAnswer);
    const correctNumber = Number(question.answer);

    if (!Number.isFinite(selectedNumber) || !Number.isFinite(correctNumber)) {
      return false;
    }

    return (
      Math.abs(selectedNumber - correctNumber) <=
      (question.numericTolerance ?? 0)
    );
  }

  if (question.answerMode === 'trueFalse') {
    return Boolean(selectedAnswer) === Boolean(question.answer);
  }

  return normalizeAnswer(selectedAnswer) === normalizeAnswer(question.answer);
}

function resetQuestionState(state: GameState): GameState {
  return {
    ...state,
    selectedAnswer: null,
    hasSubmitted: false,
    lastAnswerCorrect: null,
  };
}

function resetStageChallengeState(state: GameState): GameState {
  return resetQuestionState({
    ...state,
    combo: 0,
    bestCombo: 0,
    stageCorrectCount: 0,
    stageStartScore: state.score,
    bossHp: BOSS_MAX_HP,
    playerHp: PLAYER_MAX_HP,
  });
}

export function calculateStars(
  correctCount: number,
  questionCount: number,
): number {
  if (correctCount === questionCount) {
    return 3;
  }

  return correctCount / questionCount >= 0.75 ? 2 : 1;
}

function recordStageResult(state: GameState, isBoss: boolean): GameState {
  const questionCount = getQuestionCountForStage(
    state.tierNumber,
    state.stageNumber,
  );
  const result: StageResult = {
    correctCount: state.stageCorrectCount,
    questionCount,
    stars: calculateStars(state.stageCorrectCount, questionCount),
    bestCombo: state.bestCombo,
    isBoss,
    clearedAt: new Date().toISOString(),
  };

  return {
    ...state,
    stageResults: {
      ...state.stageResults,
      [getStageKey(state.tierNumber, state.stageNumber)]: result,
    },
  };
}

function submitAnswer(state: GameState, question: Question): GameState {
  if (state.phase !== 'main' || state.selectedAnswer === null || state.hasSubmitted) {
    return state;
  }

  const correct = isAnswerCorrect(question, state.selectedAnswer);
  const combo = correct ? state.combo + 1 : 0;
  const bossHp = question.isBoss && correct ? Math.max(0, state.bossHp - 1) : state.bossHp;
  const playerHp =
    question.isBoss && !correct
      ? Math.max(0, state.playerHp - 1)
      : state.playerHp;

  return {
    ...state,
    hasSubmitted: true,
    lastAnswerCorrect: correct,
    score: correct ? state.score + 1 : state.score,
    combo,
    bestCombo: Math.max(state.bestCombo, combo),
    stageCorrectCount: correct
      ? state.stageCorrectCount + 1
      : state.stageCorrectCount,
    bossHp,
    playerHp,
    phase: question.isBoss && playerHp === 0 ? 'bossFailed' : state.phase,
  };
}

function goNext(state: GameState): GameState {
  if (state.phase === 'stageCleared') {
    return resetStageChallengeState({
      ...state,
      stageNumber: state.stageNumber + 1,
      questionIndex: 0,
      phase: 'main',
    });
  }

  if (state.phase === 'tierCleared') {
    if (state.tierNumber === FINAL_TIER) {
      return {
        ...state,
        phase: 'gameCleared',
      };
    }

    return resetStageChallengeState({
      ...state,
      tierNumber: state.tierNumber + 1,
      stageNumber: 1,
      questionIndex: 0,
      phase: 'main',
    });
  }

  if (!state.hasSubmitted) {
    return state;
  }

  const questionCount = getQuestionCountForStage(
    state.tierNumber,
    state.stageNumber,
  );
  const stageCount = getStageCountForTier(state.tierNumber);
  const isLastQuestion = state.questionIndex === questionCount - 1;

  if (!isLastQuestion) {
    return resetQuestionState({
      ...state,
      questionIndex: state.questionIndex + 1,
    });
  }

  if (state.bossHp > 0 && state.stageNumber === stageCount && state.tierNumber !== FINAL_TIER) {
    return {
      ...state,
      phase: 'bossFailed',
    };
  }

  const cleared = recordStageResult(
    state,
    state.stageNumber === stageCount && state.tierNumber !== FINAL_TIER,
  );

  if (state.stageNumber === stageCount) {
    return {
      ...cleared,
      phase: cleared.tierNumber === FINAL_TIER ? 'gameCleared' : 'tierCleared',
    };
  }

  return {
    ...cleared,
    phase: 'stageCleared',
  };
}

function retryBoss(state: GameState): GameState {
  if (state.phase !== 'bossFailed') {
    return state;
  }

  return resetQuestionState({
    ...state,
    questionIndex: 0,
    phase: 'main',
    score: state.stageStartScore,
    combo: 0,
    bestCombo: 0,
    stageCorrectCount: 0,
    bossHp: BOSS_MAX_HP,
    playerHp: PLAYER_MAX_HP,
  });
}

export function gameReducer(
  state: GameState,
  action: GameAction,
): GameState {
  switch (action.type) {
    case 'selectAnswer':
      if (state.hasSubmitted) {
        return state;
      }

      return {
        ...state,
        selectedAnswer: action.answer,
      };
    case 'submitAnswer':
      return submitAnswer(state, action.question);
    case 'goNext':
      return goNext(state);
    case 'retryBoss':
      return retryBoss(state);
    case 'restart':
      return createInitialGameState();
    case 'debugJumpToFinalBoss':
      return {
        ...createInitialGameState(),
        tierNumber: FINAL_MAIN_TIER,
        stageNumber: BOSS_STAGE_NUMBER,
      };
    case 'debugOpenBonus':
      return {
        ...createInitialGameState(),
        tierNumber: FINAL_TIER,
        stageNumber: 1,
      };
    default:
      return state;
  }
}
