#!/bin/bash
# start.sh — Start all LTVF Dashboard CF apps without redeploying
# Run from repo root: bash start.sh

REPO="$(cd "$(dirname "$0")" && pwd)"
cd "$REPO"

CF_API="https://api.cf.sap.hana.ondemand.com"
CF_ORG="DMLT BTP Global Account (Canary)_bdv-space"
CF_SPACE="dev"

echo ""
echo "════════════════════════════════════════"
echo "  LTVF Dashboard — Start"
echo "════════════════════════════════════════"
echo ""

# Auto-login if session expired
if [ -f "$REPO/.cf-credentials" ]; then
  export $(grep -v '^#' "$REPO/.cf-credentials" | xargs)
fi

CF_TARGET=$(cf target 2>/dev/null || true)
if ! echo "$CF_TARGET" | grep -q "$CF_ORG"; then
  echo "▶ Logging in to CF..."
  cf login -a "$CF_API" -u "$CF_USER" -p "$CF_PASSWORD" -o "$CF_ORG" -s "$CF_SPACE" --skip-ssl-validation 2>/dev/null
fi

echo "▶ Starting apps..."
cf start ltvf-backend   2>/dev/null || true
cf start ltvf-approuter 2>/dev/null || true

echo ""
echo "▶ Waiting for backend..."
for i in $(seq 1 12); do
  STATUS=$(cf app ltvf-backend 2>/dev/null | grep "#0" | awk '{print $2}')
  if [ "$STATUS" = "running" ]; then
    echo "  ✔ Backend running"
    break
  fi
  echo "  ... ($i/12)"
  sleep 5
done

echo ""
cf apps | grep ltvf
echo ""
echo "  ✅ Dashboard: https://bdv-space-dev-ltvf-approuter.cfapps.sap.hana.ondemand.com"
echo "  ✅ Backend:   https://ltvf-backend.cfapps.sap.hana.ondemand.com/api/health"
