# Frontier Conversational Dashboard

A sophisticated React-based conversational interface that combines traditional UI components with advanced AI-powered chat capabilities for business intelligence and operations management.

## 🚀 Features

### Core Conversational Interface
- **Real-time Chat**: WebSocket-powered streaming conversations with AI
- **Voice Input**: Speech-to-text capability for hands-free interaction
- **Smart Suggestions**: Context-aware conversation prompts and quick actions
- **Memory System**: Persistent conversation context and learning from interactions

### Business Intelligence
- **Live Metrics Dashboard**: Real-time business performance indicators
- **Interactive Analytics**: Conversational data exploration and insights
- **Tool Integration**: Execute business operations through natural language
- **Custom Workflows**: AI-assisted task automation and process management

### Advanced UI/UX
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Dark Mode**: Automatic theme switching with user preferences
- **Accessibility**: WCAG compliant with keyboard navigation and screen reader support
- **Performance**: Optimized loading, caching, and state management

### Technical Architecture
- **Redux State Management**: Comprehensive application state with Redux Toolkit
- **TypeScript**: Full type safety and enhanced developer experience
- **Modular Components**: Reusable, composable UI components
- **Service Layer**: Clean separation of API, WebSocket, and business logic

## 🛠️ Technology Stack

- **Frontend Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **State Management**: Redux Toolkit with RTK Query
- **Styling**: Tailwind CSS with custom design system
- **Icons**: Heroicons for consistent iconography
- **HTTP Client**: Axios with interceptors and error handling
- **WebSocket**: Socket.IO client for real-time communication
- **Routing**: React Router v6 with protected routes
- **Notifications**: React Hot Toast for user feedback

## 📦 Installation & Setup

### Prerequisites
- Node.js 18+ 
- npm or yarn package manager
- Backend API server running (default: http://localhost:8000)

### Quick Start

1. **Clone and Navigate**
   \`\`\`bash
   cd frontend
   \`\`\`

2. **Install Dependencies**
   \`\`\`bash
   # Use the conversation-specific package.json
   cp package-conversation.json package.json
   npm install
   \`\`\`

3. **Start Development Server**
   \`\`\`bash
   npm run dev
   \`\`\`

4. **Open Browser**
   Navigate to http://localhost:3001

### Environment Configuration

Copy the environment files:
\`\`\`bash
cp .env.development .env.local
\`\`\`

Key environment variables:
- \`REACT_APP_API_URL\`: Backend API endpoint
- \`REACT_APP_WS_URL\`: WebSocket server endpoint
- \`REACT_APP_ENABLE_*\`: Feature flags for development

## 🏗️ Project Structure

\`\`\`
frontend/src/
├── components/           # React components
│   ├── Dashboard.tsx    # Main dashboard container
│   ├── ChatInterface.tsx # Conversational UI
│   ├── FeatureCard.tsx  # Business tool cards
│   ├── MetricsPanel.tsx # Analytics display
│   ├── NotificationCenter.tsx # Alert system
│   └── Login.tsx        # Authentication
├── store/               # Redux state management
│   ├── index.ts         # Store configuration
│   ├── authSlice.ts     # User authentication
│   ├── conversationSlice.ts # Chat state
│   ├── dashboardSlice.ts # UI state
│   ├── userPreferencesSlice.ts # Settings
│   └── analyticsSlice.ts # Tracking
├── services/            # External integrations
│   ├── apiService.ts    # REST API client
│   └── conversationService.ts # WebSocket client
├── styles/              # CSS and Tailwind
│   └── globals.css      # Global styles
├── types/              # TypeScript definitions
├── utils/              # Helper functions
├── App.tsx             # Main application
└── index.tsx           # Application entry point
\`\`\`

## 🎯 Core Components

### Dashboard
The main container that orchestrates all dashboard functionality:
- Loads user data and business metrics
- Manages WebSocket connections
- Coordinates between chat and UI components
- Handles global state and notifications

### ChatInterface
Advanced conversational UI with:
- Streaming message display
- Voice input integration
- Context-aware suggestions
- Message history and export

### FeatureCard
Interactive business tool cards featuring:
- Tool configuration and parameters
- Usage analytics and ratings
- Quick action buttons
- Permission-based access

### MetricsPanel
Real-time business intelligence display:
- Live performance indicators
- Trend visualization
- Automated refresh capabilities
- Export and sharing options

## 🔧 Development

### Available Scripts

\`\`\`bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run type-check   # TypeScript validation
\`\`\`

### Code Quality

- **ESLint**: Configured with React and TypeScript rules
- **TypeScript**: Strict mode enabled with comprehensive types
- **Prettier**: Code formatting (configure as needed)
- **Git Hooks**: Pre-commit validation (optional setup)

## 🚀 Deployment

### Build for Production

\`\`\`bash
npm run build
\`\`\`

The \`dist/\` folder contains the optimized production build.

### Environment Variables

Update \`.env.production\` with production values:
- API endpoints
- Authentication keys
- Feature flags
- Analytics configuration

### Hosting Options

- **Static Hosting**: Netlify, Vercel, GitHub Pages
- **CDN**: CloudFront, CloudFlare
- **Container**: Docker with nginx
- **Traditional**: Apache/nginx static file serving

## 🎨 Customization

### Theming
Modify \`tailwind.config.js\` for:
- Brand colors and typography
- Custom component styles
- Responsive breakpoints
- Animation and transitions

### Features
Use environment variables to enable/disable:
- Voice input capabilities
- Real-time notifications
- Advanced analytics
- Experimental features

## 🔐 Security

- **Authentication**: JWT token management with automatic refresh
- **HTTPS**: All API communication over secure connections
- **CSP**: Content Security Policy headers (configure server-side)
- **Input Validation**: Sanitization of user inputs and API responses

## 📊 Performance

- **Code Splitting**: Automatic route-based splitting
- **Lazy Loading**: Components loaded on demand
- **Caching**: Service worker and HTTP caching strategies
- **Bundle Analysis**: Use \`npm run build\` with analysis tools

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes with proper TypeScript types
4. Add/update tests as needed
5. Submit a pull request

## 📄 License

This project is proprietary to Frontier AI Systems.

## 🆘 Support

For development issues:
- Check the browser console for errors
- Verify API server is running and accessible
- Review network requests in DevTools
- Check environment variable configuration

For feature requests or bug reports, contact the development team.

---

**Built with ❤️ for intelligent business operations**
