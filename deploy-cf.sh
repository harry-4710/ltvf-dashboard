#!/bin/bash
# deploy-cf.sh — Build and deploy LTVF Dashboard to BTP Cloud Foundry
# Run from repo root: bash deploy-cf.sh

set -e
REPO="$(cd "$(dirname "$0")" && pwd)"

echo ""
echo "════════════════════════════════════════"
echo "  LTVF Dashboard — CF Deploy"
echo "════════════════════════════════════════"
echo ""

# 1. Build frontend
echo "▶ Building frontend..."
cd "$REPO/frontend"
npm ci --silent
npm run build
echo "  ✔ Frontend built"

# 2. Copy dist into approuter
echo "▶ Copying dist to approuter..."
rm -rf "$REPO/approuter/dist"
cp -r "$REPO/frontend/dist/." "$REPO/approuter/dist/"
echo "  ✔ dist copied — $(ls $REPO/approuter/dist/ | tr '\n' ' ')"

# 3. Push approuter
echo "▶ Deploying approuter to CF..."
cd "$REPO/approuter"
cf push -f manifest.yml -p .
echo ""
echo "════════════════════════════════════════"
echo "  Deploy complete!"
echo "════════════════════════════════════════"
echo ""
cf app ltvf-approuter | grep -E "routes|state"
