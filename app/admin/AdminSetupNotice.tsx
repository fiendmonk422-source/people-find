export default function AdminSetupNotice() {
  return (
    <main className="min-h-screen bg-[#0c0c0b] px-5 py-16 text-[#ebe8e1]">
      <div className="mx-auto max-w-2xl rounded-2xl border border-white/[0.08] bg-[#141413] p-7">
        <p className="text-xs uppercase tracking-[0.18em] text-[#cdbd96]">Admin setup</p>
        <h1 className="mt-3 text-2xl font-semibold">Administrator access is not configured yet.</h1>
        <p className="mt-3 text-sm leading-6 text-[#918d84]">
          Apply the admin migration and assign an administrator through the Supabase SQL Editor. Normal users cannot grant themselves admin access.
        </p>
      </div>
    </main>
  );
}
