import {
  BONUS_QUESTION_COUNT,
  FINAL_BOSS_STAGE,
  QUESTIONS_PER_STAGE,
} from './stageConfig';
import type { AnswerValue, GameState, PlayerAnswer, Question } from './types';

export type GameAction =
  | { type: 'selectAnswer'; answer: PlayerAnswer }
  | { type: 'submitAnswer'; question: Question }
  | { type: 'goNext' }
  | { type: 'enterBonus' }
  | { type: 'restart' }
  | { type: 'debugJumpToFinalBoss' }
  | { type: 'debugOpenBonus' };

export function createInitialGameState(): GameState {
  return {
    stageNumber: 1,
    questionIndex: 0,
    selectedAnswer: null,
    hasSubmitted: false,
    lastAnswerCorrect: null,
    phase: 'main',
    score: 0,
    bonusScore: 0,
    unlockedBonus: false,
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
    score:
      state.phase === 'main' && correct ? state.score + 1 : state.score,
    bonusScore:
      state.phase === 'bonus' && correct
        ? state.bonusScore + 1
        : state.bonusScore,
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

  if (!state.hasSubmitted) {
    return state;
  }

  if (state.phase === 'bonus') {
    if (state.questionIndex === BONUS_QUESTION_COUNT - 1) {
      return {
        ...state,
        phase: 'bonusCleared',
      };
    }

    return resetQuestionState({
      ...state,
      questionIndex: state.questionIndex + 1,
    });
  }

  const isLastQuestion = state.questionIndex === QUESTIONS_PER_STAGE - 1;
  const isFinalBoss =
    state.stageNumber === FINAL_BOSS_STAGE && isLastQuestion;

  if (isFinalBoss) {
    return {
      ...state,
      phase: state.lastAnswerCorrect ? 'gameCleared' : 'bossFailed',
      unlockedBonus: Boolean(state.lastAnswerCorrect),
    };
  }

  if (isLastQuestion) {
    return {
      ...state,
      phase: 'stageCleared',
    };
  }

  return resetQuestionState({
    ...state,
    questionIndex: state.questionIndex + 1,
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
    case 'enterBonus':
      if (!state.unlockedBonus) {
        return state;
      }

      return resetQuestionState({
        ...state,
        phase: 'bonus',
        questionIndex: 0,
      });
    case 'restart':
      return createInitialGameState();
    case 'debugJumpToFinalBoss':
      return {
        ...createInitialGameState(),
        stageNumber: FINAL_BOSS_STAGE,
        questionIndex: QUESTIONS_PER_STAGE - 1,
      };
    case 'debugOpenBonus':
      return {
        ...createInitialGameState(),
        stageNumber: FINAL_BOSS_STAGE,
        phase: 'bonus',
        unlockedBonus: true,
      };
    default:
      return state;
  }
}
