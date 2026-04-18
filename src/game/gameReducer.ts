import {
  BOSS_STAGE_NUMBER,
  FINAL_MAIN_TIER,
  FINAL_TIER,
  getQuestionCountForStage,
  getStageCountForTier,
} from './stageConfig';
import type { AnswerValue, GameState, PlayerAnswer, Question } from './types';

export type GameAction =
  | { type: 'selectAnswer'; answer: PlayerAnswer }
  | { type: 'submitAnswer'; question: Question }
  | { type: 'goNext' }
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

function submitAnswer(state: GameState, question: Question): GameState {
  if (state.selectedAnswer === null || state.hasSubmitted) {
    return state;
  }

  const correct = isAnswerCorrect(question, state.selectedAnswer);

  return {
    ...state,
    hasSubmitted: true,
    lastAnswerCorrect: correct,
    score: correct ? state.score + 1 : state.score,
  };
}

function goNext(state: GameState): GameState {
  if (state.phase === 'stageCleared') {
    return resetQuestionState({
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

    return resetQuestionState({
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

  if (state.stageNumber === stageCount) {
    return {
      ...state,
      phase: state.tierNumber === FINAL_TIER ? 'gameCleared' : 'tierCleared',
    };
  }

  return {
    ...state,
    phase: 'stageCleared',
  };
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
