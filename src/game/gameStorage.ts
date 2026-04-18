import {
  FINAL_TIER,
  getQuestionCountForStage,
  getStageCountForTier,
} from './stageConfig';
import type { GamePhase, GameState, PlayerAnswer } from './types';

const STORAGE_KEY = 'math-boss-quiz:game-state';
const STORAGE_VERSION = 3;

interface SavedGamePayload {
  version: number;
  state: GameState;
}

const gamePhases: GamePhase[] = [
  'main',
  'stageCleared',
  'tierCleared',
  'gameCleared',
];

function isBrowserStorageAvailable(): boolean {
  return typeof window !== 'undefined' && window.localStorage !== undefined;
}

function isValidPlayerAnswer(value: unknown): value is PlayerAnswer {
  return (
    value === null ||
    typeof value === 'number' ||
    typeof value === 'string' ||
    typeof value === 'boolean'
  );
}

function isValidGameState(value: unknown): value is GameState {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  if (
    typeof candidate.tierNumber !== 'number' ||
    candidate.tierNumber < 1 ||
    candidate.tierNumber > FINAL_TIER ||
    typeof candidate.stageNumber !== 'number'
  ) {
    return false;
  }

  let stageCount: number;
  let questionCount: number;

  try {
    stageCount = getStageCountForTier(candidate.tierNumber);
    questionCount = getQuestionCountForStage(
      candidate.tierNumber,
      candidate.stageNumber,
    );
  } catch {
    return false;
  }

  return (
    typeof candidate.tierNumber === 'number' &&
    typeof candidate.stageNumber === 'number' &&
    candidate.stageNumber >= 1 &&
    candidate.stageNumber <= stageCount &&
    typeof candidate.questionIndex === 'number' &&
    candidate.questionIndex >= 0 &&
    candidate.questionIndex < questionCount &&
    isValidPlayerAnswer(candidate.selectedAnswer) &&
    typeof candidate.hasSubmitted === 'boolean' &&
    (typeof candidate.lastAnswerCorrect === 'boolean' ||
      candidate.lastAnswerCorrect === null) &&
    gamePhases.includes(candidate.phase as GamePhase) &&
    typeof candidate.score === 'number' &&
    candidate.score >= 0
  );
}

function isSavedGamePayload(value: unknown): value is SavedGamePayload {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    candidate.version === STORAGE_VERSION &&
    isValidGameState(candidate.state)
  );
}

export function loadSavedGameState(): GameState | null {
  if (!isBrowserStorageAvailable()) {
    return null;
  }

  try {
    const rawState = window.localStorage.getItem(STORAGE_KEY);

    if (!rawState) {
      return null;
    }

    const parsedState = JSON.parse(rawState) as unknown;

    if (!isSavedGamePayload(parsedState)) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return parsedState.state;
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function saveGameState(state: GameState): void {
  if (!isBrowserStorageAvailable()) {
    return;
  }

  const payload: SavedGamePayload = {
    version: STORAGE_VERSION,
    state,
  };

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function clearSavedGameState(): void {
  if (!isBrowserStorageAvailable()) {
    return;
  }

  window.localStorage.removeItem(STORAGE_KEY);
}

export const gameStorageKey = STORAGE_KEY;
export const gameStorageVersion = STORAGE_VERSION;
