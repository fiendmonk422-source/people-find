"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { ArrowLeft, BellRing, CalendarDays, Check, Eye, EyeOff, Megaphone, Pencil, Pin, Plus, Trash2, Upload } from "lucide-react";
import { supabase } from "../../../src/lib/supabase";

type Kind = "notice" | "event";
type Status = "draft" | "published" | "archived";
type Announcement = {
  id: string; kind: Kind; title: string; body: string; event_date: string | null;
  event_time: string | null; venue: string | null; image_url: string | null;
  action_url: string | null; status: Status; is_pinned: boolean; show_popup: boolean;
  published_at: string | null; expires_at: string | null; created_at: string;
};
type Draft = {
  kind: Kind; title: string; body: string; event_date: string; event_time: string;
  venue: string; image_url: string; action_url: string; status: Status;
  is_pinned: boolean; show_popup: boolean; expires_at: string;
};
const emptyDraft: Draft = { kind: "notice", title: "", body: "", event_date: "", event_time: "", venue: "", image_url: "", action_url: "", status: "draft", is_pinned: false, show_popup: false, expires_at: "" };
const fieldClass = "mt-2 w-full rounded-xl border border-white/10 bg-[#10100f] px-3.5 py-3 text-sm text-[#ebe8e1] outline-none placeholder:text-[#625f58] focus:border-[#cdbd96]/50";
const labelClass = "block text-xs font-medium text-[#a6a197]";

export default function AnnouncementsAdminPage() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | Kind>("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    setLoading(true);
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) { window.location.href = "/auth"; return; }
    setUserId(auth.user.id);
    const { data: role, error: roleError } = await supabase.from("user_roles").select("role").eq("user_id", auth.user.id).maybeSingle();
    if (roleError || !role || !["admin", "super_admin"].includes(role.role)) {
      setError("This page is available to authorized administrators only.");
      setLoading(false);
      return;
    }
    setAuthorized(true);
    const { data, error: listError } = await supabase.from("site_announcements").select("*").order("created_at", { ascending: false });
    if (listError) setError("Could not load notices. Confirm the site_announcements migration has been applied.");
    else setItems((data || []) as Announcement[]);
    setLoading(false);
  }, []);

  useEffect(() => { void loadItems(); }, [loadItems]);

  function editItem(item: Announcement) {
    setEditingId(item.id);
    setDraft({
      kind: item.kind, title: item.title, body: item.body, event_date: item.event_date || "",
      event_time: item.event_time || "", venue: item.venue || "", image_url: item.image_url || "",
      action_url: item.action_url || "", status: item.status, is_pinned: item.is_pinned,
      show_popup: item.show_popup, expires_at: item.expires_at ? item.expires_at.slice(0, 16) : "",
    });
    setSuccess("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() { setDraft(emptyDraft); setEditingId(null); setError(""); setSuccess(""); }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true); setError(""); setSuccess("");
    if (draft.kind === "event" && !draft.event_date) { setError("Choose a date for this event."); setSaving(false); return; }
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user || auth.user.id !== userId) { setError("Your session expired. Sign in again."); setSaving(false); return; }
    const payload = {
      kind: draft.kind, title: draft.title.trim(), body: draft.body.trim(),
      event_date: draft.kind === "event" ? draft.event_date || null : null,
      event_time: draft.kind === "event" ? draft.event_time.trim() || null : null,
      venue: draft.kind === "event" ? draft.venue.trim() || null : null,
      image_url: draft.image_url.trim() || null, action_url: draft.action_url.trim() || null,
      status: draft.status, is_pinned: draft.is_pinned, show_popup: draft.show_popup,
      expires_at: draft.expires_at ? new Date(draft.expires_at).toISOString() : null,
      published_at: draft.status === "published" ? new Date().toISOString() : null,
      created_by: auth.user.id,
    };
    const result = editingId
      ? await supabase.from("site_announcements").update(payload).eq("id", editingId)
      : await supabase.from("site_announcements").insert(payload);
    if (result.error) setError(result.error.message || "Could not save this item.");
    else { setSuccess(draft.status === "published" ? "Published successfully. Students can now see it." : "Saved successfully."); resetForm(); await loadItems(); }
    setSaving(false);
  }

  async function setStatus(item: Announcement, status: Status) {
    setError(""); setSuccess("");
    const { error: updateError } = await supabase.from("site_announcements").update({ status, published_at: status === "published" ? new Date().toISOString() : item.published_at }).eq("id", item.id);
    if (updateError) setError(updateError.message);
    else { setSuccess(status === "published" ? "Item published." : status === "archived" ? "Item withdrawn from public view." : "Item returned to draft."); await loadItems(); }
  }

  async function togglePin(item: Announcement) {
    const { error: updateError } = await supabase.from("site_announcements").update({ is_pinned: !item.is_pinned }).eq("id", item.id);
    if (updateError) setError(updateError.message); else await loadItems();
  }

  async function removeItem(item: Announcement) {
    if (!window.confirm('Permanently delete "' + item.title + '"? This cannot be undone.')) return;
    const { error: deleteError } = await supabase.from("site_announcements").delete().eq("id", item.id);
    if (deleteError) setError(deleteError.message); else { setSuccess("Deleted."); await loadItems(); }
  }

  const visible = items.filter((item) => filter === "all" || item.kind === filter);
  const publishedCount = items.filter((item) => item.status === "published").length;

  return (
    <main className="min-h-screen bg-[#0c0c0b] px-4 pb-16 pt-8 text-[#ebe8e1] sm:px-6 lg:pt-12">
      <div className="mx-auto max-w-6xl">
        <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-[#918d84] hover:text-[#ebe8e1]"><ArrowLeft size={15} /> Admin dashboard</Link>
        <header className="mt-6 flex flex-col justify-between gap-4 border-b border-white/[0.07] pb-7 sm:flex-row sm:items-end">
          <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#cdbd96]">PeopleFind / Publishing</p><h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Events & notices</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[#918d84]">Create announcements, control pop-ups, pin important information and decide what students can see.</p></div>
          <div className="flex gap-2 text-xs"><span className="rounded-full border border-white/10 px-3 py-2 text-[#a6a197]">{items.length} total</span><span className="rounded-full border border-[#91b89a]/20 bg-[#91b89a]/[0.06] px-3 py-2 text-[#a6c7ad]">{publishedCount} published</span></div>
        </header>

        {error && <div role="alert" className="mt-5 rounded-xl border border-[#d98282]/20 bg-[#d98282]/[0.06] p-3 text-sm text-[#e0a29a]">{error}</div>}
        {success && <div role="status" className="mt-5 rounded-xl border border-[#91b89a]/20 bg-[#91b89a]/[0.06] p-3 text-sm text-[#a6c7ad]">{success}</div>}

        {authorized && <div className="mt-7 grid gap-7 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.9fr)]">
          <section className="rounded-2xl border border-white/[0.08] bg-[#141413] p-5 sm:p-6">
            <div className="mb-5 flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-[#1b1b19] text-[#cdbd96]">{editingId ? <Pencil size={18} /> : <Plus size={19} />}</div><div><h2 className="font-semibold">{editingId ? "Edit item" : "Create a new item"}</h2><p className="mt-1 text-xs text-[#77736c]">Drafts stay private until published.</p></div></div>
            <form onSubmit={save} className="space-y-4">
              <div><label className={labelClass}>Type</label><div className="mt-2 grid grid-cols-2 gap-2"><button type="button" onClick={() => setDraft({ ...draft, kind: "notice" })} className={`rounded-xl border px-3 py-3 text-sm ${draft.kind === "notice" ? "border-[#cdbd96]/40 bg-[#cdbd96]/[0.08] text-[#e5d9b9]" : "border-white/10 text-[#918d84]"}`}><BellRing size={16} className="mr-2 inline" />Notice</button><button type="button" onClick={() => setDraft({ ...draft, kind: "event" })} className={`rounded-xl border px-3 py-3 text-sm ${draft.kind === "event" ? "border-[#cdbd96]/40 bg-[#cdbd96]/[0.08] text-[#e5d9b9]" : "border-white/10 text-[#918d84]"}`}><CalendarDays size={16} className="mr-2 inline" />Event</button></div></div>
              <div><label className={labelClass} htmlFor="announcement-title">Title *</label><input id="announcement-title" required maxLength={180} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className={fieldClass} placeholder="e.g. Registration deadline extended" /></div>
              <div><label className={labelClass} htmlFor="announcement-body">Message *</label><textarea id="announcement-body" required maxLength={10000} rows={5} value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} className={fieldClass} placeholder="Write the full notice or event details..." /></div>
              {draft.kind === "event" && <div className="grid gap-4 sm:grid-cols-2"><div><label className={labelClass} htmlFor="event-date">Event date *</label><input id="event-date" type="date" required value={draft.event_date} onChange={(e) => setDraft({ ...draft, event_date: e.target.value })} className={fieldClass} /></div><div><label className={labelClass} htmlFor="event-time">Time</label><input id="event-time" value={draft.event_time} onChange={(e) => setDraft({ ...draft, event_time: e.target.value })} className={fieldClass} placeholder="e.g. 10:00 AM" /></div><div className="sm:col-span-2"><label className={labelClass} htmlFor="venue">Venue</label><input id="venue" value={draft.venue} onChange={(e) => setDraft({ ...draft, venue: e.target.value })} className={fieldClass} placeholder="Location or online meeting details" /></div></div>}
              <div><label className={labelClass} htmlFor="action-url">Optional action link</label><input id="action-url" type="url" value={draft.action_url} onChange={(e) => setDraft({ ...draft, action_url: e.target.value })} className={fieldClass} placeholder="https://..." /></div>
              <div><label className={labelClass} htmlFor="event-image">Event photo</label><input id="event-image" type="file" accept="image/png,image/jpeg,image/webp,image/avif" disabled={uploadingImage || saving} onChange={async (e) => { const file = e.target.files?.[0]; if (!file) return; if (file.size > 5 * 1024 * 1024) { setError("Choose an image smaller than 5 MB."); e.target.value = ""; return; } if (!file.type.startsWith("image/")) { setError("Choose an image file."); e.target.value = ""; return; } setUploadingImage(true); setError(""); const safeName = file.name.toLowerCase().replace(/[^a-z0-9.-]+/g, "-"); const path = `${userId || "admin"}/${Date.now()}-${safeName}`; const { error: uploadError } = await supabase.storage.from("announcement-images").upload(path, file, { upsert: false, contentType: file.type, cacheControl: "3600" }); if (uploadError) setError("Image upload failed. Confirm the announcement-images storage migration is applied. " + uploadError.message); else { const { data } = supabase.storage.from("announcement-images").getPublicUrl(path); setDraft((current) => ({ ...current, image_url: data.publicUrl })); setSuccess("Photo uploaded and attached to this item."); } setUploadingImage(false); e.target.value = ""; }} className={fieldClass} /><p className="mt-2 text-xs text-[#77736c]">{uploadingImage ? "Uploading photo…" : "PNG, JPG, WEBP or AVIF · maximum 5 MB."}</p>{draft.image_url && <div className="mt-3 flex items-center gap-3"><img src={draft.image_url} alt="Event preview" className="h-20 w-28 rounded-lg border border-white/10 object-cover" /><button type="button" onClick={() => setDraft({ ...draft, image_url: "" })} className="text-xs text-[#cdbd96] hover:text-white">Remove photo</button></div>}<details className="mt-3"><summary className="cursor-pointer text-xs text-[#918d84]">Or use an existing image URL</summary><input id="image-url" type="url" value={draft.image_url} onChange={(e) => setDraft({ ...draft, image_url: e.target.value })} className={fieldClass} placeholder="https://..." /></details></div>
              <div><label className={labelClass} htmlFor="expires-at">Hide after (optional)</label><input id="expires-at" type="datetime-local" value={draft.expires_at} onChange={(e) => setDraft({ ...draft, expires_at: e.target.value })} className={fieldClass} /></div>
              <div className="space-y-3 rounded-xl border border-white/[0.07] bg-[#10100f] p-4">
                <label className="flex cursor-pointer items-start gap-3 text-sm"><input type="checkbox" checked={draft.is_pinned} onChange={(e) => setDraft({ ...draft, is_pinned: e.target.checked })} className="mt-0.5 accent-[#cdbd96]" /><span><span className="block text-[#d8d4cc]">Pin to top</span><span className="mt-1 block text-xs text-[#77736c]">Show a notice bar near the top of every page.</span></span></label>
                <label className="flex cursor-pointer items-start gap-3 text-sm"><input type="checkbox" checked={draft.show_popup} onChange={(e) => setDraft({ ...draft, show_popup: e.target.checked })} className="mt-0.5 accent-[#cdbd96]" /><span><span className="block text-[#d8d4cc]">Show as pop-up</span><span className="mt-1 block text-xs text-[#77736c]">Display a notice dialog when a visitor opens the site. Visitors can dismiss it for the session.</span></span></label>
              </div>
              <div><label className={labelClass} htmlFor="publish-status">Publishing status</label><select id="publish-status" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as Status })} className={fieldClass}><option value="draft">Draft — only admins can see it</option><option value="published">Published — visible to students</option><option value="archived">Archived — hidden from students</option></select></div>
              <div className="flex flex-wrap gap-3 pt-1"><button disabled={saving} type="submit" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#ebe8e1] px-4 py-3 text-sm font-semibold text-[#0c0c0b] disabled:opacity-50"><Check size={16} />{saving ? "Saving..." : draft.status === "published" ? "Save & publish" : "Save item"}</button><button type="button" onClick={resetForm} className="rounded-xl border border-white/10 px-4 py-3 text-sm text-[#a6a197] hover:bg-white/[0.04]">Clear form</button></div>
            </form>
          </section>

          <section>
            <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">Your events & notices</h2><p className="mt-1 text-xs text-[#77736c]">Manage published items and drafts.</p></div><select value={filter} onChange={(e) => setFilter(e.target.value as "all" | Kind)} className="rounded-lg border border-white/10 bg-[#141413] px-3 py-2 text-xs text-[#c9c3b8]"><option value="all">All types</option><option value="notice">Notices</option><option value="event">Events</option></select></div>
            {loading ? <p className="mt-5 rounded-xl border border-white/10 p-5 text-sm text-[#77736c]">Loading items…</p> : visible.length === 0 ? <div className="mt-5 rounded-xl border border-dashed border-white/10 p-6 text-sm text-[#77736c]">Nothing here yet. Create your first notice or event using the form.</div> : <div className="mt-4 space-y-3">{visible.map((item) => <article key={item.id} className="rounded-2xl border border-white/[0.08] bg-[#141413] p-4 sm:p-5"><div className="flex items-start gap-3"><div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#1b1b19] text-[#cdbd96]">{item.kind === "event" ? <CalendarDays size={17} /> : <BellRing size={17} />}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="text-[10px] uppercase tracking-wider text-[#cdbd96]">{item.kind}</span><span className={`rounded-full px-2 py-1 text-[10px] ${item.status === "published" ? "bg-[#91b89a]/10 text-[#a6c7ad]" : item.status === "draft" ? "bg-white/[0.06] text-[#a6a197]" : "bg-[#d98282]/10 text-[#e0a29a]"}`}>{item.status}</span>{item.is_pinned && <span className="text-[#cdbd96]" title="Pinned"><Pin size={13} /></span>}{item.show_popup && <span className="text-[#cdbd96]" title="Pop-up enabled"><Megaphone size={13} /></span>}</div><h3 className="mt-2 break-words font-semibold">{item.title}</h3><p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-[#918d84]">{item.body}</p>{item.kind === "event" && item.event_date && <p className="mt-3 text-xs text-[#b5afa4]">{new Date(item.event_date + "T12:00:00").toLocaleDateString()}{item.event_time ? " · " + item.event_time : ""}{item.venue ? " · " + item.venue : ""}</p>}<p className="mt-3 text-[10px] text-[#625f58]">Created {new Date(item.created_at).toLocaleDateString()}</p></div></div><div className="mt-4 flex flex-wrap gap-2 border-t border-white/[0.06] pt-3"><button type="button" onClick={() => editItem(item)} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs text-[#c9c3b8] hover:bg-white/[0.04]"><Pencil size={13} />Edit</button><button type="button" onClick={() => void togglePin(item)} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs text-[#c9c3b8] hover:bg-white/[0.04]"><Pin size={13} />{item.is_pinned ? "Unpin" : "Pin"}</button>{item.status === "published" ? <button type="button" onClick={() => void setStatus(item, "archived")} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs text-[#c9c3b8] hover:bg-white/[0.04]"><EyeOff size={13} />Withdraw</button> : <button type="button" onClick={() => void setStatus(item, "published")} className="inline-flex items-center gap-1.5 rounded-lg border border-[#91b89a]/20 px-3 py-2 text-xs text-[#a6c7ad] hover:bg-[#91b89a]/[0.06]"><Eye size={13} />Publish</button>}<button type="button" onClick={() => void removeItem(item)} className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-[#d98282]/15 px-3 py-2 text-xs text-[#dca0a0] hover:bg-[#d98282]/[0.06]"><Trash2 size={13} />Delete</button></div></article>)}</div>}
          </section>
        </div>}
      </div>
    </main>
  );
}
