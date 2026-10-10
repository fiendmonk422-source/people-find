"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  AlertCircle,
  Loader2,
  MessageCircle,
  Plus,
  Send,
  Users,
  X,
} from "lucide-react";
import Navbar from "../components/Navbar";
import { supabase } from "../../src/lib/supabase";

type RequestItem = {
  id: string;
  requester_name: string | null;
  target_name: string | null;
  school: string | null;
  faculty: string | null;
  department: string | null;
  level: string | null;
  hostel: string | null;
  clues: string | null;
  status: string | null;
  created_at: string;
};

type ResponseItem = {
  id: string;
  request_id: string;
  responder_name: string | null;
  response: string | null;
  created_at: string;
};

type FeedbackItem = {
  id: string;
  response_id: string;
  user_id: string | null;
  voter_name: string | null;
  vote: "up" | "down" | null;
};

export default function RequestsPage() {
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [responses, setResponses] = useState<ResponseItem[]>([]);
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [responseText, setResponseText] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [requestForm, setRequestForm] = useState({
    targetName: "",
    school: "",
    faculty: "",
    department: "",
    level: "",
    hostel: "",
    clues: "",
  });

  useEffect(() => {
    loadRequests();
  }, []);

  async function loadRequests() {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("Please sign in to use Requests.");
        return;
      }

      setCurrentUserId(user.id);

      const [requestResult, responseResult, feedbackResult] =
        await Promise.all([
          supabase
            .from("requests")
            .select(
              "id, requester_name, target_name, school, faculty, department, level, hostel, clues, status, created_at"
            )
            .order("created_at", { ascending: false }),

          supabase
            .from("request_responses")
            .select(
              "id, request_id, responder_name, response, created_at"
            )
            .order("created_at", { ascending: true }),

          supabase
            .from("response_feedback")
            .select("id, response_id, user_id, voter_name, vote"),
        ]);

      if (requestResult.error) throw requestResult.error;
      if (responseResult.error) throw responseResult.error;
      if (feedbackResult.error) throw feedbackResult.error;

      setRequests((requestResult.data ?? []) as RequestItem[]);
      setResponses((responseResult.data ?? []) as ResponseItem[]);
      setFeedback((feedbackResult.data ?? []) as FeedbackItem[]);
    } catch (err: any) {
      console.error("Requests error:", err);
      setError(err?.message || "We couldn't load requests.");
    } finally {
      setLoading(false);
    }
  }

  function displayName(user: any) {
    return (
      user?.user_metadata?.nickname ||
      user?.user_metadata?.name ||
      user?.email?.split("@")[0] ||
      "Member"
    );
  }

  async function createRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!requestForm.targetName.trim() && !requestForm.clues.trim()) {
      setError("Add at least a name or some clues.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Please sign in first.");
      }

      const { error: insertError } = await supabase
        .from("requests")
        .insert({
          user_id: user.id,
          requester_name: displayName(user),
          target_name: requestForm.targetName.trim() || null,
          school: requestForm.school.trim() || null,
          faculty: requestForm.faculty.trim() || null,
          department: requestForm.department.trim() || null,
          level: requestForm.level.trim() || null,
          hostel: requestForm.hostel.trim() || null,
          clues: requestForm.clues.trim() || null,
          status: "Open",
        });

      if (insertError) throw insertError;

      setRequestForm({
        targetName: "",
        school: "",
        faculty: "",
        department: "",
        level: "",
        hostel: "",
        clues: "",
      });

      setShowCreate(false);

      await loadRequests();
    } catch (err: any) {
      console.error("Create request error:", err);
      setError(err?.message || "We couldn't create the request.");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitResponse(
    event: FormEvent<HTMLFormElement>,
    requestId: string
  ) {
    event.preventDefault();

    if (!responseText.trim()) return;

    setSubmitting(true);
    setError("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Please sign in first.");
      }

      const { error: insertError } = await supabase
        .from("request_responses")
        .insert({
          request_id: requestId,
          user_id: user.id,
          responder_name: displayName(user),
          response: responseText.trim(),
        });

      if (insertError) throw insertError;

      setResponseText("");
      setRespondingTo(null);

      await loadRequests();
    } catch (err: any) {
      console.error("Response error:", err);
      setError(err?.message || "We couldn't submit your response.");
    } finally {
      setSubmitting(false);
    }
  }

  async function vote(
    responseId: string,
    voteType: "up" | "down"
  ) {
    setError("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("Please sign in to react.");
        return;
      }

      setCurrentUserId(user.id);

      const existing = feedback.find(
        (item) =>
          item.response_id === responseId &&
          item.user_id === user.id
      );

      if (existing?.vote === voteType) {
        const { error: deleteError } = await supabase
          .from("response_feedback")
          .delete()
          .eq("id", existing.id);

        if (deleteError) throw deleteError;
      } else if (existing) {
        const { error: updateError } = await supabase
          .from("response_feedback")
          .update({
            vote: voteType,
            voter_name: displayName(user),
          })
          .eq("id", existing.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from("response_feedback")
          .insert({
            response_id: responseId,
            user_id: user.id,
            voter_name: displayName(user),
            vote: voteType,
          });

        if (insertError) throw insertError;
      }

      await loadRequests();
    } catch (err: any) {
      console.error("Reaction error:", err);
      setError(
        err?.message || "Couldn't save your reaction."
      );
    }
  }

  const responseList = (requestId: string) =>
    responses.filter(
      (item) => item.request_id === requestId
    );

  const countVotes = (
    responseId: string,
    type: "up" | "down"
  ) =>
    feedback.filter(
      (item) =>
        item.response_id === responseId &&
        item.vote === type
    ).length;

  const myVote = (responseId: string) =>
    feedback.find(
      (item) =>
        item.response_id === responseId &&
        item.user_id === currentUserId
    )?.vote;

  return (
    <main className="min-h-screen bg-[#0c0c0b] text-[#ebe8e1]">
      <Navbar />

      <section className="mx-auto max-w-5xl px-5 py-10 sm:px-6 lg:py-14">
        <header className="flex flex-col gap-6 border-b border-white/[0.07] pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#cdbd96]">
              Community
            </p>

            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Requests
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-6 text-[#918d84]">
              Find someone through the people who may know them.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="pf-button-primary w-full sm:w-auto"
          >
            <Plus size={16} />
            New request
          </button>
        </header>

        {error && (
          <div className="mt-6 flex items-start gap-3 border border-red-400/10 bg-red-400/[0.04] p-4">
            <AlertCircle
              size={18}
              className="mt-0.5 shrink-0 text-red-300"
            />

            <p className="text-sm text-red-300">
              {error}
            </p>
          </div>
        )}

        {loading ? (
          <div className="flex min-h-[40vh] items-center justify-center">
            <div className="flex items-center gap-3 text-sm text-[#918d84]">
              <Loader2
                size={18}
                className="animate-spin"
              />
              Loading requests...
            </div>
          </div>
        ) : requests.length === 0 ? (
          <div className="mt-10 border border-white/[0.07] bg-[#141413] p-12 text-center">
            <Users
              size={34}
              className="mx-auto mb-4 text-[#625f58]"
            />

            <h2 className="text-lg font-medium">
              No requests yet
            </h2>

            <p className="mt-2 text-sm text-[#918d84]">
              Create the first request and let the network help.
            </p>
          </div>
        ) : (
          <div className="mt-10 space-y-8">
            {requests.map((request) => {
              const requestResponses = responseList(
                request.id
              );

              const isOpen =
                (request.status || "Open").toLowerCase() ===
                "open";

              return (
                <article
                  key={request.id}
                  className="overflow-hidden border border-white/[0.075] bg-[#141413]"
                >
                  <div className="relative p-6 sm:p-7">
                    <div className="absolute inset-y-0 left-0 w-1 bg-[#cdbd96]" />

                    <div className="flex flex-wrap items-center gap-3">
                      <span
                        className={
                          isOpen
                            ? "border border-[#91b89a]/20 bg-[#91b89a]/[0.08] px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-[#91b89a]"
                            : "border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-[#918d84]"
                        }
                      >
                        {request.status || "Open"}
                      </span>

                      <span className="text-[10px] uppercase tracking-[0.16em] text-[#625f58]">
                        Finding someone
                      </span>
                    </div>

                    <h2 className="mt-5 text-2xl font-semibold tracking-tight text-[#f1eee8]">
                      {request.target_name ||
                        "Person not named"}
                    </h2>

                    <div className="mt-3 flex flex-wrap gap-x-2 gap-y-1 text-sm text-[#cbc7be]">
                      {request.department && (
                        <span>
                          {request.department}
                        </span>
                      )}

                      {request.department &&
                        request.school && (
                          <span className="text-[#625f58]">
                            ·
                          </span>
                        )}

                      {request.school && (
                        <span>
                          {request.school}
                        </span>
                      )}

                      {request.level && (
                        <>
                          <span className="text-[#625f58]">
                            ·
                          </span>

                          <span>
                            {request.level} Level
                          </span>
                        </>
                      )}
                    </div>

                    {(request.faculty ||
                      request.hostel) && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {request.faculty && (
                          <span className="border border-white/[0.06] bg-white/[0.025] px-2.5 py-1.5 text-xs text-[#918d84]">
                            {request.faculty}
                          </span>
                        )}

                        {request.hostel && (
                          <span className="border border-white/[0.06] bg-white/[0.025] px-2.5 py-1.5 text-xs text-[#918d84]">
                            {request.hostel}
                          </span>
                        )}
                      </div>
                    )}

                    {request.clues && (
                      <div className="mt-6 border-l border-[#cdbd96]/30 pl-4">
                        <p className="text-[10px] uppercase tracking-[0.16em] text-[#625f58]">
                          Additional clues
                        </p>

                        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#cbc7be]">
                          {request.clues}
                        </p>
                      </div>
                    )}

                    <div className="mt-7 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#625f58]">
                      <span>
                        Requested by
                      </span>

                      <span className="text-[#918d84]">
                        {request.requester_name ||
                          "Member"}
                      </span>

                      <span>·</span>

                      <span>
                        {new Date(
                          request.created_at
                        ).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <section className="border-t border-white/[0.07] bg-[#10100f] px-5 py-6 sm:px-7">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[#cdbd96]">
                          Responses
                        </p>

                        <p className="mt-1 text-sm text-[#918d84]">
                          {requestResponses.length ===
                          0
                            ? "No one has responded yet."
                            : `${requestResponses.length} ${
                                requestResponses.length ===
                                1
                                  ? "person has"
                                  : "people have"
                              } responded`}
                        </p>
                      </div>

                      <span className="text-sm text-[#625f58]">
                        {requestResponses.length}
                      </span>
                    </div>

                    {requestResponses.length > 0 && (
                      <div className="mt-5 space-y-0 border-l border-white/[0.08] pl-4 sm:pl-5">
                        {requestResponses.map(
                          (response, index) => {
                            /*
                             * IMPORTANT:
                             * Do NOT call this variable "vote".
                             * The page already has a vote() function.
                             * Naming this myReaction prevents the
                             * "vote is not a function" runtime error.
                             */
                            const myReaction =
                              myVote(response.id);

                            return (
                              <div
                                key={response.id}
                                className={`relative py-4 ${
                                  index > 0
                                    ? "border-t border-white/[0.05]"
                                    : ""
                                }`}
                              >
                                <div className="absolute -left-[25px] top-5 flex h-4 w-4 items-center justify-center rounded-full border border-[#cdbd96]/30 bg-[#10100f] sm:-left-[29px]">
                                  <span className="h-1.5 w-1.5 rounded-full bg-[#cdbd96]" />
                                </div>

                                <div className="flex gap-3">
                                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/[0.07] bg-[#181817] text-xs font-medium text-[#cdbd96]">
                                    {(
                                      response.responder_name ||
                                      "M"
                                    )
                                      .charAt(0)
                                      .toUpperCase()}
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                                      <span className="text-sm font-medium text-[#ebe8e1]">
                                        {response.responder_name ||
                                          "Member"}
                                      </span>

                                      <span className="text-[11px] text-[#625f58]">
                                        responded
                                      </span>

                                      <span className="text-[11px] text-[#625f58]">
                                        ·{" "}
                                        {new Date(
                                          response.created_at
                                        ).toLocaleDateString()}
                                      </span>
                                    </div>

                                    <p className="mt-2 text-sm leading-6 text-[#cbc7be]">
                                      {response.response}
                                    </p>

                                    <div className="mt-3 flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          vote(
                                            response.id,
                                            "up"
                                          )
                                        }
                                        aria-label="Like response"
                                        className={`inline-flex items-center gap-1.5 border px-2.5 py-1.5 text-xs transition ${
                                          myReaction ===
                                          "up"
                                            ? "border-[#cdbd96]/35 bg-[#cdbd96]/10 text-[#e6d8b2]"
                                            : "border-white/[0.07] bg-[#141413] text-[#918d84] hover:border-white/[0.13] hover:text-[#ebe8e1]"
                                        }`}
                                      >
                                        <span aria-hidden="true">
                                          👍
                                        </span>

                                        <span>
                                          {countVotes(
                                            response.id,
                                            "up"
                                          )}
                                        </span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() =>
                                          vote(
                                            response.id,
                                            "down"
                                          )
                                        }
                                        aria-label="Dislike response"
                                        className={`inline-flex items-center gap-1.5 border px-2.5 py-1.5 text-xs transition ${
                                          myReaction ===
                                          "down"
                                            ? "border-white/[0.16] bg-white/[0.06] text-[#ebe8e1]"
                                            : "border-white/[0.07] bg-[#141413] text-[#918d84] hover:border-white/[0.13] hover:text-[#ebe8e1]"
                                        }`}
                                      >
                                        <span aria-hidden="true">
                                          👎
                                        </span>

                                        <span>
                                          {countVotes(
                                            response.id,
                                            "down"
                                          )}
                                        </span>
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          }
                        )}
                      </div>
                    )}

                    <div className="mt-6">
                      {respondingTo ===
                      request.id ? (
                        <form
                          onSubmit={(event) =>
                            submitResponse(
                              event,
                              request.id
                            )
                          }
                          className="border border-white/[0.07] bg-[#141413] p-4"
                        >
                          <p className="text-[10px] uppercase tracking-[0.16em] text-[#625f58]">
                            Your response
                          </p>

                          <textarea
                            value={responseText}
                            onChange={(event) =>
                              setResponseText(
                                event.target.value
                              )
                            }
                            rows={3}
                            placeholder="Share what you know about this person..."
                            className="mt-3 w-full resize-none border border-white/[0.07] bg-[#0c0c0b] px-4 py-3 text-sm text-[#ebe8e1] placeholder:text-[#625f58] focus:border-[#cdbd96]/35"
                          />

                          <div className="mt-3 flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setRespondingTo(
                                  null
                                );
                                setResponseText("");
                              }}
                              className="pf-button-secondary"
                            >
                              <X size={15} />
                              Cancel
                            </button>

                            <button
                              type="submit"
                              disabled={
                                submitting ||
                                !responseText.trim()
                              }
                              className="pf-button-primary disabled:opacity-40"
                            >
                              <Send size={15} />
                              Respond
                            </button>
                          </div>
                        </form>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            setRespondingTo(
                              request.id
                            )
                          }
                          className="inline-flex w-full items-center justify-center gap-2 border border-white/[0.08] bg-[#141413] px-4 py-3 text-sm text-[#cbc7be] transition hover:border-[#cdbd96]/25 hover:text-[#ebe8e1] sm:w-auto"
                        >
                          <MessageCircle size={15} />
                          Share what you know
                        </button>
                      )}
                    </div>
                  </section>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {showCreate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto border border-white/[0.08] bg-[#141413] p-6 sm:p-7">
            <div className="flex items-start justify-between gap-5">
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-[#cdbd96]">
                  Community request
                </p>

                <h2 className="mt-2 text-xl font-semibold">
                  New request
                </h2>

                <p className="mt-1 text-sm leading-6 text-[#918d84]">
                  Give people enough information to
                  recognise the person.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowCreate(false)
                }
                className="p-2 text-[#918d84] hover:bg-white/[0.04] hover:text-[#ebe8e1]"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={createRequest}
              className="mt-7 space-y-4"
            >
              <Field
                label="Name"
                value={requestForm.targetName}
                onChange={(value) =>
                  setRequestForm((current) => ({
                    ...current,
                    targetName: value,
                  }))
                }
                placeholder="Name or partial name"
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="School"
                  value={requestForm.school}
                  onChange={(value) =>
                    setRequestForm((current) => ({
                      ...current,
                      school: value,
                    }))
                  }
                  placeholder="School or institution"
                />

                <Field
                  label="Faculty"
                  value={requestForm.faculty}
                  onChange={(value) =>
                    setRequestForm((current) => ({
                      ...current,
                      faculty: value,
                    }))
                  }
                  placeholder="Faculty"
                />

                <Field
                  label="Department"
                  value={requestForm.department}
                  onChange={(value) =>
                    setRequestForm((current) => ({
                      ...current,
                      department: value,
                    }))
                  }
                  placeholder="Department"
                />

                <Field
                  label="Level"
                  value={requestForm.level}
                  onChange={(value) =>
                    setRequestForm((current) => ({
                      ...current,
                      level: value,
                    }))
                  }
                  placeholder="100"
                />

                <Field
                  label="Hostel"
                  value={requestForm.hostel}
                  onChange={(value) =>
                    setRequestForm((current) => ({
                      ...current,
                      hostel: value,
                    }))
                  }
                  placeholder="Hostel"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs text-[#918d84]">
                  Additional clues
                </label>

                <textarea
                  value={requestForm.clues}
                  onChange={(event) =>
                    setRequestForm((current) => ({
                      ...current,
                      clues: event.target.value,
                    }))
                  }
                  rows={4}
                  placeholder="Group, class, appearance, where you last saw them, or anything else useful..."
                  className="w-full resize-none border border-white/[0.07] bg-[#0c0c0b] px-4 py-3 text-sm text-[#ebe8e1] placeholder:text-[#625f58] focus:border-[#cdbd96]/35"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="pf-button-primary w-full disabled:opacity-40"
              >
                {submitting ? (
                  <Loader2
                    size={16}
                    className="animate-spin"
                  />
                ) : (
                  <Plus size={16} />
                )}

                Create request
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs text-[#918d84]">
        {label}
      </label>

      <input
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
        className="w-full border border-white/[0.07] bg-[#0c0c0b] px-4 py-3 text-sm text-[#ebe8e1] placeholder:text-[#625f58] focus:border-[#cdbd96]/35"
      />
    </div>
  );
}