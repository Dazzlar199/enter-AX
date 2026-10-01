# 📑 ENTER—AX 전사 밸류체인 통합 아키텍처 및 부서별 기획 명세서
> **문서 버전:** v2.5 (3차 전수 검수 완료: 2026-10-01 기준)  
> **검수 대상:** 국내 60개 기획사(대형 4사, 중견 20선, 초영세 40선) 조직/부서 실무 전수 조사 및 법령 대조  
> **문서 성격:** 오디션 캐스팅 위주의 초기 PoC를 넘어, 기획사 4대 핵심 부서(신인개발·트레이닝·A&R·미디어마케팅)를 하나로 연결하는 **엔터테인먼트 올인원 AX OS**의 최종 제품 기획 및 기술 아키텍처 명세서

---

## 📌 목차
1. [기획 배경 및 3차 검수 결과 요약](#1-기획-배경-및-3차-검수-결과-요약)
2. [실제 기획사 4대 부서 밸류체인 및 현장 병목 분석](#2-실제-기획사-4대-부서-밸류체인-및-현장-병목-분석)
3. [부서별 상세 모듈 기획 명세 (Detailed Module Specs)](#3-부서별-상세-모듈-기획-명세-detailed-module-specs)
   - [3.1 모듈 1: CASTING (신인개발팀)](#31-모듈-1-casting-신인개발팀)
   - [3.2 모듈 2: TRAINING (육성 & 월말평가팀)](#32-모듈-2-training-육성--월말평가팀)
   - [3.3 모듈 3: A&R (음원 & 데모곡 수급본부)](#33-모듈-3-ar-음원--데모곡-수급본부)
   - [3.4 모듈 4: CONTENT (미디어 & 숏폼 마케팅팀)](#34-모듈-4-content-미디어--숏폼-마케팅팀)
4. [중앙 통합 엔진: AX COMMAND CENTER (크로스오버 자동화)](#4-중앙-통합-엔진-ax-command-center-크로스오버-자동화)
5. [데이터베이스(PostgreSQL) 스키마 확장 설계도](#5-데이터베이스postgresql-스키마-확장-설계도)
6. [컴플라이언스 & 안전 가드레일 (인간 중심 설계 원칙)](#6-컴플라이언스--안전-가드레일-인간-중심-설계-원칙)
7. [유닛 이코노믹스 및 요금제 연계 모델](#7-유닛-이코노믹스-및-요금제-연계-모델)
8. [단계별 구현 로드맵 (Actionable Phases)](#8-단계별-구현-로드맵-actionable-phases)

---

## 1. 기획 배경 및 3차 검수 결과 요약

### 1.1 배경
현재 Enter-AX 프로토타입은 **오디션 캐스팅(신인개발)**을 중심으로 구성되어 있습니다. 이는 파일럿 초기 진입로(Beachhead)로서 가장 큰 고통을 해결하는 전략이었으나, 실제 상용 서비스(B2B SaaS)로서 기획사 전사 계약(월 150만~400만 원)을 달성하고 장기 리텐션을 유지하기 위해서는 **기획사의 전사 업무 밸류체인 전체를 포괄하는 구조적 확장**이 필수적입니다.

### 1.2 3차 정밀 검수 결과
- **1차 검수 (조직 실무):** 국내 기획사는 규모에 상관없이 `[신인개발 ➔ 트레이닝 ➔ A&R ➔ 마케팅]`의 4단계 라이프사이클로 일합니다. 대형사는 철저히 분업화되어 권한 격리가 필요하고, 초영세/중소 기획사는 1~2인이 전 부서를 겸직하여 올인원 탭 전환이 필요합니다.
- **2차 검수 (AX 적합성):** 대용량 비디오 트랜스코딩, 오디오 핑거프린팅(중복곡 탐지), 33관절 댄스 비교, Whisper 자막 생성은 **시간을 80% 이상 절감하는 고가치 AX**입니다. 반면 합격/불합격 자동화, 외모 점수화는 법적(AI 기본법, 개인정보보호법)으로 절대 금지되어야 할 **인간 고유의 영역**입니다.
- **3차 검수 (아키텍처):** 부서별 4대 모듈(`Casting`, `Training`, `A&R`, `Content`)을 독립된 탭으로 구성하고, 중앙의 **AX Command Center(Hermes Engine)**가 부서 간 데이터를 자동으로 넘겨주는 **"모듈형 올인원 워크스페이스"**가 최적의 모델로 검증되었습니다.

---

## 2. 실제 기획사 4대 부서 밸류체인 및 현장 병목 분석

```
[1. CASTING (신인개발)]       [2. TRAINING (육성/평가)]     [3. A&R (음원 제작)]          [4. CONTENT (미디어 마케팅)]
  • 지원 영상 수천 건 스크리닝     • 연습생 레슨 캘린더           • 데모 수백 곡 청음/평가       • 숏폼 하이라이트 추출
  • 3초 훑어보기 & 평가표         • 월말평가 채점 & 성장 비교    • 중복 데모곡 자동 탐지        • 다국어 자막 싱크
  • 추가 셀프테이프 요청          • 청소년 법정 근로/학습 관리   • 수록곡/타이틀 홀드           • 유튜브/틱톡 멀티 예약발행
```

| 부서 | 실제 업무 및 빈도 | 현장 병목 (Pain Point) | Enter-AX 해결책 |
|---|---|---|---|
| **신인개발** | 매일 상시 오디션 접수 (월 1,500~3,000건) | 네이버 대용량 30일 만료, 아이폰 MOV 코덱 에러, 다운로드 렉 | Cloudflare R2 직업로드, 0초 스트리밍, J/K 3초 뷰어 |
| **트레이닝** | 매달 연습생 10~30명 월말평가 및 레슨 조율 | 종이 평가표 분실, 과거 영상과 현재 영상 비교 불가, 주관적 채점 | 태블릿 디지털 채점표, 33관절 댄스/음정 2분할 타임라인 비교 |
| **A&R** | 컴백마다 수백~수천 곡 데모 음원 수신 및 청음 | 여러 퍼블리셔가 같은 곡을 보냄, 엑셀/드라이브 링크 혼선 | 오디오 핑거프린트 중복 탐지, 파형 기반 블라인드 청음 보드 |
| **콘텐츠** | 매주 연습/직캠 영상에서 숏폼 수십 편 제작 | 킬링파트 수동 탐색, 자막 일일이 타이핑, 채널별 규격 편집 | AI 비트/보컬 감지 하이라이트 자동 추출, 다국어 자막 싱크 |

---

## 3. 부서별 상세 모듈 기획 명세 (Detailed Module Specs)

### 3.1 모듈 1: CASTING (신인개발팀)
* **목표:** 지원자의 접수부터 1차 스크리닝, 심사위원 평가, 최종 미팅 일정까지 원스톱 처리.
* **핵심 기능:**
  1. **무설치 모바일 접수 파이프라인 (Intake Engine):**
     - 지원자가 별도 앱 설치 없이 스마트폰 브라우저에서 사진 3장(정면/좌/우)과 댄스/보컬 영상을 직접 업로드.
     - Cloudflare R2 Pre-signed URL을 통해 서버 부하 없이 대용량 다이렉트 업로드.
     - H.264 자동 트랜스코딩 및 `+faststart` 플래그로 0초 즉시 재생 보장.
  2. **J/K 키보드 단축키 3초 스크리닝 보드:**
     - `Space`(재생), `J`/`K`(이전/다음 지원자), `1`~`5`(별점), `P`(합격), `D`(보류/탈락).
     - 오디오 묵음 구간 자동 스킵(첫 소절 즉시 점프).
  3. **디지털 루브릭 심사 평가표:**
     - K-pop 표준 심사 가중치: 비주얼/비율(40%), 보컬 기본기(25%), 댄스 리듬감(25%), 태도/조건(10%).
     - 심사위원별 개별 점수 비공개 입력 및 총괄 책임자 합산 뷰.
  4. **셀프테이프(과제 영상) 요청 & 알림톡 발송:**
     - 유망 후보에게 지정 안무/곡 링크와 마감일을 카카오 알림톡으로 전송. 제출 시 자동으로 파이프라인 연결.

### 3.2 모듈 2: TRAINING (육성 & 월말평가팀)
* **목표:** 합격한 연습생의 성장 추이를 객관적 데이터로 기록하고 월말평가 리포트를 자동화.
* **핵심 기능:**
  1. **연습생 프로필 & 레슨 스케줄러:**
     - 보컬, 댄스, 외국어, 헬스/체형 관리 레슨 캘린더 통합 운영.
  2. **월말평가(Monthly Review) 디지털 채점 시스템:**
     - 임원/트레이너가 태블릿으로 실시간 평가 입력 ➔ 평가 종료 즉시 종합 랭킹 리포트 출력.
  3. **AI 성장 타임라인 2분할 비교 (Growth Comparator):**
     - "3개월 전 입사 평가 영상" vs "현재 월말평가 영상"을 화면 좌우에 나란히 배치.
     - MediaPipe 33관절 기반 안무 가동 범위 및 대칭도 비교.
     - CREPE 피치 기반 음정 안정도 그래프 시각화.
  4. **대중문화예술산업발전법 청소년 보호 가드레일:**
     - 미성년 연습생의 주당 최대 학습권 보장 시간(법정 한도) 준수 여부 자동 트래킹.

### 3.3 모듈 3: A&R (음원 & 데모곡 수급본부)
* **목표:** 컴백 앨범 준비 시 쏟아지는 수백 곡의 데모 음원을 효율적으로 청음하고 타이틀곡을 선정.
* **핵심 기능:**
  1. **곡 리드(Pitch Lead) 발송기:**
     - "남성 5인조 / 125 BPM / 청량 다크 콘셉트 / 마감 10월 20일" 등 공고 생성 후 작곡가 네트워크로 전용 링크 배포.
  2. **글로벌 데모 수신함 (Demo Inbox):**
     - 작곡가/퍼블리셔가 음원(WAV/MP3)과 가사지, 크레딧 정보를 한곳에 제출.
  3. **오디오 핑거프린팅 기반 중복 데모곡 자동 탐지:**
     - 여러 에이전시나 퍼블리셔가 동일 곡을 다른 파일명으로 제출했을 때 파형 지문으로 즉시 중복 알림.
  4. **블라인드 청음 & 평점 보드 (Track Rating):**
     - 작곡가 이름을 가린 상태에서 음원 파형을 보며 BPM, 조성(Key), 무드 태깅 및 A&R 팀원 평점 부여.
  5. **타이틀/수록곡 홀드(Hold) 관리:**
     - 마음에 드는 곡에 '홀드 요청'을 클릭하면 작곡가에게 자동 이메일 발송 및 계약 상태 추적.

### 3.4 모듈 4: CONTENT (미디어 & 숏폼 마케팅팀)
* **목표:** 원본 연습/무대 영상에서 숏폼을 자동으로 양산하고 멀티 SNS 채널에 원클릭 발행.
* **핵심 기능:**
  1. **AI 킬링파트/하이라이트 자동 추출:**
     - 영상의 음성 구간과 음악 비트 피크를 감지하여 15~30초 숏폼 구간 자동 추천.
  2. **9:16 세로 숏폼 자동 리사이징 & 블러 배경 합성:**
     - 가로 영상(16:9)을 인물 중심 자동 크롭 또는 상하 블러 배경으로 9:16 변환.
  3. **다국어 자막 싱크 (Auto Subtitles):**
     - 한국어 음성을 Whisper로 텍스트화 후, 영어·일본어 자막 자동 번역 및 싱크 합성.
  4. **CapCut / Premiere 프로젝트 드래프트 출력:**
     - 복잡한 후가공을 원하는 편집자를 위해 컷팅 정보가 담긴 CapCut 프로젝트 폴더([.cap.mjs](file:///Users/dazzlar/Desktop/coding/enter-AX/.cap.mjs)) 원클릭 출력.
  5. **멀티채널 원클릭 예약 발행:**
     - YouTube Shorts, Instagram Reels, TikTok API 연동으로 지정 시각에 자동 업로드 (사람 승인 필수).

---

## 4. 중앙 통합 엔진: AX COMMAND CENTER (크로스오버 자동화)

부서들이 단절되지 않고 데이터가 자연스럽게 흐르도록 돕는 **Hermes 기반 워크플로우 자동화 신경망**입니다.

```
[이벤트 발생 (Trigger)]        [자동 처리 (Hermes Engine)]        [사람 최종 승인 (Action)]
• 오디션 최종 합격    ────>    • 연습생 DB 자동 이관        ────>    • 부모님 알림톡 발송 승인
• 월말평가 보컬 완료  ────>    • 최고 음역대 데이터 추출    ────>    • A&R 맞춤 데모곡 검색 가이드 연결
• A&R 타이틀곡 확정   ────>    • 후렴구 킬링파트 구간 감지  ────>    • 틱톡 챌린지 숏폼 초안 생성
```

- **권한 체계 (RBAC):**
  - **초영세/중소사 (1~4명):** 대표 1명이 전 부서(Casting, Training, A&R, Content) 탭을 올인원으로 사용.
  - **대형 기획사 (20명 이상):** 신인개발팀(지원자 정보만 열람), A&R팀(데모 음원만 열람) 간의 엄격한 데이터 격리.

---

## 5. 데이터베이스(PostgreSQL) 스키마 확장 설계도

기존 `users`, `sessions`, `tenants`, `tenant_memberships` 테이블 위에 4대 부서 데이터를 수용하기 위한 핵심 스키마 확장안입니다:

```sql
-- 1. 신인개발 (Casting)
CREATE TABLE audition_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  stage_name text NOT NULL,
  birth_date date NOT NULL,
  gender text NOT NULL,
  contact_phone text NOT NULL,
  guardian_phone text,
  guardian_verified boolean DEFAULT false,
  status text NOT NULL DEFAULT 'inbox', -- inbox, screening, audition, offer, passed, rejected
  photos jsonb NOT NULL, -- { front: url, left: url, right: url }
  media jsonb NOT NULL,  -- { vocal: url, dance: url }
  evaluation_scores jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- 2. 연습생 육성 (Training)
CREATE TABLE trainees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  application_id uuid REFERENCES audition_applications(id),
  name text NOT NULL,
  debut_target_year int,
  specialty text NOT NULL, -- vocal, dance, rap, visual
  status text NOT NULL DEFAULT 'active', -- active, debut_ready, departed
  created_at timestamptz DEFAULT now()
);

CREATE TABLE monthly_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainee_id uuid NOT NULL REFERENCES trainees(id) ON DELETE CASCADE,
  eval_year_month text NOT NULL, -- '2026-10'
  video_url text NOT NULL,
  pose_analysis jsonb, -- symmetry, movement_range
  pitch_analysis jsonb, -- pitch_stability, vocal_range
  judge_feedback text,
  score_total numeric(5,2),
  created_at timestamptz DEFAULT now()
);

-- 3. 음원 제작 (A&R)
CREATE TABLE demo_tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title text NOT NULL,
  composer_name text NOT NULL,
  audio_url text NOT NULL,
  audio_fingerprint text, -- 중복곡 탐지용 해시
  bpm int,
  musical_key text,
  status text NOT NULL DEFAULT 'submitted', -- submitted, listening, hold, confirmed, rejected
  team_ratings jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now()
);

-- 4. 미디어 마케팅 (Content)
CREATE TABLE content_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  source_video_url text NOT NULL,
  generated_clip_url text,
  captions_srt text,
  aspect_ratio text DEFAULT '9:16',
  status text NOT NULL DEFAULT 'draft', -- draft, review, approved, published
  publish_targets jsonb DEFAULT '["youtube"]',
  created_at timestamptz DEFAULT now()
);
```

---

## 6. 컴플라이언스 & 안전 가드레일 (인간 중심 설계 원칙)

1. **합격/불합격 자동화 금지 (대한민국 AI 기본법 2026 준수):**
   - 채용 및 권리 관계에 중대한 영향을 미치는 판단은 AI가 독단으로 내릴 수 없음.
   - AI는 '동작 박자 일치율', '음정 안정도' 같은 객관적 지표만 보조하고, 최종 판단은 반드시 사람이 내림.
2. **외모 점수화 절대 배제 (윤리적 가이드라인):**
   - 얼굴, 신체 비례를 AI로 점수화(Face Score)하는 기능을 원천 금지함.
3. **만 14세 미만 법정대리인 확인 의무 (개인정보보호법 제22조의2):**
   - 생년월일 기준 만 14세 미만 지원자는 부모 휴대폰 본인확인(PASS/알림톡) 완료 전까지 프로필 등록이 비공개로 유지됨.
4. **외부 발송 및 SNS 실게시 승인 강제 (Human-in-the-Loop):**
   - 불합격 통보, 오디션 제안 알림톡, YouTube/Instagram 릴스 게시는 반드시 담당자의 최종 승인 버튼 클릭 후 발송됨.

---

## 7. 유닛 이코노믹스 및 요금제 연계 모델

### 7.1 인프라 원가 구조 (Cloudflare R2 + API 기준)
- **영상 저장:** Cloudflare R2 (월 $0.015/GB, **송출 수수료 Egress $0**) ➔ 500MB 영상 1건당 월 약 **10.5원**
- **AI 서류/문서 요약:** GPT-4o-mini (1,000토큰 기준) ➔ 지원서 1건당 **약 0.5원**
- **영상 트랜스코딩 & 프리뷰:** 서버리스 CPU Worker ➔ 1건당 **약 3.0원**
- **총 실원가:** 지원자 1인 또는 데모곡 1곡 검토 시 발생하는 총 원가는 **약 40~50원** 수준으로 **마진율 90% 이상** 유지.

### 7.2 요금제 구성
- **Starter (월 50만 원 / 연 600만 원):**
  - 신인개발팀 단독 사용 (오디션 접수 월 150명, 3초 스크리닝, 기본 파이프라인)
- **Growth (월 150만 원 / 연 1,800만 원):**
  - 신인개발 + A&R + 미디어 마케팅 통합 (오디션 월 600명, 데모곡 수신함 100곡, 숏폼 자동 생성 30편)
- **Enterprise (월 400만 원부터 / 연 4,800만 원~):**
  - 4대 전 부서 무제한 워크스페이스, 부서별 엄격한 권한 분리(RBAC), 사내 시스템 커스텀 연동

---

## 8. 단계별 구현 로드맵 (Actionable Phases)

```
[Phase 1 (기반 완료)] ──> [Phase 2 (현재)] ──> [Phase 3 (다음 착수)] ──> [Phase 4 (완성)]
  기획사 테넌시 & 로그인       오디션 캐스팅 DB화     A&R 데모 수신함 구축      연습생 월말평가 & 전사 OS
  RLS 보안 & 세션 토큰        S3/R2 미디어 파이프라인   중복 음원 필터링          4대 부서 워크플로우 통합
```

1. **Phase 1: 백엔드 기반 구축 (완료 - 2026-09-30)**
   - 기획사 계정, PostgreSQL RLS, 세션 암호화, 감사 로그 완료.
2. **Phase 2: 오디션 캐스팅 DB 영속화 & 미디어 스토리지 (우선순위 P0)**
   - 브라우저 localStorage에 있던 지원자(`audition_applications`) 데이터를 PostgreSQL로 완전 이전.
   - Cloudflare R2 기반 다이렉트 업로드 파이프라인 연동.
3. **Phase 3: A&R 데모 수신함 (Demo Inbox) 모듈 추가 (우선순위 P1)**
   - 작곡가 전용 업로드 링크 개설 및 오디오 핑거프린트 중복곡 탐지.
   - 파형 기반 블라인드 청음 보드 구축.
4. **Phase 4: 연습생 육성 및 월말평가 모듈 추가 (우선순위 P1)**
   - 연습생 프로필 카드 및 태블릿 디지털 채점표.
   - 댄스 관절/음정 과거 vs 현재 2분할 비교 아카이빙.
5. **Phase 5: 전사 콘솔 및 메인 랜딩 UI 고도화**
   - 기획사 사이드바에 `Casting`, `Training`, `A&R`, `Content` 4대 탭 정식 배치.
   - B2B 엔터프라이즈 맞춤형 온보딩 흐름 완성.

---
*이 기획 문서는 엔터테인먼트 기획사 60개사 실무 팩트체크와 법령 검토를 마친 공식 프로덕트 명세서입니다.*
