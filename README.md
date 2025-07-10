# 🗣️ Speech Translator – Real-Time Speech-to-Text and Translation

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app). It enables **real-time speech translation**, **audio transcriptions**, and **image-based text transcribing**, all powered by **Google Cloud APIs**, **FFmpeg**, and **modern LLMs**.

---

## 🚀 Features

### 🎙️ Core Functionality

- **Real-Time Speech-to-Text Translation**
  Translate live speech input from one language to another instantly.

- **Text Translation**
  Translate text inputs from one language to another using Google Translate API.

- **Audio File Transcription**
  Upload `.wav` or `.ogg` audio files for automated transcription and translation.

- **Image & Camera-based Transcribing**
  Detect and extract text from uploaded images using Google Cloud Vision API.

---

### 🛠️ Additional Features

- 📥 **Download Transcribed Text**
- 🌐 **Auto Language Detection** (Supports multiple global languages)
- ⚡ **Minimized Latency** via input debouncing and optimized API calls
- 🎧 **FFmpeg-based audio handling** for `.wav` and `.ogg` formats on a custom Node.js server

---

## 🧠 Future Improvements

- 🔐 Database Integration and User Authentication
- 🕒 Save & Retrieve Translation History
- 🔍 Context-Driven Smart Search
- 🎙️ Audio-Based Navigation
- 🤖 Built-in AI Assistant

---

## 🧰 Tech Stack

- **Frontend**: [Next.js](https://nextjs.org), [Tailwind CSS](https://tailwindcss.com)
- **Backend**: Node.js, FFmpeg (via child processes)
- **APIs**:

  - Google Cloud Speech-to-Text
  - Google Cloud Translate
  - Google Cloud Vision

- **LLMs & AI**:

  - Claude Sonnet 4.0 (Anthropic)
  - GPT-4.0 (OpenAI)
  - GitHub Copilot

---

## 🧪 Challenges Faced

- 🎚️ FFmpeg-based conversion of stereo `.wav` files to mono for compatibility
- ⚙️ Webpack vs. Turbopack bundling issues with native modules
- 🌍 Auto language detection performance for larger language sets
- 🕐 Reducing response latency for real-time speech input
- 🎤 Real-time audio streaming and processing optimization

---

## 🛠 Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

You can start editing the project from `app/page.tsx`. Changes will be reflected in real-time.

> This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to load [Geist](https://vercel.com/font), a custom font by Vercel.

---

## 📚 Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Interactive Next.js Tutorial](https://nextjs.org/learn)
- [Next.js GitHub Repository](https://github.com/vercel/next.js)

---

## 🚀 Deployment

Deploy on [Vercel](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) for the best experience.

Refer to [Next.js deployment docs](https://nextjs.org/docs/app/building-your-application/deploying) for more options.

---

Let me know if you'd like this tailored for GitHub formatting with badges or links to specific endpoints like `/api/speech`, `/api/translate`, etc.
