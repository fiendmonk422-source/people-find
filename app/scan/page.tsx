"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import {
  Camera,
  Check,
  ImagePlus,
  Loader2,
  RotateCcw,
  ScanFace,
  Upload,
  X,
} from "lucide-react";

import Navbar from "../components/Navbar";
import { supabase } from "../../src/lib/supabase";

export default function ScanPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [userChecked, setUserChecked] = useState(false);
  const [userSignedIn, setUserSignedIn] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    checkSession();

    return () => {
      stopCamera();
    };
  }, []);

  useEffect(() => {
    if (cameraOpen && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [cameraOpen]);

  async function checkSession() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    setUserSignedIn(Boolean(user));
    setUserChecked(true);
  }

  async function openCamera() {
    setError("");
    setCapturedImage(null);
    setCapturedFile(null);
    setCameraLoading(true);

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera access is not supported by this browser.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      setCameraOpen(true);
    } catch (err: any) {
      console.error("Camera error:", err);

      setError(
        err?.name === "NotAllowedError"
          ? "Camera permission was denied. Allow camera access and try again."
          : "We could not open the camera. You can upload an image instead."
      );
    } finally {
      setCameraLoading(false);
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOpen(false);
  }

  function capturePhoto() {
    const video = videoRef.current;

    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      setError("The camera is not ready yet. Try again in a moment.");
      return;
    }

    const canvas = document.createElement("canvas");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");

    if (!context) {
      setError("Unable to capture the camera image.");
      return;
    }

    context.drawImage(
      video,
      0,
      0,
      canvas.width,
      canvas.height
    );

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setError("Unable to create the captured image.");
          return;
        }

        const fileName =
          "peoplefind-scan-" +
          Date.now() +
          ".jpg";

        const file = new File(
          [blob],
          fileName,
          {
            type: "image/jpeg",
          }
        );

        setCapturedFile(file);
        setCapturedImage(URL.createObjectURL(blob));

        stopCamera();
      },
      "image/jpeg",
      0.92
    );
  }

  function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    setError("");

    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setError("Please choose an image smaller than 15 MB.");
      return;
    }

    stopCamera();

    setCapturedFile(file);
    setCapturedImage(URL.createObjectURL(file));
  }

  function clearImage() {
    if (capturedImage) {
      URL.revokeObjectURL(capturedImage);
    }

    setCapturedImage(null);
    setCapturedFile(null);
    setError("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function startAgain() {
    clearImage();
    openCamera();
  }

  if (!userChecked) {
    return (
      <main className="min-h-screen bg-[#0c0c0b] text-[#ebe8e1]">
        <Navbar />

        <div className="flex min-h-[70vh] items-center justify-center">
          <div className="flex items-center gap-3 text-sm text-[#918d84]">
            <Loader2 size={18} className="animate-spin" />
            Loading Scan to Find...
          </div>
        </div>
      </main>
    );
  }

  if (!userSignedIn) {
    return (
      <main className="min-h-screen bg-[#0c0c0b] text-[#ebe8e1]">
        <Navbar />

        <section className="mx-auto max-w-3xl px-6 py-20 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.08] bg-[#141413]">
            <ScanFace
              size={27}
              className="text-[#cdbd96]"
            />
          </div>

          <h1 className="mt-6 text-3xl font-semibold tracking-tight">
            Scan to Find
          </h1>

          <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[#918d84]">
            Sign in to use PeopleFind's person-matching tools.
          </p>

          <a
            href="/auth"
            className="pf-button-primary mt-7"
          >
            Sign in
          </a>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0c0c0b] text-[#ebe8e1]">
      <Navbar />

      <section className="mx-auto max-w-5xl px-6 py-10 sm:py-14">
        <div className="max-w-2xl">
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-[#cdbd96]">
            PeopleFind
          </p>

          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Scan to Find
          </h1>

          <p className="mt-3 text-sm leading-7 text-[#918d84]">
            Take a photo or choose an existing image. PeopleFind will use the
            image as the starting point for finding possible matches in the
            directory.
          </p>
        </div>

        {error && (
          <div className="mt-7 flex items-start gap-3 rounded-2xl border border-[#d98282]/20 bg-[#d98282]/[0.06] p-4">
            <X
              size={18}
              className="mt-0.5 shrink-0 text-[#d98282]"
            />

            <p className="text-sm leading-6 text-[#d7aaa7]">
              {error}
            </p>
          </div>
        )}

        <div className="mt-9">
          {cameraOpen ? (
            <CameraPanel
              videoRef={videoRef}
              onCapture={capturePhoto}
              onClose={stopCamera}
            />
          ) : capturedImage ? (
            <CapturedPanel
              image={capturedImage}
              file={capturedFile}
              onClear={clearImage}
              onAgain={startAgain}
            />
          ) : (
            <StartPanel
              loading={cameraLoading}
              onCamera={openCamera}
              onUpload={() => fileInputRef.current?.click()}
            />
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleUpload}
          className="hidden"
        />

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <InfoItem
            number="01"
            title="Capture"
            text="Use your camera or choose an image from your device."
          />

          <InfoItem
            number="02"
            title="Match"
            text="The selected image will be passed to the matching system."
          />

          <InfoItem
            number="03"
            title="Profile"
            text="Possible directory matches will lead directly to their profiles."
          />
        </div>
      </section>
    </main>
  );
}

function StartPanel({
  loading,
  onCamera,
  onUpload,
}: {
  loading: boolean;
  onCamera: () => void;
  onUpload: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-white/[0.08] bg-[#141413]">
      <div className="border-b border-white/[0.07] px-6 py-5 sm:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#cdbd96]/[0.1] text-[#cdbd96]">
            <ScanFace size={20} />
          </div>

          <div>
            <h2 className="text-sm font-semibold">
              Choose an image source
            </h2>

            <p className="mt-1 text-xs text-[#625f58]">
              Camera or existing image
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 p-6 sm:grid-cols-2 sm:p-8">
        <button
          type="button"
          onClick={onCamera}
          disabled={loading}
          className="group rounded-2xl border border-[#cdbd96]/20 bg-[#cdbd96]/[0.06] p-6 text-left transition hover:border-[#cdbd96]/35 hover:bg-[#cdbd96]/[0.09] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#cdbd96] text-[#0c0c0b]">
            {loading ? (
              <Loader2
                size={21}
                className="animate-spin"
              />
            ) : (
              <Camera size={21} />
            )}
          </div>

          <h3 className="mt-5 text-base font-semibold">
            {loading
              ? "Opening camera..."
              : "Use Camera"}
          </h3>

          <p className="mt-2 text-sm leading-6 text-[#918d84]">
            Take a new photo directly from your phone or computer.
          </p>
        </button>

        <button
          type="button"
          onClick={onUpload}
          className="group rounded-2xl border border-white/[0.08] bg-[#10100f] p-6 text-left transition hover:border-white/[0.15] hover:bg-[#181817]"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/[0.1] bg-[#181817] text-[#ebe8e1]">
            <ImagePlus size={21} />
          </div>

          <h3 className="mt-5 text-base font-semibold">
            Upload Image
          </h3>

          <p className="mt-2 text-sm leading-6 text-[#918d84]">
            Choose an existing photo from your device.
          </p>
        </button>
      </div>
    </div>
  );
}

function CameraPanel({
  videoRef,
  onCapture,
  onClose,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onCapture: () => void;
  onClose: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-white/[0.08] bg-[#10100f]">
      <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="flex h-2.5 w-2.5 rounded-full bg-[#cdbd96]" />

          <span className="text-sm font-medium">
            Camera ready
          </span>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] text-[#918d84] transition hover:bg-white/[0.05] hover:text-[#ebe8e1]"
          aria-label="Close camera"
        >
          <X size={17} />
        </button>
      </div>

      <div className="relative aspect-[4/3] w-full bg-[#080808] sm:aspect-video">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="h-full w-full object-cover"
        />

        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-[62%] w-[48%] rounded-[28%] border border-[#cdbd96]/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.18)]" />
        </div>

        <div className="pointer-events-none absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full border border-white/[0.1] bg-black/60 px-4 py-2 text-xs text-[#cbc7be] backdrop-blur">
          Position the person's face inside the guide
        </div>
      </div>

      <div className="flex items-center justify-center p-6">
        <button
          type="button"
          onClick={onCapture}
          className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-[#cdbd96]/30 bg-[#ebe8e1] text-[#0c0c0b] shadow-lg transition hover:scale-105 hover:bg-white active:scale-95"
          aria-label="Take photo"
        >
          <Camera size={25} />
        </button>
      </div>
    </div>
  );
}

function CapturedPanel({
  image,
  file,
  onClear,
  onAgain,
}: {
  image: string;
  file: File | null;
  onClear: () => void;
  onAgain: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-white/[0.08] bg-[#141413]">
      <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4 sm:px-6">
        <div>
          <p className="text-sm font-semibold">
            Image selected
          </p>

          <p className="mt-1 text-xs text-[#625f58]">
            {file?.name || "Captured image"}
          </p>
        </div>

        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#91b89a]/[0.1] text-[#91b89a]">
          <Check size={17} />
        </div>
      </div>

      <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:p-8">
        <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#080808]">
          <img
            src={image}
            alt="Selected scan"
            className="max-h-[520px] w-full object-contain"
          />
        </div>

        <div className="flex flex-col justify-center">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#cdbd96]">
            Ready
          </p>

          <h2 className="mt-3 text-xl font-semibold">
            Image captured successfully
          </h2>

          <p className="mt-3 text-sm leading-6 text-[#918d84]">
            This image is ready to be sent through the PeopleFind matching
            system.
          </p>

          <button
            type="button"
            disabled
            className="mt-7 inline-flex items-center justify-center gap-2 rounded-xl bg-[#ebe8e1] px-4 py-3 text-sm font-semibold text-[#0c0c0b] opacity-50"
          >
            <ScanFace size={17} />
            Matching engine coming next
          </button>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onAgain}
              className="pf-button-secondary"
            >
              <RotateCcw size={15} />
              Try again
            </button>

            <button
              type="button"
              onClick={onClear}
              className="pf-button-secondary"
            >
              <Upload size={15} />
              Choose another
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoItem({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[#10100f] p-5">
      <span className="text-xs font-medium tracking-[0.16em] text-[#cdbd96]">
        {number}
      </span>

      <h3 className="mt-4 text-sm font-semibold">
        {title}
      </h3>

      <p className="mt-2 text-xs leading-6 text-[#625f58]">
        {text}
      </p>
    </div>
  );
}