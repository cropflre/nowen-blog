#!/usr/bin/env bash
# =============================================================================
# NOWEN Blog Docker 一键发布脚本
#
# 发布内容：
#   - cropflre/nowen-blog:vX.Y.Z
#   - cropflre/nowen-blog:latest（正式版本默认更新）
#
# 单个镜像内同时包含：
#   - Nginx 前台与反向代理
#   - Hono API
#   - SQLite、上传文件和备份工具
#
# 常用示例：
#   pnpm release:docker
#   pnpm release:docker -- -v 1.0.5 -y
#   pnpm release:docker -- -v 1.0.5 --arch multi -y
#   pnpm release:docker -- -v 1.0.5-rc.1
#   pnpm release:docker -- -v 1.0.5 --dry-run
# =============================================================================

set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

DEFAULT_IMAGE="${NOWEN_BLOG_IMAGE:-cropflre/nowen-blog}"
DEFAULT_BRANCH="main"
GITHUB_REPO_SLUG="cropflre/nowen-blog"
BUILDX_BUILDER="nowen-blog-builder"

VERSION=""
ARCH="amd64"
IMAGE="$DEFAULT_IMAGE"
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
ORIGINAL_ARGC=$#
QUICK_MODE=0
RESUME_MODE=0
STATE_FILE="$ROOT_DIR/.tmp/release-docker-state.json"
PHASE="preflight"
ORIGINAL_HEAD=""
RELEASE_SHA=""
LOCAL_RELEASE_CREATED=0
PUBLISH_STARTED=0
RELEASE_SUCCEEDED=0
DOCKER_PUBLISHED=0
GIT_COMMIT_PUBLISHED=0
GIT_TAG_PUBLISHED=0
GITHUB_RELEASE_PUBLISHED=0
PRESERVE_PACKAGE_BACKUP=0

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
  cat <<'EOF'
用法: scripts/release-docker.sh [选项]

发布选项:
      （无参数）           启动快速向导：自动版本、multi 架构、latest、Git Tag 和 GitHub Release
  -v, --version VERSION     指定版本，例如 1.0.5 或 v1.0.5
  -y, --yes                 跳过交互确认；未指定版本时采用自动建议版本
      --arch ARCH           amd64（默认）/ arm64 / multi
      --image NAME          镜像名，默认 cropflre/nowen-blog
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
      --resume              检查远端状态并续传未完成的发布
  -h, --help                显示帮助

示例:
  pnpm release:docker                              # 快速发布 amd64 + arm64，只确认一次
  pnpm release:docker -- -v 1.0.5 -y
  pnpm release:docker -- -v 1.0.5 --arch multi -y
  pnpm release:docker -- -v 1.0.5-rc.1
  pnpm release:docker -- -v 1.0.5 --no-github-release
  pnpm release:docker -- -v 1.0.5 --dry-run
  pnpm release:docker -- --resume -v 1.0.5

发布后的部署方式:
  NOWEN_BLOG_VERSION=v1.0.5 docker compose -f docker-compose.release.yml pull
  NOWEN_BLOG_VERSION=v1.0.5 docker compose -f docker-compose.release.yml up -d
EOF
}

while [ $# -gt 0 ]; do
  case "$1" in
    -v|--version) VERSION="${2:-}"; shift 2 ;;
    -y|--yes) ASSUME_YES=1; shift ;;
    --arch) ARCH="${2:-}"; shift 2 ;;
    --image) IMAGE="${2:-}"; shift 2 ;;
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
    --resume) RESUME_MODE=1; DO_PULL=0; shift ;;
    -h|--help) usage; exit 0 ;;
    *) die "未知参数: $1（使用 --help 查看帮助）" ;;
  esac
done

if [ "$ORIGINAL_ARGC" = "0" ]; then
  QUICK_MODE=1
  ARCH="multi"
  GITHUB_RELEASE_MODE="on"
fi

case "$ARCH" in
  amd64) PLATFORMS="linux/amd64" ;;
  arm64) PLATFORMS="linux/arm64" ;;
  multi) PLATFORMS="linux/amd64,linux/arm64" ;;
  *) die "不支持的架构: $ARCH（可选 amd64 / arm64 / multi）" ;;
esac

[ -n "$IMAGE" ] || die "镜像名不能为空"
[[ "$IMAGE" =~ ^[A-Za-z0-9._/-]+$ ]] || die "镜像名格式不正确: $IMAGE"

print_command() {
  printf '  %s$%s' "$C_CYAN" "$C_RESET"
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

write_release_state() {
  [ "$DRY_RUN" = "0" ] || return 0
  mkdir -p "$(dirname "$STATE_FILE")"
  STATE_FILE="$STATE_FILE" \
  STATE_VERSION="$VERSION" \
  STATE_IMAGE="$IMAGE" \
  STATE_ARCH="$ARCH" \
  STATE_LATEST="$DO_LATEST" \
  STATE_RELEASE_SHA="$RELEASE_SHA" \
  STATE_ORIGINAL_HEAD="$ORIGINAL_HEAD" \
  STATE_GIT_PUSH="$DO_GIT_PUSH" \
  STATE_GIT_TAG_ENABLED="$DO_GIT_TAG" \
  STATE_GITHUB_MODE="$GITHUB_RELEASE_MODE" \
  STATE_RELEASE_DRAFT="$RELEASE_DRAFT" \
  STATE_RELEASE_PRERELEASE="$RELEASE_PRERELEASE" \
  STATE_RELEASE_NOTES="$RELEASE_NOTES" \
  STATE_DOCKER="$DOCKER_PUBLISHED" \
  STATE_GIT_COMMIT="$GIT_COMMIT_PUBLISHED" \
  STATE_GIT_TAG="$GIT_TAG_PUBLISHED" \
  STATE_GITHUB_RELEASE="$GITHUB_RELEASE_PUBLISHED" \
    node --input-type=module <<'NODE'
import { renameSync, rmSync, writeFileSync } from 'node:fs';

const bool = (value) => value === '1';
const state = {
  schemaVersion: 1,
  version: process.env.STATE_VERSION,
  image: process.env.STATE_IMAGE,
  arch: process.env.STATE_ARCH,
  latest: bool(process.env.STATE_LATEST),
  releaseSha: process.env.STATE_RELEASE_SHA,
  originalHead: process.env.STATE_ORIGINAL_HEAD,
  enabled: {
    gitPush: bool(process.env.STATE_GIT_PUSH),
    gitTag: bool(process.env.STATE_GIT_TAG_ENABLED),
    githubRelease: process.env.STATE_GITHUB_MODE !== 'off',
  },
  github: {
    mode: process.env.STATE_GITHUB_MODE,
    draft: bool(process.env.STATE_RELEASE_DRAFT),
    prerelease: bool(process.env.STATE_RELEASE_PRERELEASE),
    notes: process.env.STATE_RELEASE_NOTES || '',
  },
  completed: {
    docker: bool(process.env.STATE_DOCKER),
    gitCommit: bool(process.env.STATE_GIT_COMMIT),
    gitTag: bool(process.env.STATE_GIT_TAG),
    githubRelease: bool(process.env.STATE_GITHUB_RELEASE),
  },
};
const temporaryFile = `${process.env.STATE_FILE}.${process.pid}.tmp`;
try {
  writeFileSync(temporaryFile, `${JSON.stringify(state, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
  renameSync(temporaryFile, process.env.STATE_FILE);
} finally {
  rmSync(temporaryFile, { force: true });
}
NODE
}

remove_release_state() {
  if [ -f "$STATE_FILE" ]; then
    rm -f "$STATE_FILE"
  fi
}

print_resume_hint() {
  [ -n "$VERSION" ] || return 0
  warn "远端发布尚未全部完成，请运行："
  warn "  pnpm release:docker -- --resume -v $VERSION"
}

rollback_local_release() {
  local current_head=""
  if [ "$LOCAL_RELEASE_CREATED" = "1" ] && [ -n "$ORIGINAL_HEAD" ] && [ -n "$RELEASE_SHA" ]; then
    current_head="$(git rev-parse HEAD 2>/dev/null || true)"
    if [ "$current_head" = "$RELEASE_SHA" ]; then
      if ! git reset --mixed "$ORIGINAL_HEAD" >/dev/null; then
        PRESERVE_PACKAGE_BACKUP=1
        warn "自动恢复失败：无法撤销 release commit，已保留状态和 package.json 备份"
        warn "请手动运行：git reset --mixed $ORIGINAL_HEAD"
        return 1
      fi
    else
      PRESERVE_PACKAGE_BACKUP=1
      warn "当前 HEAD 已变化，未自动撤销 release commit"
      warn "请确认提交历史后手动恢复；发布状态和 package.json 备份已保留"
      return 1
    fi
  elif [ "$PACKAGE_CHANGED" = "1" ]; then
    if ! git reset -- package.json >/dev/null; then
      PRESERVE_PACKAGE_BACKUP=1
      warn "自动恢复失败：无法取消暂存 package.json，已保留状态和备份"
      warn "请手动运行：git reset -- package.json"
      return 1
    fi
  fi
  if [ "$PACKAGE_CHANGED" = "1" ] && [ -n "$PACKAGE_BACKUP" ] && [ -f "$PACKAGE_BACKUP" ]; then
    if ! cp "$PACKAGE_BACKUP" package.json; then
      PRESERVE_PACKAGE_BACKUP=1
      warn "自动恢复失败：无法恢复 package.json，已保留状态和备份"
      warn "请手动运行：cp $PACKAGE_BACKUP package.json"
      return 1
    fi
  fi
  PACKAGE_CHANGED=0
  LOCAL_RELEASE_CREATED=0
  remove_release_state
  warn "发布失败，本地版本和 release commit 已恢复"
}

cleanup() {
  local status=$?
  trap - EXIT INT TERM
  if [ "$status" -ne 0 ] && [ "$RELEASE_SUCCEEDED" = "0" ]; then
    if [ "$PUBLISH_STARTED" = "0" ]; then
      if [ "$PACKAGE_CHANGED" = "1" ] || [ "$LOCAL_RELEASE_CREATED" = "1" ]; then
        rollback_local_release || true
      fi
    else
      print_resume_hint
    fi
  fi
  if [ "$PRESERVE_PACKAGE_BACKUP" = "0" ] && [ -n "$PACKAGE_BACKUP" ] && [ -f "$PACKAGE_BACKUP" ]; then
    rm -f "$PACKAGE_BACKUP"
  fi
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

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
  [[ "$1" =~ ^[^./][^/]*/[^/]+$ ]]
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
    dockerhub_versions "$IMAGE"
  } | grep -E '^[0-9]+\.[0-9]+\.[0-9]+$' | sort -Vu | tail -n 1
}

suggest_next_version() {
  local latest major minor patch
  latest="$(latest_stable_version)"
  if [ -z "$latest" ]; then
    echo "1.0.0"
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
  case "$code" in
    200) return 0 ;;
    404) return 1 ;;
    ""|000) die "无法确认 Docker Hub Tag ${repository}:${tag} 的状态：网络请求失败" ;;
    *) die "无法确认 Docker Hub Tag ${repository}:${tag} 的状态：HTTP $code" ;;
  esac
}

docker_tag_matches_release() {
  local tag="$1" reference raw digests target labels revisions revision
  reference="${IMAGE}:${tag}"
  if ! raw="$(docker buildx imagetools inspect "$reference" --raw 2>/dev/null)"; then
    die "无法读取 Docker 镜像清单：$reference"
  fi
  digests="$(printf '%s' "$raw" | node -e "let b='';process.stdin.on('data',c=>b+=c).on('end',()=>{try{for(const m of JSON.parse(b).manifests||[]){const attestation=m.annotations?.['vnd.docker.reference.type']==='attestation-manifest'||m.platform?.os==='unknown';if(m.digest&&!attestation)console.log(m.digest)}}catch{process.exit(1)}})" 2>/dev/null)" \
    || die "Docker 镜像清单格式无效：$reference"

  if [ -z "$digests" ]; then
    digests="__single_manifest__"
  fi
  revisions=""
  while IFS= read -r target; do
    [ -n "$target" ] || continue
    if [ "$target" = "__single_manifest__" ]; then
      target="$reference"
    else
      target="${IMAGE}@${target}"
    fi
    if ! labels="$(docker buildx imagetools inspect "$target" --format '{{json .Image.Config.Labels}}' 2>/dev/null)"; then
      die "无法读取 Docker 镜像标签：$target"
    fi
    revision="$(printf '%s' "$labels" | node -e "let b='';process.stdin.on('data',c=>b+=c).on('end',()=>{try{process.stdout.write(String(JSON.parse(b)?.['org.opencontainers.image.revision']||''))}catch{process.exit(1)}})" 2>/dev/null)" \
      || die "Docker 镜像标签格式无效：$target"
    [ -n "$revision" ] || return 1
    revisions="${revisions}${revision}"$'\n'
  done <<<"$digests"

  while IFS= read -r revision; do
    [ -z "$revision" ] || [ "$revision" = "$RELEASE_SHA" ] || return 1
  done <<<"$revisions"
  return 0
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
  validate_compose_file docker compose config --quiet
  validate_compose_file docker compose -f docker-compose.release.yml config --quiet
}

validate_compose_file() {
  local validation_secret validation_password validation_version
  validation_secret="${SESSION_SECRET:-release-validation-session-secret-at-least-32-characters}"
  validation_password="${ADMIN_PASSWORD:-release-validation-admin-password}"
  validation_version="${NOWEN_BLOG_VERSION:-latest}"

  print_command env \
    SESSION_SECRET="release-validation-session-secret-at-least-32-characters" \
    ADMIN_PASSWORD="release-validation-admin-password" \
    NOWEN_BLOG_VERSION="$validation_version" \
    "$@"
  if [ "$DRY_RUN" = "0" ]; then
    env \
      SESSION_SECRET="$validation_secret" \
      ADMIN_PASSWORD="$validation_password" \
      NOWEN_BLOG_VERSION="$validation_version" \
      "$@"
  fi
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
  local tag_scope="${2:-all}" image_tags
  case "$tag_scope" in
    all)
      image_tags="${IMAGE}:v${VERSION}"
      [ "$DO_LATEST" = "1" ] && image_tags="${image_tags},${IMAGE}:latest"
      ;;
    version) image_tags="${IMAGE}:v${VERSION}" ;;
    latest) image_tags="${IMAGE}:latest" ;;
    *) die "未知 Docker Tag 发布范围: $tag_scope" ;;
  esac

  local args=(docker buildx bake -f docker-bake.hcl release --builder "$BUILDX_BUILDER")
  if [ "$mode" = "push" ]; then
    args+=(--push)
  fi

  echo "  ${C_CYAN}\$${C_RESET} APP_VERSION=$(printf '%q' "$VERSION") VCS_REF=$(printf '%q' "$RELEASE_SHA") BUILD_DATE=$(printf '%q' "$BUILD_DATE") PLATFORM=$(printf '%q' "$PLATFORMS") IMAGE_TAGS=$(printf '%q' "$image_tags") $(printf '%q ' "${args[@]}")"

  if [ "$DRY_RUN" = "0" ]; then
    APP_VERSION="$VERSION" \
    VCS_REF="$RELEASE_SHA" \
    BUILD_DATE="$BUILD_DATE" \
    PLATFORM="$PLATFORMS" \
    IMAGE_TAGS="$image_tags" \
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

read_release_state_field() {
  local field="$1"
  STATE_FILE="$STATE_FILE" node --input-type=module - "$field" <<'NODE'
import { readFileSync } from 'node:fs';

const state = JSON.parse(readFileSync(process.env.STATE_FILE, 'utf8'));
const field = process.argv[2];
const value = field.split('.').reduce((current, key) => current?.[key], state);
if (typeof value === 'boolean') process.stdout.write(value ? '1' : '0');
else if (value !== undefined && value !== null) process.stdout.write(String(value));
NODE
}

validate_release_state_file() {
  local error
  if ! error="$(STATE_FILE="$STATE_FILE" node --input-type=module <<'NODE'
import { readFileSync } from 'node:fs';

try {
  const state = JSON.parse(readFileSync(process.env.STATE_FILE, 'utf8'));
  const requiredString = (key) => typeof state[key] === 'string' && state[key].length > 0;
  if (state.schemaVersion !== 1) throw new Error('状态文件格式版本不受支持');
  if (!requiredString('version') || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z][0-9A-Za-z.-]*)?$/.test(state.version)) {
    throw new Error('状态文件中的版本号无效');
  }
  if (!requiredString('image') || !/^[A-Za-z0-9._/-]+$/.test(state.image)) throw new Error('状态文件中的镜像名无效');
  if (!['amd64', 'arm64', 'multi'].includes(state.arch)) throw new Error('状态文件中的架构无效');
  if (typeof state.latest !== 'boolean') throw new Error('状态文件中的 latest 标记无效');
  if (!requiredString('releaseSha') || !/^[A-Za-z0-9._-]+$/.test(state.releaseSha)) throw new Error('状态文件中的 release SHA 无效');
  if (!requiredString('originalHead') || !/^[A-Za-z0-9._-]+$/.test(state.originalHead)) throw new Error('状态文件中的原始 SHA 无效');
  const booleanFields = (value, keys) => value && keys.every((key) => typeof value[key] === 'boolean');
  if (!booleanFields(state.completed, ['docker', 'gitCommit', 'gitTag', 'githubRelease'])) throw new Error('状态文件中的完成标记无效');
  if (state.enabled !== undefined && !booleanFields(state.enabled, ['gitPush', 'gitTag', 'githubRelease'])) throw new Error('状态文件中的启用标记无效');
  if (state.github?.mode !== undefined && !['auto', 'on', 'off'].includes(state.github.mode)) throw new Error('状态文件中的 GitHub Release 模式无效');
  if (state.github?.draft !== undefined && typeof state.github.draft !== 'boolean') throw new Error('状态文件中的 draft 标记无效');
  if (state.github?.prerelease !== undefined && typeof state.github.prerelease !== 'boolean') throw new Error('状态文件中的 prerelease 标记无效');
  if (state.github?.notes !== undefined && typeof state.github.notes !== 'string') throw new Error('状态文件中的 Release notes 无效');
} catch (caught) {
  process.stdout.write(caught instanceof Error ? caught.message : '状态文件无效');
  process.exit(1);
}
NODE
)"; then
    die "无法读取发布状态：$error"
  fi
}

validate_inferred_release_commit() {
  local current_version subject changed_files
  current_version="$(package_version)"
  [ "$current_version" = "$VERSION" ] \
    || die "无法安全推断 release commit：package.json 版本为 $current_version，目标为 $VERSION"

  subject="$(git log -1 --format=%s "$RELEASE_SHA" 2>/dev/null || true)"
  [ "$subject" = "chore(release): v$VERSION" ] \
    || die "无法安全推断 release commit：当前提交标题不是 chore(release): v$VERSION"

  changed_files="$(git diff-tree --no-commit-id --name-only -r "$RELEASE_SHA" 2>/dev/null || true)"
  [ "$changed_files" = "package.json" ] \
    || die "无法安全推断 release commit：当前提交不只包含 package.json 版本变更"

  RELEASE_SHA="$RELEASE_SHA" RELEASE_VERSION="$VERSION" node --input-type=module <<'NODE' \
    || die "无法安全推断 release commit：package.json 除 version 外还包含其他变更"
import { execFileSync } from 'node:child_process';

const sha = process.env.RELEASE_SHA;
const parseAt = (revision) => JSON.parse(execFileSync('git', ['show', `${revision}:package.json`], { encoding: 'utf8' }));

try {
  const previous = parseAt(`${sha}^`);
  const current = parseAt(sha);
  if (current.version !== process.env.RELEASE_VERSION) process.exit(1);
  delete previous.version;
  delete current.version;
  process.exit(JSON.stringify(previous) === JSON.stringify(current) ? 0 : 1);
} catch {
  process.exit(1);
}
NODE
}

load_release_state() {
  local requested_version="$VERSION" state_version value
  if [ -f "$STATE_FILE" ]; then
    validate_release_state_file
    state_version="$(read_release_state_field version)"
    if [ -n "$requested_version" ] && [ "$(normalize_version "$requested_version")" != "$state_version" ]; then
      die "续传版本与状态文件不一致：请求 $requested_version，状态为 $state_version"
    fi
    VERSION="$state_version"
    IMAGE="$(read_release_state_field image)"
    ARCH="$(read_release_state_field arch)"
    DO_LATEST="$(read_release_state_field latest)"
    RELEASE_SHA="$(read_release_state_field releaseSha)"
    ORIGINAL_HEAD="$(read_release_state_field originalHead)"
    value="$(read_release_state_field enabled.gitPush)"; [ -n "$value" ] && DO_GIT_PUSH="$value"
    value="$(read_release_state_field enabled.gitTag)"; [ -n "$value" ] && DO_GIT_TAG="$value"
    value="$(read_release_state_field github.mode)"
    if [ -n "$value" ]; then
      GITHUB_RELEASE_MODE="$value"
    else
      value="$(read_release_state_field enabled.githubRelease)"
      if [ "$value" = "1" ]; then GITHUB_RELEASE_MODE="on"; elif [ "$value" = "0" ]; then GITHUB_RELEASE_MODE="off"; fi
    fi
    value="$(read_release_state_field github.draft)"; [ -n "$value" ] && RELEASE_DRAFT="$value"
    value="$(read_release_state_field github.prerelease)"; [ -n "$value" ] && RELEASE_PRERELEASE="$value"
    RELEASE_NOTES="$(read_release_state_field github.notes)"
    RELEASE_NOTES_FILE=""
  else
    VERSION="$(normalize_version "${VERSION:-$(package_version)}")"
    validate_version "$VERSION" \
      || die "无法安全推断 release commit：版本号格式错误 $VERSION"
    RELEASE_SHA="$(git rev-parse HEAD)"
    ORIGINAL_HEAD="$(git rev-parse HEAD^ 2>/dev/null || true)"
    validate_inferred_release_commit
    [ "$GITHUB_RELEASE_MODE" = "auto" ] && GITHUB_RELEASE_MODE="on"
  fi

  case "$ARCH" in
    amd64) PLATFORMS="linux/amd64" ;;
    arm64) PLATFORMS="linux/arm64" ;;
    multi) PLATFORMS="linux/amd64,linux/arm64" ;;
    *) die "状态文件中的架构无效: $ARCH" ;;
  esac
}

remote_commit_contains_release() {
  git merge-base --is-ancestor "$RELEASE_SHA" "origin/$DEFAULT_BRANCH" >/dev/null 2>&1
}

remote_tag_target() {
  local target
  target="$(git ls-remote --tags origin "refs/tags/v$VERSION^{}" 2>/dev/null | awk 'NR==1 {print $1}' || true)"
  if [ -z "$target" ]; then
    target="$(git ls-remote --tags origin "refs/tags/v$VERSION" 2>/dev/null | awk 'NR==1 {print $1}' || true)"
  fi
  printf '%s' "$target"
}

github_release_exists() {
  command -v gh >/dev/null 2>&1 \
    && gh release view "v$VERSION" --repo "$GITHUB_REPO_SLUG" >/dev/null 2>&1
}

docker_hub_login_available() {
  local config_file="${DOCKER_CONFIG:-$HOME/.docker}/config.json"
  [ -f "$config_file" ] || return 1
  DOCKER_CONFIG_FILE="$config_file" node --input-type=module <<'NODE'
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

try {
  const config = JSON.parse(readFileSync(process.env.DOCKER_CONFIG_FILE, 'utf8'));
  const dockerHub = /(^|\.)docker\.io$|index\.docker\.io|registry-1\.docker\.io/;
  const normalize = (key) => key.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  const servers = [...new Set([
    'https://index.docker.io/v1/',
    'index.docker.io',
    'registry-1.docker.io',
    ...Object.keys(config.auths || {}),
    ...Object.keys(config.credHelpers || {}),
  ].filter((key) => dockerHub.test(normalize(key))))];

  for (const server of servers) {
    const encoded = config.auths?.[server]?.auth;
    if (typeof encoded === 'string') {
      const decoded = Buffer.from(encoded, 'base64').toString('utf8');
      const separator = decoded.indexOf(':');
      if (separator > 0 && decoded.slice(separator + 1).length > 0) process.exit(0);
    }

    const helper = config.credHelpers?.[server] || config.credsStore;
    if (!helper) continue;
    for (const executable of [`docker-credential-${helper}`, `docker-credential-${helper}.exe`]) {
      try {
        const value = JSON.parse(execFileSync(executable, ['get'], {
          input: `${server}\n`,
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'ignore'],
        }));
        if (value?.Username && value?.Secret) process.exit(0);
      } catch {
        // 尝试下一个凭据助手名称。
      }
    }
  }
  process.exit(1);
} catch {
  process.exit(1);
}
NODE
}

require_github_auth() {
  [ "$GITHUB_RELEASE_MODE" = "on" ] || return 0
  command -v gh >/dev/null 2>&1 \
    || die "发布需要 GitHub CLI，请安装 gh 后运行 gh auth login"
  gh auth status >/dev/null 2>&1 \
    || die "GitHub CLI 尚未登录，请先执行 gh auth login"
  ok "GitHub CLI 已登录"
}

require_release_head() {
  local current_head
  current_head="$(git rev-parse HEAD)"
  [ "$current_head" = "$RELEASE_SHA" ] \
    || die "当前 HEAD 为 $current_head，与待续传的 release commit $RELEASE_SHA 不一致，请切回原发布提交后重试"
}

resume_release() {
  local tag_target local_target version_exists=0 latest_matches=1 tag_scope="all"
  [ -n "$RELEASE_SHA" ] || die "无法确定 release commit，请使用原发布工作区续传"
  PHASE="publish"
  PUBLISH_STARTED=1
  BUILD_DATE="$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
  write_release_state

  step "检查并续传 Docker 镜像"
  if docker_tag_exists "$IMAGE" "v$VERSION"; then
    version_exists=1
    docker_tag_matches_release "v$VERSION" \
      || die "Docker 版本镜像 revision 冲突：${IMAGE}:v${VERSION} 不属于 release commit $RELEASE_SHA"
  fi
  if [ "$DO_LATEST" = "1" ]; then
    if docker_tag_exists "$IMAGE" latest && docker_tag_matches_release latest; then
      latest_matches=1
    else
      latest_matches=0
    fi
  fi

  if [ "$version_exists" = "1" ] && [ "$latest_matches" = "1" ]; then
    DOCKER_PUBLISHED=1
    ok "Docker ${IMAGE}:v${VERSION}$([ "$DO_LATEST" = "1" ] && printf ' 与 latest') 已存在，跳过"
  else
    require_release_head
    if [ "$DRY_RUN" = "0" ] && is_docker_hub_repository "$IMAGE"; then
      docker_hub_login_available \
        || die "未检测到 Docker Hub 登录凭据，请先执行 docker login"
    fi
    if [ "$version_exists" = "1" ]; then
      tag_scope="latest"
    elif [ "$latest_matches" = "1" ]; then
      tag_scope="version"
    fi
    ensure_builder
    run_bake push "$tag_scope"
    if [ "$DRY_RUN" = "0" ]; then
      docker_tag_matches_release "v$VERSION" \
        || die "推送后校验失败：${IMAGE}:v${VERSION} 的 revision 与 $RELEASE_SHA 不一致"
      if [ "$DO_LATEST" = "1" ]; then
        docker_tag_matches_release latest \
          || die "推送后校验失败：${IMAGE}:latest 的 revision 与 $RELEASE_SHA 不一致"
      fi
    fi
    DOCKER_PUBLISHED=1
  fi
  write_release_state

  if [ "$DO_GIT_PUSH" = "1" ]; then
    step "检查并续传 release commit"
    if remote_commit_contains_release; then
      GIT_COMMIT_PUBLISHED=1
      ok "origin/$DEFAULT_BRANCH 已包含 $RELEASE_SHA，跳过"
    else
      require_release_head
      run git push origin "$RELEASE_SHA:$DEFAULT_BRANCH"
      GIT_COMMIT_PUBLISHED=1
    fi
    write_release_state
  fi

  if [ "$DO_GIT_TAG" = "1" ]; then
    step "检查并续传 Git Tag"
    tag_target="$(remote_tag_target)"
    if [ -n "$tag_target" ]; then
      [ "$tag_target" = "$RELEASE_SHA" ] \
        || die "远端 Tag v$VERSION 指向 $tag_target，与 release commit $RELEASE_SHA 冲突"
      GIT_TAG_PUBLISHED=1
      ok "远端 Tag v$VERSION 已存在且指向正确 commit，跳过"
    else
      if git rev-parse "v$VERSION" >/dev/null 2>&1; then
        local_target="$(git rev-list -n 1 "v$VERSION")"
        [ "$local_target" = "$RELEASE_SHA" ] \
          || die "本地 Tag v$VERSION 指向 $local_target，与 release commit $RELEASE_SHA 冲突"
      else
        run git tag -a "v$VERSION" "$RELEASE_SHA" -m "Release v$VERSION"
      fi
      [ "$DO_GIT_PUSH" = "1" ] && run git push origin "v$VERSION"
      GIT_TAG_PUBLISHED=1
    fi
    write_release_state
  fi

  if [ "$GITHUB_RELEASE_MODE" != "off" ] && [ "$DO_GIT_PUSH" = "1" ] && [ "$DO_GIT_TAG" = "1" ]; then
    step "检查并续传 GitHub Release"
    if github_release_exists; then
      GITHUB_RELEASE_PUBLISHED=1
      ok "GitHub Release v$VERSION 已存在，跳过"
    else
      create_github_release
      GITHUB_RELEASE_PUBLISHED=1
    fi
    write_release_state
  fi

  RELEASE_SUCCEEDED=1
  remove_release_state
  step "续传完成"
  ok "v$VERSION 的远端发布产物已补齐"
}

step "发布环境检查"
if [ "$QUICK_MODE" = "1" ]; then
  echo
  echo "${C_BOLD}${C_CYAN}╔══════════════════════════════════════╗${C_RESET}"
  echo "${C_BOLD}${C_CYAN}║       NOWEN Blog 快速发布向导        ║${C_RESET}"
  echo "${C_BOLD}${C_CYAN}╚══════════════════════════════════════╝${C_RESET}"
fi
require_command git
require_command node
require_command pnpm
require_command docker

if [ "$DRY_RUN" = "0" ]; then
  docker info >/dev/null 2>&1 || die "Docker daemon 未运行"
fi
docker buildx version >/dev/null 2>&1 || die "当前 Docker 不支持 buildx"
if [ "$DRY_RUN" = "0" ] && [ "$RESUME_MODE" = "0" ] && is_docker_hub_repository "$IMAGE"; then
  docker_hub_login_available \
    || die "未检测到 Docker Hub 登录凭据，请先执行 docker login"
  ok "已检测到结构有效的 Docker Hub 登录凭据"
fi
require_github_auth
[ -f package.json ] || die "请在 nowen-blog 仓库中运行脚本"
[ -f docker-bake.hcl ] || die "缺少 docker-bake.hcl"
if [ -n "$RELEASE_NOTES_FILE" ]; then
  [ -f "$RELEASE_NOTES_FILE" ] || die "Release notes 文件不存在: $RELEASE_NOTES_FILE"
  RELEASE_NOTES="$(<"$RELEASE_NOTES_FILE")"
  RELEASE_NOTES_FILE=""
fi

CURRENT_BRANCH="$(git branch --show-current)"
[ "$CURRENT_BRANCH" = "$DEFAULT_BRANCH" ] || die "请切换到 $DEFAULT_BRANCH 分支后发布，当前为 ${CURRENT_BRANCH:-detached}"
ORIGIN_URL="$(git remote get-url origin 2>/dev/null || true)"
case "$ORIGIN_URL" in
  git@github.com:cropflre/nowen-blog.git|https://github.com/cropflre/nowen-blog|https://github.com/cropflre/nowen-blog.git|ssh://git@github.com/cropflre/nowen-blog.git) ;;
  *) die "origin 不是官方仓库 cropflre/nowen-blog：${ORIGIN_URL:-未配置}" ;;
esac

if [ -n "$(git status --porcelain)" ]; then
  die "工作区或暂存区不干净，请先提交或清理改动"
fi

run git fetch --tags origin

if [ "$DO_GIT_PUSH" = "1" ]; then
  step "检查 GitHub 推送权限"
  if [ "$DRY_RUN" = "0" ]; then
    git push --dry-run origin "HEAD:$DEFAULT_BRANCH" >/dev/null \
      || die "无法推送到 GitHub。请修复 origin 凭据或改用 SSH 后再发版"
    ok "GitHub 推送权限正常"
  else
    print_command git push --dry-run origin "HEAD:$DEFAULT_BRANCH"
  fi
fi

if [ "$RESUME_MODE" = "1" ]; then
  load_release_state
  require_github_auth
fi

SUGGESTED_VERSION="$(suggest_next_version)"
if [ -z "$VERSION" ]; then
  if [ "$ASSUME_YES" = "1" ] || [ "$QUICK_MODE" = "1" ]; then
    VERSION="$SUGGESTED_VERSION"
  else
    echo
    read -r -p "发布版本 [${SUGGESTED_VERSION}]: " VERSION
    VERSION="${VERSION:-$SUGGESTED_VERSION}"
  fi
fi
VERSION="$(normalize_version "$VERSION")"
validate_version "$VERSION" || die "版本号格式错误: $VERSION（示例 1.0.5 或 1.0.5-rc.1）"

if [[ "$VERSION" == *-* ]]; then
  RELEASE_PRERELEASE=1
  if [ "$LATEST_EXPLICIT" = "0" ]; then
    DO_LATEST=0
  fi
fi

if [ "$RESUME_MODE" = "1" ]; then
  resume_release
  exit 0
fi

if git rev-parse "v$VERSION" >/dev/null 2>&1 || remote_tag_exists "$VERSION"; then
  die "Git Tag v$VERSION 已存在，请使用更高版本"
fi
if docker_tag_exists "$IMAGE" "v$VERSION"; then
  die "Docker Hub 已存在 ${IMAGE}:v${VERSION}，请使用更高版本"
fi

step "发布计划"
echo "版本:          v$VERSION"
echo "架构:          $ARCH ($PLATFORMS)"
echo "Docker 镜像:   ${IMAGE}:v${VERSION}"
echo "更新 latest:   $([ "$DO_LATEST" = "1" ] && echo 是 || echo 否)"
echo "推送源码:      $([ "$DO_GIT_PUSH" = "1" ] && echo 是 || echo 否)"
echo "创建 Git Tag:  $([ "$DO_GIT_TAG" = "1" ] && echo 是 || echo 否)"
echo "GitHub Release: $GITHUB_RELEASE_MODE"

if [ "$ASSUME_YES" = "0" ] && [ "$DRY_RUN" = "0" ]; then
  echo
  if [ "$QUICK_MODE" = "1" ]; then
    read -r -p "确认开始发布？[Y/n] " confirm
    [[ -z "$confirm" || "$confirm" =~ ^[Yy]$ ]] || die "已取消"
  else
    read -r -p "确认开始发布？[y/N] " confirm
    [[ "$confirm" =~ ^[Yy]$ ]] || die "已取消"
  fi
fi

PHASE="prepare"
if [ "$DO_PULL" = "1" ]; then
  step "同步发布分支"
  run git pull --ff-only origin "$DEFAULT_BRANCH"
fi
ORIGINAL_HEAD="$(git rev-parse HEAD)"
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
    LOCAL_RELEASE_CREATED=1
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
write_release_state

ensure_builder

PHASE="build"
step "预构建单体镜像（不推送）"
info "先验证前端、API、Nginx 和运行时能够在同一镜像完整构建"
run_bake build

PHASE="publish"
PUBLISH_STARTED=1
write_release_state
step "推送 Docker 镜像"
run_bake push
DOCKER_PUBLISHED=1
write_release_state

if [ "$DRY_RUN" = "0" ]; then
  docker_tag_matches_release "v$VERSION" \
    || die "推送后校验失败：${IMAGE}:v${VERSION} 的 revision 与 $RELEASE_SHA 不一致"
  if [ "$DO_LATEST" = "1" ]; then
    docker_tag_matches_release latest \
      || die "推送后校验失败：${IMAGE}:latest 的 revision 与 $RELEASE_SHA 不一致"
  fi
fi
ok "Docker 镜像已发布"

if [ "$DO_GIT_PUSH" = "1" ]; then
  step "推送发布提交"
  run git push origin "HEAD:$DEFAULT_BRANCH"
  GIT_COMMIT_PUBLISHED=1
  write_release_state
fi

if [ "$DO_GIT_TAG" = "1" ]; then
  step "创建 Git Tag"
  run git tag -a "v$VERSION" -m "Release v$VERSION"
  if [ "$DO_GIT_PUSH" = "1" ]; then
    run git push origin "v$VERSION"
    GIT_TAG_PUBLISHED=1
    write_release_state
  fi
fi

if [ "$DO_GIT_PUSH" = "0" ] || [ "$DO_GIT_TAG" = "0" ]; then
  if [ "$GITHUB_RELEASE_MODE" != "off" ]; then
    warn "Git Tag 未推送，跳过 GitHub Release"
  fi
else
  step "创建 GitHub Release"
  create_github_release
  GITHUB_RELEASE_PUBLISHED=1
  write_release_state
fi

RELEASE_SUCCEEDED=1
remove_release_state
step "发布完成"
echo "${C_GREEN}Docker:${C_RESET} ${IMAGE}:v${VERSION}"
[ "$DO_LATEST" = "1" ] && echo "${C_GREEN}latest:${C_RESET} 已同步更新"
echo
echo "固定版本部署："
echo "  NOWEN_BLOG_VERSION=v${VERSION} docker compose -f docker-compose.release.yml pull"
echo "  NOWEN_BLOG_VERSION=v${VERSION} docker compose -f docker-compose.release.yml up -d"
echo
echo "跟随最新版部署："
echo "  docker compose -f docker-compose.release.yml pull"
echo "  docker compose -f docker-compose.release.yml up -d"
