# 🗣️ Speech Translator – Advanced Real-Time Translation Platform

A comprehensive [Next.js](https://nextjs.org) application that provides **real-time speech translation**, **AI-powered assistance**, **advanced analytics**, and **multi-modal translation capabilities**. Built with modern technologies and powered by **Google Cloud APIs**, **OpenAI**, and **PostgreSQL**.

---

## 🚀 Core Features

### 🎙️ Real-Time Translation

- **Live Speech-to-Text Translation** - Instant translation of spoken words with minimal latency
- **Multi-Language Support** - 100+ languages with automatic language detection
- **Voice Mode** - Continuous conversation with AI assistant and text-to-speech responses
- **Picture-in-Picture Mode** - Floating translation window for seamless multitasking

### 📝 Text & Document Translation

- **Text Translation** - High-quality translation using Google Translate API
- **File Upload Support** - Audio files (`.wav`, `.ogg`) for transcription and translation
- **OCR Processing** - Extract and translate text from images using Google Cloud Vision
- **Batch Processing** - Handle multiple translations efficiently

### 🤖 AI-Powered Assistant

- **Context-Aware Chatbot** - Intelligent assistant that adapts to current translation mode
- **Voice Conversations** - Natural language interactions with text-to-speech responses
- **Smart Suggestions** - Quick action recommendations based on usage patterns
- **Translation Guidance** - Cultural context, pronunciation help, and grammar assistance

### 📊 Advanced Analytics & Dashboard

- **User Dashboard** - Comprehensive overview of translation activity and costs
- **Usage Analytics** - Track translations, words, characters, and session duration
- **Cost Tracking** - Monitor API usage costs across different services
- **Language Preferences** - Manage favorite languages and default settings
- **Translation History** - Searchable history with export capabilities

---

## 🔐 Authentication & User Management

### Secure Authentication System

- **Multi-Provider OAuth** - Google, GitHub, Apple, Discord integration
- **Email/Password Authentication** - Secure credential-based login
- **OTP Verification** - Email-based one-time password for account creation
- **Session Management** - JWT-based secure sessions with automatic refresh

### User Preferences & Settings

- **Customizable Themes** - Dark/light mode with persistent preferences
- **Language Management** - Favorite source/target languages with quick access
- **Notification Settings** - Configurable alerts and updates
- **Auto-Save Options** - Automatic translation history preservation

---

## 🛠️ Technical Architecture

### Frontend Technologies

- **Next.js 15** - App Router with Turbopack for optimal performance
- **React 19** - Latest React features with concurrent rendering
- **TypeScript** - Full type safety and enhanced developer experience
- **Tailwind CSS 4** - Modern utility-first styling with custom design system
- **Framer Motion** - Smooth animations and micro-interactions
- **Radix UI** - Accessible component primitives

### Backend & APIs

- **Google Cloud Services**:
  - Speech-to-Text API for real-time transcription
  - Translate API for text translation
  - Vision API for OCR processing
  - Text-to-Speech API for voice responses
- **OpenAI GPT-4** - AI assistant and advanced language processing
- **Custom Flask TTS Server** - Deployed text-to-speech service

### Database & Storage

- **PostgreSQL** - Primary database with Prisma ORM
- **Prisma** - Type-safe database client with migrations
- **Google Cloud Storage** - File storage for audio and image uploads

### Authentication & Security

- **NextAuth.js** - Complete authentication solution
- **bcrypt** - Secure password hashing
- **JWT** - Stateless session management
- **Email Verification** - Nodemailer for OTP delivery

---

## 📱 User Experience Features

### Responsive Design

- **Mobile-First** - Optimized for all device sizes
- **Progressive Web App** - Installable with offline capabilities
- **Accessibility** - WCAG compliant with keyboard navigation
- **Performance** - Optimized loading with code splitting

### Advanced UI Components

- **Custom Audio Player** - Enhanced audio controls with waveform visualization
- **Real-Time Transcription** - Live speech recognition with interim results
- **File Upload Interface** - Drag-and-drop with progress indicators
- **Interactive Charts** - Analytics visualization with real-time updates
- **Toast Notifications** - Non-intrusive feedback system

### Voice & Audio Features

- **Smart Language Detection** - Automatic voice configuration based on content
- **Continuous Speech Recognition** - Hands-free conversation mode
- **Audio Quality Optimization** - FFmpeg-based audio processing
- **Multi-Voice Support** - Natural-sounding voices for 50+ languages

---

## 🗄️ Database Schema

### Core Models

- **User** - Authentication and profile management
- **TranslationHistory** - Complete translation records with metadata
- **Analytics** - Usage statistics and performance metrics
- **CostTracking** - API usage cost monitoring
- **UserPreferences** - Personalized settings and language preferences
- **Transcription** - Audio file processing records

### Advanced Features

- **Indexed Queries** - Optimized database performance
- **Cascade Deletes** - Automatic data cleanup
- **Audit Trails** - Complete activity tracking
- **Data Export** - User data portability

---

## 🚀 Deployment & Infrastructure

### Production Ready

- **Vercel Deployment** - Optimized for Next.js applications
- **Environment Management** - Secure configuration handling
- **API Rate Limiting** - Protection against abuse
- **Error Monitoring** - Comprehensive logging and debugging

### Development Tools

- **ESLint** - Code quality and consistency
- **TypeScript** - Compile-time error checking
- **Hot Reloading** - Fast development iteration
- **Database Migrations** - Version-controlled schema changes

---

## 📈 Analytics & Insights

### Usage Analytics

- **Translation Metrics** - Count, words, characters processed
- **Language Patterns** - Most used language pairs
- **Session Analytics** - Duration and engagement tracking
- **Performance Monitoring** - Response times and error rates

### Cost Management

- **Real-Time Cost Tracking** - API usage monitoring
- **Cost Breakdown** - Service-wise expense analysis
- **Budget Alerts** - Usage threshold notifications
- **Historical Trends** - Long-term cost analysis

---

## 🔧 Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Google Cloud Platform account
- OpenAI API key

### Environment Setup

```bash
# Clone the repository
git clone <repository-url>
cd translator

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Configure your API keys and database URL

# Run database migrations
npx prisma migrate dev

# Start development server
npm run dev
```

### Environment Variables

```env
# Database
DATABASE_URL="postgresql://..."

# Authentication
NEXTAUTH_SECRET="your-secret"
NEXTAUTH_URL="http://localhost:3000"

# Google Cloud
GOOGLE_CLOUD_PROJECT="your-project"
GOOGLE_APPLICATION_CREDENTIALS="path/to/credentials.json"

# OAuth Providers
GOOGLE_AUTH_CLIENT_ID="your-client-id"
GOOGLE_AUTH_CLIENT_SECRET="your-client-secret"
GITHUB_CLIENT_ID="your-github-id"
GITHUB_CLIENT_SECRET="your-github-secret"

# OpenAI
OPENAI_API_KEY="your-openai-key"

# Email (for OTP)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email"
SMTP_PASS="your-password"
FROM_EMAIL="noreply@yourapp.com"
```

---

## 🧪 Advanced Features

### Picture-in-Picture Mode

- **Floating Translation Window** - Always-on translation interface
- **Multi-Window Support** - Independent translation sessions
- **Audio Integration** - TTS playback in PiP windows
- **Responsive Design** - Adapts to window size changes

### AI Assistant Capabilities

- **Context Awareness** - Understands current translation mode
- **Smart Suggestions** - Proactive help based on user activity
- **Voice Interaction** - Natural conversation with TTS responses
- **Translation Guidance** - Cultural insights and language tips

### Performance Optimizations

- **Code Splitting** - Lazy-loaded components for faster loading
- **Caching Strategies** - Translation and audio result caching
- **Debounced Input** - Optimized API calls with input throttling
- **Virtual Scrolling** - Efficient rendering of large datasets

---

## 🔮 Future Roadmap

### Planned Features

- **Offline Translation** - Local processing capabilities
- **Advanced OCR** - Handwriting recognition and document analysis
- **Voice Cloning** - Custom voice synthesis
- **Collaborative Translation** - Multi-user translation sessions
- **API Rate Optimization** - Intelligent request batching
- **Mobile App** - Native iOS/Android applications

### Technical Improvements

- **WebRTC Integration** - Real-time audio streaming
- **WebAssembly** - Client-side processing for better performance
- **Service Workers** - Enhanced offline capabilities
- **GraphQL API** - More efficient data fetching

---

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines for:

- Code style and standards
- Testing requirements
- Pull request process
- Issue reporting

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 🙏 Acknowledgments

- **Google Cloud Platform** for translation and speech services
- **OpenAI** for AI assistant capabilities
- **Vercel** for hosting and deployment
- **Prisma** for database management
- **Next.js** team for the amazing framework

---

Built with ❤️ by Harsh
