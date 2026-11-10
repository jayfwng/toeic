# 토익 단어 900

2027년 2월 TOEIC 900점을 위한 **빈출 단어 암기 전용** 모바일 웹앱(PWA)입니다.
백엔드 없이 폰 안(IndexedDB)에 학습 기록을 저장하고, 설치 후에는 오프라인에서도 동작합니다.

- 플래시카드(스와이프 알아요/몰라요), 4지선다, 철자 입력, 예문 빈칸 채우기
- SM-2 기반 복습 스케줄 · 홈 화면에 **오늘 복습할 단어 N개**
- 빈출 순위 순 신규 단어 (하루 목표 기본 30개, 설정에서 변경)
- 틀린 단어 → 자동으로 **오답 단어장** 등록, 복습 간격 최대 3일, 3연속 정답 시 해제
- '이미 아는 단어' 한 번에 제외 · 발음 듣기(TTS) · 다크모드
- 연속 학습일, 암기 완료 수, 상위 100/300/500… 구간별 진행률, D-day와 하루 필요 학습량
- 단어 추가/수정/삭제, CSV 가져오기/내보내기(학습 기록 백업 포함)

---

## 1. 실행 방법

Node.js 20 이상이 필요합니다.

```bash
npm install
npm run dev          # 개발 서버 → http://localhost:3000
```

배포용 빌드(정적 사이트 + 오프라인용 서비스워커):

```bash
npm run build        # out/ 폴더 생성
npm start            # out/ 을 http://localhost:3000 으로 서빙
```

> 서비스워커(오프라인)는 `npm run build` 결과물에서만 동작합니다. `npm run dev`에서는 꺼져 있어요.

검사:

```bash
npm test             # 단위 테스트 (SRS, 큐, CSV, 통계, words.json 검증)
npm run validate     # content/words.json 형식 검사
npm run typecheck
npm run e2e          # 실제 브라우저로 '플래시카드 → 퀴즈 → 다음 날 복습 → 오프라인' 흐름 확인
                     # (먼저 npm run build 후 npx serve out -l 3123 실행, Playwright 필요)
```

---

## 2. 폰에 설치하기

PWA 설치에는 **HTTPS 주소**가 필요합니다. 가장 쉬운 방법은 이 저장소를 GitHub Pages로 배포하는 것입니다.

### GitHub Pages 배포 (무료)

1. 이 저장소의 **Settings → Pages → Build and deployment → Source** 를 **GitHub Actions** 로 바꿉니다.
2. `main` 브랜치에 push하면 `.github/workflows/deploy.yml` 이 자동으로 검증·테스트·빌드·배포합니다.
3. 배포 주소: `https://<GitHub 아이디>.github.io/<저장소 이름>/`

(Vercel/Netlify를 쓴다면 빌드 명령 `npm run build`, 출력 폴더 `out` 으로 설정하면 됩니다. 루트 도메인이면 `NEXT_PUBLIC_BASE_PATH` 는 필요 없습니다.)

### 홈 화면에 추가

- **iPhone (Safari)**: 주소 열기 → 아래쪽 공유 버튼 → **홈 화면에 추가**
- **Android (Chrome)**: 주소 열기 → 오른쪽 위 ⋮ → **앱 설치** (또는 홈 화면에 추가)

한 번 열어 두면 모든 화면과 단어가 캐시되어 지하철 등 오프라인에서도 학습할 수 있습니다.

### 백업 (중요)

학습 기록은 **그 폰의 그 브라우저 안에만** 저장됩니다. 폰을 바꾸거나 브라우저 데이터를 지우기 전에
**홈 → 오른쪽 위 목록 아이콘(단어 관리) → 단어+기록 내보내기 / 일별 기록 내보내기** 로 CSV를 받아 두세요.
새 폰에서 **CSV 가져오기** 로 두 파일을 불러오면 SRS 일정·오답장·연속 학습일이 그대로 복원됩니다.

---

## 3. 단어 추가 방법

단어 콘텐츠는 `content/words.json`, 학습 기록은 IndexedDB에 **따로** 저장됩니다.
words.json을 늘려도 기존 학습 기록은 그대로 유지됩니다.

### A. 앱에서 직접 추가/수정 (내 폰에만 반영)

홈 → 오른쪽 위 목록 아이콘(**단어 관리**) → **+ 추가**.
수정·삭제도 같은 화면에서 단어를 눌러서 합니다. 앱에서 바꾼 내용은 words.json 위에 덮어쓰는 '수정 레이어'로 저장됩니다.

### B. CSV로 한꺼번에 추가

엑셀/구글 시트에서 아래 헤더로 만든 뒤 **CSV 가져오기** 를 누르세요. 목록 칸은 ` | ` 로 구분합니다.

```csv
word,pos,meanings,example_en,example_ko,rank,parts,synonyms,collocations
allocate,v,할당하다 | 배분하다,The manager allocated more staff to the night shift.,관리자가 야간 근무에 직원을 더 배치했다.,301,Part5 | Part7,assign | distribute,allocate funds
```

- `pos`: `n` `v` `adj` `adv` `prep` `conj` `phr`
- `parts`: `Part5` `Part6` `Part7` `LC`
- `example_en` 에는 표제어(또는 -s/-ed/-ing 같은 규칙 활용형)가 들어 있어야 합니다 (빈칸 문제에 사용).
- 내보낸 CSV를 편집해서 다시 가져와도 됩니다.

### C. AI로 대량 생성해 words.json에 병합 (500~1000개 확장용)

`scripts/generate-words.ts` 가 Anthropic API로 비즈니스 영어 빈출 단어를 생성합니다.
기존 단어를 제외 목록으로 넘기고, 결과는 **필드 검증 → 중복 제거 → rank 이어 붙이기** 후 저장합니다.

```bash
export ANTHROPIC_API_KEY=sk-ant-...

npm run generate -- --count 50 --dry-run   # 먼저 미리보기 (파일 저장 안 함)
npm run generate -- --count 200            # 200개 추가 (50개씩 나눠 요청)
npm run generate -- --target 1000          # 전체 1000개가 될 때까지 추가
npm run validate                           # 결과 확인
```

- 기본 모델은 `claude-opus-5-5` 이며 `WORDS_MODEL` 환경변수로 바꿀 수 있습니다.
- 정책상 거절된 요청은 서버 쪽 대체 모델로 자동 재시도합니다 (`fallbacks: "default"`).
- 예문에 표제어가 없거나 형식이 틀린 단어는 자동으로 빠지고 이유가 출력됩니다.
- 생성 후 `git diff content/words.json` 으로 뜻과 예문을 한 번 훑어보고 커밋하세요. 배포하면 폰에 반영됩니다.

---

## 학습 규칙 (SRS)

| 학습 방식 | 응답 → 점수(quality) |
|---|---|
| 플래시카드 | 알아요(→ 스와이프) 4 / 몰라요(← 스와이프) 1 |
| 4지선다 · 빈칸 | 정답 4 / 오답 1 |
| 철자 입력 | 정답 5 / 오답 1 |

- 정답: SM-2 표준 (1일 → 6일 → 간격 × EF)
- 오답: 연속 정답 횟수 초기화, EF −0.2, 같은 세션에서 다시 출제, 내일 복습, 오답장 등록
- 오답장 단어: 간격 최대 3일, 3회 연속 정답이면 해제
- 같은 날 다시 맞히면 일정은 그대로 (연습으로 간주), 그날 처음 틀리면 오답 처리
- **암기 완료** = 복습 간격 21일 이상
- **추천 학습**: 신규 단어는 5개씩 카드로 익힌 뒤 바로 4지선다로 확인, 복습 단어는 퀴즈 유형을 섞어 출제
- **하루 필요 학습량** = (목표 단어 수 − 시작한 단어 수) ÷ (시험일까지 남은 일수 − 7일). 마지막 1주는 복습용으로 남겨 둡니다.
  시험일(기본 2027-02-28)과 목표 단어 수는 **설정**에서 바꿀 수 있습니다.

## 폴더 구조

```
content/words.json        단어 콘텐츠 (시드 300개, 뜻풀이·예문 모두 직접 작성)
scripts/generate-words.ts AI 단어 생성·검증·병합
scripts/validate-words.ts words.json 검증
scripts/build-sw.mjs      빌드 후 오프라인용 서비스워커 생성 (sw.template.js 사용)
src/app/                  화면: 홈, 학습, 오답, 통계, 단어 관리, 설정
src/components/           플래시카드, 퀴즈 3종, 학습 세션 등
src/lib/                  srs.ts(SM-2), queue.ts(오늘 큐), db.ts(Dexie), csv.ts, stats.ts, validate.ts
tests/                    단위 테스트(vitest) + e2e-flow.mjs
```
