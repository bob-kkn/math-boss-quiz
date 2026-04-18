import {
  clearSavedGameState,
  gameStorageKey,
  gameStorageVersion,
  loadSavedGameState,
  saveGameState,
} from './gameStorage';
import { createInitialGameState } from './gameReducer';
import { BONUS_TIER_NUMBER, TOTAL_BONUS_QUESTIONS } from './stageConfig';

describe('game storage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('saves and loads a valid game state', () => {
    const state = {
      ...createInitialGameState(),
      tierNumber: 5,
      stageNumber: 4,
      questionIndex: 2,
      score: 17,
    };

    saveGameState(state);

    expect(loadSavedGameState()).toEqual(state);
  });

  it('uses storage schema version 4 for game reward state', () => {
    expect(gameStorageVersion).toBe(4);
  });

  it('saves and loads stage reward results', () => {
    const state = {
      ...createInitialGameState(),
      stageResults: {
        '1-1': {
          correctCount: 8,
          questionCount: 8,
          stars: 3,
          bestCombo: 8,
          isBoss: false,
          clearedAt: '2026-04-18T00:00:00.000Z',
        },
      },
    };

    saveGameState(state);

    expect(loadSavedGameState()).toEqual(state);
  });

  it('saves and loads the final bonus question', () => {
    const state = {
      ...createInitialGameState(),
      tierNumber: BONUS_TIER_NUMBER,
      stageNumber: 1,
      questionIndex: TOTAL_BONUS_QUESTIONS - 1,
    };

    saveGameState(state);

    expect(loadSavedGameState()).toEqual(state);
  });

  it('clears the saved game state', () => {
    saveGameState(createInitialGameState());
    clearSavedGameState();

    expect(window.localStorage.getItem(gameStorageKey)).toBeNull();
    expect(loadSavedGameState()).toBeNull();
  });

  it('drops stale saved data with an incompatible version', () => {
    window.localStorage.setItem(
      gameStorageKey,
      JSON.stringify({
        version: gameStorageVersion + 1,
        state: createInitialGameState(),
      }),
    );

    expect(loadSavedGameState()).toBeNull();
    expect(window.localStorage.getItem(gameStorageKey)).toBeNull();
  });

  it('drops invalid saved state data', () => {
    window.localStorage.setItem(
      gameStorageKey,
      JSON.stringify({
        version: gameStorageVersion,
        state: {
          ...createInitialGameState(),
          tierNumber: 99,
        },
      }),
    );

    expect(loadSavedGameState()).toBeNull();
    expect(window.localStorage.getItem(gameStorageKey)).toBeNull();
  });

  it('drops invalid stage reward data', () => {
    window.localStorage.setItem(
      gameStorageKey,
      JSON.stringify({
        version: gameStorageVersion,
        state: {
          ...createInitialGameState(),
          stageResults: {
            '1-1': {
              correctCount: 9,
              questionCount: 8,
              stars: 4,
              bestCombo: 8,
              isBoss: false,
              clearedAt: '2026-04-18T00:00:00.000Z',
            },
          },
        },
      }),
    );

    expect(loadSavedGameState()).toBeNull();
    expect(window.localStorage.getItem(gameStorageKey)).toBeNull();
  });

  it('drops saved data that tries to put bonus beyond one stage', () => {
    window.localStorage.setItem(
      gameStorageKey,
      JSON.stringify({
        version: gameStorageVersion,
        state: {
          ...createInitialGameState(),
          tierNumber: BONUS_TIER_NUMBER,
          stageNumber: 2,
        },
      }),
    );

    expect(loadSavedGameState()).toBeNull();
    expect(window.localStorage.getItem(gameStorageKey)).toBeNull();
  });
});
