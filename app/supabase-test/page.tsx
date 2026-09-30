"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../src/lib/supabase";

export default function SupabaseTest() {
  const [message, setMessage] = useState("Testing Supabase...");

  useEffect(() => {
    async function test() {
      const { error } = await supabase
        .from("people")
        .select("*")
        .limit(1);

      if (error) {
        setMessage("Supabase connected, but database test failed: " + error.message);
      } else {
        setMessage("✅ SUPABASE IS CONNECTED!");
      }
    }

    test();
  }, []);

  return (
    <main className="min-h-screen bg-[#090909] flex items-center justify-center text-white">
      <h1 className="text-2xl">{message}</h1>
    </main>
  );
}