import {
  BONUS_QUESTION_COUNT,
  FINAL_BOSS_STAGE,
  QUESTIONS_PER_STAGE,
  STAGE_COUNT,
  createStageMap,
  getStageConfig,
} from './stageConfig';
import type { AnswerMode, AnswerValue, Question } from './types';

type RandomSource = () => number;

interface QuestionDraft {
  question: string;
  answerMode: AnswerMode;
  answer: AnswerValue;
  choices?: AnswerValue[];
  explanation: string;
  topic: string;
}

interface TemplateContext {
  stageNumber: number;
  gradeLabel: string;
  order: number;
  seedBase: number;
}

interface QuestionTemplate {
  topic: string;
  answerMode: AnswerMode;
  build: (context: TemplateContext) => QuestionDraft;
}

interface GeneratorOptions {
  seed?: string | number;
}

function hashSeed(seed: string | number): number {
  const text = String(seed);
  let hash = 2166136261;

  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

export function createSeededRandom(seed: string | number): RandomSource {
  let value = hashSeed(seed);

  return () => {
    value += 0x6d2b79f5;
    let next = value;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleWithRandom<T>(values: T[], random: RandomSource): T[] {
  const shuffled = [...values];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [
      shuffled[swapIndex],
      shuffled[index],
    ];
  }

  return shuffled;
}

function numberChoices(answer: number, random: RandomSource): number[] {
  const choices = new Set<number>([answer]);
  const offsets = [-4, -2, -1, 1, 2, 3, 5];

  offsets.forEach((offset) => choices.add(Math.max(0, answer + offset)));

  let cursor = 1;
  while (choices.size < 4) {
    choices.add(answer + cursor);
    cursor += 1;
  }

  return shuffleWithRandom([...choices].slice(0, 4), random);
}

function finalizeQuestion(
  stageNumber: number | 'bonus',
  gradeLabel: string,
  order: number,
  draft: QuestionDraft,
  random: RandomSource,
): Question {
  const isBoss = stageNumber === FINAL_BOSS_STAGE && order === QUESTIONS_PER_STAGE;
  const hasGeneratedChoices =
    draft.answerMode === 'multipleChoice' && draft.choices === undefined;

  if (hasGeneratedChoices && typeof draft.answer !== 'number') {
    throw new Error('String multiple choice questions must provide choices.');
  }

  return {
    id: `${stageNumber === 'bonus' ? 'bonus' : `stage-${stageNumber}`}-question-${order}`,
    stageNumber,
    order,
    question: draft.question,
    answerMode: draft.answerMode,
    answer: draft.answer,
    choices: hasGeneratedChoices
      ? numberChoices(draft.answer as number, random)
      : draft.choices
        ? shuffleWithRandom(draft.choices, random)
        : undefined,
    explanation: draft.explanation,
    topic: draft.topic,
    level: gradeLabel,
    isBoss,
    numericTolerance: 0,
  };
}

function earlyTemplates(): QuestionTemplate[] {
  return [
    {
      topic: '수 세기',
      answerMode: 'multipleChoice',
      build: ({ seedBase }) => {
        const left = seedBase + 1;
        const right = 2;
        const answer = left + right;

        return {
          question: `${left}개와 ${right}개를 합치면 모두 몇 개일까요?`,
          answerMode: 'multipleChoice',
          answer,
          explanation: `${left}에 ${right}를 더하면 ${answer}입니다.`,
          topic: '수 세기',
        };
      },
    },
    {
      topic: '크기 비교',
      answerMode: 'trueFalse',
      build: ({ seedBase }) => {
        const left = seedBase + 5;
        const right = seedBase + 3;

        return {
          question: `${left}은 ${right}보다 큽니다.`,
          answerMode: 'trueFalse',
          answer: true,
          explanation: `${left}은 ${right}보다 큰 수입니다.`,
          topic: '크기 비교',
        };
      },
    },
    {
      topic: '빈칸 찾기',
      answerMode: 'numericInput',
      build: ({ seedBase }) => {
        const answer = seedBase + 4;

        return {
          question: `${answer - 2}, ${answer - 1}, ?, ${answer + 1}`,
          answerMode: 'numericInput',
          answer,
          explanation: `1씩 커지는 수열이므로 빈칸은 ${answer}입니다.`,
          topic: '빈칸 찾기',
        };
      },
    },
    {
      topic: '모양',
      answerMode: 'multipleChoice',
      build: () => ({
        question: '변이 3개인 도형은 무엇일까요?',
        answerMode: 'multipleChoice',
        answer: '삼각형',
        choices: ['삼각형', '사각형', '원', '오각형'],
        explanation: '변이 3개인 도형은 삼각형입니다.',
        topic: '모양',
      }),
    },
    {
      topic: '덧셈',
      answerMode: 'multipleChoice',
      build: ({ seedBase }) => {
        const left = seedBase + 2;
        const answer = left + 1;

        return {
          question: `${left} + 1 = ?`,
          answerMode: 'multipleChoice',
          answer,
          explanation: `${left} 다음 수는 ${answer}입니다.`,
          topic: '덧셈',
        };
      },
    },
    {
      topic: '뺄셈',
      answerMode: 'multipleChoice',
      build: ({ seedBase }) => {
        const left = seedBase + 7;
        const answer = left - 2;

        return {
          question: `${left} - 2 = ?`,
          answerMode: 'multipleChoice',
          answer,
          explanation: `${left}에서 2를 빼면 ${answer}입니다.`,
          topic: '뺄셈',
        };
      },
    },
    {
      topic: '참거짓',
      answerMode: 'trueFalse',
      build: ({ seedBase }) => {
        const answer = seedBase + 3;

        return {
          question: `${answer} 바로 다음 수는 ${answer + 2}입니다.`,
          answerMode: 'trueFalse',
          answer: false,
          explanation: `${answer} 바로 다음 수는 ${answer + 1}입니다.`,
          topic: '참거짓',
        };
      },
    },
    {
      topic: '생활 문제',
      answerMode: 'multipleChoice',
      build: ({ seedBase }) => {
        const first = seedBase + 3;
        const second = 2;
        const answer = first + second;

        return {
          question: `사탕 ${first}개를 가지고 있다가 ${second}개를 더 받았습니다. 모두 몇 개인가요?`,
          answerMode: 'multipleChoice',
          answer,
          explanation: `${first} + ${second} = ${answer}입니다.`,
          topic: '생활 문제',
        };
      },
    },
  ];
}

function elementaryTemplates(): QuestionTemplate[] {
  return [
    {
      topic: '덧셈',
      answerMode: 'multipleChoice',
      build: ({ stageNumber, seedBase }) => {
        const left = stageNumber * 8 + seedBase;
        const right = stageNumber + 6;
        const answer = left + right;

        return {
          question: `${left} + ${right} = ?`,
          answerMode: 'multipleChoice',
          answer,
          explanation: `${left}에 ${right}를 더하면 ${answer}입니다.`,
          topic: '덧셈',
        };
      },
    },
    {
      topic: '뺄셈',
      answerMode: 'multipleChoice',
      build: ({ stageNumber, seedBase }) => {
        const left = stageNumber * 10 + seedBase + 12;
        const right = stageNumber + 4;
        const answer = left - right;

        return {
          question: `${left} - ${right} = ?`,
          answerMode: 'multipleChoice',
          answer,
          explanation: `${left}에서 ${right}를 빼면 ${answer}입니다.`,
          topic: '뺄셈',
        };
      },
    },
    {
      topic: '곱셈',
      answerMode: 'multipleChoice',
      build: ({ stageNumber }) => {
        const left = Math.min(stageNumber + 2, 9);
        const right = Math.min(stageNumber + 3, 9);
        const answer = left * right;

        return {
          question: `${left} x ${right} = ?`,
          answerMode: 'multipleChoice',
          answer,
          explanation: `${left}을 ${right}번 더하면 ${answer}입니다.`,
          topic: '곱셈',
        };
      },
    },
    {
      topic: '나눗셈',
      answerMode: 'numericInput',
      build: ({ stageNumber }) => {
        const answer = stageNumber + 3;
        const divisor = Math.min(stageNumber + 1, 8);
        const dividend = answer * divisor;

        return {
          question: `${dividend} ÷ ${divisor} = ?`,
          answerMode: 'numericInput',
          answer,
          explanation: `${divisor} x ${answer} = ${dividend}이므로 답은 ${answer}입니다.`,
          topic: '나눗셈',
        };
      },
    },
    {
      topic: '분수',
      answerMode: 'multipleChoice',
      build: () => ({
        question: '전체를 똑같이 4칸으로 나눈 것 중 1칸은 어떤 분수인가요?',
        answerMode: 'multipleChoice',
        answer: '1/4',
        choices: ['1/4', '1/2', '2/3', '4/1'],
        explanation: '4칸 중 1칸은 1/4입니다.',
        topic: '분수',
      }),
    },
    {
      topic: '규칙',
      answerMode: 'numericInput',
      build: ({ stageNumber }) => {
        const start = stageNumber + 2;
        const step = stageNumber;
        const answer = start + step * 3;

        return {
          question: `${start}, ${start + step}, ${start + step * 2}, ?`,
          answerMode: 'numericInput',
          answer,
          explanation: `${step}씩 커지므로 다음 수는 ${answer}입니다.`,
          topic: '규칙',
        };
      },
    },
    {
      topic: '참거짓',
      answerMode: 'trueFalse',
      build: ({ stageNumber }) => {
        const left = stageNumber + 4;
        const right = stageNumber + 5;
        const value = left * right;

        return {
          question: `${left} x ${right} = ${value + 1}`,
          answerMode: 'trueFalse',
          answer: false,
          explanation: `${left} x ${right}의 정확한 값은 ${value}입니다.`,
          topic: '참거짓',
        };
      },
    },
    {
      topic: '문장제',
      answerMode: 'multipleChoice',
      build: ({ stageNumber }) => {
        const packs = stageNumber + 2;
        const perPack = 4;
        const answer = packs * perPack;

        return {
          question: `상자 ${packs}개에 연필이 ${perPack}자루씩 있습니다. 연필은 모두 몇 자루인가요?`,
          answerMode: 'multipleChoice',
          answer,
          explanation: `${packs} x ${perPack} = ${answer}입니다.`,
          topic: '문장제',
        };
      },
    },
  ];
}

function middleTemplates(): QuestionTemplate[] {
  return [
    {
      topic: '정수',
      answerMode: 'numericInput',
      build: ({ stageNumber }) => {
        const left = stageNumber + 4;
        const right = stageNumber + 1;
        const answer = left - right;

        return {
          question: `${left} + (-${right}) = ?`,
          answerMode: 'numericInput',
          answer,
          explanation: `양수와 음수를 더하면 ${left} - ${right} = ${answer}입니다.`,
          topic: '정수',
        };
      },
    },
    {
      topic: '일차방정식',
      answerMode: 'numericInput',
      build: ({ stageNumber }) => {
        const answer = stageNumber - 3;
        const constant = stageNumber + 2;
        const result = answer + constant;

        return {
          question: `x + ${constant} = ${result}일 때 x는?`,
          answerMode: 'numericInput',
          answer,
          explanation: `${result}에서 ${constant}를 빼면 x = ${answer}입니다.`,
          topic: '일차방정식',
        };
      },
    },
    {
      topic: '문자식',
      answerMode: 'multipleChoice',
      build: () => ({
        question: '2a + 3a를 간단히 하면?',
        answerMode: 'multipleChoice',
        answer: '5a',
        choices: ['5a', '6a', '5a^2', 'a + 5'],
        explanation: '같은 문자끼리는 계수만 더하므로 5a입니다.',
        topic: '문자식',
      }),
    },
    {
      topic: '함수',
      answerMode: 'numericInput',
      build: ({ stageNumber }) => {
        const slope = stageNumber - 6;
        const input = 3;
        const intercept = 2;
        const answer = slope * input + intercept;

        return {
          question: `y = ${slope}x + ${intercept}에서 x = ${input}일 때 y는?`,
          answerMode: 'numericInput',
          answer,
          explanation: `${slope} x ${input} + ${intercept} = ${answer}입니다.`,
          topic: '함수',
        };
      },
    },
    {
      topic: '제곱근',
      answerMode: 'multipleChoice',
      build: () => ({
        question: '√49의 값은?',
        answerMode: 'multipleChoice',
        answer: 7,
        explanation: '7 x 7 = 49이므로 √49 = 7입니다.',
        topic: '제곱근',
      }),
    },
    {
      topic: '확률',
      answerMode: 'multipleChoice',
      build: () => ({
        question: '동전을 한 번 던질 때 앞면이 나올 확률은?',
        answerMode: 'multipleChoice',
        answer: '1/2',
        choices: ['1/2', '1/3', '1/4', '1'],
        explanation: '앞면과 뒷면 두 경우 중 앞면 한 경우이므로 1/2입니다.',
        topic: '확률',
      }),
    },
    {
      topic: '부등식',
      answerMode: 'trueFalse',
      build: () => ({
        question: 'x > 3이면 x = 2는 해가 될 수 있습니다.',
        answerMode: 'trueFalse',
        answer: false,
        explanation: '2는 3보다 크지 않으므로 해가 아닙니다.',
        topic: '부등식',
      }),
    },
    {
      topic: '도형',
      answerMode: 'numericInput',
      build: ({ stageNumber }) => {
        const width = stageNumber - 2;
        const height = 4;
        const answer = width * height;

        return {
          question: `가로 ${width}, 세로 ${height}인 직사각형의 넓이는?`,
          answerMode: 'numericInput',
          answer,
          explanation: `직사각형의 넓이는 가로 x 세로이므로 ${answer}입니다.`,
          topic: '도형',
        };
      },
    },
  ];
}

function highTemplates(): QuestionTemplate[] {
  return [
    {
      topic: '다항식',
      answerMode: 'numericInput',
      build: ({ stageNumber }) => {
        const x = stageNumber - 9;
        const answer = x * x + 2 * x + 1;

        return {
          question: `x = ${x}일 때 x^2 + 2x + 1의 값은?`,
          answerMode: 'numericInput',
          answer,
          explanation: `${x}^2 + 2 x ${x} + 1 = ${answer}입니다.`,
          topic: '다항식',
        };
      },
    },
    {
      topic: '이차방정식',
      answerMode: 'numericInput',
      build: ({ stageNumber }) => {
        const firstRoot = stageNumber - 10;
        const secondRoot = stageNumber - 8;
        const answer = firstRoot + secondRoot;

        return {
          question: `근이 ${firstRoot}, ${secondRoot}인 이차방정식에서 두 근의 합은?`,
          answerMode: 'numericInput',
          answer,
          explanation: `두 근의 합은 ${firstRoot} + ${secondRoot} = ${answer}입니다.`,
          topic: '이차방정식',
        };
      },
    },
    {
      topic: '함수 개념',
      answerMode: 'multipleChoice',
      build: () => ({
        question: '함수 f(x) = 2x + 1에서 x = 0일 때 함숫값은?',
        answerMode: 'multipleChoice',
        answer: 1,
        explanation: `2 x 0 + 1 = 1입니다.`,
        topic: '함수 개념',
      }),
    },
    {
      topic: '수열',
      answerMode: 'numericInput',
      build: ({ stageNumber }) => {
        const first = 2;
        const difference = stageNumber - 9;
        const order = 5;
        const answer = first + (order - 1) * difference;

        return {
          question: `첫째항이 ${first}, 공차가 ${difference}인 등차수열의 ${order}번째 항은?`,
          answerMode: 'numericInput',
          answer,
          explanation: `${first} + (${order} - 1) x ${difference} = ${answer}입니다.`,
          topic: '수열',
        };
      },
    },
    {
      topic: '미분',
      answerMode: 'numericInput',
      build: () => ({
        question: 'f(x) = x^2일 때 f′(3)의 값은?',
        answerMode: 'numericInput',
        answer: 6,
        explanation: `f′(x) = 2x이므로 f′(3) = 6입니다.`,
        topic: '미분',
      }),
    },
    {
      topic: '확률',
      answerMode: 'numericInput',
      build: () => ({
        question: '서로 다른 동전 2개를 던질 때 나올 수 있는 전체 경우의 수는?',
        answerMode: 'numericInput',
        answer: 4,
        explanation: '각 동전은 2가지 경우가 있으므로 2 x 2 = 4입니다.',
        topic: '확률',
      }),
    },
    {
      topic: '참거짓',
      answerMode: 'trueFalse',
      build: () => ({
        question: '모든 실수 x에 대해 x^2은 0보다 작을 수 있습니다.',
        answerMode: 'trueFalse',
        answer: false,
        explanation: '실수의 제곱은 항상 0 이상입니다.',
        topic: '참거짓',
      }),
    },
    {
      topic: '최종 보스',
      answerMode: 'multipleChoice',
      build: () => ({
        question: '최종 보스: f(x) = x^2 + 1일 때 f(3) + f(1)의 값은?',
        answerMode: 'multipleChoice',
        answer: 12,
        explanation: 'f(3) = 10, f(1) = 2이므로 합은 12입니다.',
        topic: '최종 보스',
      }),
    },
  ];
}

function templatesForStage(stageNumber: number): QuestionTemplate[] {
  if (stageNumber === 1) {
    return earlyTemplates();
  }

  if (stageNumber <= 7) {
    return elementaryTemplates();
  }

  if (stageNumber <= 10) {
    return middleTemplates();
  }

  return highTemplates();
}

export function generateStageQuestions(
  stageNumber: number,
  options: GeneratorOptions = {},
): Question[] {
  const stage = getStageConfig(stageNumber);
  const templates = templatesForStage(stageNumber);
  const random = createSeededRandom(options.seed ?? `stage-${stageNumber}`);

  if (templates.length !== QUESTIONS_PER_STAGE) {
    throw new Error(`Stage ${stageNumber} must have ${QUESTIONS_PER_STAGE} templates.`);
  }

  return templates.map((template, index) =>
    finalizeQuestion(
      stageNumber,
      stage.gradeLabel,
      index + 1,
      template.build({
        stageNumber,
        gradeLabel: stage.gradeLabel,
        order: index + 1,
        seedBase: stageNumber + index + 1,
      }),
      random,
    ),
  );
}

export function generateAllStageQuestions(
  options: GeneratorOptions = {},
): Record<number, Question[]> {
  return createStageMap().reduce<Record<number, Question[]>>((acc, stage) => {
    acc[stage.stageNumber] = generateStageQuestions(stage.stageNumber, {
      seed: `${options.seed ?? 'main'}-${stage.stageNumber}`,
    });
    return acc;
  }, {});
}

export function generateBonusQuestions(
  options: GeneratorOptions = {},
): Question[] {
  const random = createSeededRandom(options.seed ?? 'bonus');
  const drafts: QuestionDraft[] = [
    {
      question: '보너스 1: 18과 24의 최대공약수는?',
      answerMode: 'numericInput',
      answer: 6,
      explanation: '18과 24의 공통 약수 중 가장 큰 수는 6입니다.',
      topic: '보너스 계산',
    },
    {
      question: '보너스 2: 3/4은 1/2보다 큽니다.',
      answerMode: 'trueFalse',
      answer: true,
      explanation: '3/4은 0.75이고 1/2은 0.5이므로 참입니다.',
      topic: '보너스 분수',
    },
    {
      question: '보너스 3: y = 3x - 2에서 x = 4일 때 y는?',
      answerMode: 'multipleChoice',
      answer: 10,
      explanation: '3 x 4 - 2 = 10입니다.',
      topic: '보너스 함수',
    },
    {
      question: '보너스 4: 첫째항 5, 공차 2인 등차수열의 6번째 항은?',
      answerMode: 'numericInput',
      answer: 15,
      explanation: '5 + (6 - 1) x 2 = 15입니다.',
      topic: '보너스 수열',
    },
    {
      question: '보너스 5: x^2 = 25를 만족하는 양수 x는?',
      answerMode: 'multipleChoice',
      answer: 5,
      explanation: '5 x 5 = 25이므로 양수 해는 5입니다.',
      topic: '보너스 보스',
    },
  ];

  if (drafts.length !== BONUS_QUESTION_COUNT) {
    throw new Error(`Bonus level must have ${BONUS_QUESTION_COUNT} questions.`);
  }

  return drafts.map((draft, index) =>
    finalizeQuestion('bonus', '보너스', index + 1, draft, random),
  );
}

export function getTotalGeneratedQuestionCount(): number {
  return STAGE_COUNT * QUESTIONS_PER_STAGE;
}
