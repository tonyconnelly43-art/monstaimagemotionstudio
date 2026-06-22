# Monsta Motion Studio

Transform static images into short AI-generated videos using [fal.ai](https://fal.ai) and the Kling v1.6 image-to-video model.

## Features

- Upload any image (JPG, PNG, WebP)
- Write a motion prompt
- Choose video length: 5s or 10s
- Choose style: Realistic, Cinematic, Cartoon, Product Ad, Mascot Animation
- Preview the finished video in-browser
- Download as MP4

## Setup

### 1. Clone and install

```bash
git clone <repo-url>
cd monstaimagemotionstudio
npm install
```

### 2. Add your fal.ai API key

Create a `.env.local` file in the project root:

```env
FAL_KEY=your_fal_ai_api_key_here
```

Get your key at [fal.ai/dashboard](https://fal.ai/dashboard).

### 3. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
app/
  page.tsx              # Home / landing page
  studio/
    page.tsx            # Main generator UI
  api/
    generate/route.ts   # POST — submits image-to-video job to fal.ai
    status/route.ts     # GET  — polls job status, returns video URL
```

## Deployment (Vercel)

1. Push to GitHub
2. Import into Vercel
3. Add `FAL_KEY` as an environment variable in Vercel project settings
4. Deploy

## Video Model

Uses `fal-ai/kling-video/v1.6/standard/image-to-video` via fal.ai's async queue API.
Generation typically takes 30–90 seconds depending on queue load.
