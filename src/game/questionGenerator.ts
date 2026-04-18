import {
  BONUS_TIER_NUMBER,
  TOTAL_GENERATED_QUESTIONS,
  createTierMap,
  getGlobalStageNumber,
  getQuestionCountForStage,
  getStageConfig,
  getStageCountForTier,
  getStageKey,
  getTierConfig,
  isBossStage,
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

interface GeneratorOptions {
  seed?: string | number;
}

interface BuildContext {
  tierNumber: number;
  stageNumber: number;
  tierLabel: string;
  topic: string;
  difficulty: number;
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
  const offsets = [-5, -3, -1, 1, 2, 4, 6];
  const choices = new Set<number>([answer]);

  offsets.forEach((offset) => {
    const candidate = Number((answer + offset).toFixed(2));
    choices.add(candidate < 0 ? Math.abs(candidate) + 1 : candidate);
  });

  let cursor = 1;
  while (choices.size < 4) {
    choices.add(Number((answer + cursor).toFixed(2)));
    cursor += 1;
  }

  return shuffleWithRandom([...choices].slice(0, 4), random);
}

function finalizeQuestion(
  context: BuildContext,
  order: number,
  draft: QuestionDraft,
  random: RandomSource,
): Question {
  const boss = isBossStage(context.tierNumber, context.stageNumber);
  const shouldGenerateChoices =
    draft.answerMode === 'multipleChoice' && draft.choices === undefined;

  if (shouldGenerateChoices && typeof draft.answer !== 'number') {
    throw new Error('String multiple choice questions must provide choices.');
  }

  return {
    id: `tier-${context.tierNumber}-stage-${context.stageNumber}-question-${order}`,
    tierNumber: context.tierNumber,
    stageNumber: context.stageNumber,
    globalStageNumber: getGlobalStageNumber(
      context.tierNumber,
      context.stageNumber,
    ),
    order,
    question: draft.question,
    answerMode: draft.answerMode,
    answer: draft.answer,
    choices: shouldGenerateChoices
      ? numberChoices(draft.answer as number, random)
      : draft.choices
        ? shuffleWithRandom(draft.choices, random)
        : undefined,
    explanation: draft.explanation,
    topic: boss ? `${draft.topic} 보스` : draft.topic,
    level: context.tierLabel,
    isBoss: boss,
    numericTolerance: 0,
  };
}

function earlyDrafts(context: BuildContext): QuestionDraft[] {
  const base = context.stageNumber + context.tierNumber;
  const next = base + 1;
  const sum = base + 2;

  return [
    {
      question: `${context.tierLabel} 바구니에 ${base}개와 1개를 합치면 몇 개인가요?`,
      answerMode: 'multipleChoice',
      answer: next,
      explanation: `${base} 다음 수는 ${next}입니다.`,
      topic: '수 세기',
    },
    {
      question: `${context.tierLabel} 접시에 있는 ${sum}개 중 1개를 빼면 몇 개인가요?`,
      answerMode: 'multipleChoice',
      answer: sum - 1,
      explanation: `${sum}에서 1을 빼면 ${sum - 1}입니다.`,
      topic: '빼기 감각',
    },
    {
      question: `${context.tierLabel} 숫자 카드에서 ${next}은 ${base}보다 큽니다.`,
      answerMode: 'trueFalse',
      answer: true,
      explanation: `${next}은 ${base}보다 1 큰 수입니다.`,
      topic: '크기 비교',
    },
    {
      question: `${context.tierLabel} ${base}번 그림판에서 동그라미처럼 모서리가 없는 도형은 무엇인가요?`,
      answerMode: 'multipleChoice',
      answer: '원',
      choices: ['원', '삼각형', '사각형', '별'],
      explanation: '모서리가 없이 둥근 도형은 원입니다.',
      topic: '모양',
    },
    {
      question: `${context.tierLabel} 규칙 카드: ${base}, ${next}, ?`,
      answerMode: 'multipleChoice',
      answer: next + 1,
      explanation: '1씩 커지는 순서입니다.',
      topic: '규칙',
    },
    {
      question: `${context.tierLabel} 놀이에서 사탕 ${base}개를 받고 2개를 더 받았습니다. 모두 몇 개인가요?`,
      answerMode: 'multipleChoice',
      answer: base + 2,
      explanation: `${base} + 2 = ${base + 2}입니다.`,
      topic: '생활 문제',
    },
    {
      question: `${context.tierLabel} 숫자 길에서 ${base + 3} 바로 앞의 수는 ${base + 2}입니다.`,
      answerMode: 'trueFalse',
      answer: true,
      explanation: `${base + 3}보다 1 작은 수는 ${base + 2}입니다.`,
      topic: '참거짓',
    },
    {
      question: `${context.tierLabel} ${sum}번 도형 카드에서 변이 3개인 도형은 무엇인가요?`,
      answerMode: 'multipleChoice',
      answer: '삼각형',
      choices: ['삼각형', '사각형', '원', '육각형'],
      explanation: '변이 3개인 도형은 삼각형입니다.',
      topic: '도형',
    },
  ];
}

function elementaryDrafts(context: BuildContext): QuestionDraft[] {
  const a = context.tierNumber + context.stageNumber + 4;
  const b = Math.max(2, context.stageNumber + 2);
  const product = a * b;
  const divisor = b;
  const quotient = context.tierNumber + context.stageNumber + 3;
  const denominator = context.tierNumber + context.stageNumber + 2;
  const sequenceStep = context.tierNumber - 1;

  return [
    {
      question: `${a} + ${b} = ?`,
      answerMode: 'multipleChoice',
      answer: a + b,
      explanation: `${a}에 ${b}를 더하면 ${a + b}입니다.`,
      topic: '덧셈',
    },
    {
      question: `${a + b + 5} - ${b} = ?`,
      answerMode: 'multipleChoice',
      answer: a + 5,
      explanation: `${a + b + 5}에서 ${b}를 빼면 ${a + 5}입니다.`,
      topic: '뺄셈',
    },
    {
      question: `${a} x ${b} = ?`,
      answerMode: 'multipleChoice',
      answer: product,
      explanation: `${a}을 ${b}번 더하면 ${product}입니다.`,
      topic: '곱셈',
    },
    {
      question: `${quotient * divisor} ÷ ${divisor} = ?`,
      answerMode: 'numericInput',
      answer: quotient,
      explanation: `${divisor} x ${quotient} = ${quotient * divisor}입니다.`,
      topic: '나눗셈',
    },
    {
      question: `${context.tierLabel} 분수판을 똑같이 ${denominator}칸으로 나눈 것 중 1칸은?`,
      answerMode: 'multipleChoice',
      answer: `1/${denominator}`,
      choices: [
        `1/${denominator}`,
        `1/${denominator - 1}`,
        `2/${denominator}`,
        `${denominator}/1`,
      ],
      explanation: `${denominator}칸 중 1칸은 1/${denominator}입니다.`,
      topic: '분수',
    },
    {
      question: `${a}, ${a + sequenceStep}, ${a + sequenceStep * 2}, ?`,
      answerMode: 'numericInput',
      answer: a + sequenceStep * 3,
      explanation: `${sequenceStep}씩 커지는 규칙입니다.`,
      topic: '규칙',
    },
    {
      question: `가로 ${a}, 세로 ${b}인 직사각형의 넓이는 가로 x 세로로 구합니다.`,
      answerMode: 'trueFalse',
      answer: true,
      explanation: '직사각형의 넓이는 가로와 세로를 곱합니다.',
      topic: '도형',
    },
    {
      question: `${context.tierLabel} 간식 봉지에 ${b}개씩 든 과자가 ${context.stageNumber + 2}개 있습니다. 모두 몇 개인가요?`,
      answerMode: 'multipleChoice',
      answer: b * (context.stageNumber + 2),
      explanation: `${b} x ${context.stageNumber + 2} = ${b * (context.stageNumber + 2)}입니다.`,
      topic: '문장제',
    },
  ];
}

function middleSchoolDrafts(context: BuildContext): QuestionDraft[] {
  const x = (context.tierNumber - 9) * 10 + context.stageNumber;
  const y = context.tierNumber - 8;
  const slope = y + 1;
  const coefficientA = context.stageNumber + 1;
  const coefficientB = context.tierNumber - 7;
  const root = (context.tierNumber - 9) * 10 + context.stageNumber + 2;
  const redBalls = y;
  const blueBalls = x;
  const threshold = x + 2;
  const candidate = threshold - y;

  return [
    {
      question: `${x + 4} + (-${x}) = ?`,
      answerMode: 'numericInput',
      answer: 4,
      explanation: `${x + 4}에서 ${x}를 빼면 4입니다.`,
      topic: '정수',
    },
    {
      question: `z + ${x} = ${x + y + 5}일 때 z의 값은?`,
      answerMode: 'numericInput',
      answer: y + 5,
      explanation: `${x + y + 5}에서 ${x}를 빼면 ${y + 5}입니다.`,
      topic: '일차방정식',
    },
    {
      question: `${coefficientA}a + ${coefficientB}a를 간단히 하면?`,
      answerMode: 'multipleChoice',
      answer: `${coefficientA + coefficientB}a`,
      choices: [
        `${coefficientA + coefficientB}a`,
        `${coefficientA * coefficientB}a`,
        `${coefficientA + coefficientB}a^2`,
        `a + ${coefficientA + coefficientB}`,
      ],
      explanation: '같은 문자끼리는 계수만 더합니다.',
      topic: '문자식',
    },
    {
      question: `y = ${slope}x + ${context.stageNumber}에서 x = 3일 때 y는?`,
      answerMode: 'numericInput',
      answer: slope * 3 + context.stageNumber,
      explanation: `${slope} x 3 + ${context.stageNumber} = ${slope * 3 + context.stageNumber}입니다.`,
      topic: '함수',
    },
    {
      question: `√${root * root}의 값은?`,
      answerMode: 'multipleChoice',
      answer: root,
      explanation: `${root} x ${root} = ${root * root}입니다.`,
      topic: '제곱근',
    },
    {
      question: `빨간 구슬 ${redBalls}개와 파란 구슬 ${blueBalls}개 중 빨간 구슬을 뽑을 확률은?`,
      answerMode: 'multipleChoice',
      answer: `${redBalls}/${redBalls + blueBalls}`,
      choices: [
        `${redBalls}/${redBalls + blueBalls}`,
        `${blueBalls}/${redBalls + blueBalls}`,
        `${redBalls + 1}/${redBalls + blueBalls}`,
        `${redBalls}/${blueBalls}`,
      ],
      explanation: `전체 ${redBalls + blueBalls}개 중 빨간 구슬은 ${redBalls}개입니다.`,
      topic: '확률',
    },
    {
      question: `x > ${threshold}이면 x = ${candidate}는 해가 될 수 있습니다.`,
      answerMode: 'trueFalse',
      answer: false,
      explanation: `${candidate}는 ${threshold}보다 크지 않습니다.`,
      topic: '부등식',
    },
    {
      question: `가로 ${x + 3}, 세로 ${y + 4}인 직사각형의 넓이는?`,
      answerMode: 'numericInput',
      answer: (x + 3) * (y + 4),
      explanation: `넓이는 ${x + 3} x ${y + 4}입니다.`,
      topic: '도형',
    },
  ];
}

function highSchoolDrafts(context: BuildContext): QuestionDraft[] {
  const x = (context.tierNumber - 12) * 10 + context.stageNumber;
  const p = (context.tierNumber - 12) * 10 + 1;
  const q = context.stageNumber + 1;
  const difference = (context.tierNumber - 12) * 10 + context.stageNumber + 1;
  const logBase = context.tierNumber - 11;
  const logExponent = context.stageNumber + 1;
  const probabilityNumerator = context.tierNumber - 12;
  const probabilityDenominator = probabilityNumerator + context.stageNumber + 2;
  const height = context.tierNumber - 10;
  const width = context.stageNumber + 1;

  return [
    {
      question: `x = ${x}일 때 x^2 + 2x + 1의 값은?`,
      answerMode: 'numericInput',
      answer: x * x + 2 * x + 1,
      explanation: `${x}^2 + 2 x ${x} + 1 = ${x * x + 2 * x + 1}입니다.`,
      topic: '다항식',
    },
    {
      question: `x^2 + ${p + q}x + ${p * q}을 인수분해하면?`,
      answerMode: 'multipleChoice',
      answer: `(x + ${p})(x + ${q})`,
      choices: [
        `(x + ${p})(x + ${q})`,
        `(x + ${p + 1})(x + ${q - 1})`,
        `(x - ${p})(x - ${q})`,
        `x(x + ${p + q})`,
      ],
      explanation: `${p}와 ${q}의 합은 ${p + q}, 곱은 ${p * q}입니다.`,
      topic: '인수분해',
    },
    {
      question: `f(x) = 3x - ${p}일 때 f(${x})는?`,
      answerMode: 'numericInput',
      answer: 3 * x - p,
      explanation: `3 x ${x} - ${p} = ${3 * x - p}입니다.`,
      topic: '함수',
    },
    {
      question: `첫째항 2, 공차 ${difference}인 등차수열의 5번째 항은?`,
      answerMode: 'numericInput',
      answer: 2 + 4 * difference,
      explanation: `2 + (5 - 1) x ${difference} = ${2 + 4 * difference}입니다.`,
      topic: '수열',
    },
    {
      question: `log_${logBase} ${logBase ** logExponent}의 값은?`,
      answerMode: 'multipleChoice',
      answer: logExponent,
      explanation: `${logBase}^${logExponent} = ${logBase ** logExponent}입니다.`,
      topic: '로그',
    },
    {
      question: `확률 ${probabilityNumerator}/${probabilityDenominator}은 0 이상 1 이하입니다.`,
      answerMode: 'trueFalse',
      answer: true,
      explanation: '확률은 0부터 1 사이의 값입니다.',
      topic: '확률',
    },
    {
      question: `f(x) = x^2일 때 f′(${x})의 값은?`,
      answerMode: 'numericInput',
      answer: 2 * x,
      explanation: `f′(x) = 2x이므로 f′(${x}) = ${2 * x}입니다.`,
      topic: '미분',
    },
    {
      question: `상수함수 y = ${height}을 x = 0부터 x = ${width}까지 적분한 값은?`,
      answerMode: 'multipleChoice',
      answer: height * width,
      explanation: `가로 ${width}, 높이 ${height}인 직사각형의 넓이입니다.`,
      topic: '적분',
    },
  ];
}

function universityDrafts(context: BuildContext): QuestionDraft[] {
  const n = context.stageNumber + 1;
  const dimension = context.stageNumber + 2;
  const exponent = context.stageNumber + 2;
  const constant = context.stageNumber + 4;
  const width = context.stageNumber;
  const mean = context.stageNumber - 5;

  return [
    {
      question: `2x + 3 = ${2 * n + 3}일 때 x는?`,
      answerMode: 'numericInput',
      answer: n,
      explanation: `${2 * n + 3} - 3을 2로 나누면 ${n}입니다.`,
      topic: '선형방정식',
    },
    {
      question: `${dimension}x${dimension} 단위행렬의 대각 원소의 합은?`,
      answerMode: 'numericInput',
      answer: dimension,
      explanation: `단위행렬의 대각 원소 ${dimension}개가 모두 1이므로 합은 ${dimension}입니다.`,
      topic: '선형대수',
    },
    {
      question: `함수 f(x) = x^${exponent}의 도함수는?`,
      answerMode: 'multipleChoice',
      answer: `${exponent}x^${exponent - 1}`,
      choices: [
        `${exponent}x^${exponent - 1}`,
        `x^${exponent - 1}`,
        `${exponent - 1}x^${exponent}`,
        `x^${exponent} + 1`,
      ],
      explanation: `x^${exponent}을 미분하면 ${exponent}x^${exponent - 1}입니다.`,
      topic: '미분',
    },
    {
      question: `상수 ${constant}를 0부터 ${width}까지 적분한 값은?`,
      answerMode: 'numericInput',
      answer: constant * width,
      explanation: `높이 ${constant}, 폭 ${width}인 직사각형의 넓이입니다.`,
      topic: '적분',
    },
    {
      question: `서로 독립인 사건 A_${n}, B_${n}에 대해 P(A_${n}∩B_${n})=P(A_${n})P(B_${n})입니다.`,
      answerMode: 'trueFalse',
      answer: true,
      explanation: '독립 사건의 곱셈정리입니다.',
      topic: '확률',
    },
    {
      question: `n = ${n}일 때 2^n의 값은?`,
      answerMode: 'numericInput',
      answer: 2 ** n,
      explanation: `2를 ${n}번 곱합니다.`,
      topic: '이산수학',
    },
    {
      question: `정${n + 2}각형의 순환 그래프에서 모든 꼭짓점의 차수는 2입니다.`,
      answerMode: 'trueFalse',
      answer: true,
      explanation: '모든 꼭짓점 차수가 2인 연결 그래프는 사이클입니다.',
      topic: '그래프',
    },
    {
      question: `평균이 ${mean}인 정규분포가 대칭이면 중앙값은?`,
      answerMode: 'numericInput',
      answer: mean,
      explanation: `대칭인 정규분포에서는 평균과 중앙값이 ${mean}으로 같습니다.`,
      topic: '통계',
    },
  ];
}

function graduateDrafts(context: BuildContext): QuestionDraft[] {
  const n = context.stageNumber + 2;

  return [
    {
      question: `연산 구조 G_${n}이 군이라면 항등원은 하나뿐입니다.`,
      answerMode: 'trueFalse',
      answer: true,
      explanation: '항등원이 둘이라고 가정하면 서로 같음을 보일 수 있습니다.',
      topic: '추상대수',
    },
    {
      question: `거리공간 X_${n}에서 모든 코시 수열이 수렴하는 성질을 무엇이라 하나요?`,
      answerMode: 'multipleChoice',
      answer: '완비공간',
      choices: ['완비공간', '공집합', '부분공간', '영공간'],
      explanation: '코시 수열이 항상 수렴하는 공간은 완비공간입니다.',
      topic: '해석학',
    },
    {
      question: `볼록함수 f(x)=(x-${n})^2의 전역 최소점 x는?`,
      answerMode: 'numericInput',
      answer: n,
      explanation: `(x-${n})^2은 x = ${n}에서 최솟값을 가집니다.`,
      topic: '최적화',
    },
    {
      question: `모든 간선 가중치가 ${n} 이상인 최단거리 문제에는 다익스트라 알고리즘을 쓸 수 있습니다.`,
      answerMode: 'trueFalse',
      answer: true,
      explanation: '간선 가중치가 음수가 아니면 다익스트라를 사용할 수 있습니다.',
      topic: '알고리즘',
    },
    {
      question: `차원이 ${n}인 벡터공간의 표준기저 벡터 개수는?`,
      answerMode: 'numericInput',
      answer: n,
      explanation: '차원은 기저 벡터의 개수입니다.',
      topic: '선형대수',
    },
    {
      question: `연속함수 f_${n}과 g_${n}의 합은 항상 연속입니다.`,
      answerMode: 'trueFalse',
      answer: true,
      explanation: '연속함수들의 합도 연속함수입니다.',
      topic: '해석학',
    },
    {
      question: `P 대 NP 문제는 ${2000 + n}년에 일반적으로 해결되었습니다.`,
      answerMode: 'trueFalse',
      answer: false,
      explanation: 'P 대 NP는 아직 해결되지 않은 대표 난제입니다.',
      topic: '계산이론',
    },
    {
      question: `행렬식이 ${n}인 정사각행렬은 무엇을 가질까요?`,
      answerMode: 'multipleChoice',
      answer: '역행렬',
      choices: ['역행렬', '항상 영행렬', '무한한 행렬식', '음수 차원'],
      explanation: '행렬식이 0이 아니면 역행렬이 존재합니다.',
      topic: '행렬',
    },
  ];
}

function bonusDrafts(context: BuildContext): QuestionDraft[] {
  const n = context.stageNumber + 2;

  return [
    {
      question: `난제 감각: n = ${n}일 때 2^n + 2^n의 값은?`,
      answerMode: 'numericInput',
      answer: 2 ** (n + 1),
      explanation: '같은 항을 두 번 더하면 2 x 2^n = 2^(n+1)입니다.',
      topic: '거듭제곱 추론',
    },
    {
      question: '모든 짝수는 두 소수의 합으로 표현된다는 명제는 골드바흐 추측입니다.',
      answerMode: 'trueFalse',
      answer: true,
      explanation: '골드바흐 추측은 대표적인 미해결 문제입니다.',
      topic: '수론 난제',
    },
    {
      question: '리만 가설은 모든 자연수가 소수라는 주장입니다.',
      answerMode: 'trueFalse',
      answer: false,
      explanation: '리만 가설은 제타함수의 비자명한 영점 위치에 대한 명제입니다.',
      topic: '리만 가설',
    },
    {
      question: `피보나치 수열 1, 1, 2, 3, 5, ?의 다음 수는?`,
      answerMode: 'multipleChoice',
      answer: 8,
      explanation: '앞의 두 수를 더해 다음 수를 만듭니다.',
      topic: '수열 추론',
    },
    {
      question: 'NP-완전 문제는 모든 문제가 빠르게 풀린다는 뜻입니다.',
      answerMode: 'trueFalse',
      answer: false,
      explanation: 'NP-완전은 NP 문제 중 가장 어려운 축에 속하는 문제군입니다.',
      topic: '계산 복잡도',
    },
    {
      question: `정수 ${n}과 ${n + 1}은 서로소입니다.`,
      answerMode: 'trueFalse',
      answer: true,
      explanation: '연속한 두 정수의 최대공약수는 항상 1입니다.',
      topic: '수론',
    },
    {
      question: `x^2 = ${n * n}을 만족하는 양수 x는?`,
      answerMode: 'numericInput',
      answer: n,
      explanation: `${n} x ${n} = ${n * n}입니다.`,
      topic: '역추론',
    },
    {
      question: '보너스 보스: 증명에서 반례 하나는 보편 명제를 깨뜨릴 수 있습니다.',
      answerMode: 'trueFalse',
      answer: true,
      explanation: '모든 경우에 대한 명제는 반례 하나로 거짓임을 보일 수 있습니다.',
      topic: '증명 감각',
    },
    {
      question: `난제 감각: ${n}개의 점을 모두 서로 연결하면 선분은 몇 개인가요?`,
      answerMode: 'numericInput',
      answer: (n * (n - 1)) / 2,
      explanation: `서로 다른 두 점을 고르는 경우의 수이므로 ${n} x ${n - 1} ÷ 2입니다.`,
      topic: '조합 추론',
    },
    {
      question: '난제 감각: 증명이 없는 직감은 정답을 보장하지 않습니다.',
      answerMode: 'trueFalse',
      answer: true,
      explanation: '수학에서는 직감보다 논리적 증명이나 반례 검사가 우선입니다.',
      topic: '논리 검증',
    },
  ];
}

function bossDrafts(context: BuildContext): QuestionDraft[] {
  const base = context.tierNumber * 3 + context.stageNumber;
  const trap = base + 4;
  const bonusLike = context.tierNumber === BONUS_TIER_NUMBER;

  if (bonusLike) {
    return bonusDrafts(context).map((draft) => ({
      ...draft,
      question: `보너스 보스전: ${draft.question}`,
      topic: `${draft.topic} 심화`,
    }));
  }

  return [
    {
      question: `보스전: ${base} + ${trap} - ${base} = ?`,
      answerMode: 'multipleChoice',
      answer: trap,
      explanation: `${base}를 더했다가 다시 빼므로 ${trap}만 남습니다.`,
      topic: '계산 함정',
    },
    {
      question: `보스전: ${base} x 0 + ${trap} = ?`,
      answerMode: 'numericInput',
      answer: trap,
      explanation: '어떤 수에 0을 곱하면 0이므로 뒤의 수만 남습니다.',
      topic: '연산 순서',
    },
    {
      question: `보스전: ${trap}은 ${trap - 1}보다 작습니다.`,
      answerMode: 'trueFalse',
      answer: false,
      explanation: `${trap}은 ${trap - 1}보다 큽니다.`,
      topic: '비교 함정',
    },
    {
      question: `보스전: ${base}번 함정에서 "아닌 것"을 물으면 맞는 설명을 고르면 됩니다.`,
      answerMode: 'trueFalse',
      answer: false,
      explanation: '"아닌 것"은 틀린 설명을 골라야 합니다.',
      topic: '문장 해석',
    },
    {
      question: `보스전: ${base}, ${base + 2}, ${base + 4}, ?`,
      answerMode: 'multipleChoice',
      answer: base + 6,
      explanation: '2씩 커지는 규칙입니다.',
      topic: '규칙 심화',
    },
    {
      question: `보스전: ${base + 10}에서 ${base}를 빼고 1을 더하면?`,
      answerMode: 'numericInput',
      answer: 11,
      explanation: `${base + 10} - ${base} + 1 = 11입니다.`,
      topic: '복합 계산',
    },
    {
      question: `보스전: 한 변이 ${base}인 모든 정사각형은 직사각형입니다.`,
      answerMode: 'trueFalse',
      answer: true,
      explanation: '정사각형은 네 각이 직각이므로 직사각형의 조건을 만족합니다.',
      topic: '개념 함정',
    },
    {
      question: `보스전: ${base}명이 2명씩 팀을 만들면 남는 사람이 없다는 말은 ${base}가 짝수라는 뜻입니다.`,
      answerMode: 'trueFalse',
      answer: base % 2 === 0,
      explanation: '2명씩 나누어 남지 않으면 짝수입니다.',
      topic: '응용 판단',
    },
  ];
}

function standardDrafts(context: BuildContext): QuestionDraft[] {
  if (context.tierNumber <= 3) {
    return earlyDrafts(context);
  }

  if (context.tierNumber <= 9) {
    return elementaryDrafts(context);
  }

  if (context.tierNumber <= 12) {
    return middleSchoolDrafts(context);
  }

  if (context.tierNumber <= 15) {
    return highSchoolDrafts(context);
  }

  if (context.tierNumber === 16) {
    return universityDrafts(context);
  }

  if (context.tierNumber === 17) {
    return graduateDrafts(context);
  }

  return bonusDrafts(context);
}

function buildQuestionDrafts(context: BuildContext): QuestionDraft[] {
  return isBossStage(context.tierNumber, context.stageNumber)
    ? bossDrafts(context)
    : standardDrafts(context);
}

export function generateStageQuestions(
  tierNumber: number,
  stageNumber: number,
  options: GeneratorOptions = {},
): Question[] {
  const tier = getTierConfig(tierNumber);
  const stage = getStageConfig(tierNumber, stageNumber);
  const context: BuildContext = {
    tierNumber,
    stageNumber,
    tierLabel: tier.label,
    topic: stage.topic,
    difficulty: getGlobalStageNumber(tierNumber, stageNumber),
  };
  const random = createSeededRandom(
    options.seed ?? `tier-${tierNumber}-stage-${stageNumber}`,
  );
  const drafts = buildQuestionDrafts(context);
  const questionCount = getQuestionCountForStage(tierNumber, stageNumber);

  if (drafts.length !== questionCount) {
    throw new Error(
      `Tier ${tierNumber} stage ${stageNumber} must have ${questionCount} questions.`,
    );
  }

  return drafts.map((draft, index) =>
    finalizeQuestion(context, index + 1, draft, random),
  );
}

export function generateTierQuestions(
  tierNumber: number,
  options: GeneratorOptions = {},
): Record<number, Question[]> {
  return Array.from({ length: getStageCountForTier(tierNumber) }, (_, index) => {
    const stageNumber = index + 1;
    return [
      stageNumber,
      generateStageQuestions(tierNumber, stageNumber, {
        seed: `${options.seed ?? 'tier'}-${tierNumber}-${stageNumber}`,
      }),
    ] as const;
  }).reduce<Record<number, Question[]>>((acc, [stageNumber, questions]) => {
    acc[stageNumber] = questions;
    return acc;
  }, {});
}

export function generateAllStageQuestions(
  options: GeneratorOptions = {},
): Record<string, Question[]> {
  return createTierMap().reduce<Record<string, Question[]>>((acc, tier) => {
    Array.from(
      { length: getStageCountForTier(tier.tierNumber) },
      (_, index) => index + 1,
    ).forEach((stageNumber) => {
      acc[getStageKey(tier.tierNumber, stageNumber)] = generateStageQuestions(
        tier.tierNumber,
        stageNumber,
        {
          seed: `${options.seed ?? 'all'}-${tier.tierNumber}-${stageNumber}`,
        },
      );
    });

    return acc;
  }, {});
}

export function generateBonusQuestions(
  options: GeneratorOptions = {},
): Question[] {
  return generateStageQuestions(BONUS_TIER_NUMBER, 1, {
    seed: options.seed ?? 'bonus',
  });
}

export function getTotalGeneratedQuestionCount(): number {
  return TOTAL_GENERATED_QUESTIONS;
}

export { TOTAL_GENERATED_QUESTIONS };
