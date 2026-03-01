#!/usr/bin/env bash
# JusticeMap — Start Script
# Sets up and launches the backend (frontend must be started separately)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"

echo ""
echo "  ⚖️  JusticeMap — AI Legal Rights Assistant"
echo "  ============================================"
echo ""

# ── 1. Navigate to backend ──────────────────────────────────────────────────
cd "$BACKEND_DIR"

# ── 2. Create and activate virtual environment if it doesn't exist ──────────
if [ ! -d "venv" ]; then
  echo "  [1/4] Creating Python virtual environment..."
  python3 -m venv venv
  echo "        ✓ venv created"
else
  echo "  [1/4] Virtual environment already exists"
fi

# Activate venv (works on Mac/Linux; adjust for Windows)
source venv/bin/activate
echo "        ✓ venv activated"

# ── 3. Install dependencies ──────────────────────────────────────────────────
echo ""
echo "  [2/4] Installing Python dependencies..."
pip install -q --upgrade pip
pip install -q -r requirements.txt
echo "        ✓ Dependencies installed"

# ── 4. Check for .env ────────────────────────────────────────────────────────
echo ""
echo "  [3/4] Checking configuration..."
if [ ! -f ".env" ]; then
  if [ -f ".env.example" ]; then
    cp ".env.example" ".env"
    echo ""
    echo "  ⚠️  IMPORTANT: .env file created from .env.example"
    echo "     Please edit backend/.env and add your API keys:"
    echo "       ANTHROPIC_API_KEY=your_key_here"
    echo "       WOLFRAM_APP_ID=your_key_here"
    echo ""
    read -p "     Press Enter to continue after editing .env, or Ctrl+C to abort... "
  else
    echo "  ⚠️  No .env file found. Please create backend/.env with your API keys."
    exit 1
  fi
else
  echo "        ✓ .env found"
fi

# Warn if API key is still placeholder
if grep -q "your_groq_api_key_here" .env 2>/dev/null; then
  echo ""
  echo "  ⚠️  WARNING: GROQ_API_KEY is still a placeholder in .env"
  echo "     The server will start but /analyze calls will fail."
  echo "     Get a free key at: https://console.groq.com/"
  echo ""
fi

# ── 5. Seed ChromaDB if not already seeded ───────────────────────────────────
echo ""
echo "  [4/4] Checking ChromaDB index..."
if [ ! -d "vector_db" ] || [ -z "$(ls -A vector_db 2>/dev/null)" ]; then
  echo "        Vector store not found. Seeding legal documents..."
  echo "        (This may take 1-2 minutes on first run while downloading the model)"
  echo ""
  python seed_legal_docs.py
  echo ""
  echo "        ✓ Legal documents indexed"
else
  echo "        ✓ Vector store index exists (skip seeding)"
  echo "          (Run 'python seed_legal_docs.py' to re-index)"
fi

# ── 6. Start the backend server ──────────────────────────────────────────────
echo ""
echo "  ============================================"
echo "  ✓ Starting JusticeMap API server..."
echo ""
echo "  Backend:  http://localhost:8000"
echo "  API docs: http://localhost:8000/docs"
echo ""
echo "  To start the frontend (in a new terminal):"
echo "    cd frontend && npm install && npm start"
echo "  Frontend: http://localhost:3000"
echo ""
echo "  Press Ctrl+C to stop the server"
echo "  ============================================"
echo ""

uvicorn main:app --reload --host 0.0.0.0 --port 8000
