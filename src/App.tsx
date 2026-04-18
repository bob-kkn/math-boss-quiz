import { useEffect, useMemo, useReducer } from 'react';
import {
  QUESTIONS_PER_STAGE,
  STAGES_PER_TIER,
  TIER_COUNT,
  TOTAL_MAIN_QUESTIONS,
  createStageMap,
  createTierMap,
} from './game/stageConfig';
import { generateStageQuestions } from './game/questionGenerator';
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
          inputMode="decimal"
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
  if (['stageCleared', 'tierCleared', 'gameCleared'].includes(state.phase)) {
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

  if (question.isBoss && isLastQuestion) {
    return '보스전 완료';
  }

  return isLastQuestion ? '스테이지 완료' : '다음 문제';
}

export default function App() {
  const [state, dispatch] = useReducer(
    gameReducer,
    undefined,
    () => loadSavedGameState() ?? createInitialGameState(),
  );
  const activeQuestions = useMemo(
    () =>
      generateStageQuestions(state.tierNumber, state.stageNumber, {
        seed: `math-boss-${state.tierNumber}-${state.stageNumber}`,
      }),
    [state.tierNumber, state.stageNumber],
  );
  const currentQuestion = activeQuestions[state.questionIndex];
  const tierMap = createTierMap(state.tierNumber, state.phase);
  const stageMap = createStageMap(
    state.tierNumber,
    state.stageNumber,
    state.phase,
  );
  const selectedTier = tierMap[state.tierNumber - 1] ?? tierMap[0];
  const selectedStage = stageMap[state.stageNumber - 1] ?? stageMap[0];
  const progressPercent = getProgressPercent(state, activeQuestions.length);
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
          <h1>{selectedTier.label}</h1>
          <p className="sidebar-copy">
            {state.stageNumber}스테이지 ·{' '}
            {selectedStage.isBossStage ? '보스전' : selectedTier.topic}
          </p>
        </div>

        <div className="stat-grid" aria-label="현재 점수와 진행도">
          <div className="stat-box">
            <span>점수</span>
            <strong>{state.score}</strong>
          </div>
          <div className="stat-box">
            <span>문항</span>
            <strong>
              {Math.min(state.questionIndex + 1, activeQuestions.length)}/
              {activeQuestions.length}
            </strong>
          </div>
        </div>

        <div className="progress-block">
          <div className="progress-label">
            <span>
              {selectedTier.label} {state.stageNumber}/{STAGES_PER_TIER}
            </span>
            <strong>{progressPercent}%</strong>
          </div>
          <div className="progress-track" aria-hidden="true">
            <div
              className="progress-fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <section className="stage-panel" aria-labelledby="tier-panel-title">
          <div className="stage-panel-header">
            <strong id="tier-panel-title">단계 진행</strong>
            <span>{TIER_COUNT}단계</span>
          </div>
          <ol className="tier-list" aria-label="전체 단계">
            {tierMap.map((tier) => (
              <li className={`tier-item ${tier.status}`} key={tier.tierNumber}>
                <span>{tier.label}</span>
                <small>{tier.isBonusTier ? '거의 난제' : tier.topic}</small>
              </li>
            ))}
          </ol>
        </section>

        <section className="stage-panel" aria-labelledby="stage-panel-title">
          <div className="stage-panel-header">
            <strong id="stage-panel-title">스테이지 진행</strong>
            <span>10스테이지</span>
          </div>
          <ol className="stage-list" aria-label="현재 단계 스테이지">
            {stageMap.map((stage) => (
              <li
                className={`stage-item ${stage.status}`}
                key={stage.stageNumber}
              >
                <span>{stage.label}</span>
                <small>{stage.isBossStage ? '보스전' : '8문항'}</small>
              </li>
            ))}
          </ol>
        </section>

        <div className="future-note">
          <strong>확정 구조</strong>
          <span>
            {TIER_COUNT}단계 · {STAGES_PER_TIER}스테이지씩 · 본편{' '}
            {TOTAL_MAIN_QUESTIONS}문항
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
              {selectedStage.isBossStage ? '보스전' : selectedTier.label}
            </p>
            <h2>
              {selectedTier.label} {state.stageNumber}스테이지
            </h2>
          </div>
        </div>

        {state.phase === 'stageCleared' ? (
          <div className="result-panel">
            <p className="eyebrow">Stage Clear</p>
            <h2>{state.stageNumber}스테이지 클리어</h2>
            <p>
              {QUESTIONS_PER_STAGE}문항을 완료했습니다. 다음 스테이지로
              이동합니다.
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

        {state.phase === 'tierCleared' ? (
          <div className="result-panel">
            <p className="eyebrow">Tier Clear</p>
            <h2>{selectedTier.label} 단계 클리어</h2>
            <p>
              10스테이지를 모두 완료했습니다. 다음 단계는 더 높은 난이도로
              이어집니다.
            </p>
            <button
              className="primary-action"
              type="button"
              onClick={() => dispatch({ type: 'goNext' })}
            >
              다음 단계
            </button>
          </div>
        ) : null}

        {state.phase === 'gameCleared' ? (
          <div className="result-panel">
            <p className="eyebrow">All Clear</p>
            <h2>전체 클리어</h2>
            <p>
              {TIER_COUNT}단계, {TOTAL_MAIN_QUESTIONS}문항 여정을 모두
              완료했습니다. 칭호: 수학 보스전 정복자
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

        {state.phase === 'main' && currentQuestion ? (
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
                  <span className="boss-badge">보스전</span>
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
