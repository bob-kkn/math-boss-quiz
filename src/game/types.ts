export type AnswerMode = 'multipleChoice' | 'numericInput' | 'trueFalse';

export type AnswerValue = number | string | boolean;

export type PlayerAnswer = AnswerValue | null;

export type GamePhase =
  | 'main'
  | 'stageCleared'
  | 'tierCleared'
  | 'bossFailed'
  | 'gameCleared';

export type ProgressStatus = 'completed' | 'active' | 'locked';

export type DifficultyBand =
  | 'intro'
  | 'practice'
  | 'application'
  | 'boss'
  | 'bonus';

export type SkillTag =
  | 'counting'
  | 'calculation'
  | 'comparison'
  | 'pattern'
  | 'geometry'
  | 'wordProblem'
  | 'algebra'
  | 'function'
  | 'probability'
  | 'calculus'
  | 'logic'
  | 'advanced';

export interface TierConfig {
  tierNumber: number;
  label: string;
  topic: string;
  status: ProgressStatus;
  isBonusTier: boolean;
}

export interface StageConfig {
  tierNumber: number;
  stageNumber: number;
  globalStageNumber: number;
  label: string;
  topic: string;
  questionCount: number;
  isBossStage: boolean;
  status: ProgressStatus;
}

export interface Question {
  id: string;
  tierNumber: number;
  stageNumber: number;
  globalStageNumber: number;
  order: number;
  question: string;
  answerMode: AnswerMode;
  answer: AnswerValue;
  choices?: AnswerValue[];
  explanation: string;
  topic: string;
  concept: string;
  skill: SkillTag;
  difficultyBand: DifficultyBand;
  level: string;
  isBoss: boolean;
  numericTolerance?: number;
}

export interface StageResult {
  correctCount: number;
  questionCount: number;
  stars: number;
  bestCombo: number;
  isBoss: boolean;
  clearedAt: string;
}

export interface GameState {
  tierNumber: number;
  stageNumber: number;
  questionIndex: number;
  selectedAnswer: PlayerAnswer;
  hasSubmitted: boolean;
  lastAnswerCorrect: boolean | null;
  phase: GamePhase;
  score: number;
  combo: number;
  bestCombo: number;
  stageCorrectCount: number;
  stageStartScore: number;
  bossHp: number;
  playerHp: number;
  stageResults: Record<string, StageResult>;
}
