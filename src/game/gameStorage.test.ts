import {
  clearSavedGameState,
  gameStorageKey,
  gameStorageVersion,
  loadSavedGameState,
  saveGameState,
} from './gameStorage';
import { createInitialGameState } from './gameReducer';

describe('game storage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('saves and loads a valid game state', () => {
    const state = {
      ...createInitialGameState(),
      stageNumber: 5,
      questionIndex: 2,
      score: 17,
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
          stageNumber: 99,
        },
      }),
    );

    expect(loadSavedGameState()).toBeNull();
    expect(window.localStorage.getItem(gameStorageKey)).toBeNull();
  });
});
