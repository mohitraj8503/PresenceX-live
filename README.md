# <img src="./public/images/thumbnail.png" width="100%" alt="PresenceX Banner" />

<div align="center">

# PresenceX

### AI-Powered Face Recognition Attendance — Built for Real Indian Classrooms

*No more roll calls. No more proxy attendance. Just walk in, and you're marked present.*

[![Framework: Next.js](https://img.shields.io/badge/Frontend-Next.js%2016-black?style=for-the-badge&logo=nextdotjs)](https://nextjs.org/)
[![Engine: Python](https://img.shields.io/badge/AI%20Engine-Python%20%2F%20FastAPI-blue?style=for-the-badge&logo=python)](https://www.python.org/)
[![Model: ArcFace](https://img.shields.io/badge/Recognition-DeepFace%20%2B%20ArcFace-green?style=for-the-badge)](https://github.com/serengil/deepface)
[![Status: In Development](https://img.shields.io/badge/Status-Active%20Development-orange?style=for-the-badge)]()

</div>

---

## What is PresenceX, in one line?

**PresenceX is a system that marks student/staff attendance automatically by recognizing their face through a camera — no fingerprint machine, no RFID card, no manual roll call.**

Someone walks up to a camera (a kiosk near the classroom door, or eventually a regular CCTV camera), the system recognizes who they are in under a couple of seconds, and logs them as "present" — instantly, without a teacher or admin doing anything by hand.

---

## Why does this exist? (The real problem)

Anyone who has sat through a classroom roll call knows the pain:

- **It wastes time.** Calling out 60+ names, one by one, every single period, eats into actual teaching/learning time.
- **Proxy attendance is rampant.** One student answers "present" for a friend who isn't even there.
- **Paper registers get lost, faked, or are a nightmare to compile into reports** at the end of a semester.
- **Fingerprint/RFID systems exist, but they're clunky** — queues form at the scanner, cards get forgotten or shared, fingerprint sensors fail with sweaty/dirty hands (very common in Indian summers).

PresenceX's answer: **your face is your attendance card, and it can't be handed to a friend.**

---

## How does it actually work? (For a complete beginner)

Think of it in three simple stages:

### Stage 1 — Enrollment (done once per person)
An admin/faculty member registers each student or staff member **one time**: their name, ID, role, and a live photo captured through the camera. The system converts that photo into a unique mathematical "fingerprint" of their face (called a **face embedding**) and stores it securely. The actual photo isn't what gets compared later — it's this mathematical signature, which is far more private and secure than storing raw photos.

### Stage 2 — Live Recognition (happens every single time someone walks up)
When a person stands in front of the camera during an active attendance session:
1. The system detects that there **is** a face in the frame at all.
2. It checks that the face is a **real, live person** — not someone holding up a photo or a phone screen to trick the camera (this is called **anti-spoofing**, explained more below).
3. It converts the live face into the same kind of mathematical signature used during enrollment.
4. It compares this signature against everyone who's enrolled, and finds the closest match.
5. If the match is confident enough, that person is marked present — instantly, automatically, no human involved.

### Stage 3 — Reporting
Faculty/admins can open a dashboard and see, for any session: who was present, who was absent, at what exact time each person was marked, and how confident the system was in each match — turning what used to be a paper register into a clean, searchable digital record.

---

## The Hard Problems This Project Actually Solves

A face-recognition demo that works on a laptop webcam in good light is easy. A system that works reliably in a **real Indian classroom** is a much harder engineering problem. Here's what PresenceX is specifically built to handle:

### 🛡️ Anti-Spoofing (stopping "photo attendance")
The very first thing anyone tries with a face-attendance system is holding up a photo of their friend on a phone screen to mark them present without them being there. PresenceX actively detects this — using signals like screen glare, moiré patterns (the shimmering effect you see when you photograph a screen), unnatural rectangular borders, and a dedicated liveness-detection model — and **refuses to mark attendance** if it suspects a photo/screen rather than a real person.

### 📷 Cheap, Low-Quality Cameras
Most Indian institutions don't have expensive, professional-grade CCTV — they have basic 2-megapixel cameras, often mounted 15-25 feet away from where people actually walk. At that distance, a face might only be a few dozen pixels wide in the raw video. PresenceX includes a dedicated image-quality pipeline that:
- Measures how usable each captured face actually is (Is it too small? Too blurry? Too dark or overexposed?)
- **Refuses to guess** when the image quality is genuinely too poor to trust — rather than confidently marking the wrong person present.
- Uses AI-based face restoration (not generic "upscaling," which can invent fake detail) to recover usable detail from borderline images.
- Automatically corrects for harsh, uneven lighting (a very common issue with backlit doorways and tube-light glare in Indian buildings).

### 🌓 Lighting & Appearance Changes
A person registered on a bright day shouldn't fail to be recognized on a cloudy one, or under yellow tube-light instead of daylight. The system normalizes illumination differences using symmetric CLAHE (Contrast Limited Adaptive Histogram Equalization) and supports storing multiple reference captures per person, so recognition stays reliable across real-world variation — not just in the exact lighting conditions someone happened to register in.

### 👥 Multiple People, One Camera
For a CCTV-style deployment (as opposed to a one-person-at-a-time kiosk), the system is designed to independently detect and identify **every** face in frame — so ten students walking through a doorway together can all be recognized in the same moment, each correctly, without one person's identity leaking onto another.

---

## System Architecture (how the pieces fit together)

PresenceX is built as two connected pieces working together:

```text
┌─────────────────────────┐         ┌──────────────────────────────┐
│      PresenceX-live      │  API    │     presencex-face-engine     │
│   (this repo — the app   │ ──────► │  (Python AI microservice —    │
│    people actually use)  │ ◄────── │   the "brain" that does the   │
│                           │  JSON   │   actual face recognition)    │
│  • Next.js website/app    │         │                                │
│  • Admin dashboard         │         │  • DeepFace + ArcFace model    │
│  • Face registration UI    │         │  • Anti-spoofing detection     │
│  • Live kiosk screen       │         │  • Image quality pipeline      │
│  • Attendance reports      │         │  • Database (people, faces,    │
│                           │         │    sessions, attendance logs)  │
└─────────────────────────┘         └──────────────────────────────┘
```

**Why split it this way?** The actual face-recognition AI (DeepFace/ArcFace, image processing, etc.) only runs properly in Python — that's where the mature, well-tested face-recognition libraries live. The website/dashboard that people click around in is built in Next.js/React, which is the standard modern way to build fast, good-looking web apps. So PresenceX runs both: a Python "brain" doing the AI work, and a Next.js "face" that people actually interact with, talking to each other over a simple internal API. The browser never talks to the Python service directly — it always goes through the Next.js layer, which keeps things secure and lets the AI engine be upgraded independently later without touching the website.

---

## Key Features

| Feature | What it means in plain terms |
|---|---|
| 🎯 **One-time face enrollment** | Register once, recognized forever (until re-enrolled) |
| ⚡ **Real-time recognition** | Attendance marked in a couple of seconds, no waiting in line |
| 🛡️ **Anti-spoofing / liveness detection** | Can't fool it with a photo or a phone screen |
| 📊 **Live attendance dashboard** | See who's present/absent for any session, in real time |
| 🔁 **Duplicate-mark protection** | Someone can't accidentally (or intentionally) get marked present twice in one session |
| 🌗 **Lighting-robust recognition** | Works across normal day-to-day lighting changes, not just perfect studio conditions |
| 📉 **Low-quality camera tolerance** | Designed for real, budget CCTV — not just high-end webcams |
| 🖥️ **Kiosk mode** | A dedicated walk-up-and-be-recognized screen for classroom/seminar entrances |

---

## Technology Stack

| Layer | Technology | Why |
|---|---|---|
| **Frontend / Website** | Next.js 16 (App Router), React 19, TypeScript | Fast, modern, industry-standard web framework |
| **Styling** | Vanilla CSS + PresenceX Design Tokens | Consistent, branded visual identity across every screen |
| **AI / Face Recognition Engine** | Python, FastAPI | Where the actual face-recognition computation happens |
| **Face Recognition Model** | DeepFace with ArcFace backend, RetinaFace detector | Industry-grade accuracy, the same family of models used in production face-recognition systems |
| **Anti-Spoofing** | DeepFace FASNet liveness model + custom multi-signal optical PAD | Blocks photo/screen-based fake attendance attempts |
| **Database** | SQLite (development) → PostgreSQL/Supabase (production) | Stores people, face data, sessions, and attendance records |
| **Animations** | GSAP | Smooth, polished interactions across the site |
| **Deployment (planned)** | Vercel (website) + dedicated Python host (AI engine) | Keeps the AI workload and the website independently scalable |

---

## Project Status — What's Done, What's Coming

PresenceX is being built in clear, verifiable stages. Here's the honest current state:

- ✅ **Core face recognition engine** — register and identify faces, with anti-spoofing, is working and tested.
- ✅ **Database + attendance logging** — sessions, present/absent tracking, duplicate-prevention.
- ✅ **Website ↔ AI engine bridge** — the Next.js app can talk to the Python engine reliably, including graceful handling if the AI service goes down.
- ✅ **Admin UI** — face registration screen, live kiosk screen, multi-face test lab, and attendance dashboard.
- ✅ **Low-light & CCTV hardening** — image quality scoring, structural restoration, symmetric CLAHE, and multi-embedding enrollment.
- 🚧 **Login/authentication** — role-based access control for administrative functions.
- 🚧 **Cloud deployment** — moving from local microservices to a real hosted, publicly-accessible deployment.
- 📋 **Planned**: bulk photo enrollment (upload a folder of ID photos instead of registering one by one), multi-organization support, and a real subscription/pricing system for institutions.

This project follows a strict internal rule: **nothing is marked "done" without real, reproducible proof that it works** — not just "the code compiles" or "the build passed." Every feature above has been tested with actual captured evidence before being considered complete.

---

## Getting Started (Running It Yourself)

### Prerequisites
- [Node.js](https://nodejs.org/) v18 or later, and `npm`
- [Python](https://www.python.org/) 3.10–3.13
- A webcam (for testing registration/recognition locally)

### 1. Clone this repository (the website)
```bash
git clone https://github.com/mohitraj8503/PresenceX-live.git
cd PresenceX-live
npm install
```

### 2. Set up the AI engine (separate repo/folder — `presencex-face-engine`)
```bash
cd ../presencex-face-engine
python3 -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --port 8001
```

### 3. Configure the website to talk to the AI engine
Create a `.env.local` file in `PresenceX-live/`:
```
FACE_ENGINE_URL=http://127.0.0.1:8001
```

### 4. Run the website
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) — you'll find the main site, plus:
- `/admin/register` — enroll a new face
- `/kiosk` — the live walk-up attendance screen
- `/admin/face-test` — single-face and multi-face live recognition test lab
- `/admin/dashboard` — attendance reports

---

## A Note on Privacy & Data

Face data is sensitive. PresenceX is being built with these principles in mind:
- What's stored is a **mathematical face signature (embedding)**, not just a raw photo dump sitting unprotected.
- Attendance decisions happen on the **server**, never trusted from something the browser alone claims — a person can't fake their own attendance by tampering with the website.
- As the project matures toward production use, encryption-at-rest for biometric data, access logging, and a clear data-retention policy are planned — this is explicitly on the roadmap, not an afterthought.

---

## Contributing / Feedback

This is an actively evolving student-built project. If you're exploring the code, the cleanest starting points are:
- `app/admin/register/page.tsx` — face enrollment flow
- `app/kiosk/page.tsx` — live recognition flow
- `app/admin/dashboard/page.tsx` — attendance reporting
- `app/admin/face-test/page.tsx` — multi-face / single-face test lab
- The `presencex-face-engine` repo — the actual AI/recognition logic

---

<div align="center">

**PresenceX** — because attendance should be automatic, honest, and instant.

Built with ❤️ by [Mohit Raj](https://github.com/mohitraj8503)

</div>
