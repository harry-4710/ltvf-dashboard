#!/bin/bash
# start.sh — Start all LTVF Dashboard CF apps without redeploying
# Run from repo root: bash start.sh

REPO="$(cd "$(dirname "$0")" && pwd)"
cd "$REPO"

CF_API="https://api.cf.us10-003.hana.ondemand.com"
CF_ORG="d73dca5etrial"
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
echo "  ✅ Dashboard: https://d73dca5etrial-dev-ltvf-approuter.cfapps.us10-003.hana.ondemand.com"
echo "  ✅ Backend:   https://ltvf-backend.cfapps.us10-003.hana.ondemand.com/api/health"
