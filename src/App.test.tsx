import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App, { AnswerControl } from './App';
import { gameStorageKey } from './game/gameStorage';
import type { PlayerAnswer, Question } from './game/types';

function makeQuestion(overrides: Partial<Question>): Question {
  return {
    id: 'test-question',
    stageNumber: 1,
    order: 1,
    question: '테스트 문제',
    answerMode: 'multipleChoice',
    answer: 4,
    choices: [3, 4, 5, 6],
    explanation: '테스트 해설',
    topic: '테스트',
    level: '테스트',
    isBoss: false,
    ...overrides,
  };
}

describe('App UI', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('renders the stage 1 multiple choice flow', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Stage 1' })).toBeInTheDocument();
    expect(screen.getByText('4지선다')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '제출' })).toBeDisabled();
  });

  it('keeps core controls available at a mobile viewport width', () => {
    vi.stubGlobal('innerWidth', 375);

    render(<App />);

    expect(screen.getByText('4지선다')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '제출' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '다음 문제' })).toBeInTheDocument();
  });

  it('exposes dev-only QA shortcuts in the test/dev environment', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: '최종 보스 바로가기' }));
    expect(screen.getByRole('heading', { name: 'Stage 13' })).toBeInTheDocument();
    expect(screen.getByText('보스전 결과')).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: '보너스 바로가기' }));
    expect(screen.getByRole('heading', { name: 'Bonus' })).toBeInTheDocument();
    expect(screen.getAllByText('보너스 레벨').length).toBeGreaterThan(0);
  });

  it('persists progress and reloads from saved state', async () => {
    const { unmount } = render(<App />);

    fireEvent.click(screen.getByRole('button', { name: '최종 보스 바로가기' }));

    await waitFor(() => {
      const savedState = window.localStorage.getItem(gameStorageKey);
      expect(savedState).toContain('"stageNumber":13');
      expect(savedState).toContain('"questionIndex":7');
    });

    unmount();
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Stage 13' })).toBeInTheDocument();
    expect(screen.getAllByText('최종 보스').length).toBeGreaterThan(0);
  });

  it('clears saved progress when storage reset is clicked', async () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: '최종 보스 바로가기' }));

    await waitFor(() => {
      expect(window.localStorage.getItem(gameStorageKey)).toContain(
        '"stageNumber":13',
      );
    });

    fireEvent.click(screen.getByRole('button', { name: '저장 초기화' }));

    await waitFor(() => {
      expect(window.localStorage.getItem(gameStorageKey)).toContain(
        '"stageNumber":1',
      );
    });

    expect(screen.getByRole('heading', { name: 'Stage 1' })).toBeInTheDocument();
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
