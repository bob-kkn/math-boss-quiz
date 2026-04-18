import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App, { AnswerControl } from './App';
import { gameStorageKey } from './game/gameStorage';
import type { PlayerAnswer, Question } from './game/types';

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

    expect(screen.getByRole('heading', { name: '아기' })).toBeInTheDocument();
    expect(screen.getByText('4지선다')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '제출' })).toBeDisabled();
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
    expect(screen.getByRole('button', { name: '다음 문제' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: '보너스 바로가기' }));
    expect(screen.getByRole('heading', { name: '보너스' })).toBeInTheDocument();
    expect(screen.getAllByText('거의 난제').length).toBeGreaterThan(0);
    expect(screen.getByText('1스테이지')).toBeInTheDocument();
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
