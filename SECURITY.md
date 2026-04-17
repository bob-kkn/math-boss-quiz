# Security Policy

## Supported Versions

현재 이 저장소는 최신 기본 브랜치 기준으로만 보안 수정과 유지보수를 제공합니다.

| Version | Supported |
| --- | --- |
| `main` | Yes |
| Older snapshots / forks | No |

## Reporting a Vulnerability

보안 취약점이 의심되는 내용을 발견하셨다면, 공개 Issue로 올리지 말아 주세요.

가능하면 GitHub의 private vulnerability reporting 기능을 사용해 비공개로 제보해 주세요.
해당 기능이 활성화되어 있지 않다면 아래 연락처로 제보해 주세요.

- 메인테이너: `bob-kkn`

제보에는 가능하면 아래 정보를 포함해 주세요.

- 취약점 요약
- 재현 방법
- 영향 범위
- 테스트 환경
- 필요한 경우 스크린샷 또는 로그

확인 후 가능한 범위에서 접수 사실을 안내하고, 우선순위를 판단해 수정 일정을 결정하겠습니다.

## Disclosure Policy

유지보수자가 수정 또는 완화 방안을 준비할 수 있도록, 공개 공유 전에는 먼저 비공개 제보를 부탁드립니다.

## Scope

이 정책은 이 저장소의 소스 코드와 배포 산출물에 적용됩니다.
서드파티 의존성의 취약점은 각 패키지의 upstream 공지를 함께 확인해 주세요.

## Secrets

토큰, API 키, 인증 정보, `.env` 파일 내용은 절대 커밋하지 마세요.
실수로 노출되었다면 즉시 값 회전(rotating) 후 유지보수자에게 알려 주세요.
