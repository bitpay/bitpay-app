#!/bin/sh
set -eu

seen=/tmp/vultisig-verification-codes
: > "$seen"

while :; do
  redis-cli -h redis --scan --pattern 'verification_code_*' | while IFS= read -r key; do
    [ -n "$key" ] || continue
    code="$(redis-cli -h redis --raw GET "$key")"
    marker="$key=$code"
    if [ -n "$code" ] && ! grep -Fqx "$marker" "$seen"; then
      printf 'VULTISIG_VERIFICATION_CODE vault=%s code=%s\n' \
        "${key#verification_code_}" "$code"
      printf '%s\n' "$marker" >> "$seen"
    fi
  done
  sleep 1
done
