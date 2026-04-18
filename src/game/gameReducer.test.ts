import { createInitialGameState, gameReducer } from './gameReducer';
import { generateBonusQuestions, generateStageQuestions } from './questionGenerator';
import {
  BONUS_TIER_NUMBER,
  BOSS_STAGE_NUMBER,
  FINAL_TIER,
  QUESTIONS_PER_STAGE,
} from './stageConfig';

describe('game reducer', () => {
  it('increases score after a correct answer', () => {
    const question = generateStageQuestions(1, 1, { seed: 'score' })[0];
    const selected = gameReducer(createInitialGameState(), {
      type: 'selectAnswer',
      answer: question.answer,
    });
    const submitted = gameReducer(selected, {
      type: 'submitAnswer',
      question,
    });

    expect(submitted.score).toBe(1);
    expect(submitted.lastAnswerCorrect).toBe(true);
  });

  it('keeps score after a wrong answer', () => {
    const question = generateStageQuestions(1, 1, { seed: 'wrong' })[0];
    const selected = gameReducer(createInitialGameState(), {
      type: 'selectAnswer',
      answer: '__wrong__',
    });
    const submitted = gameReducer(selected, {
      type: 'submitAnswer',
      question,
    });

    expect(submitted.score).toBe(0);
    expect(submitted.lastAnswerCorrect).toBe(false);
  });

  it('does not move before answer submission', () => {
    const next = gameReducer(createInitialGameState(), { type: 'goNext' });

    expect(next.questionIndex).toBe(0);
    expect(next.phase).toBe('main');
  });

  it('clears a regular stage after its last question', () => {
    const question = generateStageQuestions(1, 1, { seed: 'clear' })[
      QUESTIONS_PER_STAGE - 1
    ];
    const selected = gameReducer(
      {
        ...createInitialGameState(),
        questionIndex: QUESTIONS_PER_STAGE - 1,
      },
      {
        type: 'selectAnswer',
        answer: question.answer,
      },
    );
    const submitted = gameReducer(selected, {
      type: 'submitAnswer',
      question,
    });
    const cleared = gameReducer(submitted, { type: 'goNext' });

    expect(cleared.phase).toBe('stageCleared');
  });

  it('moves from a cleared stage to the next stage', () => {
    const next = gameReducer(
      {
        ...createInitialGameState(),
        phase: 'stageCleared',
      },
      { type: 'goNext' },
    );

    expect(next.phase).toBe('main');
    expect(next.stageNumber).toBe(2);
    expect(next.questionIndex).toBe(0);
  });

  it('clears a tier after its boss stage', () => {
    const boss = generateStageQuestions(1, BOSS_STAGE_NUMBER, {
      seed: 'tier-boss',
    })[QUESTIONS_PER_STAGE - 1];
    const selected = gameReducer(
      {
        ...createInitialGameState(),
        stageNumber: BOSS_STAGE_NUMBER,
        questionIndex: QUESTIONS_PER_STAGE - 1,
      },
      {
        type: 'selectAnswer',
        answer: boss.answer,
      },
    );
    const submitted = gameReducer(selected, {
      type: 'submitAnswer',
      question: boss,
    });
    const cleared = gameReducer(submitted, { type: 'goNext' });

    expect(cleared.phase).toBe('tierCleared');
  });

  it('moves from a cleared tier to the next tier', () => {
    const next = gameReducer(
      {
        ...createInitialGameState(),
        stageNumber: BOSS_STAGE_NUMBER,
        phase: 'tierCleared',
      },
      { type: 'goNext' },
    );

    expect(next.phase).toBe('main');
    expect(next.tierNumber).toBe(2);
    expect(next.stageNumber).toBe(1);
  });

  it('clears the full game after the bonus boss stage', () => {
    const boss = generateStageQuestions(FINAL_TIER, BOSS_STAGE_NUMBER, {
      seed: 'final-boss',
    })[QUESTIONS_PER_STAGE - 1];
    const selected = gameReducer(
      {
        ...createInitialGameState(),
        tierNumber: FINAL_TIER,
        stageNumber: BOSS_STAGE_NUMBER,
        questionIndex: QUESTIONS_PER_STAGE - 1,
      },
      {
        type: 'selectAnswer',
        answer: boss.answer,
      },
    );
    const submitted = gameReducer(selected, {
      type: 'submitAnswer',
      question: boss,
    });
    const cleared = gameReducer(submitted, { type: 'goNext' });

    expect(cleared.phase).toBe('gameCleared');
  });

  it('jumps to the final boss stage through the debug action', () => {
    const jumped = gameReducer(createInitialGameState(), {
      type: 'debugJumpToFinalBoss',
    });

    expect(jumped.tierNumber).toBe(FINAL_TIER);
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
    expect(bonusQuestions).toHaveLength(80);
  });
});
