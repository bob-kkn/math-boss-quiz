import { useEffect, useMemo, useReducer } from 'react';
import {
  BONUS_QUESTION_COUNT,
  QUESTIONS_PER_STAGE,
  TOTAL_MAIN_QUESTIONS,
  createStageMap,
} from './game/stageConfig';
import {
  generateAllStageQuestions,
  generateBonusQuestions,
} from './game/questionGenerator';
import {
  createInitialGameState,
  gameReducer,
  isAnswerCorrect,
} from './game/gameReducer';
import {
  clearSavedGameState,
  loadSavedGameState,
  saveGameState,
} from './game/gameStorage';
import type { AnswerValue, GameState, PlayerAnswer, Question } from './game/types';

interface AnswerControlProps {
  question: Question;
  selectedAnswer: PlayerAnswer;
  hasSubmitted: boolean;
  onSelect: (answer: PlayerAnswer) => void;
}

function formatAnswer(value: AnswerValue): string {
  if (typeof value === 'boolean') {
    return value ? '맞다' : '아니다';
  }

  return String(value);
}

function answerClassName(
  question: Question,
  option: AnswerValue,
  selectedAnswer: PlayerAnswer,
  hasSubmitted: boolean,
): string {
  if (!hasSubmitted) {
    return option === selectedAnswer ? 'choice selected' : 'choice';
  }

  if (option === question.answer) {
    return 'choice correct';
  }

  if (option === selectedAnswer) {
    return 'choice incorrect';
  }

  return 'choice muted';
}

export function AnswerControl({
  question,
  selectedAnswer,
  hasSubmitted,
  onSelect,
}: AnswerControlProps) {
  if (question.answerMode === 'numericInput') {
    return (
      <label className="numeric-answer">
        <span>숫자 답안</span>
        <input
          aria-label="숫자 답안"
          disabled={hasSubmitted}
          inputMode="numeric"
          onChange={(event) =>
            onSelect(event.target.value === '' ? null : event.target.value)
          }
          placeholder="정답 입력"
          type="number"
          value={selectedAnswer === null ? '' : String(selectedAnswer)}
        />
      </label>
    );
  }

  const options =
    question.answerMode === 'trueFalse'
      ? [true, false]
      : question.choices ?? [];

  return (
    <div className="choices" role="group" aria-label="정답 선택">
      {options.map((option) => (
        <button
          aria-pressed={option === selectedAnswer}
          className={answerClassName(
            question,
            option,
            selectedAnswer,
            hasSubmitted,
          )}
          disabled={hasSubmitted}
          key={String(option)}
          onClick={() => onSelect(option)}
          type="button"
        >
          {formatAnswer(option)}
        </button>
      ))}
    </div>
  );
}

function getProgressPercent(state: GameState, questionCount: number): number {
  const completedPhases = [
    'stageCleared',
    'gameCleared',
    'bossFailed',
    'bonusCleared',
  ];

  if (completedPhases.includes(state.phase)) {
    return 100;
  }

  return Math.round(
    ((state.questionIndex + (state.hasSubmitted ? 1 : 0)) / questionCount) *
      100,
  );
}

function getNextButtonLabel(
  state: GameState,
  question: Question,
  questionCount: number,
): string {
  const isLastQuestion = state.questionIndex === questionCount - 1;

  if (question.isBoss) {
    return '보스전 결과';
  }

  if (state.phase === 'bonus' && isLastQuestion) {
    return '보너스 완료';
  }

  return isLastQuestion ? '스테이지 완료' : '다음 문제';
}

export default function App() {
  const mainQuestionsByStage = useMemo(
    () => generateAllStageQuestions({ seed: 'math-boss-main' }),
    [],
  );
  const bonusQuestions = useMemo(
    () => generateBonusQuestions({ seed: 'math-boss-bonus' }),
    [],
  );
  const [state, dispatch] = useReducer(
    gameReducer,
    undefined,
    () => loadSavedGameState() ?? createInitialGameState(),
  );
  const isBonusPhase =
    state.phase === 'bonus' || state.phase === 'bonusCleared';
  const activeQuestions = isBonusPhase
    ? bonusQuestions
    : mainQuestionsByStage[state.stageNumber];
  const currentQuestion = activeQuestions[state.questionIndex];
  const stageMap = createStageMap(state.stageNumber, state.phase);
  const selectedStage = stageMap[state.stageNumber - 1] ?? stageMap[0];
  const progressPercent = getProgressPercent(state, activeQuestions.length);
  const displayScore = isBonusPhase ? state.bonusScore : state.score;
  const isCorrect =
    currentQuestion && state.hasSubmitted
      ? isAnswerCorrect(currentQuestion, state.selectedAnswer)
      : false;

  function submitAnswer() {
    if (!currentQuestion) {
      return;
    }

    dispatch({ type: 'submitAnswer', question: currentQuestion });
  }

  function resetSavedGame() {
    clearSavedGameState();
    dispatch({ type: 'restart' });
  }

  useEffect(() => {
    saveGameState(state);
  }, [state]);

  const showDevTools = import.meta.env.DEV;

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="게임 진행 정보">
        <div>
          <p className="eyebrow">수학 보스전</p>
          <h1>{isBonusPhase ? 'Bonus' : `Stage ${state.stageNumber}`}</h1>
          <p className="sidebar-copy">
            유치원부터 고3까지 핵심개념형 보스전을 돌파하라.
          </p>
        </div>

        <div className="stat-grid" aria-label="현재 점수와 진행도">
          <div className="stat-box">
            <span>{isBonusPhase ? '보너스 점수' : '점수'}</span>
            <strong>{displayScore}</strong>
          </div>
          <div className="stat-box">
            <span>진행</span>
            <strong>
              {Math.min(state.questionIndex + 1, activeQuestions.length)}/
              {activeQuestions.length}
            </strong>
          </div>
        </div>

        <div className="progress-block">
          <div className="progress-label">
            <span>{isBonusPhase ? '보너스 레벨' : selectedStage.topic}</span>
            <strong>{progressPercent}%</strong>
          </div>
          <div className="progress-track" aria-hidden="true">
            <div
              className="progress-fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <ol className="stage-list" aria-label="전체 스테이지">
          {stageMap.map((stage) => (
            <li
              className={`stage-item ${stage.status}`}
              key={stage.stageNumber}
            >
              <span>{stage.label}</span>
              <small>
                {stage.gradeLabel} · {stage.hasFinalBoss ? '최종 보스' : stage.topic}
              </small>
            </li>
          ))}
        </ol>

        <div className="future-note">
          <strong>확정 구조</strong>
          <span>
            본편 {TOTAL_MAIN_QUESTIONS}문항, 보너스 {BONUS_QUESTION_COUNT}문항
          </span>
        </div>

        <div className="save-tools" aria-label="저장 상태">
          <strong>자동 저장</strong>
          <span>새로고침 후에도 현재 진행이 이어집니다.</span>
          <button type="button" onClick={resetSavedGame}>
            저장 초기화
          </button>
        </div>

        {showDevTools ? (
          <div className="dev-tools" aria-label="개발 QA 도구">
            <strong>개발 QA</strong>
            <button
              type="button"
              onClick={() => dispatch({ type: 'debugJumpToFinalBoss' })}
            >
              최종 보스 바로가기
            </button>
            <button
              type="button"
              onClick={() => dispatch({ type: 'debugOpenBonus' })}
            >
              보너스 바로가기
            </button>
            <button type="button" onClick={resetSavedGame}>
              QA 초기화
            </button>
          </div>
        ) : null}
      </aside>

      <section className="play-area" aria-label="퀴즈 플레이">
        <div className="boss-strip">
          <img src="/assets/boss.svg" alt="최종 보스" />
          <div>
            <p className="eyebrow">
              {isBonusPhase ? '보너스 레벨' : selectedStage.gradeLabel}
            </p>
            <h2>
              {isBonusPhase ? '클리어 이후의 추가 시험' : selectedStage.topic}
            </h2>
          </div>
        </div>

        {state.phase === 'stageCleared' ? (
          <div className="result-panel">
            <p className="eyebrow">Stage Clear</p>
            <h2>{selectedStage.label} 클리어</h2>
            <p>
              {QUESTIONS_PER_STAGE}문항을 완료했습니다. 다음 단계로 넘어가면
              난이도와 답안 방식이 함께 확장됩니다.
            </p>
            <button
              className="primary-action"
              type="button"
              onClick={() => dispatch({ type: 'goNext' })}
            >
              다음 스테이지
            </button>
          </div>
        ) : null}

        {state.phase === 'gameCleared' ? (
          <div className="result-panel">
            <p className="eyebrow">Final Boss Clear</p>
            <h2>최종 보스 격파</h2>
            <p>
              본편 {TOTAL_MAIN_QUESTIONS}문항 여정을 완료했습니다. 보너스
              5문제가 해금되었습니다.
            </p>
            <button
              className="primary-action"
              type="button"
              onClick={() => dispatch({ type: 'enterBonus' })}
            >
              보너스 레벨 진입
            </button>
          </div>
        ) : null}

        {state.phase === 'bossFailed' ? (
          <div className="result-panel danger">
            <p className="eyebrow">Boss Failed</p>
            <h2>최종 보스 방어 실패</h2>
            <p>
              마지막 문제는 보너스 레벨의 관문입니다. 다시 도전해 정답을
              맞히면 보너스 레벨이 열립니다.
            </p>
            <button
              className="primary-action"
              type="button"
              onClick={resetSavedGame}
            >
              처음부터 다시
            </button>
          </div>
        ) : null}

        {state.phase === 'bonusCleared' ? (
          <div className="result-panel">
            <p className="eyebrow">Bonus Clear</p>
            <h2>보너스 레벨 완료</h2>
            <p>
              보너스 {BONUS_QUESTION_COUNT}문항 중 {state.bonusScore}문항을
              맞혔습니다. 칭호: 핵심개념 보스 슬레이어
            </p>
            <button
              className="primary-action"
              type="button"
              onClick={resetSavedGame}
            >
              새 게임
            </button>
          </div>
        ) : null}

        {(state.phase === 'main' || state.phase === 'bonus') &&
        currentQuestion ? (
          <article className={`question-panel ${currentQuestion.isBoss ? 'boss-panel' : ''}`}>
            <header className="question-header">
              <div>
                <p className="eyebrow">{currentQuestion.topic}</p>
                <h2>{currentQuestion.question}</h2>
                <span className="answer-mode">
                  {currentQuestion.answerMode === 'multipleChoice'
                    ? '4지선다'
                    : currentQuestion.answerMode === 'numericInput'
                      ? '직접입력'
                      : '참거짓'}
                </span>
                {currentQuestion.isBoss ? (
                  <span className="boss-badge">최종 보스</span>
                ) : null}
              </div>
              <span className="question-count">
                {state.questionIndex + 1}/{activeQuestions.length}
              </span>
            </header>

            <AnswerControl
              question={currentQuestion}
              selectedAnswer={state.selectedAnswer}
              hasSubmitted={state.hasSubmitted}
              onSelect={(answer) =>
                dispatch({ type: 'selectAnswer', answer })
              }
            />

            <div className="feedback" aria-live="polite">
              {state.hasSubmitted ? (
                <>
                  <strong>{isCorrect ? '정답' : '오답'}</strong>
                  <span>{currentQuestion.explanation}</span>
                </>
              ) : (
                <span>답을 고른 뒤 제출하세요.</span>
              )}
            </div>

            <div className="actions">
              <button
                className="secondary-action"
                disabled={state.selectedAnswer === null || state.hasSubmitted}
                onClick={submitAnswer}
                type="button"
              >
                제출
              </button>
              <button
                className="primary-action"
                disabled={!state.hasSubmitted}
                onClick={() => dispatch({ type: 'goNext' })}
                type="button"
              >
                {getNextButtonLabel(
                  state,
                  currentQuestion,
                  activeQuestions.length,
                )}
              </button>
            </div>
          </article>
        ) : null}
      </section>
    </main>
  );
}
