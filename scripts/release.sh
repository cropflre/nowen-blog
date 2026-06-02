#!/usr/bin/env bash
# nowen-blog Docker release script
set -euo pipefail

DEFAULT_IMAGE_NAME="cropflre/nowen-blog"
DEFAULT_BRANCH="main"

# Colors
if [ -t 1 ] && command -v tput >/dev/null 2>&1; then
    C_RED="$(tput setaf 1)"; C_GREEN="$(tput setaf 2)"; C_YELLOW="$(tput setaf 3)"
    C_BLUE="$(tput setaf 4)"; C_CYAN="$(tput setaf 6)"; C_BOLD="$(tput bold)"; C_RESET="$(tput sgr0)"
else
    C_RED=""; C_GREEN=""; C_YELLOW=""; C_BLUE=""; C_CYAN=""; C_BOLD=""; C_RESET=""
fi

info()  { echo "${C_BLUE}[*]${C_RESET} $*"; }
ok()    { echo "${C_GREEN}[✓]${C_RESET} $*"; }
warn()  { echo "${C_YELLOW}[!]${C_RESET} $*" >&2; }
die()   { echo "${C_RED}[✗]${C_RESET} $*" >&2; exit 1; }
step()  { echo; echo "${C_BOLD}${C_CYAN}==== $* ====${C_RESET}"; }

VERSION=""; ASSUME_YES=0; DO_PUSH=1; DO_LATEST=1; DRY_RUN=0; IMAGE_NAME="$DEFAULT_IMAGE_NAME"

while [ $# -gt 0 ]; do
    case "$1" in
        -v|--version)   VERSION="$2"; shift 2 ;;
        -y|--yes)       ASSUME_YES=1; shift ;;
        --no-push)      DO_PUSH=0; shift ;;
        --no-latest)    DO_LATEST=0; shift ;;
        --dry-run)      DRY_RUN=1; shift ;;
        --image)        IMAGE_NAME="$2"; shift 2 ;;
        -h|--help)      echo "Usage: $0 [-v VERSION] [-y] [--no-push] [--no-latest] [--dry-run] [--image IMAGE]"; exit 0 ;;
        *) die "Unknown: $1" ;;
    esac
done

step "Pre-check"
command -v docker >/dev/null 2>&1 || die "docker not found"
docker info >/dev/null 2>&1 || die "Docker daemon not running"
[ -f "Dockerfile" ] || die "Run from project root (needs Dockerfile)"
ok "Docker ready"

step "Version"
SUGGESTED=""
if command -v git >/dev/null 2>&1 && git rev-parse --git-dir >/dev/null 2>&1; then
    LATEST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || true)
    if [ -n "$LATEST_TAG" ]; then
        LV="${LATEST_TAG#v}"
        if [[ "$LV" =~ ^([0-9]+)\.([0-9]+)\.([0-9]+)$ ]]; then
            SUGGESTED="${BASH_REMATCH[1]}.${BASH_REMATCH[2]}.$(( ${BASH_REMATCH[3]} + 1 ))"
        fi
    fi
fi

if [ -z "$VERSION" ]; then
    if [ -n "$SUGGESTED" ]; then
        read -rp "Version [suggested: $SUGGESTED]: " VERSION
        [ -z "$VERSION" ] && VERSION="$SUGGESTED"
    else
        read -rp "Version (e.g. 1.0.0): " VERSION
        [ -z "$VERSION" ] && die "Version required"
    fi
fi

[[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.]+)?$ ]] || die "Invalid version: $VERSION"
VERSION_TAG="v${VERSION}"
info "Version: $VERSION_TAG"

if [ "$ASSUME_YES" -eq 0 ] && [ "$DRY_RUN" -eq 0 ]; then
    echo ""; echo "  Image:  $IMAGE_NAME"; echo "  Tags:   $VERSION_TAG + latest"
    [ "$DO_PUSH" -eq 1 ] && echo "  Push:   Yes -> Docker Hub" || echo "  Push:   No"
    echo ""; read -rp "Confirm? (y/N) " C; [[ "$C" =~ ^[Yy]$ ]] || die "Cancelled"
fi

step "Build"
BUILD_START=$(date +%s)
CMD="docker build -t ${IMAGE_NAME}:${VERSION_TAG}"
[ "$DO_LATEST" -eq 1 ] && CMD="$CMD -t ${IMAGE_NAME}:latest"
CMD="$CMD ."
if [ "$DRY_RUN" -eq 1 ]; then echo "  (dry-run) $CMD"
else info "Building..."; eval "$CMD"; ok "Build done"; fi
BUILD_END=$(date +%s); BUILD_DURATION=$((BUILD_END - BUILD_START))

if [ "$DO_PUSH" -eq 1 ]; then
    step "Push"
    if [ "$DRY_RUN" -eq 1 ]; then
        echo "  (dry-run) docker push ${IMAGE_NAME}:${VERSION_TAG}"
        [ "$DO_LATEST" -eq 1 ] && echo "  (dry-run) docker push ${IMAGE_NAME}:latest"
    else
        info "Pushing ${IMAGE_NAME}:${VERSION_TAG}..."
        docker push "${IMAGE_NAME}:${VERSION_TAG}"
        if [ "$DO_LATEST" -eq 1 ]; then
            info "Pushing ${IMAGE_NAME}:latest..."
            docker push "${IMAGE_NAME}:latest"
        fi
        ok "Push done"
    fi
fi

step "Done"
echo ""; echo "  Image:    ${IMAGE_NAME}:${VERSION_TAG}"
[ "$DO_LATEST" -eq 1 ] && echo "  Latest:   ${IMAGE_NAME}:latest"
echo "  Build:    ${BUILD_DURATION}s"; echo ""
echo "Pull:  docker pull ${IMAGE_NAME}:${VERSION_TAG}"
echo "Run:   docker run -d -p 8080:80 --name nowen-blog ${IMAGE_NAME}:${VERSION_TAG}"
echo ""; ok "Release complete"
