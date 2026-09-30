"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  AlertCircle,
  Check,
  Loader2,
  MessageCircle,
  Plus,
  Send,
  ThumbsDown,
  ThumbsUp,
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
  vote: string | null;
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

      const [
        { data: requestData, error: requestError },
        { data: responseData, error: responseError },
        { data: feedbackData, error: feedbackError },
      ] = await Promise.all([
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
          .select(
            "id, response_id, user_id, voter_name, vote"
          ),
      ]);

      if (requestError) throw requestError;
      if (responseError) throw responseError;
      if (feedbackError) throw feedbackError;

      setRequests((requestData ?? []) as RequestItem[]);
      setResponses((responseData ?? []) as ResponseItem[]);
      setFeedback((feedbackData ?? []) as FeedbackItem[]);
    } catch (err: any) {
      console.error("Requests error:", err);

      setError(
        err?.message || "We couldn't load requests."
      );
    } finally {
      setLoading(false);
    }
  }

  async function createRequest(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      !requestForm.targetName.trim() &&
      !requestForm.clues.trim()
    ) {
      setError("Add at least a name or some clues.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("Please sign in first.");

      const nickname =
        user.user_metadata?.nickname ||
        user.user_metadata?.name ||
        "Anonymous";

      const { error: insertError } = await supabase
        .from("requests")
        .insert({
          user_id: user.id,
          requester_name: nickname,
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
      setError(
        err?.message || "We couldn't create the request."
      );
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

      if (!user) throw new Error("Please sign in first.");

      const nickname =
        user.user_metadata?.nickname ||
        user.user_metadata?.name ||
        "Anonymous";

      const { error: insertError } = await supabase
        .from("request_responses")
        .insert({
          request_id: requestId,
          user_id: user.id,
          responder_name: nickname,
          response: responseText.trim(),
        });

      if (insertError) throw insertError;

      setResponseText("");
      setRespondingTo(null);

      await loadRequests();
    } catch (err: any) {
      setError(
        err?.message || "We couldn't submit your response."
      );
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
        setError("Please sign in to give feedback.");
        return;
      }

      const existing = feedback.find(
        (item) =>
          item.response_id === responseId &&
          item.user_id === user.id
      );

      if (existing?.vote === voteType) {
        const { error } = await supabase
          .from("response_feedback")
          .delete()
          .eq("id", existing.id);

        if (error) throw error;
      } else if (existing) {
        const { error } = await supabase
          .from("response_feedback")
          .update({
            vote: voteType,
            voter_name:
              user.user_metadata?.nickname ||
              user.user_metadata?.name ||
              "Anonymous",
          })
          .eq("id", existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("response_feedback")
          .insert({
            response_id: responseId,
            user_id: user.id,
            voter_name:
              user.user_metadata?.nickname ||
              user.user_metadata?.name ||
              "Anonymous",
            vote: voteType,
          });

        if (error) throw error;
      }

      await loadRequests();
    } catch (err: any) {
      console.error("Feedback error:", err);

      setError(
        err?.message || "Couldn't save your feedback."
      );
    }
  }

  function getResponseFeedback(responseId: string) {
    return feedback.filter(
      (item) => item.response_id === responseId
    );
  }

  function getVoteCount(
    responseId: string,
    type: "up" | "down"
  ) {
    return getResponseFeedback(responseId).filter(
      (item) => item.vote === type
    ).length;
  }

  function getMyVote(responseId: string) {
    return feedback.find(
      (item) =>
        item.response_id === responseId &&
        item.user_id
    );
  }

  function responsesFor(requestId: string) {
    return responses.filter(
      (response) => response.request_id === requestId
    );
  }

  return (
    <main className="min-h-screen bg-[#090909] text-[#E8E5DF]">
      <Navbar />

      <section className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.07] bg-[#151515]">
              <MessageCircle
                size={20}
                className="text-[#A7A39B]"
              />
            </div>

            <h1 className="text-3xl font-semibold tracking-tight">
              Requests
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-6 text-[#77736D]">
              Ask the network if they know someone you are trying to find.
            </p>
          </div>

          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#E8E5DF] px-4 py-3 text-sm font-medium text-[#090909] hover:bg-white"
          >
            <Plus size={16} />
            New request
          </button>
        </div>

        {error && (
          <div className="mt-8 flex items-start gap-3 rounded-2xl border border-red-500/10 bg-red-500/[0.04] p-4">
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
            <div className="flex items-center gap-3 text-sm text-[#77736D]">
              <Loader2 size={18} className="animate-spin" />
              Loading requests...
            </div>
          </div>
        ) : requests.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-white/[0.06] bg-[#111111] p-12 text-center">
            <Users
              size={34}
              className="mx-auto mb-4 text-[#5F5C57]"
            />
            <h2 className="text-lg font-medium">
              No requests yet
            </h2>
            <p className="mt-2 text-sm text-[#77736D]">
              Create the first request and let the network help.
            </p>
          </div>
        ) : (
          <div className="mt-10 space-y-5">
            {requests.map((request) => {
              const requestResponses =
                responsesFor(request.id);

              return (
                <article
                  key={request.id}
                  className="rounded-2xl border border-white/[0.06] bg-[#111111] p-6"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className="rounded-lg border border-white/[0.06] px-2 py-1 text-[10px] uppercase tracking-wider text-[#77736D]">
                        {request.status || "Open"}
                      </span>

                      <h2 className="mt-4 text-xl font-medium">
                        {request.target_name ||
                          "Someone unidentified"}
                      </h2>

                      <p className="mt-1 text-xs text-[#77736D]">
                        Requested by{" "}
                        {request.requester_name ||
                          "Anonymous"}{" "}
                        ·{" "}
                        {new Date(
                          request.created_at
                        ).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    {request.school && (
                      <Detail
                        label="School"
                        value={request.school}
                      />
                    )}

                    {request.faculty && (
                      <Detail
                        label="Faculty"
                        value={request.faculty}
                      />
                    )}

                    {request.department && (
                      <Detail
                        label="Department"
                        value={request.department}
                      />
                    )}

                    {request.level && (
                      <Detail
                        label="Level"
                        value={request.level}
                      />
                    )}

                    {request.hostel && (
                      <Detail
                        label="Hostel"
                        value={request.hostel}
                      />
                    )}
                  </div>

                  {request.clues && (
                    <div className="mt-5 rounded-xl border border-white/[0.05] bg-[#151515] p-4">
                      <p className="mb-1 text-[10px] uppercase tracking-wider text-[#5F5C57]">
                        Clues
                      </p>

                      <p className="text-sm leading-6 text-[#A7A39B]">
                        {request.clues}
                      </p>
                    </div>
                  )}

                  {requestResponses.length > 0 && (
                    <div className="mt-6 border-t border-white/[0.05] pt-5">
                      <p className="text-xs uppercase tracking-wider text-[#5F5C57]">
                        Responses
                      </p>

                      <div className="mt-3 space-y-3">
                        {requestResponses.map(
                          (response) => {
                            const myVote =
                              getMyVote(response.id);

                            return (
                              <div
                                key={response.id}
                                className="rounded-xl border border-white/[0.05] bg-[#151515] p-4"
                              >
                                <p className="text-sm leading-6 text-[#E8E5DF]">
                                  {response.response}
                                </p>

                                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                                  <p className="text-xs text-[#77736D]">
                                    {response.responder_name ||
                                      "Anonymous"}{" "}
                                    ·{" "}
                                    {new Date(
                                      response.created_at
                                    ).toLocaleString()}
                                  </p>

                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() =>
                                        vote(
                                          response.id,
                                          "up"
                                        )
                                      }
                                      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition ${
                                        myVote?.vote ===
                                        "up"
                                          ? "border-white/[0.18] bg-[#E8E5DF] text-[#090909]"
                                          : "border-white/[0.06] text-[#77736D] hover:bg-[#1D1D1D]"
                                      }`}
                                    >
                                      {myVote?.vote ===
                                      "up" ? (
                                        <Check size={13} />
                                      ) : (
                                        <ThumbsUp size={13} />
                                      )}
                                      {getVoteCount(
                                        response.id,
                                        "up"
                                      )}
                                    </button>

                                    <button
                                      onClick={() =>
                                        vote(
                                          response.id,
                                          "down"
                                        )
                                      }
                                      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition ${
                                        myVote?.vote ===
                                        "down"
                                          ? "border-white/[0.18] bg-[#E8E5DF] text-[#090909]"
                                          : "border-white/[0.06] text-[#77736D] hover:bg-[#1D1D1D]"
                                      }`}
                                    >
                                      {myVote?.vote ===
                                      "down" ? (
                                        <Check size={13} />
                                      ) : (
                                        <ThumbsDown size={13} />
                                      )}
                                      {getVoteCount(
                                        response.id,
                                        "down"
                                      )}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          }
                        )}
                      </div>
                    </div>
                  )}

                  <div className="mt-6">
                    {respondingTo === request.id ? (
                      <form
                        onSubmit={(event) =>
                          submitResponse(
                            event,
                            request.id
                          )
                        }
                      >
                        <textarea
                          value={responseText}
                          onChange={(event) =>
                            setResponseText(
                              event.target.value
                            )
                          }
                          rows={3}
                          placeholder="What do you know about this person?"
                          className="w-full resize-none rounded-xl border border-white/[0.07] bg-[#0D0D0D] px-4 py-3 text-sm text-[#E8E5DF] outline-none placeholder:text-[#5F5C57] focus:border-white/[0.15]"
                        />

                        <div className="mt-3 flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setRespondingTo(null);
                              setResponseText("");
                            }}
                            className="inline-flex items-center gap-2 rounded-xl border border-white/[0.07] px-4 py-2.5 text-sm text-[#A7A39B]"
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
                            className="inline-flex items-center gap-2 rounded-xl bg-[#E8E5DF] px-4 py-2.5 text-sm font-medium text-[#090909] disabled:opacity-40"
                          >
                            <Send size={15} />
                            Respond
                          </button>
                        </div>
                      </form>
                    ) : (
                      <button
                        onClick={() =>
                          setRespondingTo(request.id)
                        }
                        className="inline-flex items-center gap-2 rounded-xl border border-white/[0.07] bg-[#151515] px-4 py-2.5 text-sm text-[#E8E5DF] hover:bg-[#1B1B1B]"
                      >
                        <MessageCircle size={15} />
                        Respond
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {showCreate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/[0.08] bg-[#111111] p-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold">
                  New request
                </h2>

                <p className="mt-1 text-sm text-[#77736D]">
                  Give the network enough clues to identify the person.
                </p>
              </div>

              <button
                onClick={() => setShowCreate(false)}
                className="rounded-lg p-2 text-[#77736D] hover:bg-[#1A1A1A]"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={createRequest}
              className="mt-6 space-y-4"
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
                  placeholder="University of Ibadan"
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
                <label className="mb-2 block text-xs text-[#77736D]">
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
                  placeholder="Anything else that could help..."
                  className="w-full resize-none rounded-xl border border-white/[0.07] bg-[#0D0D0D] px-4 py-3 text-sm text-[#E8E5DF] outline-none placeholder:text-[#5F5C57] focus:border-white/[0.15]"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#E8E5DF] px-5 py-3 text-sm font-medium text-[#090909] disabled:opacity-40"
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
      <label className="mb-2 block text-xs text-[#77736D]">
        {label}
      </label>

      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-white/[0.07] bg-[#0D0D0D] px-4 py-3 text-sm text-[#E8E5DF] outline-none placeholder:text-[#5F5C57] focus:border-white/[0.15]"
      />
    </div>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/[0.05] bg-[#151515] px-4 py-3">
      <p className="text-[10px] uppercase tracking-wider text-[#5F5C57]">
        {label}
      </p>

      <p className="mt-1 truncate text-sm text-[#A7A39B]">
        {value}
      </p>
    </div>
  );
}