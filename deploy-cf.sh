#!/bin/bash
# deploy-cf.sh — Build and deploy LTVF Dashboard to BTP Cloud Foundry via MTA
# Run from repo root: bash deploy-cf.sh

set -e
REPO="$(cd "$(dirname "$0")" && pwd)"
cd "$REPO"

echo ""
echo "════════════════════════════════════════"
echo "  LTVF Dashboard — MTA Deploy"
echo "════════════════════════════════════════"
echo ""

# 1. Build MTA archive (builds frontend + copies dist into approuter + packages backend)
echo "▶ Building MTA archive..."
mbt build
echo "  ✔ MTA archive built: mta_archives/ltvf-dashboard_1.0.0.mtar"

# 2. Deploy to CF
echo "▶ Deploying to CF..."
cf deploy mta_archives/ltvf-dashboard_1.0.0.mtar --version-rule ALL

echo ""
echo "════════════════════════════════════════"
echo "  Deploy complete!"
echo "════════════════════════════════════════"
echo ""
cf apps | grep ltvf
