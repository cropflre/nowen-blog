#!/bin/bash
# Quick start script for nowen-blog

export PATH="/Users/cropflre/.workbuddy/binaries/node/versions/20.18.0/bin:$PATH"

case "${1:-frontend}" in
  frontend)
    echo "Starting React frontend..."
    cd "$(dirname "$0")/react-frontend" && npm run dev
    ;;
  backend)
    echo "Starting Go backend..."
    cd "$(dirname "$0")/go-backend" && go run main.go
    ;;
  all)
    echo "Starting both frontend and backend..."
    cd "$(dirname "$0")/go-backend" && go run main.go &
    cd "$(dirname "$0")/react-frontend" && npm run dev
    ;;
  *)
    echo "Usage: ./start.sh [frontend|backend|all]"
    ;;
esac
