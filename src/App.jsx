import { useMemo, useState } from 'react';
import {
  BONUS_QUESTION_COUNT,
  QUESTIONS_PER_STAGE,
  TOTAL_MAIN_QUESTIONS,
  createStageMap,
} from './game/stageConfig.js';
import { generateStageQuestions } from './game/questionGenerator.js';

const INITIAL_STAGE = 1;

function getChoiceClassName(choice, selectedChoice, answered, answer) {
  if (!answered) {
    return choice === selectedChoice ? 'choice selected' : 'choice';
  }

  if (choice === answer) {
    return 'choice correct';
  }

  if (choice === selectedChoice) {
    return 'choice incorrect';
  }

  return 'choice muted';
}

export default function App() {
  const stageMap = useMemo(() => createStageMap(), []);
  const [stageNumber] = useState(INITIAL_STAGE);
  const [questions] = useState(() => generateStageQuestions(INITIAL_STAGE));
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(null);
  const [score, setScore] = useState(0);
  const [stageCleared, setStageCleared] = useState(false);

  const currentQuestion = questions[currentQuestionIndex];
  const progressPercent = Math.round(
    ((currentQuestionIndex + (answered ? 1 : 0)) / questions.length) * 100,
  );
  const selectedStage = stageMap[stageNumber - 1];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  function handleSubmit() {
    if (selectedChoice === null || answered) {
      return;
    }

    const correct = selectedChoice === currentQuestion.answer;
    setAnswered(true);
    setIsCorrect(correct);

    if (correct) {
      setScore((currentScore) => currentScore + 1);
    }
  }

  function handleNextQuestion() {
    if (!answered) {
      return;
    }

    if (isLastQuestion) {
      setStageCleared(true);
      return;
    }

    setCurrentQuestionIndex((index) => index + 1);
    setSelectedChoice(null);
    setAnswered(false);
    setIsCorrect(null);
  }

  function restartStage() {
    setCurrentQuestionIndex(0);
    setSelectedChoice(null);
    setAnswered(false);
    setIsCorrect(null);
    setScore(0);
    setStageCleared(false);
  }

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="게임 진행 정보">
        <div>
          <p className="eyebrow">수학 보스전</p>
          <h1>Stage 1</h1>
          <p className="sidebar-copy">첫 관문을 통과하고 보스 탑을 열어라.</p>
        </div>

        <div className="stat-grid" aria-label="현재 점수와 진행도">
          <div className="stat-box">
            <span>점수</span>
            <strong>{score}</strong>
          </div>
          <div className="stat-box">
            <span>진행</span>
            <strong>
              {Math.min(currentQuestionIndex + 1, questions.length)}/
              {questions.length}
            </strong>
          </div>
        </div>

        <div className="progress-block">
          <div className="progress-label">
            <span>{selectedStage.topic}</span>
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
              <small>{stage.hasFinalBoss ? '최종 보스' : stage.topic}</small>
            </li>
          ))}
        </ol>

        <div className="future-note">
          <strong>확장 구조</strong>
          <span>
            본편 {TOTAL_MAIN_QUESTIONS}문항, 보너스 {BONUS_QUESTION_COUNT}문항
          </span>
        </div>
      </aside>

      <section className="play-area" aria-label="퀴즈 플레이">
        <div className="boss-strip">
          <img src="/assets/boss.svg" alt="최종 보스" />
          <div>
            <p className="eyebrow">MVP 전투</p>
            <h2>정답을 골라 게이지를 채워라</h2>
          </div>
        </div>

        {stageCleared ? (
          <div className="result-panel">
            <p className="eyebrow">Stage Clear</p>
            <h2>Stage 1 클리어</h2>
            <p>
              {QUESTIONS_PER_STAGE}문항 중 {score}문항을 맞혔습니다. 다음
              단계는 같은 구조에서 생성기를 확장해 연결하면 됩니다.
            </p>
            <button className="primary-action" type="button" onClick={restartStage}>
              다시 도전
            </button>
          </div>
        ) : (
          <article className="question-panel">
            <header className="question-header">
              <div>
                <p className="eyebrow">{currentQuestion.topic}</p>
                <h2>{currentQuestion.question}</h2>
              </div>
              <span className="question-count">
                {currentQuestionIndex + 1}/{questions.length}
              </span>
            </header>

            <div className="choices" role="group" aria-label="정답 선택">
              {currentQuestion.choices.map((choice) => (
                <button
                  className={getChoiceClassName(
                    choice,
                    selectedChoice,
                    answered,
                    currentQuestion.answer,
                  )}
                  disabled={answered}
                  key={choice}
                  onClick={() => setSelectedChoice(choice)}
                  type="button"
                >
                  {choice}
                </button>
              ))}
            </div>

            <div className="feedback" aria-live="polite">
              {answered ? (
                <>
                  <strong>{isCorrect ? '정답' : '오답'}</strong>
                  <span>{currentQuestion.explanation}</span>
                </>
              ) : (
                <span>선택지를 고른 뒤 제출하세요.</span>
              )}
            </div>

            <div className="actions">
              <button
                className="secondary-action"
                disabled={selectedChoice === null || answered}
                onClick={handleSubmit}
                type="button"
              >
                제출
              </button>
              <button
                className="primary-action"
                disabled={!answered}
                onClick={handleNextQuestion}
                type="button"
              >
                {isLastQuestion ? '스테이지 완료' : '다음 문제'}
              </button>
            </div>
          </article>
        )}
      </section>
    </main>
  );
}
