import Image from "next/image";
import Link from "next/link";

import "@/components/marketing/landing.css";
import { AppShell } from "@/components/shared/AppShell";

const talentPoints = [
  { title: "프로필 한 번 등록", body: "정면·좌·우 사진 3장과 보컬·댄스 영상으로 프로필을 완성합니다." },
  { title: "공개 범위는 내가 선택", body: "인증된 기획사에만 보일지, 전체에 공개할지 직접 정합니다." },
  { title: "제안은 한곳에서", body: "기획사의 제안을 받은 제안함에서 확인하고 수락·거절합니다." },
];

const agencyPoints = [
  { title: "지원자 찾기", body: "분야·연령대·공개 범위로 지원자를 찾고 관심 지원자로 저장합니다." },
  { title: "지원자 관리", body: "지원자별 진행 단계와 담당자, 다음 할 일을 팀이 같은 화면에서 봅니다." },
  { title: "비교 자료와 콘텐츠", body: "춤 동작·음정 비교 자료를 참고하고, 승인된 영상으로 숏폼 초안을 만듭니다." },
];

const workflowSteps = [
  {
    num: "01",
    title: "끌어다 연결",
    body: "단계를 화면에 놓고 선으로 이으면 순서대로 실행됩니다.",
  },
  {
    num: "02",
    title: "외부 서비스 연결",
    body: "HTTP API 호출, AI 요약, Slack 알림을 한 흐름에 넣을 수 있습니다.",
  },
  {
    num: "03",
    title: "승인 전에는 멈춤",
    body: "승인 단계에서 실행이 멈추고, 담당자가 확인해야 다음 단계로 넘어갑니다.",
  },
];

const principles = [
  {
    tag: "Human Review",
    title: "합격·불합격은 사람이 정합니다",
    body: "비교 자료는 참고용입니다. AI가 자동으로 탈락시키는 기능은 없습니다.",
  },
  {
    tag: "Objective Metrics",
    title: "외모를 점수화하지 않습니다",
    body: "외모를 인공지능으로 평가하지 않으며, 동작 타이밍과 음정처럼 수행 역량만 객관적으로 보조합니다.",
  },
  {
    tag: "Legal Safety",
    title: "미성년자는 보호자 동의 후 등록",
    body: "만 14세 미만 지원자는 법정대리인 동의 절차를 거쳐 안전하게 관리됩니다.",
  },
];

function PointList({ points }: { points: Array<{ title: string; body: string }> }) {
  return (
    <ul className="ld-points">
      {points.map((point) => (
        <li key={point.title}>
          <strong>{point.title}</strong>
          <span>{point.body}</span>
        </li>
      ))}
    </ul>
  );
}

export default function Home() {
  return (
    <AppShell mode="public">
      <main className="ld">
        {/* 1. Asymmetric Split Hero */}
        <section className="ld-hero">
          <div className="ld-hero__content">
            <div className="ld-eyebrow">
              <span className="ld-eyebrow__dot" />
              Casting & AX Operations
            </div>
            <h1>
              오디션 지원은 한 번에,
              <br />
              검토는 한곳에서.
            </h1>
            <p className="ld-hero__lede">
              ENTER—AX는 오디션 지원자와 기획사를 잇는 캐스팅 플랫폼입니다. 지원자는 프로필을 한 번 등록하고, 기획사는 지원자 검토와
              반복 업무를 한 화면에서 처리합니다.
            </p>
            <div className="ld-actions">
              <Link className="ld-btn ld-btn--primary" href="/talent/onboarding">
                오디션 프로필 등록
              </Link>
              <Link className="ld-btn ld-btn--secondary" href="/agency">
                기획사로 시작하기
              </Link>
            </div>
            <div className="ld-hero-meta">
              <span className="ld-hero-meta__item">
                <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>
                3방향 실사 프로필
              </span>
              <span className="ld-hero-meta__item">
                <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>
                동작·음정 비교 보조
              </span>
              <span className="ld-hero-meta__item">
                <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>
                사람 최종 승인 필수
              </span>
            </div>
          </div>

          <div className="ld-hero-showcase">
            <div className="ld-window">
              <div className="ld-window__bar">
                <span className="ld-window__dot" />
                <span className="ld-window__dot" />
                <span className="ld-window__dot" />
                <span className="ld-window__title">ENTER—AX · Candidate Pipeline</span>
              </div>
              <Image
                alt="기획사 지원자 관리 화면. 진행 단계별 지원자 카드"
                height={1800}
                priority
                sizes="(max-width: 960px) 100vw, 560px"
                src="/images/landing/pipeline.png"
                width={2880}
              />
            </div>
            <div className="ld-floating-status">
              <span className="ld-pulse" />
              실시간 파이프라인 · 14건 심사 진행 중
            </div>
          </div>
        </section>

        {/* 2. Dual-Perspective Bento Grid */}
        <section className="ld-bento-section">
          <div className="ld-section-head">
            <h2>하나의 플랫폼, 두 개의 관점</h2>
            <p>지원자는 공정한 기회를 얻고, 기획사는 검토 시간을 획기적으로 줄입니다.</p>
          </div>

          <div className="ld-bento-grid">
            {/* Bento Card A: Talent */}
            <article className="ld-bento-card ld-bento-card--talent" id="talent">
              <span className="ld-bento-card__badge">For Talent · 지원자</span>
              <h3>프로필 하나로 여러 기획사에</h3>
              <PointList points={talentPoints} />
              <div className="ld-bento-card__frame">
                <Image
                  alt="지원자 프로필 등록 화면. 기본 프로필, 얼굴 사진, 보컬·댄스 자료, 공개 범위 4단계"
                  height={1800}
                  sizes="(max-width: 960px) 100vw, 520px"
                  src="/images/landing/onboarding.png"
                  width={2880}
                />
              </div>
              <div className="ld-actions">
                <Link className="ld-btn ld-btn--primary" href="/talent/onboarding">
                  오디션 프로필 등록
                </Link>
                <Link className="ld-link" href="/talent">
                  커뮤니티 둘러보기 →
                </Link>
              </div>
            </article>

            {/* Bento Card B: Agency */}
            <article className="ld-bento-card ld-bento-card--agency" id="agency">
              <span className="ld-bento-card__badge">For Agency · 기획사</span>
              <h3>지원자 검토를 한 흐름으로</h3>
              <PointList points={agencyPoints} />
              <div className="ld-bento-card__frame">
                <Image
                  alt="기획사 지원자 찾기 화면"
                  height={1800}
                  sizes="(max-width: 960px) 100vw, 520px"
                  src="/images/landing/discover.png"
                  width={2880}
                />
              </div>
              <div className="ld-actions">
                <Link className="ld-btn ld-btn--primary" href="/agency">
                  기획사로 시작하기
                </Link>
              </div>
            </article>
          </div>
        </section>

        {/* 3. Workflow Engine Showcase */}
        <section className="ld-workflow" id="workflow">
          <div className="ld-section-head">
            <h2>반복 업무는 자동화로</h2>
            <p>지원자 정리, 외부 데이터 가져오기, 팀 알림처럼 매번 하는 일을 단계로 이어 붙여 한 번에 실행합니다.</p>
          </div>

          <div className="ld-workflow-canvas">
            <div className="ld-window__bar">
              <span className="ld-window__dot" />
              <span className="ld-window__dot" />
              <span className="ld-window__dot" />
              <span className="ld-window__title">ENTER—AX Workflow Studio</span>
            </div>
            <Image
              alt="업무 자동화 화면. 직접 시작, 보컬 지원자, 캐스팅 리드 승인, 내부 검토로 옮기기 단계가 이어져 있고 승인 대기 중"
              height={1422}
              sizes="(max-width: 1200px) 100vw, 1160px"
              src="/images/landing/workflow-editor.png"
              width={2544}
            />
          </div>

          <div className="ld-step-grid">
            {workflowSteps.map((step) => (
              <div className="ld-step-item" key={step.title}>
                <span className="ld-step-item__num">{step.num}</span>
                <strong>{step.title}</strong>
                <span>{step.body}</span>
              </div>
            ))}
          </div>
        </section>

        {/* 4. Safety & Principles */}
        <section className="ld-principles">
          <div className="ld-section-head">
            <h2>지원자를 보호하는 원칙</h2>
            <p>ENTER—AX는 사람 중심의 투명하고 안전한 캐스팅 문화를 지향합니다.</p>
          </div>

          <div className="ld-principles-grid">
            {principles.map((item) => (
              <div className="ld-principle-card" key={item.title}>
                <span className="ld-principle-card__tag">{item.tag}</span>
                <strong>{item.title}</strong>
                <span>{item.body}</span>
              </div>
            ))}
          </div>
        </section>

        {/* 5. Closing CTA */}
        <section className="ld-cta">
          <div className="ld-cta__text">
            <h2>지금 시작하세요</h2>
            <p>지원자 프로필 등록부터 기획사 맞춤 워크스페이스까지, 오늘 바로 시작하세요.</p>
          </div>
          <div className="ld-actions">
            <Link className="ld-btn ld-btn--primary" href="/talent/onboarding">
              오디션 프로필 등록
            </Link>
            <Link className="ld-btn ld-btn--inverse" href="/agency">
              기획사로 시작하기
            </Link>
          </div>
        </section>

        {/* 6. Footer */}
        <footer className="ld-footer">
          <span>© 2026 ENTER—AX. All rights reserved.</span>
          <nav aria-label="바닥글">
            <Link href="/talent">커뮤니티</Link>
            <Link href="/talent/onboarding">프로필 등록</Link>
            <Link href="/agency">기획사 콘솔</Link>
          </nav>
        </footer>
      </main>
    </AppShell>
  );
}
