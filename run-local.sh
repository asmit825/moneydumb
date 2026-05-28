#!/bin/bash
# MONEY_DUMB Local Dev Script
# This project uses Next.js, which handles both the frontend (React) and backend (API Routes).
# Simply running this script will launch both simultaneously.

echo "=== Starting MONEY_DUMB Local Environment ==="

# Check for node_modules and install dependencies if missing
if [ ! -d "node_modules" ]; then
  echo "📦 node_modules not found. Installing dependencies..."
  npm install
else
  echo "✅ Dependencies found."
fi

# Need to check for environment variables
if [ ! -f ".env" ] && [ ! -f ".env.local" ]; then
  echo "⚠️ Warning: No .env or .env.local file found."
  echo "Make sure your Vercel Postgres database connection variables are set!"
fi

# Run the Next.js development server
echo "🚀 Launching frontend and backend on http://localhost:3000..."
npm run dev
