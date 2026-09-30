"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { useAgencySession } from "@/features/agency/AgencySessionProvider";

export default function AgencyLoginPage() {
  const router = useRouter();
  const { login } = useAgencySession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(email, password);
      router.replace("/agency");
    } catch {
      setError("이메일 또는 비밀번호가 올바르지 않습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="agency-login">
      <form className="agency-login__form" onSubmit={submit}>
        <h1>기획사 로그인</h1>
        <label>
          <span>이메일</span>
          <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <label>
          <span>비밀번호</span>
          <input required minLength={8} type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>
        {error ? <p role="alert">{error}</p> : null}
        <button disabled={submitting} type="submit">{submitting ? "로그인 중..." : "로그인"}</button>
      </form>
    </main>
  );
}
