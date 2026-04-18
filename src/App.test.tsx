import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App, { AnswerControl } from './App';
import { gameStorageKey } from './game/gameStorage';
import { generateStageQuestions } from './game/questionGenerator';
import {
  BOSS_STAGE_NUMBER,
  FINAL_MAIN_TIER,
  QUESTIONS_PER_STAGE,
} from './game/stageConfig';
import type { AnswerValue, PlayerAnswer, Question } from './game/types';

function makeQuestion(overrides: Partial<Question>): Question {
  return {
    id: 'test-question',
    tierNumber: 1,
    stageNumber: 1,
    globalStageNumber: 1,
    order: 1,
    question: '테스트 문제',
    answerMode: 'multipleChoice',
    answer: 4,
    choices: [3, 4, 5, 6],
    explanation: '테스트 해설',
    topic: '테스트',
    concept: '테스트 개념',
    skill: 'calculation',
    difficultyBand: 'intro',
    level: '테스트',
    isBoss: false,
    ...overrides,
  };
}

function getWrongAnswer(question: Question): AnswerValue {
  if (question.answerMode === 'trueFalse') {
    return !question.answer;
  }

  if (question.choices) {
    return question.choices.find((choice) => choice !== question.answer) ?? question.answer;
  }

  if (typeof question.answer === 'number') {
    return question.answer + 9999;
  }

  return '__wrong__';
}

function getButtonLabel(answer: AnswerValue): string {
  if (typeof answer === 'boolean') {
    return answer ? '맞다' : '아니다';
  }

  return String(answer);
}

function selectQuestionAnswer(question: Question, correct = true): void {
  const answer = correct ? question.answer : getWrongAnswer(question);

  if (question.answerMode === 'numericInput') {
    fireEvent.change(screen.getByLabelText('숫자 답안'), {
      target: { value: String(answer) },
    });
    return;
  }

  fireEvent.click(screen.getByRole('button', { name: getButtonLabel(answer) }));
}

function submitVisibleAnswer(): void {
  fireEvent.click(screen.getByRole('button', { name: '제출' }));
}

describe('App UI', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('renders the stage 1 multiple choice flow', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: '아기' })).toBeInTheDocument();
    expect(screen.getByText('4지선다')).toBeInTheDocument();
    expect(screen.getByText(/^핵심 /)).toBeInTheDocument();
    expect(screen.getByText('기초')).toBeInTheDocument();
    expect(screen.getByText('콤보 0')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '제출' })).toBeDisabled();
  });

  it('shows combo feedback after a correct answer', () => {
    const question = generateStageQuestions(1, 1, {
      seed: 'math-boss-1-1',
    })[0];

    render(<App />);

    selectQuestionAnswer(question);
    submitVisibleAnswer();

    expect(screen.getByText('콤보 1')).toBeInTheDocument();
    expect(screen.getByText('정답')).toBeInTheDocument();
  });

  it('keeps core controls available at a mobile viewport width', () => {
    vi.stubGlobal('innerWidth', 375);

    render(<App />);

    expect(screen.getByText('4지선다')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: '단계 진행' })).toBeInTheDocument();
    expect(screen.getByLabelText('전체 단계')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: '스테이지 진행' })).toBeInTheDocument();
    expect(screen.getByLabelText('현재 단계 스테이지')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '제출' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '다음 문제' })).toBeInTheDocument();
  });

  it('exposes dev-only QA shortcuts in the test/dev environment', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: '최종 보스 바로가기' }));
    expect(screen.getByRole('heading', { name: '대학원' })).toBeInTheDocument();
    expect(screen.getByLabelText('보스전 상태')).toBeInTheDocument();
    expect(screen.getByText('6/6')).toBeInTheDocument();
    expect(screen.getByLabelText('플레이어 체력 3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '다음 문제' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: '보너스 바로가기' }));
    expect(screen.getByRole('heading', { name: '보너스' })).toBeInTheDocument();
    expect(screen.getAllByText('거의 난제').length).toBeGreaterThan(0);
    expect(screen.getByText('1스테이지')).toBeInTheDocument();
  });

  it('shows a boss retry screen after losing all player HP', () => {
    const bossQuestions = generateStageQuestions(
      FINAL_MAIN_TIER,
      BOSS_STAGE_NUMBER,
      { seed: `math-boss-${FINAL_MAIN_TIER}-${BOSS_STAGE_NUMBER}` },
    );

    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: '최종 보스 바로가기' }));

    bossQuestions.slice(0, 3).forEach((question, index) => {
      selectQuestionAnswer(question, false);
      submitVisibleAnswer();

      if (index < 2) {
        fireEvent.click(screen.getByRole('button', { name: '다음 문제' }));
      }
    });

    expect(screen.getByRole('heading', { name: '보스전 재도전' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '재도전' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '재도전' }));

    expect(screen.getAllByText('1/8').length).toBeGreaterThan(0);
    expect(screen.getByText('6/6')).toBeInTheDocument();
    expect(screen.getByLabelText('플레이어 체력 3')).toBeInTheDocument();
  });

  it('shows 3-star reward after a perfect stage clear', () => {
    const questions = generateStageQuestions(1, 1, {
      seed: 'math-boss-1-1',
    });

    render(<App />);

    questions.forEach((question, index) => {
      selectQuestionAnswer(question);
      submitVisibleAnswer();

      fireEvent.click(
        screen.getByRole('button', {
          name:
            index === QUESTIONS_PER_STAGE - 1 ? '스테이지 완료' : '다음 문제',
        }),
      );
    });

    expect(screen.getByRole('heading', { name: '1스테이지 클리어' })).toBeInTheDocument();
    expect(screen.getAllByText('별 3개').length).toBeGreaterThan(0);
    expect(screen.getByText(/정답 8\/8/)).toBeInTheDocument();
  });

  it('persists progress and reloads from saved state', async () => {
    const { unmount } = render(<App />);

    fireEvent.click(screen.getByRole('button', { name: '최종 보스 바로가기' }));

    await waitFor(() => {
      const savedState = window.localStorage.getItem(gameStorageKey);
      expect(savedState).toContain('"tierNumber":17');
      expect(savedState).toContain('"stageNumber":10');
    });

    unmount();
    render(<App />);

    expect(screen.getByRole('heading', { name: '대학원' })).toBeInTheDocument();
    expect(screen.getAllByText('보스전').length).toBeGreaterThan(0);
  });

  it('clears saved progress when storage reset is clicked', async () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: '최종 보스 바로가기' }));

    await waitFor(() => {
      expect(window.localStorage.getItem(gameStorageKey)).toContain(
        '"tierNumber":17',
      );
    });

    fireEvent.click(screen.getByRole('button', { name: '저장 초기화' }));

    await waitFor(() => {
      expect(window.localStorage.getItem(gameStorageKey)).toContain(
        '"stageNumber":1',
      );
    });

    expect(screen.getByRole('heading', { name: '아기' })).toBeInTheDocument();
  });

  it('renders numeric input questions', () => {
    const onSelect = vi.fn<(answer: PlayerAnswer) => void>();

    render(
      <AnswerControl
        question={makeQuestion({
          answerMode: 'numericInput',
          answer: 12,
          choices: undefined,
        })}
        selectedAnswer={null}
        hasSubmitted={false}
        onSelect={onSelect}
      />,
    );

    fireEvent.change(screen.getByLabelText('숫자 답안'), {
      target: { value: '12' },
    });

    expect(onSelect).toHaveBeenCalledWith('12');
  });

  it('renders true/false questions', () => {
    const onSelect = vi.fn<(answer: PlayerAnswer) => void>();

    render(
      <AnswerControl
        question={makeQuestion({
          answerMode: 'trueFalse',
          answer: true,
          choices: undefined,
        })}
        selectedAnswer={null}
        hasSubmitted={false}
        onSelect={onSelect}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '맞다' }));

    expect(onSelect).toHaveBeenCalledWith(true);
    expect(screen.getByRole('button', { name: '아니다' })).toBeInTheDocument();
  });
});
