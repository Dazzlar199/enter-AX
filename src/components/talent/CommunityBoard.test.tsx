import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CommunityBoard } from "./CommunityBoard";

describe("CommunityBoard authenticated author mode", () => {
  it("uses the session nickname without rendering a spoofable author field", async () => {
    const user = userEvent.setup();
    const onCreatePost = vi.fn();
    render(
      <CommunityBoard
        posts={[]}
        viewerName="루아"
        onCreatePost={onCreatePost}
        onReply={vi.fn()}
      />,
    );

    await user.click(screen.getAllByRole("button", { name: /글쓰기/ })[0]);
    expect(screen.queryByPlaceholderText("닉네임")).not.toBeInTheDocument();
    await user.type(screen.getByPlaceholderText("제목"), "커뮤니티 제목");
    await user.type(screen.getByPlaceholderText("내용을 입력해주세요."), "커뮤니티 본문");
    await user.click(screen.getByRole("button", { name: "등록" }));

    expect(onCreatePost).toHaveBeenCalledWith({
      authorName: "루아",
      category: "자유",
      title: "커뮤니티 제목",
      body: "커뮤니티 본문",
    });
  });

  it("filters posts by board and search keyword", async () => {
    const user = userEvent.setup();
    const posts = [
      { id: "a", authorName: "솔", category: "질문" as const, title: "유튜브 링크 질문", body: "본문", createdAt: "2026-09-10T00:00:00.000Z", replies: [] },
      { id: "b", authorName: "민", category: "자유" as const, title: "연습실 이야기", body: "본문", createdAt: "2026-09-11T00:00:00.000Z", replies: [] },
    ];
    render(<CommunityBoard posts={posts} onCreatePost={vi.fn()} onReply={vi.fn()} />);

    const boards = within(screen.getByRole("navigation", { name: "게시판" }));
    await user.click(boards.getByRole("button", { name: /질문/ }));
    expect(screen.getByText("유튜브 링크 질문")).toBeInTheDocument();
    expect(screen.queryByText("연습실 이야기")).not.toBeInTheDocument();

    await user.click(boards.getByRole("button", { name: /전체 글/ }));
    await user.type(screen.getByLabelText("게시글 검색"), "연습실");
    expect(screen.getByText("연습실 이야기")).toBeInTheDocument();
    expect(screen.queryByText("유튜브 링크 질문")).not.toBeInTheDocument();
  });

  it("warns while composing when text exposes a phone number or asks for upfront fees", async () => {
    const user = userEvent.setup();
    render(<CommunityBoard posts={[]} viewerName="루아" onCreatePost={vi.fn()} onReply={vi.fn()} />);

    await user.click(screen.getAllByRole("button", { name: /글쓰기/ })[0]);
    await user.type(screen.getByPlaceholderText("내용을 입력해주세요."), "프로필 촬영비 입금하래요 010-1234-5678");

    const alerts = screen.getAllByRole("alert");
    expect(alerts.map((alert) => alert.textContent).join(" ")).toMatch(/전화번호/);
    expect(alerts.map((alert) => alert.textContent).join(" ")).toMatch(/금전 요구/);
  });

  it("shows the scam checklist on the 주의 제보 board", async () => {
    const user = userEvent.setup();
    render(<CommunityBoard posts={[]} onCreatePost={vi.fn()} onReply={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /주의 제보/ }));
    expect(screen.getByText("오디션 사기, 이렇게 구분하세요")).toBeInTheDocument();
  });

  it("toggles a reaction once per browser and shows the verified agency badge", async () => {
    window.localStorage.clear();
    const user = userEvent.setup();
    const onToggleLike = vi.fn();
    const posts = [{ id: "p1", authorName: "관리자", category: "정보공유" as const, title: "공식 공고", body: "본문", createdAt: "2026-09-10T00:00:00.000Z", replies: [], likes: 2, verifiedAgency: true }];
    render(<CommunityBoard posts={posts} onCreatePost={vi.fn()} onReply={vi.fn()} onToggleLike={onToggleLike} />);

    expect(screen.getByText("인증 기획사")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /공식 공고/ }));
    await user.click(screen.getByRole("button", { name: /♡ 공감/ }));
    expect(onToggleLike).toHaveBeenLastCalledWith("p1", true);
    await user.click(screen.getByRole("button", { name: /공감 취소/ }));
    expect(onToggleLike).toHaveBeenLastCalledWith("p1", false);
  });
});
