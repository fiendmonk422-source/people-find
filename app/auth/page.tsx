"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { supabase } from "../../src/lib/supabase";

export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setMessage("");

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            nickname: nickname.trim() || "Anonymous",
          },
        },
      });

      if (error) {
        setMessage(error.message);
      } else {
        setMessage(
          "✅ Account created. Check your email if confirmation is required."
        );
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setMessage(error.message);
      } else {
        window.location.href = "/";
      }
    }

    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-[#090909] text-[#E8E5DF]">
      <nav className="border-b border-white/[0.07] bg-[#0B0B0B]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link
            href="/"
            className="text-lg font-semibold tracking-tight"
          >
            PeopleFind
          </Link>

          <Link
            href="/"
            className="text-sm text-[#A7A39B] hover:text-white"
          >
            ← Home
          </Link>
        </div>
      </nav>

      <section className="flex min-h-[calc(100vh-73px)] items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="text-4xl">👤</div>

            <h1 className="mt-4 text-3xl font-semibold tracking-tight">
              {mode === "login"
                ? "Welcome back"
                : "Create your account"}
            </h1>

            <p className="mt-3 text-sm text-[#817D76]">
              {mode === "login"
                ? "Sign in to continue to PeopleFind."
                : "Create an account to use PeopleFind."}
            </p>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-[#111111] p-6">
            <form onSubmit={handleSubmit}>
              {mode === "signup" && (
                <label className="block">
                  <span className="mb-2 block text-sm text-[#B8B4AC]">
                    🕶️ Nickname
                  </span>

                  <input
                    type="text"
                    value={nickname}
                    onChange={(event) =>
                      setNickname(event.target.value)
                    }
                    placeholder="What should people see?"
                    className="w-full rounded-xl border border-white/[0.08] bg-[#090909] px-4 py-3 text-sm outline-none placeholder:text-[#55514C] focus:border-white/[0.2]"
                  />

                  <p className="mt-2 text-xs text-[#625F59]">
                    This can be different from your real name.
                  </p>
                </label>
              )}

              <label className="mt-4 block">
                <span className="mb-2 block text-sm text-[#B8B4AC]">
                  📧 Email
                </span>

                <input
                  type="email"
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  placeholder="you@example.com"
                  required
                  className="w-full rounded-xl border border-white/[0.08] bg-[#090909] px-4 py-3 text-sm outline-none placeholder:text-[#55514C] focus:border-white/[0.2]"
                />
              </label>

              <label className="mt-4 block">
                <span className="mb-2 block text-sm text-[#B8B4AC]">
                  🔒 Password
                </span>

                <input
                  type="password"
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full rounded-xl border border-white/[0.08] bg-[#090909] px-4 py-3 text-sm outline-none placeholder:text-[#55514C] focus:border-white/[0.2]"
                />
              </label>

              {message && (
                <div className="mt-4 rounded-xl border border-white/[0.07] bg-[#0C0C0C] px-4 py-3 text-sm text-[#B8B4AC]">
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="mt-5 w-full rounded-xl bg-[#E8E5DF] px-5 py-3 text-sm font-semibold text-[#090909] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading
                  ? "⏳ Please wait..."
                  : mode === "login"
                  ? "🚪 Sign In"
                  : "✨ Create Account"}
              </button>
            </form>

            <div className="my-6 border-t border-white/[0.07]" />

            <div className="text-center text-sm text-[#817D76]">
              {mode === "login" ? (
                <>
                  Don't have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setMode("signup");
                      setMessage("");
                    }}
                    className="text-[#E8E5DF] hover:underline"
                  >
                    Create one
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setMode("login");
                      setMessage("");
                    }}
                    className="text-[#E8E5DF] hover:underline"
                  >
                    Sign in
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}