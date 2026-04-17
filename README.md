# 수학 보스전 웹앱

React 기반 수학 퀴즈 게임 MVP입니다.

## 목표

- 1차 목표: 웹앱 MVP 완성
- 핵심 구조: 13단계, 총 104문항, 마지막 스테이지 최종 보스, 클리어 후 보너스 5문제
- 1차 배포 목표: 브라우저에서 플레이 가능

## 현재 MVP 범위

- 유치원부터 고3까지 13단계 생성
- 각 단계 8문항 생성
- 4지선다, 숫자 입력, 참거짓 답안 유형
- 정답 제출
- 점수 표시
- 다음 문제 이동
- 최종 보스와 보너스 레벨 해금

## 실행

```bash
npm install
npm run dev
```

## 검증

```bash
npm test
npm run build
npm run verify:prod
```

## 배포

Vercel 배포 기준:

- Framework Preset: Vite
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`

배포 전 확인:

```bash
npm test
npm run verify:prod
```

`npm run verify:prod`는 TypeScript 검사와 Vite 프로덕션 빌드를 실행한 뒤, 개발 QA 버튼 문구가 번들에 남아 있지 않은지 확인합니다.

## QA 체크리스트

배포 전 [production-qa.md](docs/production-qa.md)를 기준으로 본편, 최종 보스, 보너스, 저장/이어하기, 모바일 화면을 확인합니다.
