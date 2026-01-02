#!/bin/bash
set -e
echo "=== Mobile App Dev Server Init ==="

# Install backend dependencies
echo "Installing backend dependencies..."
cd /app/backend
npm install

# Install Expo dependencies
echo "Installing Expo dependencies..."
cd /app/expo
npm install --legacy-peer-deps

# Start backend server (port 3000)
echo "Starting backend server on port 3000..."
cd /app/backend
npm run dev &

# Wait for backend to initialize
sleep 2

# Start Expo web dev server (port 5173)
echo "Starting Expo dev server on port 5173..."
cd /app/expo
npm run dev &

echo "=== Development servers started ==="
echo "Expo Web: http://localhost:5173"
echo "Backend:  http://localhost:3000"
