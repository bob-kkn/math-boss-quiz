import {
  createInitialGameState,
  gameReducer,
} from './gameReducer';
import { generateStageQuestions } from './questionGenerator';

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
});
