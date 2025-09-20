#!/bin/bash
# entrypoint-wrapper.sh
# Start the base entrypoint in background, wait for splunkd, run init-index, then wait

set -euo pipefail

# Ensure runtime permissions so tests can write into /opt/splunk/etc and /opt/splunk/var
# Perform these operations as root before starting Splunk to avoid 'Operation not permitted'.
echo "[entrypoint-wrapper] fixing permissions at runtime"
mkdir -p /opt/splunk/etc/auth /opt/splunk/etc/users /opt/splunk/etc/system || true
# Ensure the 'local' directory exists so Ansible can create/update server.conf
mkdir -p /opt/splunk/etc/system/local || true
# Ensure users and metadata dirs exist and have minimal placeholder files so splunkd
# and Ansible have expected targets with correct ownership during provisioning.
mkdir -p /opt/splunk/etc/users || true
mkdir -p /opt/splunk/etc/system/metadata || true
USERS_INI="/opt/splunk/etc/users/users.ini"
LOCAL_META="/opt/splunk/etc/system/metadata/local.meta"
if [ ! -f "$USERS_INI" ]; then
  echo "[users]" > "$USERS_INI" || true
fi
if [ ! -f "$LOCAL_META" ]; then
  echo "[*]" > "$LOCAL_META" || true
fi
mkdir -p /opt/splunk/var/run /opt/splunk/var/log /opt/splunk/var/lib || true
chown -R splunk:splunk /opt/splunk/etc/auth /opt/splunk/etc/users /opt/splunk/etc/system /opt/splunk/etc/system/local || true
chown -R splunk:splunk /opt/splunk/var/run /opt/splunk/var/log /opt/splunk/var/lib || true
# Ensure files are writable by owner and group so provisioning can update them
chmod -R a+rwX /opt/splunk/etc || true
chmod -R a+rwX /opt/splunk/var || true
mkdir -p /tmp/logs || true
chown splunk:splunk /tmp/logs || true

# Ensure server.conf exists and is writable by the splunk user so Ansible's ini_file
# module can open/update it without PermissionError. If an existing file is present
# with restrictive permissions remove and recreate it with correct ownership.
SERVER_CONF="/opt/splunk/etc/system/local/server.conf"
# Ensure /opt/splunk/etc and /opt/splunk/var ownership/permissions are correct
# so both Ansible and splunkd can read/write as the splunk user.
echo "[entrypoint-wrapper] normalizing ownership and permissions under /opt/splunk"
mkdir -p /opt/splunk/etc/system/local /opt/splunk/var/run /opt/splunk/var/log || true
# Make splunk the owner of configuration and var directories
chown -R splunk:splunk /opt/splunk/etc /opt/splunk/var || true
# Directories chmod 755, files chmod 644
find /opt/splunk/etc -type d -exec chmod 755 {} + || true
find /opt/splunk/etc -type f -exec chmod 644 {} + || true
find /opt/splunk/var -type d -exec chmod 755 {} + || true
find /opt/splunk/var -type f -exec chmod 644 {} + || true
# Ensure server.conf exists and is owned by splunk
if [ ! -f "$SERVER_CONF" ]; then
  touch "$SERVER_CONF" || true
fi
chown splunk:splunk "$SERVER_CONF" || true
chmod 644 "$SERVER_CONF" || true

echo "[entrypoint-wrapper] permissions after adjustment:"
ls -la /opt/splunk/etc/system/local || true

# Create inputs.conf before Splunk starts if not provided by the test runner.
# This ensures HEC token is available to Splunk during initial provisioning.
INPUTS_CONF_PATH="/opt/splunk/etc/system/local/inputs.conf"
if [ ! -f "$INPUTS_CONF_PATH" ]; then
  echo "[entrypoint-wrapper] creating inputs.conf before splunk start"
  cat > "$INPUTS_CONF_PATH" <<EOF
# Enable HTTP Event Collector globally
[http]
port = 8088
disabled = 0

# Create HEC token for E2E testing
[http://e2e_hec]
disabled = 0
token = ${HEC_TOKEN:-}
index = main
indexes = main
sourcetype = _json
useSSL = 0

# Note: This is a test-only configuration to enable HEC with a fixed token.
EOF
  # Fix ownership/permissions so Ansible/splunk can read/write
  chown splunk:splunk "$INPUTS_CONF_PATH" 2>/dev/null || true
  chmod 644 "$INPUTS_CONF_PATH" 2>/dev/null || true
else
  echo "[entrypoint-wrapper] inputs.conf already exists, skipping creation"
fi

# Start base entrypoint with 'start' to provision and run splunk in foreground via its internal logic
# Pipe 'y' to answer any interactive prompts (e.g., ignore config errors) so startup is non-interactive
yes y | /sbin/entrypoint.sh start &
ENTRY_PID=$!

echo "[entrypoint-wrapper] started base entrypoint pid=${ENTRY_PID}"

# Start a short-lived background fixer to keep local config files writable
# This runs only for the first 60 seconds covering provisioning window.
(
  FIX_DURATION=180
  elapsed=0
  while [ $elapsed -lt $FIX_DURATION ]; do
    # Ensure ownership/permissions across the whole etc/ and var/ trees while
    # Ansible runs. Some tasks temporarily create files as root or tighten
    # permissions; repeatedly forcing splunk:splunk ownership during the
    # provisioning window prevents transient PermissionError in splunkd.
    if [ -d /opt/splunk/etc ]; then
      chown -R splunk:splunk /opt/splunk/etc /opt/splunk/var 2>/dev/null || true
      find /opt/splunk/etc -type d -exec chmod 755 {} + 2>/dev/null || true
      find /opt/splunk/etc -type f -exec chmod 644 {} + 2>/dev/null || true
      find /opt/splunk/var -type d -exec chmod 755 {} + 2>/dev/null || true
      find /opt/splunk/var -type f -exec chmod 644 {} + 2>/dev/null || true
    fi
    sleep 1
    elapsed=$((elapsed+1))
  done
) &
# Wait for splunkd to be ready
MAX_WAIT=180
SECS=0
while [ $SECS -lt $MAX_WAIT ]; do
  if /opt/splunk/bin/splunk status --accept-license >/dev/null 2>&1; then
    echo "[entrypoint-wrapper] splunkd ready after ${SECS}s"
    # Additional wait to ensure services are fully initialized
    sleep 10
    break
  fi
  sleep 2
  SECS=$((SECS+2))
done

if [ $SECS -ge $MAX_WAIT ]; then
  echo "[entrypoint-wrapper] timeout waiting for splunkd" >&2
  # let base entrypoint handle logs, then exit
  wait $ENTRY_PID
  exit 1
fi

# Run init-index (best-effort) as the splunk user if available
# Wait for inputs.conf to exist (injected by test runner)
INPUTS_PATH="/opt/splunk/etc/system/local/inputs.conf"
INPUT_WAIT=0
while [ $INPUT_WAIT -lt 60 ]; do
  if [ -f "$INPUTS_PATH" ]; then
    echo "[entrypoint-wrapper] inputs.conf found"
    break
  fi
  sleep 1
  INPUT_WAIT=$((INPUT_WAIT+1))
done
if [ $INPUT_WAIT -ge 60 ]; then
  echo "[entrypoint-wrapper] inputs.conf not found after wait, continuing" >&2
fi
if id splunk >/dev/null 2>&1; then
  echo "[entrypoint-wrapper] attempting to run init-index as splunk user"
  if command -v runuser >/dev/null 2>&1; then
    echo "[entrypoint-wrapper] using runuser"
    runuser -u splunk -- /opt/splunk/bin/init-index.sh || echo "[entrypoint-wrapper] init-index failed (runuser), continuing"
  elif command -v sudo >/dev/null 2>&1; then
    echo "[entrypoint-wrapper] using sudo"
    sudo -u splunk /opt/splunk/bin/init-index.sh || echo "[entrypoint-wrapper] init-index failed (sudo), continuing"
  elif command -v su >/dev/null 2>&1; then
    echo "[entrypoint-wrapper] using su"
    su -s /bin/bash splunk -c '/opt/splunk/bin/init-index.sh' || echo "[entrypoint-wrapper] init-index failed (su), continuing"
  else
    echo "[entrypoint-wrapper] no runuser/sudo/su found; running init-index as root (fallback)"
    /opt/splunk/bin/init-index.sh || echo "[entrypoint-wrapper] init-index failed (root), continuing"
  fi
else
  echo "[entrypoint-wrapper] splunk user not present; running init-index as current user"
  /opt/splunk/bin/init-index.sh || echo "[entrypoint-wrapper] init-index failed, continuing"
fi

# Wait on base entrypoint so container doesn't exit
wait $ENTRY_PID
