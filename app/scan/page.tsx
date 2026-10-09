"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import * as faceapi from "@vladmandic/face-api";
import { Camera, CheckCircle2, ImagePlus, Loader2, RotateCcw, ScanFace, ShieldCheck, X } from "lucide-react";
import Navbar from "../components/Navbar";
import { supabase } from "../../src/lib/supabase";

const MODEL_PATH = "/models/face/";
const MATCH_THRESHOLD = 0.6;
type MatchResult = { distance: number; possibleMatch: boolean };

export default function ScanPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [userChecked, setUserChecked] = useState(false);
  const [userSignedIn, setUserSignedIn] = useState(false);
  const [modelsReady, setModelsReady] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [referenceUrl, setReferenceUrl] = useState("");
  const [testImage, setTestImage] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MatchResult | null>(null);

  useEffect(() => {
    let active = true;
    async function initialise() {
      try {
        const { data } = await supabase.auth.getUser();
        if (active) setUserSignedIn(Boolean(data.user));
      } catch {
        if (active) setError("Could not check your session. Refresh and sign in again.");
      } finally {
        if (active) setUserChecked(true);
      }
    }
    void initialise();
    Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_PATH),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_PATH),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_PATH),
    ]).then(() => {
      if (active) setModelsReady(true);
    }).catch((cause: unknown) => {
      console.error("Face model loading failed:", cause);
      if (active) setError("Face models could not load. Run the model-download script and refresh this page.");
    });
    return () => {
      active = false;
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    if (!cameraOpen || !videoRef.current || !streamRef.current) return;
    videoRef.current.srcObject = streamRef.current;
    void videoRef.current.play().catch((cause) => {
      console.error("Camera preview failed:", cause);
      setError("Camera opened, but its preview did not start. Check browser permissions.");
    });
  }, [cameraOpen]);

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOpen(false);
  }

  async function openCamera() {
    setError("");
    setResult(null);
    setCameraLoading(true);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera access requires HTTPS or localhost and a supported browser.");
      }
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "user" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOpen(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not open the camera. Allow camera access or upload a photo instead.");
    } finally {
      setCameraLoading(false);
    }
  }

  function capturePhoto() {
    const video = videoRef.current;
    if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || !video.videoWidth) {
      setError("The camera is not ready yet. Wait until the preview appears and try again.");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      setError("Could not capture the camera image.");
      return;
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    setTestImage(canvas.toDataURL("image/jpeg", 0.92));
    setResult(null);
    setError("");
    stopCamera();
  }

  function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Choose an image file.");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setError("Choose an image smaller than 15 MB.");
      return;
    }
    stopCamera();
    if (testImage?.startsWith("blob:")) URL.revokeObjectURL(testImage);
    setTestImage(URL.createObjectURL(file));
    setResult(null);
    setError("");
  }

  function loadImage(source: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Could not load the reference image. Check that the URL is valid, not expired, and allows browser image access."));
      image.src = source;
    });
  }

  async function descriptorFor(source: string): Promise<Float32Array> {
    const image = await loadImage(source);
    const detection = await faceapi.detectSingleFace(image, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
      .withFaceLandmarks()
      .withFaceDescriptor();
    if (!detection) throw new Error("No clear face was detected in one of the images. Try a front-facing, well-lit photo.");
    return detection.descriptor;
  }

  async function comparePhotos() {
    if (!modelsReady) { setError("Wait until the face models finish loading."); return; }
    if (!referenceUrl.trim() || !testImage) { setError("Add your reference photo URL and capture or upload a second photo."); return; }
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const [referenceDescriptor, testDescriptor] = await Promise.all([
        descriptorFor(referenceUrl.trim()),
        descriptorFor(testImage),
      ]);
      const distance = faceapi.euclideanDistance(referenceDescriptor, testDescriptor);
      setResult({ distance, possibleMatch: distance < MATCH_THRESHOLD });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Photo comparison failed.");
    } finally {
      setLoading(false);
    }
  }

  function resetTest() {
    stopCamera();
    if (testImage?.startsWith("blob:")) URL.revokeObjectURL(testImage);
    setTestImage(null);
    setResult(null);
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  if (!userChecked) return <main className="min-h-screen bg-[#0c0c0b] text-[#ebe8e1]"><Navbar /><div className="flex min-h-[65vh] items-center justify-center gap-3 text-sm text-[#918d84]"><Loader2 size={18} className="animate-spin" /> Loading Scan to Find...</div></main>;
  if (!userSignedIn) return (
    <main className="min-h-screen bg-[#0c0c0b] text-[#ebe8e1]">
      <Navbar />
      <section className="mx-auto max-w-2xl px-6 py-20 text-center">
        <ScanFace size={36} className="mx-auto text-[#cdbd96]" />
        <h1 className="mt-5 text-3xl font-semibold">Face Match Lab</h1>
        <p className="mt-3 text-sm leading-7 text-[#918d84]">Sign in to test the personal photo-comparison prototype.</p>
        <a href="/auth" className="pf-button-primary mt-7">Sign in</a>
      </section>
    </main>
  );

  return (
    <main className="min-h-screen bg-[#0c0c0b] text-[#ebe8e1]">
      <Navbar />
      <section className="mx-auto max-w-4xl px-5 py-9 sm:px-6 sm:py-12">
        <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-[#cdbd96]">PeopleFind · Experimental tool</p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Face Match Lab</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-[#918d84]">Compare two photos you control. This version tests one reference photo against one test photo; it does not search the student directory or reveal anyone’s profile.</p>
        <div className="mt-7 flex items-center gap-2 rounded-xl border border-white/[0.08] bg-[#141413] px-4 py-3 text-sm">
          <span className={`h-2 w-2 rounded-full ${modelsReady ? "bg-emerald-400" : "bg-[#cdbd96]"}`} />
          {modelsReady ? "Face models ready" : "Loading face models…"}
        </div>
        {error && <div role="alert" className="mt-5 flex items-start gap-3 rounded-xl border border-[#d98282]/20 bg-[#d98282]/[0.06] p-4 text-sm leading-6 text-[#d7aaa7]"><X size={18} className="mt-0.5 shrink-0" /><span>{error}</span></div>}
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <section className="rounded-2xl border border-white/[0.08] bg-[#141413] p-5 sm:p-6">
            <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#cdbd96]/10 text-[#cdbd96]"><ShieldCheck size={20} /></div><div><h2 className="text-sm font-semibold">Reference photo</h2><p className="mt-1 text-xs text-[#918d84]">A photo you control</p></div></div>
            <label htmlFor="reference-url" className="mt-5 block text-sm font-medium">Supabase image URL</label>
            <input id="reference-url" type="url" value={referenceUrl} onChange={(event) => { setReferenceUrl(event.target.value); setResult(null); }} placeholder="Paste a public or valid signed URL" className="mt-2 w-full rounded-xl border border-white/[0.1] bg-[#0b0b0a] px-3 py-3 text-sm outline-none focus:border-[#cdbd96]/60" />
            <p className="mt-2 text-xs leading-5 text-[#777267]">Private Supabase files need an unexpired signed URL and browser access. Never paste a service-role key.</p>
          </section>
          <section className="rounded-2xl border border-white/[0.08] bg-[#141413] p-5 sm:p-6">
            <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#cdbd96]/10 text-[#cdbd96]"><ScanFace size={20} /></div><div><h2 className="text-sm font-semibold">Test photo</h2><p className="mt-1 text-xs text-[#918d84]">Capture or upload another image</p></div></div>
            <div className="mt-5 flex min-h-52 items-center justify-center overflow-hidden rounded-xl border border-white/[0.08] bg-[#090909]">
              {cameraOpen ? <video ref={videoRef} autoPlay muted playsInline className="max-h-80 w-full object-contain" /> : testImage ? <img src={testImage} alt="Selected test photo" className="max-h-80 w-full object-contain" /> : <div className="p-6 text-center text-sm text-[#777267]"><ImagePlus size={28} className="mx-auto mb-3" />No test photo selected</div>}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button type="button" onClick={cameraOpen ? capturePhoto : openCamera} disabled={cameraLoading} className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#cdbd96] px-3 py-3 text-sm font-semibold text-[#171612] disabled:opacity-50">{cameraLoading ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}{cameraOpen ? "Capture" : cameraLoading ? "Opening…" : "Use camera"}</button>
              <button type="button" onClick={() => fileInputRef.current?.click()} className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/[0.1] px-3 py-3 text-sm hover:bg-white/[0.04]"><ImagePlus size={16} /> Upload</button>
            </div>
            {cameraOpen && <button type="button" onClick={stopCamera} className="mt-3 w-full rounded-xl border border-white/[0.08] px-3 py-2 text-xs text-[#918d84]">Close camera</button>}
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
          </section>
        </div>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <button type="button" disabled={!modelsReady || !testImage || !referenceUrl.trim() || loading} onClick={comparePhotos} className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-[#ebe8e1] px-5 py-3 text-sm font-semibold text-[#0c0c0b] disabled:cursor-not-allowed disabled:opacity-40">{loading ? <Loader2 size={17} className="animate-spin" /> : <ScanFace size={17} />}{loading ? "Comparing photos…" : "Compare photos"}</button>
          <button type="button" onClick={resetTest} className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/[0.1] px-5 py-3 text-sm"><RotateCcw size={16} /> Reset</button>
        </div>
        {result && <section className="mt-5 rounded-2xl border border-white/[0.1] bg-[#141413] p-5 sm:p-6"><div className="flex items-start gap-3"><CheckCircle2 size={22} className="mt-0.5 text-[#cdbd96]" /><div><p className="text-xs uppercase tracking-[0.16em] text-[#918d84]">Experimental result</p><h2 className="mt-2 text-xl font-semibold">{result.possibleMatch ? "Possible match" : "No match at this threshold"}</h2><p className="mt-2 text-sm text-[#b9b4a9]">Descriptor distance: <span className="font-mono">{result.distance.toFixed(4)}</span></p><p className="mt-3 text-xs leading-6 text-[#777267]">The 0.6 threshold is only a starting point, not an identity confidence score. Lighting, pose, image quality, and the model can cause errors. Do not use this result to make decisions about another person.</p></div></div></section>}
        <p className="mt-5 text-xs leading-6 text-[#777267]">This page calculates descriptors in your browser and does not save images or descriptors to Supabase. The next stage requires an explicit opt-in design and accuracy testing before any student-directory integration.</p>
      </section>
    </main>
  );
}
