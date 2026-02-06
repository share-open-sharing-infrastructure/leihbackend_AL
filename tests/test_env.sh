#!/bin/bash
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
POCKETBASE_PATH="$SCRIPT_DIR/../pocketbase"
MIGRATIONS_PATH="$SCRIPT_DIR/../pb_migrations"
HOOKS_PATH="$SCRIPT_DIR/../pb_hooks"
DATA_DIR="/tmp/pb_data"
USERNAME="dev@leihlokal-ka.de"
PASSWORD="leihenistdasneuekaufen"
