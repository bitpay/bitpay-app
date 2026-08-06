#!/bin/sh
set -eu

stack_dir="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
workspace_dir="$(CDPATH= cd -- "$stack_dir/../../.." && pwd)"
vultiserver_dir="$workspace_dir/vultiserver-main"
relay_dir="$workspace_dir/vultisig-relay-main"
bin_dir="$stack_dir/bin"

verify_clean_upstream_main() {
  repo_dir="$1"
  expected_remote="$2"
  label="$3"

  [ -d "$repo_dir/.git" ] || [ -f "$repo_dir/.git" ] || {
    echo "$label checkout not found: $repo_dir" >&2
    exit 1
  }
  [ -z "$(git -C "$repo_dir" status --porcelain)" ] || {
    echo "$label checkout has local changes: $repo_dir" >&2
    exit 1
  }
  head="$(git -C "$repo_dir" rev-parse HEAD)"
  upstream_main="$(git -C "$repo_dir" rev-parse upstream/main)"
  [ "$head" = "$upstream_main" ] || {
    echo "$label HEAD $head is not upstream/main $upstream_main" >&2
    exit 1
  }
  actual_remote="$(git -C "$repo_dir" remote get-url upstream)"
  [ "$actual_remote" = "$expected_remote" ] || {
    echo "$label upstream is $actual_remote, expected $expected_remote" >&2
    exit 1
  }
  echo "$label source verified: upstream/main $head"
}

verify_clean_upstream_main "$vultiserver_dir" \
  https://github.com/vultisig/vultiserver.git VultiServer
verify_clean_upstream_main "$relay_dir" \
  https://github.com/vultisig/vultisig-relay.git Vultisig-relay

mkdir -p "$bin_dir"

docker run --rm \
  -v "$vultiserver_dir:/src:ro" \
  -v "$bin_dir:/out" \
  -v vultiserver-go-mod-cache:/go/pkg/mod \
  -w /src \
  golang:1.25-alpine \
  sh -ec 'CGO_ENABLED=0 GOOS=linux go build -trimpath -o /out/vultiserver-api ./cmd/vultisigner'

docker run --rm \
  --platform linux/amd64 \
  -v "$vultiserver_dir:/src:ro" \
  -v "$stack_dir/worker/main.go:/src/cmd/worker/main.go:ro" \
  -v "$bin_dir:/out" \
  -v vultiserver-go-mod-cache:/go/pkg/mod \
  -w /src \
  golang:1.25-bookworm \
  sh -ec '
    CGO_ENABLED=1 GOOS=linux GOARCH=amd64 go build -trimpath -o /out/vultiserver-worker ./cmd/worker
    mkdir -p /out/lib
    cp /go/pkg/mod/github.com/vultisig/go-wrappers@*/includes/linux/*.so /out/lib/
  '

docker run --rm \
  -v "$relay_dir:/src:ro" \
  -v "$bin_dir:/out" \
  -v vultisig-relay-go-mod-cache:/go/pkg/mod \
  -w /src \
  golang:1.25-alpine \
  sh -ec 'CGO_ENABLED=0 GOOS=linux go build -trimpath -o /out/vultisig-relay ./cmd/router'

echo "Local VultiServer binaries built in $bin_dir"
