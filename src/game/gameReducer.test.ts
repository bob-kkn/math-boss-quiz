import {
  createInitialGameState,
  gameReducer,
} from './gameReducer';
import {
  generateBonusQuestions,
  generateStageQuestions,
} from './questionGenerator';

describe('game reducer', () => {
  it('increases score after a correct answer', () => {
    const question = generateStageQuestions(1, { seed: 'score' })[0];
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
    const question = generateStageQuestions(1, { seed: 'wrong' })[0];
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
    const question = generateStageQuestions(1, { seed: 'clear' })[7];
    const selected = gameReducer(
      {
        ...createInitialGameState(),
        questionIndex: 7,
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

  it('unlocks bonus after the stage 13 boss is cleared', () => {
    const boss = generateStageQuestions(13, { seed: 'boss' })[7];
    const selected = gameReducer(
      {
        ...createInitialGameState(),
        stageNumber: 13,
        questionIndex: 7,
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
    expect(cleared.unlockedBonus).toBe(true);
  });

  it('fails the final boss when the boss answer is wrong', () => {
    const boss = generateStageQuestions(13, { seed: 'boss-fail' })[7];
    const selected = gameReducer(
      {
        ...createInitialGameState(),
        stageNumber: 13,
        questionIndex: 7,
      },
      {
        type: 'selectAnswer',
        answer: '__wrong__',
      },
    );
    const submitted = gameReducer(selected, {
      type: 'submitAnswer',
      question: boss,
    });
    const failed = gameReducer(submitted, { type: 'goNext' });

    expect(failed.phase).toBe('bossFailed');
    expect(failed.unlockedBonus).toBe(false);
  });

  it('jumps to final boss through the debug action', () => {
    const jumped = gameReducer(createInitialGameState(), {
      type: 'debugJumpToFinalBoss',
    });

    expect(jumped.stageNumber).toBe(13);
    expect(jumped.questionIndex).toBe(7);
    expect(jumped.phase).toBe('main');
  });

  it('opens bonus through the debug action and clears it after five submitted answers', () => {
    const bonusQuestions = generateBonusQuestions({ seed: 'bonus-flow' });
    const opened = gameReducer(createInitialGameState(), {
      type: 'debugOpenBonus',
    });

    const cleared = bonusQuestions.reduce((state, question) => {
      const selected = gameReducer(state, {
        type: 'selectAnswer',
        answer: question.answer,
      });
      const submitted = gameReducer(selected, {
        type: 'submitAnswer',
        question,
      });

      return gameReducer(submitted, { type: 'goNext' });
    }, opened);

    expect(opened.phase).toBe('bonus');
    expect(cleared.phase).toBe('bonusCleared');
    expect(cleared.bonusScore).toBe(5);
  });
});
