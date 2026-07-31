#!/bin/bash
# deploy-cf.sh — Build and deploy LTVF Dashboard to BTP Cloud Foundry via MTA
# Run from repo root: bash deploy-cf.sh
#
# CF credentials (set once, reused automatically):
#   export CF_USER=hariprasad.velu@sap.com
#   export CF_PASSWORD=your-password
# Or store in .cf-credentials file (git-ignored):
#   echo "CF_USER=hariprasad.velu@sap.com" > .cf-credentials
#   echo "CF_PASSWORD=your-password" >> .cf-credentials

set -e
REPO="$(cd "$(dirname "$0")" && pwd)"
cd "$REPO"

CF_API="https://api.cf.us10-003.hana.ondemand.com"
CF_ORG="d73dca5etrial"
CF_SPACE="dev"

echo ""
echo "════════════════════════════════════════"
echo "  LTVF Dashboard — MTA Deploy"
echo "════════════════════════════════════════"
echo ""

# ── Auto-login ────────────────────────────────────────────────────────────────
cf_login() {
  echo "▶ Logging in to CF..."

  # Load credentials from .cf-credentials file if present
  if [ -f "$REPO/.cf-credentials" ]; then
    export $(grep -v '^#' "$REPO/.cf-credentials" | xargs)
  fi

  if [ -n "$CF_USER" ] && [ -n "$CF_PASSWORD" ]; then
    cf login \
      -a "$CF_API" \
      -u "$CF_USER" \
      -p "$CF_PASSWORD" \
      -o "$CF_ORG" \
      -s "$CF_SPACE" \
      --skip-ssl-validation 2>/dev/null && echo "  ✔ Logged in as $CF_USER" && return 0
    echo "  ✘ Login failed — check CF_USER / CF_PASSWORD"
    return 1
  else
    echo "  ⚠ No credentials found. Using SSO..."
    cf login --sso -a "$CF_API" -o "$CF_ORG" -s "$CF_SPACE"
  fi
}

# Check if already logged in and targeting correct org/space
CF_TARGET=$(cf target 2>/dev/null || true)
if echo "$CF_TARGET" | grep -q "$CF_ORG" && echo "$CF_TARGET" | grep -q "$CF_SPACE"; then
  echo "▶ CF session active — $CF_ORG / $CF_SPACE"
else
  cf_login
fi

# ── Build MTA archive ─────────────────────────────────────────────────────────
echo "▶ Building MTA archive..."
mbt build
echo "  ✔ MTA archive built: mta_archives/ltvf-dashboard_1.0.0.mtar"

# ── Deploy ────────────────────────────────────────────────────────────────────
echo "▶ Deploying to CF..."
cf deploy mta_archives/ltvf-dashboard_1.0.0.mtar --version-rule ALL

# Ensure both apps are running after deploy
echo "▶ Ensuring all apps are running..."
cf start ltvf-backend 2>/dev/null || true
cf start ltvf-approuter 2>/dev/null || true

# Wait for backend to be healthy
echo "▶ Waiting for backend to start..."
for i in $(seq 1 12); do
  STATUS=$(cf app ltvf-backend | grep "#0" | awk '{print $2}')
  if [ "$STATUS" = "running" ]; then
    echo "  ✔ Backend is running"
    break
  fi
  echo "  ... waiting ($i/12)"
  sleep 5
done

echo ""
echo "════════════════════════════════════════"
echo "  Deploy complete!"
echo "════════════════════════════════════════"
echo ""
cf apps | grep ltvf
echo ""
echo "  Frontend: https://d73dca5etrial-dev-ltvf-approuter.cfapps.us10-003.hana.ondemand.com"
echo "  Backend:  https://ltvf-backend.cfapps.us10-003.hana.ondemand.com"
