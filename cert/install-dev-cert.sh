#!/usr/bin/env bash
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain "$SCRIPT_DIR/dev.crt"
