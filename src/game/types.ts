export type AnswerMode = 'multipleChoice' | 'numericInput' | 'trueFalse';

export type AnswerValue = number | string | boolean;

export type PlayerAnswer = AnswerValue | null;

export type GamePhase =
  | 'main'
  | 'stageCleared'
  | 'gameCleared'
  | 'bossFailed'
  | 'bonus'
  | 'bonusCleared';

export type StageStatus = 'completed' | 'active' | 'locked';

export interface StageConfig {
  stageNumber: number;
  label: string;
  gradeLabel: string;
  topic: string;
  questionCount: number;
  isFinalStage: boolean;
  hasFinalBoss: boolean;
  status: StageStatus;
}

export interface Question {
  id: string;
  stageNumber: number | 'bonus';
  order: number;
  question: string;
  answerMode: AnswerMode;
  answer: AnswerValue;
  choices?: AnswerValue[];
  explanation: string;
  topic: string;
  level: string;
  isBoss: boolean;
  numericTolerance?: number;
}

export interface GameState {
  stageNumber: number;
  questionIndex: number;
  selectedAnswer: PlayerAnswer;
  hasSubmitted: boolean;
  lastAnswerCorrect: boolean | null;
  phase: GamePhase;
  score: number;
  bonusScore: number;
  unlockedBonus: boolean;
}
