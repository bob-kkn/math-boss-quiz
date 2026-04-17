import { fireEvent, render, screen } from '@testing-library/react';
import App, { AnswerControl } from './App';
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
