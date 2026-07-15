#!/usr/bin/env bash
# =============================================================================
# NOWEN Blog Docker 一键发布脚本
#
# 发布内容：
#   - cropflre/nowen-blog-api:vX.Y.Z / latest
#   - cropflre/nowen-blog-web:vX.Y.Z / latest
#
# 默认流程：
#   1. 检查 main 分支和干净工作区，并执行 git pull --ff-only
#   2. 根据 package.json、本地/远端 Git Tag、Docker Hub Tag 建议下一版本
#   3. 更新 package.json 版本并运行类型检查、测试、Compose 校验
#   4. 先完整构建 API + Web，全部成功后再统一推送 Docker Hub
#   5. 推送 release commit、Git Tag，并在可用时创建 GitHub Release
#
# 常用示例：
#   pnpm release:docker
#   pnpm release:docker -- -v 0.2.0 -y
#   pnpm release:docker -- -v 0.2.0 --arch multi -y
#   pnpm release:docker -- -v 0.2.0-rc.1 --arch amd64
#   pnpm release:docker -- -v 0.2.0 --dry-run
# =============================================================================

set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

DEFAULT_IMAGE_PREFIX="${NOWEN_BLOG_IMAGE_PREFIX:-cropflre/nowen-blog}"
DEFAULT_BRANCH="main"
GITHUB_REPO_SLUG="cropflre/nowen-blog"
BUILDX_BUILDER="nowen-blog-builder"

VERSION=""
ARCH="amd64"
IMAGE_PREFIX="$DEFAULT_IMAGE_PREFIX"
ASSUME_YES=0
DO_PULL=1
DO_LATEST=1
LATEST_EXPLICIT=0
DO_GIT_PUSH=1
DO_GIT_TAG=1
GITHUB_RELEASE_MODE="auto" # auto | on | off
DRY_RUN=0
SKIP_CHECKS=0
SETUP_QEMU=1
RELEASE_NOTES=""
RELEASE_NOTES_FILE=""
RELEASE_DRAFT=0
RELEASE_PRERELEASE=0
PACKAGE_BACKUP=""
PACKAGE_CHANGED=0
RELEASE_COMMITTED=0

if [ -t 1 ] && command -v tput >/dev/null 2>&1 && [ "$(tput colors 2>/dev/null || echo 0)" -ge 8 ]; then
  C_RED="$(tput setaf 1)"
  C_GREEN="$(tput setaf 2)"
  C_YELLOW="$(tput setaf 3)"
  C_BLUE="$(tput setaf 4)"
  C_CYAN="$(tput setaf 6)"
  C_BOLD="$(tput bold)"
  C_RESET="$(tput sgr0)"
else
  C_RED=""; C_GREEN=""; C_YELLOW=""; C_BLUE=""; C_CYAN=""; C_BOLD=""; C_RESET=""
fi

info() { echo "${C_BLUE}[*]${C_RESET} $*"; }
ok() { echo "${C_GREEN}[✓]${C_RESET} $*"; }
warn() { echo "${C_YELLOW}[!]${C_RESET} $*" >&2; }
die() { echo "${C_RED}[✗]${C_RESET} $*" >&2; exit 1; }
step() { echo; echo "${C_BOLD}${C_CYAN}==== $* ====${C_RESET}"; }

usage() {
  cat <<EOF
用法: $0 [选项]

发布选项:
  -v, --version VERSION     指定版本，例如 0.2.0 或 v0.2.0
  -y, --yes                 跳过交互确认；未指定版本时采用自动建议版本
      --arch ARCH           amd64（默认）/ arm64 / multi
      --image-prefix NAME   镜像前缀，默认 cropflre/nowen-blog
                            最终发布 NAME-api 与 NAME-web
      --latest              即使是预发布版本也更新 latest
      --no-latest           不更新 latest
      --no-pull             不执行 git pull
      --no-git-push         不推送 release commit 和 Git Tag
      --no-git-tag          不创建 Git Tag
      --github-release      强制创建 GitHub Release；gh 不可用时失败
      --no-github-release   不创建 GitHub Release
      --notes TEXT          GitHub Release 简短说明
      --notes-file PATH     从文件读取 GitHub Release 说明
      --draft               GitHub Release 创建为草稿
      --prerelease          GitHub Release 标记为预发布
      --skip-checks         跳过 pnpm 类型检查和测试（不推荐）
      --no-qemu             arm64/multi 时不自动安装 QEMU binfmt
      --dry-run             只打印计划和命令，不真实执行
  -h, --help                显示帮助

示例:
  $0
  $0 -v 0.2.0 -y
  $0 -v 0.2.0 --arch multi -y
  $0 -v 0.2.0-rc.1 --arch amd64
  $0 -v 0.2.0 --no-github-release
  $0 -v 0.2.0 --dry-run

发布后的部署方式:
  NOWEN_BLOG_VERSION=v0.2.0 docker compose -f docker-compose.release.yml pull
  NOWEN_BLOG_VERSION=v0.2.0 docker compose -f docker-compose.release.yml up -d
EOF
}

while [ $# -gt 0 ]; do
  case "$1" in
    -v|--version) VERSION="${2:-}"; shift 2 ;;
    -y|--yes) ASSUME_YES=1; shift ;;
    --arch) ARCH="${2:-}"; shift 2 ;;
    --image-prefix) IMAGE_PREFIX="${2:-}"; shift 2 ;;
    --latest) DO_LATEST=1; LATEST_EXPLICIT=1; shift ;;
    --no-latest) DO_LATEST=0; LATEST_EXPLICIT=1; shift ;;
    --no-pull) DO_PULL=0; shift ;;
    --no-git-push) DO_GIT_PUSH=0; shift ;;
    --no-git-tag) DO_GIT_TAG=0; shift ;;
    --github-release) GITHUB_RELEASE_MODE="on"; shift ;;
    --no-github-release) GITHUB_RELEASE_MODE="off"; shift ;;
    --notes) RELEASE_NOTES="${2:-}"; shift 2 ;;
    --notes-file) RELEASE_NOTES_FILE="${2:-}"; shift 2 ;;
    --draft) RELEASE_DRAFT=1; shift ;;
    --prerelease) RELEASE_PRERELEASE=1; shift ;;
    --skip-checks) SKIP_CHECKS=1; shift ;;
    --no-qemu) SETUP_QEMU=0; shift ;;
    --dry-run) DRY_RUN=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) die "未知参数: $1（使用 --help 查看帮助）" ;;
  esac
done

case "$ARCH" in
  amd64) PLATFORMS="linux/amd64" ;;
  arm64) PLATFORMS="linux/arm64" ;;
  multi) PLATFORMS="linux/amd64,linux/arm64" ;;
  *) die "不支持的架构: $ARCH（可选 amd64 / arm64 / multi）" ;;
esac

[ -n "$IMAGE_PREFIX" ] || die "镜像前缀不能为空"
[[ "$IMAGE_PREFIX" =~ ^[A-Za-z0-9._/-]+$ ]] || die "镜像前缀格式不正确: $IMAGE_PREFIX"

API_IMAGE="${IMAGE_PREFIX}-api"
WEB_IMAGE="${IMAGE_PREFIX}-web"

print_command() {
  printf "  ${C_CYAN}\$${C_RESET}"
  printf ' %q' "$@"
  printf '\n'
}

run() {
  print_command "$@"
  if [ "$DRY_RUN" = "0" ]; then
    "$@"
  fi
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || die "缺少命令: $1"
}

cleanup() {
  local status=$?
  if [ "$status" -ne 0 ] && [ "$PACKAGE_CHANGED" = "1" ] && [ "$RELEASE_COMMITTED" = "0" ] && [ -n "$PACKAGE_BACKUP" ] && [ -f "$PACKAGE_BACKUP" ]; then
    cp "$PACKAGE_BACKUP" package.json
    warn "发布失败，已恢复 package.json"
  fi
  if [ -n "$PACKAGE_BACKUP" ] && [ -f "$PACKAGE_BACKUP" ]; then
    rm -f "$PACKAGE_BACKUP"
  fi
}
trap cleanup EXIT

normalize_version() {
  local value="$1"
  value="${value#v}"
  printf '%s' "$value"
}

validate_version() {
  [[ "$1" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z][0-9A-Za-z.-]*)?$ ]]
}

package_version() {
  node -e "const p=require('./package.json'); process.stdout.write(String(p.version || '0.0.0'))"
}

is_docker_hub_repository() {
  [[ "$1" =~ ^[A-Za-z0-9._-]+/[A-Za-z0-9._-]+$ ]]
}

dockerhub_versions() {
  local repository="$1"
  is_docker_hub_repository "$repository" || return 0
  command -v curl >/dev/null 2>&1 || return 0
  curl -fsS --max-time 8 "https://hub.docker.com/v2/repositories/${repository}/tags?page_size=100" 2>/dev/null \
    | node -e "let body='';process.stdin.on('data',c=>body+=c).on('end',()=>{try{for(const row of JSON.parse(body).results||[]){const name=String(row.name||'').replace(/^v/,'');if(/^\\d+\\.\\d+\\.\\d+$/.test(name))console.log(name)}}catch{}})" \
    || true
}

latest_stable_version() {
  local current_package
  current_package="$(normalize_version "$(package_version)")"
  {
    printf '%s\n' "$current_package"
    git tag -l 'v*' 2>/dev/null | sed 's/^v//' || true
    git ls-remote --tags origin 'refs/tags/v*' 2>/dev/null \
      | awk -F/ '{print $NF}' | sed 's/\^{}$//' | sed 's/^v//' || true
    dockerhub_versions "$API_IMAGE"
    dockerhub_versions "$WEB_IMAGE"
  } | node -e "let body='';process.stdin.on('data',c=>body+=c).on('end',()=>{const versions=[...new Set(body.split(/\\s+/).filter(v=>/^\\d+\\.\\d+\\.\\d+$/.test(v)))];versions.sort((a,b)=>{const aa=a.split('.').map(Number),bb=b.split('.').map(Number);for(let i=0;i<3;i++){if(aa[i]!==bb[i])return aa[i]-bb[i]}return 0});if(versions.length)process.stdout.write(versions.at(-1))})"
}

suggest_next_version() {
  local latest major minor patch
  latest="$(latest_stable_version)"
  if [ -z "$latest" ]; then
    echo "0.1.0"
    return
  fi
  IFS=. read -r major minor patch <<<"$latest"
  echo "${major}.${minor}.$((patch + 1))"
}

remote_tag_exists() {
  git ls-remote --exit-code --tags origin "refs/tags/v$1" >/dev/null 2>&1
}

docker_tag_exists() {
  local repository="$1" tag="$2" code
  is_docker_hub_repository "$repository" || return 1
  command -v curl >/dev/null 2>&1 || return 1
  code="$(curl -sS --max-time 8 -o /dev/null -w '%{http_code}' \
    "https://hub.docker.com/v2/repositories/${repository}/tags/${tag}" 2>/dev/null || true)"
  [ "$code" = "200" ]
}

set_package_version() {
  local target="$1"
  if [ "$(package_version)" = "$target" ]; then
    info "package.json 已是版本 $target"
    return
  fi
  if [ "$DRY_RUN" = "1" ]; then
    info "将 package.json version 更新为 $target"
    return
  fi
  VERSION_TO_WRITE="$target" node --input-type=module <<'NODE'
import { readFileSync, writeFileSync } from 'node:fs';
const path = 'package.json';
const pkg = JSON.parse(readFileSync(path, 'utf8'));
pkg.version = process.env.VERSION_TO_WRITE;
writeFileSync(path, `${JSON.stringify(pkg, null, 2)}\n`);
NODE
  PACKAGE_CHANGED=1
}

validate_compose_files() {
  local validation_secret validation_password
  validation_secret="${SESSION_SECRET:-release-validation-session-secret-at-least-32-characters}"
  validation_password="${ADMIN_PASSWORD:-release-validation-admin-password}"
  run env \
    SESSION_SECRET="$validation_secret" \
    ADMIN_PASSWORD="$validation_password" \
    NOWEN_BLOG_VERSION="latest" \
    docker compose config --quiet
  run env \
    SESSION_SECRET="$validation_secret" \
    ADMIN_PASSWORD="$validation_password" \
    NOWEN_BLOG_VERSION="latest" \
    docker compose -f docker-compose.release.yml config --quiet
}

ensure_builder() {
  step "准备 Docker Buildx"
  if docker buildx inspect "$BUILDX_BUILDER" >/dev/null 2>&1; then
    run docker buildx use "$BUILDX_BUILDER"
  else
    run docker buildx create --name "$BUILDX_BUILDER" --driver docker-container --use
  fi

  if [ "$ARCH" != "amd64" ] && [ "$SETUP_QEMU" = "1" ] && [ "$DRY_RUN" = "0" ]; then
    local available
    available="$(docker buildx inspect "$BUILDX_BUILDER" --bootstrap 2>/dev/null | sed -n 's/^Platforms:[[:space:]]*//p' || true)"
    if [[ "$available" != *"linux/arm64"* ]]; then
      info "当前构建器缺少 arm64，自动安装 QEMU binfmt"
      run docker run --privileged --rm tonistiigi/binfmt --install arm64
    fi
  fi
  run docker buildx inspect "$BUILDX_BUILDER" --bootstrap
}

run_bake() {
  local mode="$1"
  local api_tags="${API_IMAGE}:v${VERSION}"
  local web_tags="${WEB_IMAGE}:v${VERSION}"
  if [ "$DO_LATEST" = "1" ]; then
    api_tags="${api_tags},${API_IMAGE}:latest"
    web_tags="${web_tags},${WEB_IMAGE}:latest"
  fi

  local args=(docker buildx bake -f docker-bake.hcl release --builder "$BUILDX_BUILDER")
  if [ "$mode" = "push" ]; then
    args+=(--push)
  fi

  echo "  ${C_CYAN}\$${C_RESET} APP_VERSION=$(printf '%q' "$VERSION") VCS_REF=$(printf '%q' "$RELEASE_SHA") BUILD_DATE=$(printf '%q' "$BUILD_DATE") PLATFORM=$(printf '%q' "$PLATFORMS") API_TAGS=$(printf '%q' "$api_tags") WEB_TAGS=$(printf '%q' "$web_tags")" \
    "$(printf '%q ' "${args[@]}")"

  if [ "$DRY_RUN" = "0" ]; then
    APP_VERSION="$VERSION" \
    VCS_REF="$RELEASE_SHA" \
    BUILD_DATE="$BUILD_DATE" \
    PLATFORM="$PLATFORMS" \
    API_TAGS="$api_tags" \
    WEB_TAGS="$web_tags" \
      "${args[@]}"
  fi
}

create_github_release() {
  [ "$GITHUB_RELEASE_MODE" != "off" ] || return 0

  if ! command -v gh >/dev/null 2>&1; then
    if [ "$GITHUB_RELEASE_MODE" = "on" ]; then
      die "已要求创建 GitHub Release，但未安装 gh CLI"
    fi
    warn "未安装 gh CLI，跳过 GitHub Release"
    return 0
  fi

  if ! gh auth status >/dev/null 2>&1; then
    if [ "$GITHUB_RELEASE_MODE" = "on" ]; then
      die "gh CLI 尚未登录，请先执行 gh auth login"
    fi
    warn "gh CLI 尚未登录，跳过 GitHub Release"
    return 0
  fi

  if gh release view "v$VERSION" --repo "$GITHUB_REPO_SLUG" >/dev/null 2>&1; then
    warn "GitHub Release v$VERSION 已存在，跳过"
    return 0
  fi

  local args=(gh release create "v$VERSION" --repo "$GITHUB_REPO_SLUG" --title "v$VERSION")
  if [ -n "$RELEASE_NOTES_FILE" ]; then
    [ -f "$RELEASE_NOTES_FILE" ] || die "Release notes 文件不存在: $RELEASE_NOTES_FILE"
    args+=(--notes-file "$RELEASE_NOTES_FILE")
  elif [ -n "$RELEASE_NOTES" ]; then
    args+=(--notes "$RELEASE_NOTES")
  else
    args+=(--generate-notes)
  fi
  [ "$RELEASE_DRAFT" = "1" ] && args+=(--draft)
  [ "$RELEASE_PRERELEASE" = "1" ] && args+=(--prerelease)
  run "${args[@]}"
}

step "发布环境检查"
require_command git
require_command node
require_command pnpm
require_command docker

docker info >/dev/null 2>&1 || die "Docker daemon 未运行"
docker buildx version >/dev/null 2>&1 || die "当前 Docker 不支持 buildx"
[ -f package.json ] || die "请在 nowen-blog 仓库中运行脚本"
[ -f docker-bake.hcl ] || die "缺少 docker-bake.hcl"
[ -f docker-compose.release.yml ] || die "缺少 docker-compose.release.yml"

CURRENT_BRANCH="$(git branch --show-current)"
[ "$CURRENT_BRANCH" = "$DEFAULT_BRANCH" ] || die "请切换到 $DEFAULT_BRANCH 分支后发布，当前为 ${CURRENT_BRANCH:-detached}"

if [ -n "$(git status --porcelain)" ]; then
  die "工作区或暂存区不干净，请先提交或清理改动"
fi

if [ "$DO_PULL" = "1" ]; then
  run git pull --ff-only origin "$DEFAULT_BRANCH"
fi
run git fetch --tags origin

SUGGESTED_VERSION="$(suggest_next_version)"
if [ -z "$VERSION" ]; then
  if [ "$ASSUME_YES" = "1" ]; then
    VERSION="$SUGGESTED_VERSION"
  else
    echo
    read -r -p "发布版本 [${SUGGESTED_VERSION}]: " VERSION
    VERSION="${VERSION:-$SUGGESTED_VERSION}"
  fi
fi
VERSION="$(normalize_version "$VERSION")"
validate_version "$VERSION" || die "版本号格式错误: $VERSION（示例 0.2.0 或 0.2.0-rc.1）"

if [[ "$VERSION" == *-* ]]; then
  RELEASE_PRERELEASE=1
  if [ "$LATEST_EXPLICIT" = "0" ]; then
    DO_LATEST=0
  fi
fi

if git rev-parse "v$VERSION" >/dev/null 2>&1 || remote_tag_exists "$VERSION"; then
  die "Git Tag v$VERSION 已存在，请使用更高版本"
fi
if docker_tag_exists "$API_IMAGE" "v$VERSION" || docker_tag_exists "$WEB_IMAGE" "v$VERSION"; then
  die "Docker Hub 已存在 v$VERSION，为避免覆盖不可变版本，请使用更高版本"
fi

step "发布计划"
echo "版本:          v$VERSION"
echo "架构:          $ARCH ($PLATFORMS)"
echo "API 镜像:      ${API_IMAGE}:v${VERSION}"
echo "Web 镜像:      ${WEB_IMAGE}:v${VERSION}"
echo "更新 latest:   $([ "$DO_LATEST" = "1" ] && echo 是 || echo 否)"
echo "推送源码:      $([ "$DO_GIT_PUSH" = "1" ] && echo 是 || echo 否)"
echo "创建 Git Tag:  $([ "$DO_GIT_TAG" = "1" ] && echo 是 || echo 否)"
echo "GitHub Release: $GITHUB_RELEASE_MODE"

if [ "$ASSUME_YES" = "0" ] && [ "$DRY_RUN" = "0" ]; then
  echo
  read -r -p "确认开始发布？[y/N] " confirm
  [[ "$confirm" =~ ^[Yy]$ ]] || die "已取消"
fi

PACKAGE_BACKUP="$(mktemp)"
cp package.json "$PACKAGE_BACKUP"
set_package_version "$VERSION"

if [ "$SKIP_CHECKS" = "0" ]; then
  step "质量检查"
  run pnpm install --frozen-lockfile
  run pnpm typecheck
  run pnpm test
  validate_compose_files
else
  warn "已跳过质量检查"
fi

step "创建本地发布提交"
if [ "$DRY_RUN" = "0" ]; then
  git add package.json
  if ! git diff --cached --quiet; then
    git commit -m "chore(release): v$VERSION"
  else
    info "没有需要提交的版本文件变化"
  fi
  RELEASE_COMMITTED=1
else
  print_command git add package.json
  print_command git commit -m "chore(release): v$VERSION"
fi

RELEASE_SHA="$(git rev-parse HEAD)"
BUILD_DATE="$(date -u +'%Y-%m-%dT%H:%M:%SZ')"

ensure_builder

step "预构建 API 与 Web（不推送）"
info "先验证两个镜像都能完整构建；任一失败都不会发布版本 Tag"
run_bake build

if [ "$DO_GIT_PUSH" = "1" ]; then
  step "推送发布提交"
  run git push origin "HEAD:$DEFAULT_BRANCH"
fi

step "推送 Docker 镜像"
run_bake push

if [ "$DRY_RUN" = "0" ]; then
  docker buildx imagetools inspect "${API_IMAGE}:v${VERSION}" >/dev/null
  docker buildx imagetools inspect "${WEB_IMAGE}:v${VERSION}" >/dev/null
fi
ok "两张 Docker 镜像均已发布"

if [ "$DO_GIT_TAG" = "1" ]; then
  step "创建 Git Tag"
  run git tag -a "v$VERSION" -m "Release v$VERSION"
  if [ "$DO_GIT_PUSH" = "1" ]; then
    run git push origin "v$VERSION"
  fi
fi

if [ "$DO_GIT_TAG" = "0" ] && [ "$GITHUB_RELEASE_MODE" != "off" ]; then
  warn "未创建 Git Tag，自动跳过 GitHub Release"
elif [ "$DO_GIT_PUSH" = "0" ] && [ "$GITHUB_RELEASE_MODE" != "off" ]; then
  warn "未推送 Git Tag，自动跳过 GitHub Release"
else
  step "创建 GitHub Release"
  create_github_release
fi

step "发布完成"
echo "${C_GREEN}API:${C_RESET} ${API_IMAGE}:v${VERSION}"
echo "${C_GREEN}Web:${C_RESET} ${WEB_IMAGE}:v${VERSION}"
[ "$DO_LATEST" = "1" ] && echo "${C_GREEN}latest:${C_RESET} 已同步更新"
echo
echo "固定版本部署："
echo "  NOWEN_BLOG_VERSION=v${VERSION} docker compose -f docker-compose.release.yml pull"
echo "  NOWEN_BLOG_VERSION=v${VERSION} docker compose -f docker-compose.release.yml up -d"
echo
echo "跟随最新版部署："
echo "  docker compose -f docker-compose.release.yml pull"
echo "  docker compose -f docker-compose.release.yml up -d"
