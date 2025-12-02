# Overview

Boundier is a privacy-first Chrome extension that analyzes how content influences users while they consume it. Unlike misinformation detectors or fact-checkers, Boundier measures three key metrics: Influence (emotional pressure combined with fixation intensity), Distortion (certainty framing and one-sided narratives), and Echo Drift (pattern changes in content consumption over time). The project includes both the browser extension and a companion web application built with React and Express.

The extension runs entirely client-side using lightweight heuristics to analyze text content without making external API calls. It operates across all websites, tracking user behavior patterns like dwell time, scroll behavior, and fixation to provide insights into how content affects consumption patterns.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

**Technology Stack**
- React 18 with TypeScript for type safety
- Vite as the build tool and development server
- Wouter for client-side routing (lightweight alternative to React Router)
- TanStack Query (React Query) for server state management
- Tailwind CSS v4 with shadcn/ui component library (New York style variant)
- Framer Motion for animations

**Component Organization**
- `/client/src/components/ui` - Reusable UI components from shadcn/ui (radix-ui primitives with custom styling)
- `/client/src/pages` - Route-level page components
- `/client/src/hooks` - Custom React hooks for shared logic
- `/client/src/lib` - Utility functions and client configuration

**Styling Approach**
- CSS variables for theming with dark mode as default (Boundier aesthetic: #000543 dark, #0038FF accent blue)
- Tailwind utility-first approach with custom glass-morphism effects
- Custom font stack: Outfit and Inter for body text, Cooper Hewitt for extension UI

## Backend Architecture

**Technology Stack**
- Express.js server with TypeScript
- HTTP server (not using WebSockets, though ws package is available)
- In-memory storage implementation (MemStorage class)
- Modular route registration system

**Server Structure**
- Development mode uses Vite middleware for HMR
- Production mode serves pre-built static assets
- All API routes prefixed with `/api`
- Request/response logging with timing information
- Session support ready (connect-pg-simple available for PostgreSQL session store)

**Storage Layer**
- Interface-based storage design (`IStorage`) for easy database swapping
- Current implementation: in-memory Map-based storage
- Prepared for Drizzle ORM integration with PostgreSQL (schema defined, not yet connected)
- User model with username/password authentication structure

## Chrome Extension Architecture

**Manifest V3 Configuration**
- Content scripts injected on all URLs (`<all_urls>`)
- Permissions: activeTab, scripting, storage
- Background service worker for lifecycle management
- Web accessible resources for fonts and assets

**Extension Components**
- `background.js` - Service worker for installation and storage initialization
- `contentScript.js` - Main analysis engine injected into all web pages
  - Client-side heuristics for emotional words, certainty phrases, and engagement patterns
  - Configurable thresholds for pressure (0.3), fixation (0.2), and dwell time (3 seconds)
  - Dynamic UI injection for scan button and results overlay
  - Local storage of scan history
- `popup.html/js` - Extension popup dashboard showing scan history
- `styles.css` - Glass-morphism styling with Cooper Hewitt font family

**Analysis Heuristics**
- Emotional intensity: keyword matching against curated list (e.g., "destroyed", "shocking", "betrayal")
- Certainty detection: phrase matching for absolute language (e.g., "everyone knows", "the truth is")
- Behavioral tracking: scroll patterns, dwell time, scroll-back events
- Scoring system: normalized values for Influence, Distortion, and Echo Drift metrics

## Build System

**Development Workflow**
- `npm run dev` - Starts Express server with Vite middleware for HMR
- `npm run dev:client` - Standalone Vite dev server on port 5000
- Separate client and server TypeScript compilation

**Production Build**
- Custom build script (`script/build.ts`) using esbuild for server bundling
- Selective dependency bundling (allowlist) to reduce syscalls and improve cold start
- Vite builds client to `dist/public`
- Server bundle outputs to `dist/index.cjs`
- Express serves static client files from dist/public

**Path Aliases**
- `@/` maps to `client/src/`
- `@shared/` maps to `shared/`
- `@assets/` maps to `attached_assets/`

# External Dependencies

## Database
- **Drizzle ORM** (v0.39.1) - Type-safe ORM for PostgreSQL integration
- **@neondatabase/serverless** (v0.10.4) - Neon serverless PostgreSQL driver
- **drizzle-zod** (v0.7.0) - Schema validation integration
- Database configuration ready but not actively connected (schema defined in `shared/schema.ts`)

## UI Component Libraries
- **Radix UI** - Unstyled, accessible component primitives for all interactive elements (dialogs, dropdowns, tooltips, etc.)
- **shadcn/ui** - Pre-styled Radix components with Tailwind CSS
- **Lucide React** - Icon library
- **cmdk** - Command palette component
- **embla-carousel-react** - Carousel implementation
- **react-day-picker** - Calendar/date picker component

## Form Handling & Validation
- **React Hook Form** - Form state management
- **@hookform/resolvers** - Validation resolver integration
- **Zod** - Runtime type validation and schema definition
- **zod-validation-error** - Human-friendly validation error messages

## Session Management
- **express-session** - Session middleware for Express
- **connect-pg-simple** - PostgreSQL session store (configured but storage may not be active yet)

## Utilities
- **clsx** & **tailwind-merge** - Conditional className composition
- **class-variance-authority** - Type-safe variant styling
- **date-fns** - Date manipulation and formatting
- **nanoid** - Unique ID generation

## Development Tools
- **Vite Plugins**:
  - `@replit/vite-plugin-runtime-error-modal` - Runtime error overlay
  - `@replit/vite-plugin-cartographer` - Code navigation (dev only)
  - `@replit/vite-plugin-dev-banner` - Development banner (dev only)
  - Custom `metaImagesPlugin` - OpenGraph image URL updating for Replit deployments

## Chrome Extension Specific
- **Chrome Extensions API** - Manifest V3 with storage, scripting, and activeTab permissions
- **Cooper Hewitt Font** - Custom web fonts (Bold, Heavy) loaded as web accessible resources
- Client-side only - no external API dependencies by design

## Build Dependencies
- **esbuild** - Fast JavaScript bundler for server code
- **tsx** - TypeScript execution for development and build scripts
- **TypeScript** - Type system for entire application