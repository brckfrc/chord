#!/usr/bin/env bash
set -euo pipefail
/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "${SA_PASSWORD}" -Q "SELECT 1" -C -l 30
