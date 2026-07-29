#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# LTVF Dashboard — BAS Setup Script
# Run this once in the BAS terminal after opening a Dev Space:
#   chmod +x bas_setup.sh && ./bas_setup.sh
# ─────────────────────────────────────────────────────────────────────────────

set -e

REPO="https://github.com/harry-4710/ltvf-dashboard.git"
PROJECT_DIR="$HOME/projects/ltvf-dashboard"

echo ""
echo "════════════════════════════════════════════"
echo "  LTVF Dashboard — BAS Setup"
echo "════════════════════════════════════════════"
echo ""

# ── 1. Clone repo ─────────────────────────────────────────────────────────────
if [ -d "$PROJECT_DIR" ]; then
  echo "▶ Repo already cloned — pulling latest..."
  cd "$PROJECT_DIR" && git pull
else
  echo "▶ Cloning repository..."
  mkdir -p "$HOME/projects"
  git clone "$REPO" "$PROJECT_DIR"
  cd "$PROJECT_DIR"
fi

echo ""
echo "▶ Repo ready at: $PROJECT_DIR"

# ── 2. Backend setup ──────────────────────────────────────────────────────────
echo ""
echo "▶ Setting up Python backend..."
cd "$PROJECT_DIR/backend"

# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install --upgrade pip -q
pip install -r requirements.txt -q

# Create .env if it doesn't exist
if [ ! -f .env ]; then
  cp .env.example .env
  echo "  ✔ Created backend/.env from .env.example"
  echo "  ⚠  Set USE_MOCK_SCHEDULED=true is already configured for demo mode"
fi

deactivate
echo "  ✔ Backend dependencies installed"

# ── 3. Frontend setup ─────────────────────────────────────────────────────────
echo ""
echo "▶ Setting up Node.js frontend..."
cd "$PROJECT_DIR/frontend"

# Check node version
NODE_VERSION=$(node -v 2>/dev/null || echo "not found")
echo "  Node.js: $NODE_VERSION"

npm install -q
echo "  ✔ Frontend dependencies installed"

# ── 4. Print next steps ───────────────────────────────────────────────────────
echo ""
echo "════════════════════════════════════════════"
echo "  Setup Complete!"
echo "════════════════════════════════════════════"
echo ""
echo "  Open the project in BAS:"
echo "  File → Open Folder → $PROJECT_DIR"
echo ""
echo "  Start backend (Terminal 1):"
echo "  cd $PROJECT_DIR/backend"
echo "  source .venv/bin/activate"
echo "  uvicorn main:app --reload --port 8000"
echo ""
echo "  Start frontend (Terminal 2):"
echo "  cd $PROJECT_DIR/frontend"
echo "  npm run dev"
echo ""
echo "  Or use the BAS Run menu (F5) after opening the project."
echo ""
