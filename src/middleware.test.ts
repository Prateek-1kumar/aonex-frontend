import { describe, it, expect } from "bun:test";
import { NextRequest } from "next/server";
import { middleware, config } from "./middleware";

function makeReq(path: string, hasCookie = false) {
  const headers = new Headers();
  if (hasCookie) headers.set("cookie", "aonex_token=mock-jwt");
  return new NextRequest(`http://localhost:3000${path}`, { headers });
}

describe("middleware", () => {
  it("redirects unauthenticated user from /connections to /login", async () => {
    const res = await middleware(makeReq("/connections", false));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login");
  });

  it("allows authenticated user through to /connections", async () => {
    const res = await middleware(makeReq("/connections", true));
    expect(res.headers.get("location")).toBeNull();
  });

  it("redirects authenticated user away from /login to /connections", async () => {
    const res = await middleware(makeReq("/login", true));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/connections");
  });

  it("allows unauthenticated user on public route /", async () => {
    const res = await middleware(makeReq("/", false));
    expect(res.headers.get("location")).toBeNull();
  });

  it("matcher config excludes static assets", () => {
    const pattern = config.matcher[0];
    expect(pattern).toContain("_next");
  });
});
