import {
  FINAL_TIER,
  getQuestionCountForStage,
  getStageCountForTier,
} from './stageConfig';
import { BOSS_MAX_HP, PLAYER_MAX_HP } from './gameReducer';
import type { GamePhase, GameState, PlayerAnswer, StageResult } from './types';

const STORAGE_KEY = 'math-boss-quiz:game-state';
const STORAGE_VERSION = 4;

interface SavedGamePayload {
  version: number;
  state: GameState;
}

const gamePhases: GamePhase[] = [
  'main',
  'stageCleared',
  'tierCleared',
  'bossFailed',
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

function isValidStageResult(value: unknown): value is StageResult {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.correctCount === 'number' &&
    candidate.correctCount >= 0 &&
    typeof candidate.questionCount === 'number' &&
    candidate.questionCount > 0 &&
    candidate.correctCount <= candidate.questionCount &&
    typeof candidate.stars === 'number' &&
    candidate.stars >= 1 &&
    candidate.stars <= 3 &&
    typeof candidate.bestCombo === 'number' &&
    candidate.bestCombo >= 0 &&
    typeof candidate.isBoss === 'boolean' &&
    typeof candidate.clearedAt === 'string' &&
    candidate.clearedAt.trim() !== ''
  );
}

function isValidStageResults(
  value: unknown,
): value is Record<string, StageResult> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  return Object.entries(value).every(
    ([key, result]) => key.trim() !== '' && isValidStageResult(result),
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
    candidate.score >= 0 &&
    typeof candidate.combo === 'number' &&
    candidate.combo >= 0 &&
    typeof candidate.bestCombo === 'number' &&
    candidate.bestCombo >= 0 &&
    typeof candidate.stageCorrectCount === 'number' &&
    candidate.stageCorrectCount >= 0 &&
    candidate.stageCorrectCount <= questionCount &&
    typeof candidate.stageStartScore === 'number' &&
    candidate.stageStartScore >= 0 &&
    typeof candidate.bossHp === 'number' &&
    candidate.bossHp >= 0 &&
    candidate.bossHp <= BOSS_MAX_HP &&
    typeof candidate.playerHp === 'number' &&
    candidate.playerHp >= 0 &&
    candidate.playerHp <= PLAYER_MAX_HP &&
    isValidStageResults(candidate.stageResults)
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
