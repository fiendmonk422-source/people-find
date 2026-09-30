"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../src/lib/supabase";

export default function AuthButton() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setUser(user);
    }

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  if (!user) {
    return (
      <Link
        href="/auth"
        className="rounded-xl border border-white/[0.1] bg-[#171717] px-4 py-2.5 text-sm text-[#E8E5DF] hover:bg-[#202020]"
      >
        🔐 Sign In
      </Link>
    );
  }

  const nickname =
    user.user_metadata?.nickname || "Anonymous";

  return (
    <div className="flex items-center gap-3">
      <Link
        href="/profile"
        className="text-sm text-[#A7A39B] hover:text-white"
      >
        🕶️ {nickname}
      </Link>

      <button
        onClick={logout}
        className="rounded-xl border border-white/[0.08] px-3 py-2 text-sm text-[#A7A39B] hover:bg-[#171717] hover:text-white"
      >
        🚪
      </button>
    </div>
  );
}