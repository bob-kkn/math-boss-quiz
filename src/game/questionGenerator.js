import { FINAL_BOSS_STAGE, QUESTIONS_PER_STAGE } from './stageConfig.js';

function shuffleChoices(values) {
  return [...values].sort(() => Math.random() - 0.5);
}

function uniqueChoices(answer, offsets) {
  const choices = new Set([answer]);

  offsets.forEach((offset) => {
    const candidate = Math.max(0, answer + offset);
    choices.add(candidate);
  });

  let cursor = 1;
  while (choices.size < 4) {
    choices.add(answer + cursor);
    cursor += 1;
  }

  return shuffleChoices([...choices]).slice(0, 4);
}

function createQuestion({
  id,
  question,
  answer,
  explanation,
  topic,
  level,
  isBoss = false,
}) {
  return {
    id,
    question,
    choices: uniqueChoices(answer, [-2, -1, 1, 3]),
    answer,
    explanation,
    topic,
    level,
    isBoss,
  };
}

function generateStageOneQuestions() {
  const seeds = [
    { left: 3, right: 4, operator: '+', topic: '덧셈' },
    { left: 9, right: 2, operator: '-', topic: '뺄셈' },
    { left: 5, right: 6, operator: '+', topic: '덧셈' },
    { left: 12, right: 5, operator: '-', topic: '뺄셈' },
    { left: 7, right: 8, operator: '+', topic: '덧셈' },
    { left: 15, right: 6, operator: '-', topic: '뺄셈' },
    { left: 8, right: 9, operator: '+', topic: '덧셈' },
    { left: 18, right: 7, operator: '-', topic: '뺄셈' },
  ];

  return seeds.map((seed, index) => {
    const answer =
      seed.operator === '+'
        ? seed.left + seed.right
        : seed.left - seed.right;

    return createQuestion({
      id: `stage-1-question-${index + 1}`,
      question: `${seed.left} ${seed.operator} ${seed.right} = ?`,
      answer,
      explanation: `${seed.left} ${seed.operator} ${seed.right}의 값은 ${answer}입니다.`,
      topic: seed.topic,
      level: 1,
    });
  });
}

export function generateStageQuestions(stageNumber) {
  if (stageNumber === 1) {
    return generateStageOneQuestions();
  }

  return Array.from({ length: QUESTIONS_PER_STAGE }, (_, index) => {
    const base = stageNumber * 3 + index;
    const answer = base + stageNumber;

    return createQuestion({
      id: `stage-${stageNumber}-question-${index + 1}`,
      question: `${base} + ${stageNumber} = ?`,
      answer,
      explanation: `${base}에 ${stageNumber}를 더하면 ${answer}입니다.`,
      topic: `Stage ${stageNumber} 확장 문제`,
      level: stageNumber,
      isBoss:
        stageNumber === FINAL_BOSS_STAGE && index === QUESTIONS_PER_STAGE - 1,
    });
  });
}
