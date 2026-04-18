import {
  BOSS_MAX_HP,
  PLAYER_MAX_HP,
  calculateStars,
  createInitialGameState,
  gameReducer,
} from './gameReducer';
import { generateBonusQuestions, generateStageQuestions } from './questionGenerator';
import {
  BONUS_TIER_NUMBER,
  BOSS_STAGE_NUMBER,
  FINAL_MAIN_TIER,
  FINAL_TIER,
  QUESTIONS_PER_STAGE,
  TOTAL_BONUS_QUESTIONS,
  getStageKey,
} from './stageConfig';
import type { GameState, PlayerAnswer, Question } from './types';

function wrongAnswer(question: Question): PlayerAnswer {
  if (question.answerMode === 'trueFalse') {
    return !question.answer;
  }

  if (typeof question.answer === 'number') {
    return question.answer + 9999;
  }

  return '__wrong__';
}

function submitQuestion(
  state: GameState,
  question: Question,
  correct = true,
): GameState {
  const selected = gameReducer(state, {
    type: 'selectAnswer',
    answer: correct ? question.answer : wrongAnswer(question),
  });

  return gameReducer(selected, {
    type: 'submitAnswer',
    question,
  });
}

function completeStage(
  tierNumber: number,
  stageNumber: number,
  correctCount: number,
): GameState {
  const questions = generateStageQuestions(tierNumber, stageNumber, {
    seed: `complete-${tierNumber}-${stageNumber}-${correctCount}`,
  });
  let state: GameState = {
    ...createInitialGameState(),
    tierNumber,
    stageNumber,
  };

  questions.forEach((question, index) => {
    const submitted = submitQuestion(state, question, index < correctCount);
    state = gameReducer(submitted, { type: 'goNext' });
  });

  return state;
}

describe('game reducer', () => {
  it('increases score and combo after a correct answer', () => {
    const question = generateStageQuestions(1, 1, { seed: 'score' })[0];
    const submitted = submitQuestion(createInitialGameState(), question);

    expect(submitted.score).toBe(1);
    expect(submitted.combo).toBe(1);
    expect(submitted.bestCombo).toBe(1);
    expect(submitted.stageCorrectCount).toBe(1);
    expect(submitted.lastAnswerCorrect).toBe(true);
  });

  it('keeps score and resets combo after a wrong answer', () => {
    const questions = generateStageQuestions(1, 1, { seed: 'wrong' });
    let state = submitQuestion(createInitialGameState(), questions[0]);
    state = gameReducer(state, { type: 'goNext' });
    state = submitQuestion(state, questions[1], false);

    expect(state.score).toBe(1);
    expect(state.combo).toBe(0);
    expect(state.bestCombo).toBe(1);
    expect(state.stageCorrectCount).toBe(1);
    expect(state.lastAnswerCorrect).toBe(false);
  });

  it('does not move before answer submission', () => {
    const next = gameReducer(createInitialGameState(), { type: 'goNext' });

    expect(next.questionIndex).toBe(0);
    expect(next.phase).toBe('main');
  });

  it('clears a regular stage and records a 3-star result', () => {
    const cleared = completeStage(1, 1, QUESTIONS_PER_STAGE);
    const result = cleared.stageResults[getStageKey(1, 1)];

    expect(cleared.phase).toBe('stageCleared');
    expect(result.correctCount).toBe(QUESTIONS_PER_STAGE);
    expect(result.stars).toBe(3);
  });

  it('calculates regular stage 1/2/3-star rewards', () => {
    const oneStar = completeStage(1, 1, 3).stageResults[getStageKey(1, 1)];
    const twoStar = completeStage(1, 1, 6).stageResults[getStageKey(1, 1)];
    const threeStar = completeStage(1, 1, 8).stageResults[getStageKey(1, 1)];

    expect(oneStar.stars).toBe(1);
    expect(twoStar.stars).toBe(2);
    expect(threeStar.stars).toBe(3);
    expect(calculateStars(6, 8)).toBe(2);
  });

  it('moves from a cleared stage to the next stage with a fresh challenge state', () => {
    const next = gameReducer(
      {
        ...createInitialGameState(),
        phase: 'stageCleared',
        score: 5,
        combo: 3,
        bestCombo: 3,
        stageCorrectCount: 4,
      },
      { type: 'goNext' },
    );

    expect(next.phase).toBe('main');
    expect(next.stageNumber).toBe(2);
    expect(next.questionIndex).toBe(0);
    expect(next.stageStartScore).toBe(5);
    expect(next.combo).toBe(0);
    expect(next.stageCorrectCount).toBe(0);
  });

  it('reduces boss HP after a correct boss answer', () => {
    const boss = generateStageQuestions(1, BOSS_STAGE_NUMBER, {
      seed: 'boss-hit',
    })[0];
    const submitted = submitQuestion(
      {
        ...createInitialGameState(),
        stageNumber: BOSS_STAGE_NUMBER,
      },
      boss,
    );

    expect(submitted.bossHp).toBe(BOSS_MAX_HP - 1);
    expect(submitted.playerHp).toBe(PLAYER_MAX_HP);
  });

  it('reduces player HP after a wrong boss answer', () => {
    const boss = generateStageQuestions(1, BOSS_STAGE_NUMBER, {
      seed: 'boss-damage',
    })[0];
    const submitted = submitQuestion(
      {
        ...createInitialGameState(),
        stageNumber: BOSS_STAGE_NUMBER,
      },
      boss,
      false,
    );

    expect(submitted.playerHp).toBe(PLAYER_MAX_HP - 1);
    expect(submitted.bossHp).toBe(BOSS_MAX_HP);
  });

  it('fails the boss stage when player HP reaches zero', () => {
    const questions = generateStageQuestions(1, BOSS_STAGE_NUMBER, {
      seed: 'boss-fail',
    });
    let state: GameState = {
      ...createInitialGameState(),
      stageNumber: BOSS_STAGE_NUMBER,
    };

    for (let index = 0; index < PLAYER_MAX_HP; index += 1) {
      const submitted = submitQuestion(state, questions[index], false);
      state =
        index === PLAYER_MAX_HP - 1
          ? submitted
          : gameReducer(submitted, { type: 'goNext' });
    }

    expect(state.phase).toBe('bossFailed');
    expect(state.playerHp).toBe(0);
  });

  it('retries a failed boss stage from the first question and restores stage score', () => {
    const questions = generateStageQuestions(1, BOSS_STAGE_NUMBER, {
      seed: 'boss-retry',
    });
    let state: GameState = {
      ...createInitialGameState(),
      stageNumber: BOSS_STAGE_NUMBER,
      score: 10,
      stageStartScore: 10,
    };

    state = gameReducer(submitQuestion(state, questions[0]), { type: 'goNext' });
    state = gameReducer(submitQuestion(state, questions[1]), { type: 'goNext' });

    for (let index = 2; index < 5; index += 1) {
      const submitted = submitQuestion(state, questions[index], false);
      state = index === 4 ? submitted : gameReducer(submitted, { type: 'goNext' });
    }

    const retried = gameReducer(state, { type: 'retryBoss' });

    expect(state.phase).toBe('bossFailed');
    expect(state.score).toBe(12);
    expect(retried.phase).toBe('main');
    expect(retried.questionIndex).toBe(0);
    expect(retried.score).toBe(10);
    expect(retried.combo).toBe(0);
    expect(retried.stageCorrectCount).toBe(0);
    expect(retried.bossHp).toBe(BOSS_MAX_HP);
    expect(retried.playerHp).toBe(PLAYER_MAX_HP);
  });

  it('clears a boss stage with 6 correct answers and records 2 stars', () => {
    const cleared = completeStage(1, BOSS_STAGE_NUMBER, 6);
    const result = cleared.stageResults[getStageKey(1, BOSS_STAGE_NUMBER)];

    expect(cleared.phase).toBe('tierCleared');
    expect(cleared.bossHp).toBe(0);
    expect(result.isBoss).toBe(true);
    expect(result.correctCount).toBe(6);
    expect(result.stars).toBe(2);
  });

  it('records 3 stars for a perfect boss stage', () => {
    const cleared = completeStage(1, BOSS_STAGE_NUMBER, 8);
    const result = cleared.stageResults[getStageKey(1, BOSS_STAGE_NUMBER)];

    expect(cleared.phase).toBe('tierCleared');
    expect(result.stars).toBe(3);
    expect(result.bestCombo).toBe(8);
  });

  it('moves from a cleared tier to the next tier', () => {
    const next = gameReducer(
      {
        ...createInitialGameState(),
        stageNumber: BOSS_STAGE_NUMBER,
        phase: 'tierCleared',
        score: 11,
      },
      { type: 'goNext' },
    );

    expect(next.phase).toBe('main');
    expect(next.tierNumber).toBe(2);
    expect(next.stageNumber).toBe(1);
    expect(next.stageStartScore).toBe(11);
  });

  it('clears the full game after the one-stage bonus level', () => {
    const bonusQuestion = generateStageQuestions(FINAL_TIER, 1, {
      seed: 'final-bonus',
    })[TOTAL_BONUS_QUESTIONS - 1];
    const selected = gameReducer(
      {
        ...createInitialGameState(),
        tierNumber: FINAL_TIER,
        stageNumber: 1,
        questionIndex: TOTAL_BONUS_QUESTIONS - 1,
      },
      {
        type: 'selectAnswer',
        answer: bonusQuestion.answer,
      },
    );
    const submitted = gameReducer(selected, {
      type: 'submitAnswer',
      question: bonusQuestion,
    });
    const cleared = gameReducer(submitted, { type: 'goNext' });

    expect(cleared.phase).toBe('gameCleared');
  });

  it('jumps to the final boss stage through the debug action', () => {
    const jumped = gameReducer(createInitialGameState(), {
      type: 'debugJumpToFinalBoss',
    });

    expect(jumped.tierNumber).toBe(FINAL_MAIN_TIER);
    expect(jumped.stageNumber).toBe(BOSS_STAGE_NUMBER);
    expect(jumped.questionIndex).toBe(0);
    expect(jumped.phase).toBe('main');
  });

  it('opens the bonus tier through the debug action', () => {
    const opened = gameReducer(createInitialGameState(), {
      type: 'debugOpenBonus',
    });
    const bonusQuestions = generateBonusQuestions({ seed: 'bonus-flow' });

    expect(opened.tierNumber).toBe(BONUS_TIER_NUMBER);
    expect(opened.stageNumber).toBe(1);
    expect(opened.phase).toBe('main');
    expect(bonusQuestions).toHaveLength(TOTAL_BONUS_QUESTIONS);
  });
});
