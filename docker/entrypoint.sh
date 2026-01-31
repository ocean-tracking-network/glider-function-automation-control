#!/bin/sh
set -e

# Ensure uploads dir exists and has correct ownership
mkdir -p /usr/src/app/uploads

# Ensure the app directory and files are owned and readable by the `node` user.
# This handles cases where files or mounted volumes are owned by root.
chown -R node:node /usr/src/app || true
chmod -R u+rwX,go+rX /usr/src/app || true

# Execute the provided command as the node user
exec su-exec node "$@"
