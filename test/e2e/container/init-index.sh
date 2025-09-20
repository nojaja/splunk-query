#!/bin/bash
# init-index.sh: send test data to splunk
set -euo pipefail

LOGDIR="/tmp/logs"
LOGFILE="$LOGDIR/init-index.log"

# Create logs output directory
mkdir -p "$LOGDIR" 2>/dev/null || true

echo "[init-index] starting data initialization" | tee "$LOGFILE"

# Wait briefly for splunkd to be fully ready
sleep 10

# Determine HEC token: prefer environment variable, otherwise attempt to read from inputs.conf
HEC_TOKEN=${HEC_TOKEN:-}

# Ensure SAMPLE_FILE is always defined to avoid set -u failures later
SAMPLE_FILE=""
if [ -z "${HEC_TOKEN}" ]; then
  INPUTS_CONF="/opt/splunk/etc/system/local/inputs.conf"
  if [ -f "$INPUTS_CONF" ]; then
    # Try to parse token under the e2e_hec stanza or any token= line
    # Look for the token in the stanza [http://e2e_hec] first
    HEC_TOKEN=$(awk '/^\[http:\/\/e2e_hec\]/{f=1;next} /^\[/{f=0} f && /token\s*=/{gsub(/^[ \t]+|[ \t]+$/,"",$0); split($0,a,"="); print a[2]; exit}' "$INPUTS_CONF" | tr -d '\r' || true)
    if [ -z "${HEC_TOKEN}" ]; then
      # Fallback: find the first token= anywhere in the file
      HEC_TOKEN=$(awk -F'=' '/token\s*=/{gsub(/^[ \t]+|[ \t]+$/,"",$2); print $2; exit}' "$INPUTS_CONF" | tr -d '\r' || true)
    fi
  fi
fi

# Masked logging of token (show first/last chars only)
if [ -n "${HEC_TOKEN}" ]; then
  MASKED="${HEC_TOKEN:0:4}...${HEC_TOKEN: -4}"
else
  MASKED="(empty)"
fi
echo "[init-index] Testing HEC with token ${MASKED}" | tee -a "$LOGFILE"

# Retry logic for HEC send: retry up to 8 times with backoff
MAX_RETRIES=8
RETRY=0
SENT_OK=0
while [ $RETRY -lt $MAX_RETRIES ]; do
  echo "[init-index] HEC attempt=$((RETRY+1))" | tee -a "$LOGFILE"

  if [ -z "${HEC_TOKEN}" ]; then
    echo "[init-index] no HEC_TOKEN available, skipping HTTP attempt" | tee -a "$LOGFILE"
    HTTP_CODE="000"
  else
    # Perform the HEC POST and capture HTTP code and response body
    HTTP_CODE=$(curl -k -s -w "%{http_code}" \
      -H "Authorization: Splunk ${HEC_TOKEN}" \
      -H "Content-Type: application/json" \
      -d '{"event":"initialization-test-event","sourcetype":"manual","index":"main"}' \
      https://localhost:8088/services/collector/event \
      -o "$LOGDIR/hec_response.json" 2>/dev/null || echo "000") || true
  fi

  echo "[init-index] HEC HTTP code: ${HTTP_CODE}" | tee -a "$LOGFILE"
  if [ -f "$LOGDIR/hec_response.json" ]; then
    echo "[init-index] HEC response:" | tee -a "$LOGFILE"
    cat "$LOGDIR/hec_response.json" | tee -a "$LOGFILE"
  fi

  if [ "$HTTP_CODE" = "200" ]; then
    echo "[init-index] HEC send succeeded" | tee -a "$LOGFILE"
    SENT_OK=1
    break
  fi

  RETRY=$((RETRY+1))
  # exponential backoff up to ~32s
  SLEEP_SEC=$((2 ** RETRY))
  if [ $SLEEP_SEC -gt 32 ]; then SLEEP_SEC=32; fi
  echo "[init-index] HEC send failed, retrying in ${SLEEP_SEC}s" | tee -a "$LOGFILE"
  sleep ${SLEEP_SEC}
done

if [ $SENT_OK -eq 1 ]; then
  echo "[init-index] HEC initialization complete" | tee -a "$LOGFILE"
else
  echo "[init-index] HEC failed after retries, attempting oneshot fallback" | tee -a "$LOGFILE"
  # Create sample event and add via oneshot
  SAMPLE_FILE="$LOGDIR/sample_event.txt"
  echo "timestamp=$(date) message=initialization_complete source=e2e_test" > "$SAMPLE_FILE"
  AUTH_PASS=${SPLUNK_PASSWORD:-E2Epassw0rd!}
  # Try to run oneshot as splunk user if possible
  if id splunk >/dev/null 2>&1; then
    if command -v runuser >/dev/null 2>&1; then
      runuser -u splunk -- /opt/splunk/bin/splunk add oneshot "$SAMPLE_FILE" -index main -auth "admin:${AUTH_PASS}" 2>&1 | tee -a "$LOGFILE" || echo "[init-index] oneshot failed (runuser)" | tee -a "$LOGFILE"
    elif command -v sudo >/dev/null 2>&1; then
      sudo -u splunk /opt/splunk/bin/splunk add oneshot "$SAMPLE_FILE" -index main -auth "admin:${AUTH_PASS}" 2>&1 | tee -a "$LOGFILE" || echo "[init-index] oneshot failed (sudo)" | tee -a "$LOGFILE"
    else
      /opt/splunk/bin/splunk add oneshot "$SAMPLE_FILE" -index main -auth "admin:${AUTH_PASS}" 2>&1 | tee -a "$LOGFILE" || echo "[init-index] oneshot failed" | tee -a "$LOGFILE"
    fi
  else
    /opt/splunk/bin/splunk add oneshot "$SAMPLE_FILE" -index main -auth "admin:${AUTH_PASS}" 2>&1 | tee -a "$LOGFILE" || echo "[init-index] oneshot failed" | tee -a "$LOGFILE"
  fi
  if grep -q "Oneshot" "$LOGFILE" 2>/dev/null || grep -q "added" "$LOGFILE" 2>/dev/null; then
    echo "[init-index] Oneshot appears successful" | tee -a "$LOGFILE"
  fi
fi

echo "[init-index] initialization complete" | tee -a "$LOGFILE"

# If running as root, ensure files we created are owned by splunk to avoid
# permission surprises for later processes or cleanup.
if id splunk >/dev/null 2>&1; then
  chown -R splunk:splunk "$LOGDIR" 2>/dev/null || true
  if [ -n "$SAMPLE_FILE" ]; then
    chown splunk:splunk "$SAMPLE_FILE" 2>/dev/null || true
  fi
fi
