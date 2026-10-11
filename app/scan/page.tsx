"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Camera, CheckCircle2, ImagePlus, LoaderCircle, RefreshCw, ScanSearch, ShieldCheck, X,
} from "lucide-react";
import Navbar from "../components/Navbar";

type ScanMatch = {
  id: string;
  name: string;
  photoUrl: string | null;
  faculty: string | null;
  distance: number;
  profileUrl: string;
};

type MatchResponse = {
  matches?: ScanMatch[];
  note?: string;
  error?: string;
  hint?: string;
};

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

export default function ScanPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraBusy, setCameraBusy] = useState(false);
  const [matching, setMatching] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [matches, setMatches] = useState<ScanMatch[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  useEffect(() => {
    if (!cameraOpen || !videoRef.current || !streamRef.current) return;
    const video = videoRef.current;
    video.srcObject = streamRef.current;
    void video.play().catch(() => setError("The camera opened, but its preview could not start."));
  }, [cameraOpen]);

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOpen(false);
  }

  function resetResults() {
    setMatches([]);
    setNote("");
    setHasSearched(false);
    setError("");
  }

  function selectImage(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Choose a valid image file.");
      return;
    }
    if (file.size <= 0 || file.size > MAX_UPLOAD_BYTES) {
      setError("Choose an image smaller than 8 MB.");
      return;
    }
    stopCamera();
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    resetResults();
  }

  function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) selectImage(file);
  }

  async function openCamera() {
    setError("");
    setCameraBusy(true);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera access needs HTTPS or localhost. You can upload a photo instead.");
      }
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOpen(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not open the camera. Check browser permissions.");
    } finally {
      setCameraBusy(false);
    }
  }

  async function capturePhoto() {
    const video = videoRef.current;
    if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || !video.videoWidth) {
      setError("The camera is not ready yet. Wait for the preview and try again.");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      setError("Could not capture the image. Upload a photo instead.");
      return;
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
    if (!blob) {
      setError("Could not prepare the captured image. Please try again.");
      return;
    }
    selectImage(new File([blob], "scan-photo.jpg", { type: "image/jpeg" }));
  }

  async function runMatch() {
    if (!selectedFile || matching) return;
    setMatching(true);
    setError("");
    setNote("");
    setMatches([]);
    setHasSearched(false);

    try {
      const body = new FormData();
      body.append("image", selectedFile);
      const response = await fetch("/api/scan/match", {
        method: "POST",
        body,
        cache: "no-store",
      });
      const payload = await response.json().catch(() => ({})) as MatchResponse;

      if (!response.ok) {
        if (response.status === 401) throw new Error("Please sign in before using Scan-to-Find.");
        if (response.status === 403) throw new Error(payload.hint || "Your account is not yet enabled for Scan-to-Find.");
        if (response.status === 429) throw new Error("You have reached the scan limit. Please wait a minute and try again.");
        if (response.status === 422) throw new Error("We could not read that image. Try a clearer photo in JPG or PNG format.");
        throw new Error(payload.hint || "The scan could not be completed. Please try again.");
      }

      setMatches(Array.isArray(payload.matches) ? payload.matches : []);
      setNote(payload.note || "");
      setHasSearched(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong while matching the image.");
    } finally {
      setMatching(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#0e0e0d] text-[#ebe8e1]">
      <Navbar />
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6 lg:pt-12">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#a7a195]">PeopleFind / Scan-to-Find</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Find a person from a photo</h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-[#a7a195] sm:text-base">
            Upload or capture a reference image. PeopleFind compares its visual appearance with indexed directory photos and shows the closest results it can find.
          </p>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
          <section className="rounded-2xl border border-white/[0.09] bg-[#151514] p-4 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-[#20201e] text-[#d2cabb]">
                <ScanSearch size={19} />
              </div>
              <div>
                <h2 className="font-semibold">Reference image</h2>
                <p className="mt-1 text-xs text-[#858178]">JPG, PNG, WEBP · Maximum 8 MB</p>
              </div>
            </div>

            <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleUpload} />

            {cameraOpen ? (
              <div className="mt-5 overflow-hidden rounded-xl border border-white/[0.08] bg-black">
                <video ref={videoRef} autoPlay playsInline muted className="max-h-[420px] min-h-48 w-full object-contain" />
                <div className="flex flex-wrap gap-2 border-t border-white/[0.08] p-3">
                  <button type="button" onClick={() => void capturePhoto()} className="inline-flex items-center gap-2 rounded-lg bg-[#e3ded2] px-4 py-2.5 text-sm font-semibold text-[#171715] hover:bg-white">
                    <Camera size={16} /> Capture photo
                  </button>
                  <button type="button" onClick={stopCamera} className="inline-flex items-center gap-2 rounded-lg border border-white/[0.12] px-4 py-2.5 text-sm text-[#c8c3b9] hover:bg-white/[0.05]">
                    <X size={16} /> Cancel
                  </button>
                </div>
              </div>
            ) : previewUrl ? (
              <div className="mt-5 overflow-hidden rounded-xl border border-white/[0.08] bg-[#0b0b0a]">
                <img src={previewUrl} alt="Selected reference" className="max-h-[420px] min-h-48 w-full object-contain" />
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.08] p-3">
                  <p className="max-w-[70%] truncate text-xs text-[#a7a195]">{selectedFile?.name}</p>
                  <button type="button" onClick={() => { setSelectedFile(null); setPreviewUrl(""); resetResults(); }} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs text-[#c8c3b9] hover:bg-white/[0.06]">
                    <X size={14} /> Remove
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => fileInputRef.current?.click()} className="mt-5 flex min-h-64 w-full flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.16] bg-[#10100f] px-5 text-center transition hover:border-white/[0.28] hover:bg-[#181817]">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.09] bg-[#20201e] text-[#c8c3b9]"><ImagePlus size={22} /></span>
                <span className="mt-4 text-sm font-semibold">Choose a reference image</span>
                <span className="mt-2 max-w-xs text-xs leading-5 text-[#858178]">Use a clear, well-lit image for the best chance of a useful visual match.</span>
              </button>
            )}

            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button type="button" disabled={cameraBusy || matching} onClick={() => void openCamera()} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.12] px-4 py-3 text-sm font-medium text-[#d8d2c7] transition hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-50">
                {cameraBusy ? <LoaderCircle className="animate-spin" size={17} /> : <Camera size={17} />}
                {cameraBusy ? "Opening camera…" : "Use camera"}
              </button>
              <button type="button" disabled={!selectedFile || matching} onClick={() => void runMatch()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#e3ded2] px-4 py-3 text-sm font-semibold text-[#171715] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-45">
                {matching ? <LoaderCircle className="animate-spin" size={17} /> : <ScanSearch size={17} />}
                {matching ? "Comparing image…" : "Find matches"}
              </button>
            </div>

            {error && <div role="alert" className="mt-4 rounded-xl border border-[#c77b6b]/25 bg-[#c77b6b]/[0.08] px-4 py-3 text-sm leading-5 text-[#e2a99d]">{error}</div>}
          </section>

          <section className="rounded-2xl border border-white/[0.09] bg-[#151514] p-4 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-[#20201e] text-[#d2cabb]">
                <CheckCircle2 size={19} />
              </div>
              <div>
                <h2 className="font-semibold">Closest results</h2>
                <p className="mt-1 text-xs text-[#858178]">Visual similarity, not proof of identity</p>
              </div>
            </div>

            {matching ? (
              <div className="flex min-h-64 flex-col items-center justify-center text-center">
                <LoaderCircle className="animate-spin text-[#c8c3b9]" size={28} />
                <p className="mt-4 text-sm font-medium">Comparing the image</p>
                <p className="mt-2 max-w-xs text-xs leading-5 text-[#858178]">The first scan may take longer while the vision model loads.</p>
              </div>
            ) : matches.length > 0 ? (
              <div className="mt-5 space-y-3">
                {matches.map((match, index) => (
                  <Link key={match.id} href={match.profileUrl} className="flex gap-3 rounded-xl border border-white/[0.08] bg-[#10100f] p-3 transition hover:border-white/[0.18] hover:bg-[#191918]">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/[0.08] bg-[#20201e] text-xs text-[#858178]">
                      {match.photoUrl ? <img src={match.photoUrl} alt="" className="h-full w-full object-cover" /> : <ImagePlus size={20} />}
                    </div>
                    <div className="min-w-0 flex-1 py-0.5">
                      <p className="text-[11px] uppercase tracking-[0.15em] text-[#858178]">Possible result {index + 1}</p>
                      <p className="mt-1 truncate text-sm font-semibold text-[#ebe8e1]">{match.name}</p>
                      <p className="mt-1 truncate text-xs text-[#a7a195]">{match.faculty || "Faculty not listed"}</p>
                    </div>
                    <div className="self-center text-[#858178]"><CheckCircle2 size={16} /></div>
                  </Link>
                ))}
                {note && <p className="rounded-lg bg-[#10100f] p-3 text-xs leading-5 text-[#a7a195]">{note}</p>}
              </div>
            ) : hasSearched ? (
              <div className="mt-5 flex min-h-64 flex-col items-center justify-center rounded-xl border border-white/[0.07] bg-[#10100f] px-5 text-center">
                <ScanSearch size={26} className="text-[#858178]" />
                <p className="mt-4 text-sm font-semibold">No close matches found</p>
                <p className="mt-2 max-w-sm text-xs leading-5 text-[#858178]">{note || "Try a clearer image or a different angle."}</p>
                <button type="button" onClick={() => { setHasSearched(false); setMatches([]); setNote(""); }} className="mt-4 inline-flex items-center gap-2 rounded-lg border border-white/[0.12] px-3 py-2 text-xs text-[#d8d2c7] hover:bg-white/[0.05]"><RefreshCw size={14} /> Try again</button>
              </div>
            ) : (
              <div className="mt-5 flex min-h-64 flex-col items-center justify-center rounded-xl border border-white/[0.07] bg-[#10100f] px-5 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.08] bg-[#20201e] text-[#c8c3b9]"><ScanSearch size={22} /></div>
                <p className="mt-4 text-sm font-semibold">Your matches will appear here</p>
                <p className="mt-2 max-w-sm text-xs leading-5 text-[#858178]">Choose an image and select Find matches. Results depend on the quality and coverage of the indexed directory photos.</p>
              </div>
            )}

            <div className="mt-5 flex items-start gap-3 rounded-xl border border-white/[0.07] bg-[#10100f] p-3.5">
              <ShieldCheck size={17} className="mt-0.5 shrink-0 text-[#a7a195]" />
              <p className="text-xs leading-5 text-[#858178]">Scan results are suggestions based on image similarity. Always open the directory profile and verify details independently. This feature does not identify someone with certainty.</p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
