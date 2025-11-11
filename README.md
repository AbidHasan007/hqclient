# 🏡 HomeQuest - Frontend

Modern property rental platform built with Next.js 14, React, and TypeScript.

![Deployment Status](https://img.shields.io/badge/deployment-vercel-black)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)

## 🚀 Deployed on Vercel

This frontend is automatically deployed via GitHub integration with Vercel.

**Live URL:** [Will be added after deployment]

## 📋 Environment Variables

Required environment variables for deployment:

```env
NEXT_PUBLIC_API_BASE_URL=https://your-backend-url.azurewebsites.net
NEXT_PUBLIC_AWS_COGNITO_USER_POOL_ID=your_user_pool_id
NEXT_PUBLIC_AWS_COGNITO_USER_POOL_CLIENT_ID=your_client_id
NEXT_PUBLIC_MAPTILER_KEY=your_maptiler_key
```

## 🛠️ Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS + shadcn/ui
- **State Management:** Redux Toolkit + RTK Query
- **Authentication:** AWS Cognito
- **Maps:** MapLibre GL + MapTiler
- **Real-time:** Socket.io Client

## 📦 Installation

```bash
npm install
```

## 🔧 Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 🏗️ Build

```bash
npm run build
```

## 🚀 Deployment

This project is configured for automatic deployment on Vercel:

1. Push to `main` branch
2. Vercel automatically builds and deploys
3. Preview deployments for PRs

## 📄 License

MIT License
