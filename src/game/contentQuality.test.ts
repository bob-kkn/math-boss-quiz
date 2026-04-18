import { buildLearningExplanation } from './contentQuality';

describe('content quality helpers', () => {
  it('uses a natural Korean object particle in generated explanations', () => {
    expect(buildLearningExplanation('기본 해설', '수 세기')).toContain(
      '핵심: 수 세기를 확인하세요.',
    );
    expect(buildLearningExplanation('기본 해설', '분수')).toContain(
      '핵심: 분수를 확인하세요.',
    );
    expect(buildLearningExplanation('기본 해설', '도형')).toContain(
      '핵심: 도형을 확인하세요.',
    );
  });

  it('does not duplicate an existing concept hint', () => {
    expect(
      buildLearningExplanation('이미 핵심: 덧셈을 확인하세요.', '덧셈'),
    ).toBe('이미 핵심: 덧셈을 확인하세요.');
  });
});
