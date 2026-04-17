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

function lowerElementaryTemplates(): QuestionTemplate[] {
  return [
    {
      topic: '덧셈',
      answerMode: 'multipleChoice',
      build: ({ stageNumber, seedBase }) => {
        const left = stageNumber * 4 + seedBase;
        const right = stageNumber + 2;
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
        const right = stageNumber + 2;
        const answer = seedBase + 4;
        const left = answer + right;

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
      topic: '묶어 세기',
      answerMode: 'multipleChoice',
      build: ({ stageNumber }) => {
        const groups = stageNumber + 1;
        const count = 2;
        const answer = groups * count;

        return {
          question: `${count}개씩 ${groups}묶음이면 모두 몇 개인가요?`,
          answerMode: 'multipleChoice',
          answer,
          explanation: `${count}씩 ${groups}번 세면 ${answer}입니다.`,
          topic: '묶어 세기',
        };
      },
    },
    {
      topic: '수 비교',
      answerMode: 'trueFalse',
      build: ({ stageNumber }) => {
        const left = stageNumber * 5 + 7;
        const right = left + 3;

        return {
          question: `${left}은 ${right}보다 큽니다.`,
          answerMode: 'trueFalse',
          answer: false,
          explanation: `${left}은 ${right}보다 작은 수입니다.`,
          topic: '수 비교',
        };
      },
    },
    {
      topic: '시계',
      answerMode: 'multipleChoice',
      build: () => ({
        question: '긴바늘이 12, 짧은바늘이 3을 가리키면 몇 시인가요?',
        answerMode: 'multipleChoice',
        answer: '3시',
        choices: ['3시', '6시', '9시', '12시'],
        explanation: '긴바늘이 12에 있고 짧은바늘이 3에 있으면 3시입니다.',
        topic: '시계',
      }),
    },
    {
      topic: '규칙',
      answerMode: 'multipleChoice',
      build: ({ stageNumber }) => {
        const start = stageNumber + 4;
        const answer = start + 3;

        return {
          question: `${start}, ${start + 1}, ${start + 2}, ?`,
          answerMode: 'multipleChoice',
          answer,
          explanation: '1씩 커지는 규칙이므로 다음 수를 고르면 됩니다.',
          topic: '규칙',
        };
      },
    },
    {
      topic: '참거짓',
      answerMode: 'trueFalse',
      build: ({ stageNumber }) => {
        const value = stageNumber + 8;

        return {
          question: `${value} 바로 앞의 수는 ${value - 1}입니다.`,
          answerMode: 'trueFalse',
          answer: true,
          explanation: `${value}보다 1 작은 수는 ${value - 1}입니다.`,
          topic: '참거짓',
        };
      },
    },
    {
      topic: '문장제',
      answerMode: 'multipleChoice',
      build: ({ stageNumber }) => {
        const first = stageNumber + 5;
        const second = 3;
        const answer = first + second;

        return {
          question: `연필 ${first}자루가 있고 ${second}자루를 더 받았습니다. 모두 몇 자루인가요?`,
          answerMode: 'multipleChoice',
          answer,
          explanation: `${first} + ${second} = ${answer}입니다.`,
          topic: '문장제',
        };
      },
    },
  ];
}

function middleElementaryTemplates(): QuestionTemplate[] {
  return [
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
      topic: '큰 수',
      answerMode: 'multipleChoice',
      build: ({ stageNumber }) => {
        const answer = stageNumber * 100 + 35;

        return {
          question: `${answer}은 백의 자리 숫자가 무엇인가요?`,
          answerMode: 'multipleChoice',
          answer: stageNumber,
          explanation: `${answer}에서 백의 자리 숫자는 ${stageNumber}입니다.`,
          topic: '큰 수',
        };
      },
    },
    {
      topic: '규칙',
      answerMode: 'numericInput',
      build: ({ stageNumber }) => {
        const start = stageNumber + 2;
        const step = 3;
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
      topic: '도형',
      answerMode: 'multipleChoice',
      build: () => ({
        question: '직사각형의 넓이는 어떻게 구하나요?',
        answerMode: 'multipleChoice',
        answer: '가로 x 세로',
        choices: ['가로 x 세로', '가로 + 세로', '가로 - 세로', '세로 ÷ 가로'],
        explanation: '직사각형의 넓이는 가로와 세로를 곱해 구합니다.',
        topic: '도형',
      }),
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

function upperElementaryTemplates(): QuestionTemplate[] {
  return [
    {
      topic: '약수',
      answerMode: 'multipleChoice',
      build: () => ({
        question: '12의 약수가 아닌 것은?',
        answerMode: 'multipleChoice',
        answer: 5,
        choices: [1, 3, 4, 5],
        explanation: '12는 5로 나누어떨어지지 않으므로 5는 약수가 아닙니다.',
        topic: '약수',
      }),
    },
    {
      topic: '배수',
      answerMode: 'numericInput',
      build: ({ stageNumber }) => {
        const number = stageNumber;
        const answer = number * 6;

        return {
          question: `${number}의 6번째 배수는?`,
          answerMode: 'numericInput',
          answer,
          explanation: `${number} x 6 = ${answer}입니다.`,
          topic: '배수',
        };
      },
    },
    {
      topic: '분수 계산',
      answerMode: 'numericInput',
      build: () => ({
        question: '1/5 + 2/5의 분자는 얼마인가요?',
        answerMode: 'numericInput',
        answer: 3,
        explanation: '분모가 같으므로 분자 1과 2를 더해 3/5가 됩니다.',
        topic: '분수 계산',
      }),
    },
    {
      topic: '소수',
      answerMode: 'numericInput',
      build: () => ({
        question: '0.3 + 0.4 = ?',
        answerMode: 'numericInput',
        answer: 0.7,
        explanation: '소수 첫째 자리끼리 더하면 0.7입니다.',
        topic: '소수',
      }),
    },
    {
      topic: '비율',
      answerMode: 'multipleChoice',
      build: () => ({
        question: '전체 10명 중 3명이 안경을 썼다면 비율은?',
        answerMode: 'multipleChoice',
        answer: '3/10',
        choices: ['3/10', '7/10', '10/3', '3/7'],
        explanation: '전체 10명 중 3명이므로 비율은 3/10입니다.',
        topic: '비율',
      }),
    },
    {
      topic: '입체도형',
      answerMode: 'trueFalse',
      build: () => ({
        question: '정육면체는 모든 모서리의 길이가 같습니다.',
        answerMode: 'trueFalse',
        answer: true,
        explanation: '정육면체는 모든 모서리 길이가 같은 입체도형입니다.',
        topic: '입체도형',
      }),
    },
    {
      topic: '평균',
      answerMode: 'numericInput',
      build: () => ({
        question: '4, 6, 8의 평균은?',
        answerMode: 'numericInput',
        answer: 6,
        explanation: '(4 + 6 + 8) ÷ 3 = 6입니다.',
        topic: '평균',
      }),
    },
    {
      topic: '문장제',
      answerMode: 'multipleChoice',
      build: ({ stageNumber }) => {
        const price = 500;
        const count = stageNumber;
        const answer = price * count;

        return {
          question: `${price}원짜리 공책 ${count}권의 값은?`,
          answerMode: 'multipleChoice',
          answer,
          explanation: `${price} x ${count} = ${answer}원입니다.`,
          topic: '문장제',
        };
      },
    },
  ];
}

function middleSchoolOneTemplates(): QuestionTemplate[] {
  return [
    {
      topic: '정수',
      answerMode: 'numericInput',
      build: () => ({
        question: '7 + (-3) = ?',
        answerMode: 'numericInput',
        answer: 4,
        explanation: '7에서 3을 빼면 4입니다.',
        topic: '정수',
      }),
    },
    {
      topic: '정수',
      answerMode: 'trueFalse',
      build: () => ({
        question: '-5는 -2보다 작은 수입니다.',
        answerMode: 'trueFalse',
        answer: true,
        explanation: '수직선에서 -5는 -2보다 왼쪽에 있으므로 더 작습니다.',
        topic: '정수',
      }),
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
      topic: '일차방정식',
      answerMode: 'numericInput',
      build: () => ({
        question: 'x + 5 = 12일 때 x는?',
        answerMode: 'numericInput',
        answer: 7,
        explanation: '12에서 5를 빼면 x = 7입니다.',
        topic: '일차방정식',
      }),
    },
    {
      topic: '비례식',
      answerMode: 'numericInput',
      build: () => ({
        question: '2 : 3 = 4 : x일 때 x는?',
        answerMode: 'numericInput',
        answer: 6,
        explanation: '2가 4로 2배가 되었으므로 3도 2배인 6이 됩니다.',
        topic: '비례식',
      }),
    },
    {
      topic: '좌표',
      answerMode: 'multipleChoice',
      build: () => ({
        question: '점 (3, 2)의 x좌표는?',
        answerMode: 'multipleChoice',
        answer: 3,
        explanation: '순서쌍 (x, y)에서 첫 번째 수가 x좌표입니다.',
        topic: '좌표',
      }),
    },
    {
      topic: '도형',
      answerMode: 'numericInput',
      build: () => ({
        question: '밑변 6, 높이 4인 삼각형의 넓이는?',
        answerMode: 'numericInput',
        answer: 12,
        explanation: '삼각형의 넓이는 밑변 x 높이 ÷ 2이므로 12입니다.',
        topic: '도형',
      }),
    },
    {
      topic: '자료',
      answerMode: 'trueFalse',
      build: () => ({
        question: '중앙값은 자료를 크기순으로 놓았을 때 가운데 값입니다.',
        answerMode: 'trueFalse',
        answer: true,
        explanation: '중앙값은 정렬된 자료의 가운데 위치에 있는 값입니다.',
        topic: '자료',
      }),
    },
  ];
}

function middleSchoolTwoTemplates(): QuestionTemplate[] {
  return [
    {
      topic: '연립방정식',
      answerMode: 'numericInput',
      build: () => ({
        question: 'x + y = 7, x = 3일 때 y는?',
        answerMode: 'numericInput',
        answer: 4,
        explanation: '7에서 x의 값 3을 빼면 y = 4입니다.',
        topic: '연립방정식',
      }),
    },
    {
      topic: '일차함수',
      answerMode: 'numericInput',
      build: () => ({
        question: 'y = 2x + 1에서 x = 3일 때 y는?',
        answerMode: 'numericInput',
        answer: 7,
        explanation: '2 x 3 + 1 = 7입니다.',
        topic: '일차함수',
      }),
    },
    {
      topic: '기울기',
      answerMode: 'multipleChoice',
      build: () => ({
        question: 'y = 4x - 2의 기울기는?',
        answerMode: 'multipleChoice',
        answer: 4,
        explanation: 'y = ax + b에서 a가 기울기이므로 4입니다.',
        topic: '기울기',
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
      topic: '닮음',
      answerMode: 'trueFalse',
      build: () => ({
        question: '닮은 도형은 대응하는 각의 크기가 같습니다.',
        answerMode: 'trueFalse',
        answer: true,
        explanation: '닮은 도형은 대응각이 같고 대응변의 길이 비가 같습니다.',
        topic: '닮음',
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
      build: () => ({
        question: '가로 7, 세로 4인 직사각형의 넓이는?',
        answerMode: 'numericInput',
        answer: 28,
        explanation: '직사각형의 넓이는 가로 x 세로이므로 28입니다.',
        topic: '도형',
      }),
    },
    {
      topic: '자료',
      answerMode: 'numericInput',
      build: () => ({
        question: '2, 4, 6, 8의 평균은?',
        answerMode: 'numericInput',
        answer: 5,
        explanation: '(2 + 4 + 6 + 8) ÷ 4 = 5입니다.',
        topic: '자료',
      }),
    },
  ];
}

function middleSchoolThreeTemplates(): QuestionTemplate[] {
  return [
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
      topic: '이차식',
      answerMode: 'multipleChoice',
      build: () => ({
        question: '(x + 2)(x + 3)을 전개하면?',
        answerMode: 'multipleChoice',
        answer: 'x^2 + 5x + 6',
        choices: ['x^2 + 5x + 6', 'x^2 + 6x + 5', 'x^2 + x + 6', '2x + 5'],
        explanation: 'x^2 + 3x + 2x + 6 = x^2 + 5x + 6입니다.',
        topic: '이차식',
      }),
    },
    {
      topic: '이차방정식',
      answerMode: 'numericInput',
      build: () => ({
        question: 'x^2 = 16을 만족하는 양수 x는?',
        answerMode: 'numericInput',
        answer: 4,
        explanation: '4 x 4 = 16이므로 양수 해는 4입니다.',
        topic: '이차방정식',
      }),
    },
    {
      topic: '이차함수',
      answerMode: 'numericInput',
      build: () => ({
        question: 'y = x^2에서 x = 3일 때 y는?',
        answerMode: 'numericInput',
        answer: 9,
        explanation: '3^2 = 9입니다.',
        topic: '이차함수',
      }),
    },
    {
      topic: '피타고라스',
      answerMode: 'numericInput',
      build: () => ({
        question: '직각삼각형에서 두 변이 3, 4일 때 빗변은?',
        answerMode: 'numericInput',
        answer: 5,
        explanation: '3-4-5 직각삼각형이므로 빗변은 5입니다.',
        topic: '피타고라스',
      }),
    },
    {
      topic: '원',
      answerMode: 'multipleChoice',
      build: () => ({
        question: '원의 지름은 반지름의 몇 배인가요?',
        answerMode: 'multipleChoice',
        answer: 2,
        explanation: '지름은 반지름 2개를 이은 길이입니다.',
        topic: '원',
      }),
    },
    {
      topic: '참거짓',
      answerMode: 'trueFalse',
      build: () => ({
        question: '모든 양수의 제곱근은 하나뿐입니다.',
        answerMode: 'trueFalse',
        answer: false,
        explanation: '양수의 제곱근은 양수와 음수 두 개입니다.',
        topic: '참거짓',
      }),
    },
    {
      topic: '확률',
      answerMode: 'numericInput',
      build: () => ({
        question: '서로 다른 동전 2개를 던질 때 전체 경우의 수는?',
        answerMode: 'numericInput',
        answer: 4,
        explanation: '각 동전은 2가지 경우가 있으므로 2 x 2 = 4입니다.',
        topic: '확률',
      }),
    },
  ];
}

function highSchoolOneTemplates(): QuestionTemplate[] {
  return [
    {
      topic: '다항식',
      answerMode: 'numericInput',
      build: () => ({
        question: 'x = 2일 때 x^2 + 2x + 1의 값은?',
        answerMode: 'numericInput',
        answer: 9,
        explanation: '2^2 + 2 x 2 + 1 = 9입니다.',
        topic: '다항식',
      }),
    },
    {
      topic: '인수분해',
      answerMode: 'multipleChoice',
      build: () => ({
        question: 'x^2 + 5x + 6을 인수분해하면?',
        answerMode: 'multipleChoice',
        answer: '(x + 2)(x + 3)',
        choices: ['(x + 2)(x + 3)', '(x + 1)(x + 6)', '(x - 2)(x - 3)', 'x(x + 5)'],
        explanation: '2와 3의 합은 5, 곱은 6이므로 (x + 2)(x + 3)입니다.',
        topic: '인수분해',
      }),
    },
    {
      topic: '이차방정식',
      answerMode: 'numericInput',
      build: () => ({
        question: '근이 2, 5인 이차방정식에서 두 근의 합은?',
        answerMode: 'numericInput',
        answer: 7,
        explanation: '두 근의 합은 2 + 5 = 7입니다.',
        topic: '이차방정식',
      }),
    },
    {
      topic: '함수',
      answerMode: 'multipleChoice',
      build: () => ({
        question: '함수 f(x) = 2x + 1에서 f(0)은?',
        answerMode: 'multipleChoice',
        answer: 1,
        explanation: '2 x 0 + 1 = 1입니다.',
        topic: '함수',
      }),
    },
    {
      topic: '집합',
      answerMode: 'trueFalse',
      build: () => ({
        question: '1은 집합 {1, 2, 3}의 원소입니다.',
        answerMode: 'trueFalse',
        answer: true,
        explanation: '{1, 2, 3} 안에 1이 있으므로 원소입니다.',
        topic: '집합',
      }),
    },
    {
      topic: '명제',
      answerMode: 'trueFalse',
      build: () => ({
        question: '짝수는 항상 2로 나누어떨어집니다.',
        answerMode: 'trueFalse',
        answer: true,
        explanation: '짝수의 정의는 2로 나누어떨어지는 정수입니다.',
        topic: '명제',
      }),
    },
    {
      topic: '경우의 수',
      answerMode: 'numericInput',
      build: () => ({
        question: '셔츠 2벌, 바지 3벌로 만들 수 있는 옷차림 수는?',
        answerMode: 'numericInput',
        answer: 6,
        explanation: '2 x 3 = 6가지입니다.',
        topic: '경우의 수',
      }),
    },
    {
      topic: '도형',
      answerMode: 'numericInput',
      build: () => ({
        question: '반지름이 3인 원의 지름은?',
        answerMode: 'numericInput',
        answer: 6,
        explanation: '지름은 반지름의 2배이므로 6입니다.',
        topic: '도형',
      }),
    },
  ];
}

function highSchoolTwoTemplates(): QuestionTemplate[] {
  return [
    {
      topic: '함수',
      answerMode: 'numericInput',
      build: () => ({
        question: 'f(x) = 3x - 2일 때 f(4)는?',
        answerMode: 'numericInput',
        answer: 10,
        explanation: '3 x 4 - 2 = 10입니다.',
        topic: '함수',
      }),
    },
    {
      topic: '지수',
      answerMode: 'numericInput',
      build: () => ({
        question: '2^4의 값은?',
        answerMode: 'numericInput',
        answer: 16,
        explanation: '2를 4번 곱하면 16입니다.',
        topic: '지수',
      }),
    },
    {
      topic: '로그',
      answerMode: 'multipleChoice',
      build: () => ({
        question: 'log_2 8의 값은?',
        answerMode: 'multipleChoice',
        answer: 3,
        explanation: '2^3 = 8이므로 log_2 8 = 3입니다.',
        topic: '로그',
      }),
    },
    {
      topic: '삼각함수',
      answerMode: 'multipleChoice',
      build: () => ({
        question: '직각삼각형에서 sin은 어떤 비율인가요?',
        answerMode: 'multipleChoice',
        answer: '높이/빗변',
        choices: ['높이/빗변', '밑변/빗변', '높이/밑변', '빗변/높이'],
        explanation: 'sin은 기준각에 대한 높이를 빗변으로 나눈 비율입니다.',
        topic: '삼각함수',
      }),
    },
    {
      topic: '확률',
      answerMode: 'numericInput',
      build: () => ({
        question: '동전 3개를 던질 때 전체 경우의 수는?',
        answerMode: 'numericInput',
        answer: 8,
        explanation: '각 동전은 2가지 경우가 있으므로 2^3 = 8입니다.',
        topic: '확률',
      }),
    },
    {
      topic: '통계',
      answerMode: 'multipleChoice',
      build: () => ({
        question: '자료의 흩어진 정도를 나타내는 대표 개념은?',
        answerMode: 'multipleChoice',
        answer: '분산',
        choices: ['분산', '최빈값', '중앙값', '합계'],
        explanation: '분산은 자료가 평균에서 얼마나 흩어졌는지 나타냅니다.',
        topic: '통계',
      }),
    },
    {
      topic: '참거짓',
      answerMode: 'trueFalse',
      build: () => ({
        question: '확률은 항상 0 이상 1 이하입니다.',
        answerMode: 'trueFalse',
        answer: true,
        explanation: '확률은 0부터 1 사이의 값으로 나타냅니다.',
        topic: '참거짓',
      }),
    },
    {
      topic: '수열',
      answerMode: 'numericInput',
      build: () => ({
        question: '첫째항 2, 공차 3인 등차수열의 5번째 항은?',
        answerMode: 'numericInput',
        answer: 14,
        explanation: '2 + (5 - 1) x 3 = 14입니다.',
        topic: '수열',
      }),
    },
  ];
}

function highSchoolThreeTemplates(): QuestionTemplate[] {
  return [
    {
      topic: '수열',
      answerMode: 'numericInput',
      build: () => ({
        question: '첫째항이 3, 공차가 2인 등차수열의 6번째 항은?',
        answerMode: 'numericInput',
        answer: 13,
        explanation: '3 + (6 - 1) x 2 = 13입니다.',
        topic: '수열',
      }),
    },
    {
      topic: '극한',
      answerMode: 'multipleChoice',
      build: () => ({
        question: 'x가 2에 가까워질 때 3x + 1은 어떤 값에 가까워지나요?',
        answerMode: 'multipleChoice',
        answer: 7,
        explanation: '3 x 2 + 1 = 7입니다.',
        topic: '극한',
      }),
    },
    {
      topic: '미분',
      answerMode: 'numericInput',
      build: () => ({
        question: 'f(x) = x^2일 때 f′(3)의 값은?',
        answerMode: 'numericInput',
        answer: 6,
        explanation: 'f′(x) = 2x이므로 f′(3) = 6입니다.',
        topic: '미분',
      }),
    },
    {
      topic: '적분',
      answerMode: 'multipleChoice',
      build: () => ({
        question: '상수함수 y = 3을 x = 0부터 x = 2까지 적분한 값은?',
        answerMode: 'multipleChoice',
        answer: 6,
        explanation: '가로 2, 높이 3인 직사각형의 넓이이므로 6입니다.',
        topic: '적분',
      }),
    },
    {
      topic: '확률',
      answerMode: 'numericInput',
      build: () => ({
        question: '서로 다른 동전 2개를 던질 때 전체 경우의 수는?',
        answerMode: 'numericInput',
        answer: 4,
        explanation: '각 동전은 2가지 경우가 있으므로 2 x 2 = 4입니다.',
        topic: '확률',
      }),
    },
    {
      topic: '조건부확률',
      answerMode: 'trueFalse',
      build: () => ({
        question: '조건부확률은 어떤 조건이 주어졌을 때의 확률입니다.',
        answerMode: 'trueFalse',
        answer: true,
        explanation: '조건부확률은 조건이 있는 상황에서 사건이 일어날 확률입니다.',
        topic: '조건부확률',
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

function elementaryTemplates(stageNumber: number): QuestionTemplate[] {
  if (stageNumber <= 3) {
    return lowerElementaryTemplates();
  }

  if (stageNumber <= 5) {
    return middleElementaryTemplates();
  }

  return upperElementaryTemplates();
}

function middleTemplates(stageNumber: number): QuestionTemplate[] {
  if (stageNumber === 8) {
    return middleSchoolOneTemplates();
  }

  if (stageNumber === 9) {
    return middleSchoolTwoTemplates();
  }

  return middleSchoolThreeTemplates();
}

function highTemplates(stageNumber: number): QuestionTemplate[] {
  if (stageNumber === 11) {
    return highSchoolOneTemplates();
  }

  if (stageNumber === 12) {
    return highSchoolTwoTemplates();
  }

  return highSchoolThreeTemplates();
}

function templatesForStage(stageNumber: number): QuestionTemplate[] {
  if (stageNumber === 1) {
    return earlyTemplates();
  }

  if (stageNumber <= 7) {
    return elementaryTemplates(stageNumber);
  }

  if (stageNumber <= 10) {
    return middleTemplates(stageNumber);
  }

  return highTemplates(stageNumber);
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
