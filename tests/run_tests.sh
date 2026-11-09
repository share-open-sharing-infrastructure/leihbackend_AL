#!/bin/bash

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"  # just bash things ...
POCKETBASE_PATH="$SCRIPT_DIR/../pocketbase"
MIGRATIONS_PATH="$SCRIPT_DIR/../pb_migrations"
HOOKS_PATH="$SCRIPT_DIR/../pb_hooks"
DATA_DIR="/tmp/pb_data_$(date +%s)"
USERNAME="dev@leihlokal-ka.de"
PASSWORD="leihenistdasneuekaufen"
PB_PID=0

cleanup() {
    echo
    if [ $PB_PID -ne 0 ]; then
        echo "Stopping Pocketbase (PID: $PB_PID)..."
        kill $PB_PID 2>/dev/null
        wait $PB_PID 2>/dev/null
    fi

    # Belt-and-braces: kill any pocketbase still bound to our data dir,
    # in case $! pointed at a shell wrapper that already exited while
    # its pocketbase child kept running (has happened on macOS with `nohup`).
    pkill -f "pocketbase.*$DATA_DIR" 2>/dev/null

    echo "Cleaning up data dir: $DATA_DIR"
    rm -r "$DATA_DIR"
}

trap cleanup EXIT

# Refuse to start on top of a leftover Pocketbase from a previous interrupted
# run — otherwise tests would silently talk to that ghost server (whose data
# dir has since been rm -r'd) instead of the fresh instance we're about to
# spin up, producing bewildering 404s and "record not found" failures.
if lsof -iTCP:8090 -sTCP:LISTEN >/dev/null 2>&1; then
    echo "Port 8090 already in use. Killing occupant(s)..."
    lsof -tiTCP:8090 -sTCP:LISTEN | xargs kill 2>/dev/null || true
    sleep 1
fi

mkdir -p $DATA_DIR

$POCKETBASE_PATH --dir $DATA_DIR superuser create $USERNAME $PASSWORD
echo "Created test user."

$POCKETBASE_PATH --dir $DATA_DIR --hooksDir $HOOKS_PATH migrate --migrationsDir $MIGRATIONS_PATH
echo "Applied migrations."

echo "Loading fixtures ..."
sqlite3 $DATA_DIR/data.db < "$SCRIPT_DIR/seed.sql"

echo "Starting Pocketbase ..."
export DRY_MODE=false  # to test emailing functionality
nohup $POCKETBASE_PATH --dir $DATA_DIR --hooksDir $HOOKS_PATH serve > /dev/null 2>&1 &
PB_PID=$!
echo "Pocketbase started (PID: $PB_PID)"

# Wait until Pocketbase is actually accepting requests (or clearly died).
# Without this, the previous `sleep 5` would race: on a slow machine PB
# was still coming up, and on an already-occupied port PB had died before
# the tests ran, both surfacing as identical downstream 404s.
for _ in $(seq 1 30); do
    if curl -sf http://127.0.0.1:8090/api/health >/dev/null 2>&1; then
        break
    fi
    if ! kill -0 $PB_PID 2>/dev/null; then
        echo "Pocketbase died before becoming healthy. Aborting."
        exit 1
    fi
    sleep 0.5
done

echo "Starting tests ..."
cd $SCRIPT_DIR
npm test
