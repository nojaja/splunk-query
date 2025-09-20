#!/bin/bash
# hec_send.sh - send HEC event (expects env var HEC_TOKEN)
HEC_TOKEN="$1"

# Ensure output files can be created
touch /tmp/hec_send_body.json 2>/dev/null || true
touch /tmp/hec_send_code.txt 2>/dev/null || true

curl -k -s -o /tmp/hec_send_body.json -w "%{http_code}" -H "Authorization: Splunk ${HEC_TOKEN}" -H "Content-Type: application/json" -d '{"event":"hello from container","sourcetype":"manual","index":"main"}' https://localhost:8088/services/collector/event > /tmp/hec_send_code.txt 2>/dev/null || echo "000" > /tmp/hec_send_code.txt
