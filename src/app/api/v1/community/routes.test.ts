import { describe, expect, it } from "vitest";

import * as postsRoute from "./posts/route";
import * as sessionRoute from "./session/route";

const origin = "http://localhost:3000";

describe("community route delegates", () => {
  it("wires session and post methods to the server handlers", async () => {
    const sessionResponse = await sessionRoute.POST(new Request(`${origin}/api/v1/community/session`, {
      method: "POST",
      headers: { "content-type": "application/json", origin },
      body: JSON.stringify({ nickname: `라우트${crypto.randomUUID().slice(0, 4)}` }),
    }));
    const cookie = sessionResponse.headers.get("set-cookie")?.split(";")[0] ?? "";
    const postResponse = await postsRoute.POST(new Request(`${origin}/api/v1/community/posts`, {
      method: "POST",
      headers: { "content-type": "application/json", origin, cookie },
      body: JSON.stringify({ category: "question", title: "라우트 질문", body: "라우트 본문" }),
    }));
    const listResponse = await postsRoute.GET(new Request(`${origin}/api/v1/community/posts?category=question`));

    expect(sessionResponse.status).toBe(201);
    expect(postResponse.status).toBe(201);
    expect((await listResponse.json()).items).toHaveLength(1);
  });
});
