# Learnify Auth Service

A lightweight, event-driven authentication service for the Learnify e-learning platform. This service acts as a bridge between **Clerk Auth** and the application database, automatically synchronizing user information whenever authentication events occur.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Installation & Setup](#installation--setup)
- [API Routes](#api-routes)
- [Webhook Events & Logic](#webhook-events--logic)
- [Database Schema](#database-schema)
- [Development](#development)
- [Building & Deployment](#building--deployment)
- [Docker Support](#docker-support)

---

## Overview

The **Learnify Auth Service** is a TypeScript-based microservice that handles user authentication synchronization. It listens for Clerk webhook events and performs corresponding database operations (create, update, delete) without implementing additional authentication logic, as Clerk already handles the authentication process.

**Key Point:** This service is purely a database synchronization layer. All authentication logic is handled by Clerk.

---

## Features

- ✅ **Clerk Authentication Integration** - Seamless webhook-based authentication
- ✅ **Real-time User Sync** - Automatic database synchronization with Clerk events
- ✅ **Event-Driven Architecture** - Handles `user.created`, `user.updated`, and `user.deleted` events
- ✅ **Secure Webhook Verification** - Uses Svix library for webhook signature validation
- ✅ **TypeScript Support** - Full type safety and modern JavaScript features
- ✅ **Prisma ORM** - Type-safe database access with MariaDB/MySQL
- ✅ **CORS Enabled** - Configurable cross-origin resource sharing
- ✅ **Development Tools** - Morgan logging and Nodemon for hot reload
- ✅ **Docker Ready** - Container support for easy deployment

---

## Architecture

```
Clerk Auth System
       ↓ (Webhook Events)
┌─────────────────────────────────┐
│   Auth Service                  │
├─────────────────────────────────┤
│  POST /api/webhooks/clerk       │
│    ↓ (Verification & Validation)│
│  Clerk Event Handler            │
│    ├─ user.created              │
│    ├─ user.updated              │
│    └─ user.deleted              │
├─────────────────────────────────┤
│  Prisma ORM                     │
├─────────────────────────────────┤
│  MariaDB/MySQL Database         │
└─────────────────────────────────┘
```

---

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v14 or higher) - [Download](https://nodejs.org/)
- **npm** or **yarn** - Comes with Node.js
- **MariaDB/MySQL** - [Download](https://mariadb.org/) or use Docker
- **Clerk Account** - [Create Free Account](https://clerk.com/)

---

## Installation & Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd auth-service
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the project root and add the required variables.

### 4. Setup Database

Ensure your MariaDB/MySQL database is running ( depend on docker image ), then run Prisma migrations:

```bash
npx prisma migrate dev
```

### 5. Start the Service

**Development Mode:**

```bash
npm run local:watch
```

**Production Mode:**

```bash
npm run build
npm run prod
```

---

### How to Get These Values

1. **Clerk Keys**:
   - Sign in to [Clerk Dashboard](https://dashboard.clerk.com/)
   - Navigate to API Keys
   - Copy `CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`

2. **Webhook Secret**:
   - Go to Webhooks in Clerk Dashboard
   - Create a new webhook endpoint (your service URL)
   - Copy the signing secret

3. **Database URL**:
   - Format: `mysqlservicename://username:password@host:port/database`

---

## API Routes

### Health Check

**GET** `/`

Returns a simple health check response.

```bash
curl http://localhost:7001/
# Response: "Hello Learnify!!"
```

---

### Clerk Webhook Endpoint

**POST** `/api/webhooks/clerk`

Receives webhook events from Clerk and processes user synchronization.

---

## Webhook Events & Logic

The service automatically processes three types of Clerk webhook events:

### 1. User Created (`user.created`)

### 2. User Updated (`user.updated`)

### 3. User Deleted (`user.deleted`)

---

## Database Schema

### User Table

Stores all synchronized user information from Clerk.

| Column      | Type     | Constraints       | Description                      |
| ----------- | -------- | ----------------- | -------------------------------- |
| `id`        | String   | Primary Key, CUID | Auto-generated unique identifier |
| `clerkId`   | String   | Unique            | Clerk's unique user identifier   |
| `email`     | String   | Unique            | User's email address             |
| `userName`  | String   | Unique            | User's username                  |
| `firstName` | String   | -                 | User's first name                |
| `lastName`  | String   | -                 | User's last name                 |
| `img`       | String   | Default: `""`     | User's profile image URL         |
| `createdAt` | DateTime | Auto-generated    | Record creation timestamp        |
| `updatedAt` | DateTime | Auto-updated      | Record last update timestamp     |

**Schema File:** `prisma/schema.prisma`

---

## Development

### Scripts

| Command               | Description                                  |
| --------------------- | -------------------------------------------- |
| `npm run dev`         | Run with ts-node (TypeScript execution)      |
| `npm run local:watch` | Run in watch mode with auto-reload (nodemon) |
| `npm run build`       | Compile TypeScript to JavaScript             |
| `npm run prod`        | Run compiled JavaScript in production        |
| `npm run fmt`         | Format code with oxfmt                       |
| `npm run fmt:check`   | Check code formatting without modifying      |
| `npm test`            | Run tests (currently not implemented)        |

### Watch Mode Development

For active development with automatic reloading:

```bash
npm run local:watch
```

The server will restart automatically whenever files in the `src/` directory change.

### Code Formatting

Format your code before committing:

```bash
npm run fmt
```

Check formatting without modifying:

```bash
npm run fmt:check
```

---

## Building & Deployment

### Build for Production

```bash
npm run build
```

This compiles TypeScript files from `src/` to `dist/`.

### Run Production Build

```bash
npm run prod
```

### Verify Build

```bash
node dist/index.js
```

---

## Docker Support

### Development with Docker Compose

```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

### Production with Docker Compose

```bash
docker-compose -f docker-compose.yml -f docker-compose.build.yml up --build
```

then :

```bash
docker-compose -f docker-compose.prod.yml up
```

### Build Docker Image

```bash
docker build -t learnify-auth-service .
```

---

## Contributing

When contributing to this project:

1. Create a new branch for your feature: `git checkout -b feature/your-feature`
2. Make your changes
3. Format code: `npm run fmt`
4. Commit with meaningful message: `npm run commit`
5. Push to the repository
6. Create a Pull Request

---

---

**Last Updated:** March 2026
