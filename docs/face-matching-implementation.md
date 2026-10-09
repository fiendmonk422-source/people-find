# PeopleFind face matching: build notes

## Implemented on this branch
- The /scan page is a personal 1:1 experiment: one reference photo URL and one camera/upload photo.
- Face detection and descriptor comparison run in the browser.
- No face descriptors or images are written to Supabase.
- It does not search the student directory or reveal a profile.
- The similarity threshold is experimental and is not proof of identity.

## Set up locally
1. Check out branch feature/consent-based-face-match.
2. From the project root run:
   powershell
   npm install
   .\scripts\download-face-models.ps1
   npm run dev
3. Sign in, open http://localhost:3000/scan, paste a URL for a reference image you control, and upload/capture a second photo.
4. Commit package-lock.json after npm install updates it. Include public/models/face in deployment if you want the deployed page to work. Never put private keys in the browser.

## What remains for the larger Scan to Find idea
The student-directory version is deliberately not implemented here. Before linking a face to a student record, build an explicit opt-in enrollment flow and limit matching to people who knowingly enrolled for this specific purpose. Do not generate embeddings for all existing student photos by default.

A production design still needs:
- consent text, revocation, deletion, and retention rules;
- server-side access checks and rate limits;
- a defined policy for who can run a search and what results they can see;
- a human review step for uncertain candidates, rather than automatically opening a profile;
- representative testing of false-positive and false-negative rates across lighting, angles, and demographic groups;
- abuse testing to prevent bulk enumeration and scraping;
- a legal/privacy review appropriate to the institution and location.

## Technical next steps for an independent build
1. Confirm the schema and auth model for people and admin roles before writing migrations.
2. Add an enrollment table keyed to a person, with explicit consent version/timestamp, active/revoked status, and a protected embedding field.
3. Make enrollment/deletion operations server-side and restrict reads; never expose a service-role key or unrestricted vector search to the browser.
4. Add a server endpoint that verifies the signed-in user's permissions, rate-limits requests, and returns only a small, consented candidate set.
5. Calibrate the model and threshold on a labelled evaluation set before any real-world use. A raw distance is not a probability.

## Current limitations
- A reference URL must be accessible by the browser; private Supabase objects require a valid signed URL and suitable image access.
- Camera requires localhost or HTTPS plus browser permission.
- Only one face is used per image; multiple-face handling and liveness detection are not included.
- The threshold 0.6 is a placeholder, not a calibrated accuracy guarantee.
- Model assets add roughly 12 MB to the project and browser inference may be slow on lower-end devices.
