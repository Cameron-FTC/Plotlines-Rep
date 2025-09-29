# Overview

Allied Health Social Story Tool is a specialized web application designed for healthcare providers to generate personalized, neuro-affirming social stories for therapeutic use with neurodiverse clients. The tool focuses on creating customized narratives that help individuals understand and navigate various activities and social situations while incorporating their interests and addressing specific therapeutic goals.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
The application uses a modern React-based frontend built with TypeScript and Vite for fast development and building. The UI is constructed using shadcn/ui components with Radix UI primitives, providing accessible and customizable interface elements. The design system follows healthcare-focused principles with a calming, therapeutic color palette optimized for neurodiverse users.

**Key Frontend Decisions:**
- React with TypeScript for type safety and developer experience
- Vite for fast development builds and hot module replacement
- shadcn/ui component library for consistent, accessible UI components
- Tailwind CSS for utility-first styling with custom healthcare-focused design tokens
- React Hook Form with Zod validation for robust form handling
- TanStack Query for efficient data fetching and state management

## Backend Architecture
The backend uses Express.js with TypeScript in a full-stack Node.js application. The server is designed to handle social story generation requests and manage user data through a RESTful API structure.

**Key Backend Decisions:**
- Express.js server with TypeScript for type-safe backend development
- Modular route registration system for organized API endpoints
- In-memory storage implementation with interface-based design for easy database migration
- Session-based architecture prepared for user authentication

## Data Management
The application uses Drizzle ORM with PostgreSQL for data persistence, providing type-safe database operations and schema management. The database schema supports user management and social story data structures.

**Key Data Decisions:**
- Drizzle ORM for type-safe database operations and migrations
- PostgreSQL as the primary database (configured via Neon serverless)
- Schema-driven development with Zod validation for data integrity
- Prepared for user authentication and session management

## Form Architecture
The story generation form uses a comprehensive schema-based approach to collect therapeutic requirements:

**Form Structure:**
- Diagnosis selection (including custom options)
- Character customization with motivating interests
- Story category selection (daily living, social skills, emotional regulation, etc.)
- Activity specification and additional therapeutic notes
- Person perspective selection (first/third person)

## Design System
The application implements a healthcare-focused design system with accessibility and neuro-affirming principles:

**Design Principles:**
- Reduced cognitive load with clear visual hierarchy
- Calming therapeutic color palette (teal-blue primary, soft grays)
- Inter font family for readability
- High contrast ratios and accessibility compliance
- Consistent spacing and layout patterns optimized for form completion

# External Dependencies

## UI Framework Dependencies
- **Radix UI**: Comprehensive set of accessible, unstyled UI primitives for building the component library
- **shadcn/ui**: Pre-built component library built on Radix UI with consistent styling
- **Tailwind CSS**: Utility-first CSS framework for rapid UI development
- **Lucide React**: Icon library providing consistent iconography

## Form and Validation
- **React Hook Form**: Performant form library with minimal re-renders
- **Zod**: TypeScript-first schema validation library
- **@hookform/resolvers**: Integration between React Hook Form and Zod validation

## Data Management
- **TanStack Query**: Data fetching and caching library for React applications
- **Drizzle ORM**: TypeScript ORM for database operations
- **@neondatabase/serverless**: Serverless PostgreSQL driver for database connectivity

## Development Tools
- **Vite**: Fast build tool and development server
- **TypeScript**: Static type checking for JavaScript
- **ESBuild**: Fast JavaScript bundler for production builds

## Runtime Dependencies
- **Express.js**: Web application framework for Node.js
- **connect-pg-simple**: PostgreSQL session store for Express sessions
- **date-fns**: Utility library for date manipulation
- **nanoid**: URL-safe unique string ID generator

## Development Environment
- **Replit Integration**: Custom Vite plugins for Replit development environment
- **Runtime Error Overlay**: Development error handling and debugging tools