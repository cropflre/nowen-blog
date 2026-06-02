#!/usr/bin/env bash
# =============================================================================
# nowen-blog Docker 一键发布脚本
# =============================================================================

set -euo pipefail

# -------------------- 自动定位项目根目录 --------------------
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

DEFAULT_IMAGE_NAME="cropflre/nowen-blog"
DEFAULT_BRANCH="main"

# -------------------- 彩色输出 --------------------
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

# -------------------- 参数解析 --------------------
VERSION=""
ASSUME_YES=0
DO_PUSH=1
DO_LATEST=1
DRY_RUN=0
IMAGE_NAME="$DEFAULT_IMAGE_NAME"
ARCH=""  # amd64 | arm64 | all

while [ $# -gt 0 ]; do
    case "$1" in
        -v|--version)   VERSION="$2"; shift 2 ;;
        -y|--yes)       ASSUME_YES=1; shift ;;
        --no-push)      DO_PUSH=0; shift ;;
        --no-latest)    DO_LATEST=0; shift ;;
        --dry-run)      DRY_RUN=1; shift ;;
        --image)        IMAGE_NAME="$2"; shift 2 ;;
        -h|--help)
            echo "用法: $0 [-v 版本号] [-y] [--arch 架构] [--no-push] [--no-latest] [--dry-run] [--image 镜像名]"
            echo ""
            echo "选项："
            echo "  -v, --version VERSION    指定版本号（如 1.0.0）"
            echo "  -y, --yes                跳过确认提示"
            echo "  --arch ARCH              架构：amd64 | arm64 | all（默认交互选择）"
            echo "  --no-push                只构建，不推送到 Docker Hub"
            echo "  --no-latest              不更新 latest 标签"
            echo "  --dry-run                只打印命令，不执行"
            echo "  --image IMAGE            自定义镜像名（默认 $DEFAULT_IMAGE_NAME）"
            exit 0
            ;;
        *) die "未知参数: $1（使用 -h 查看帮助）" ;;
    esac
done

# -------------------- 前置检查 --------------------
step "前置检查"

command -v docker >/dev/null 2>&1 || die "未找到 docker，请先安装 Docker"
docker info >/dev/null 2>&1 || die "Docker 服务未启动，请先启动 Docker"
[ -f "Dockerfile" ] || die "未找到 Dockerfile，请确认项目结构正确"

ok "Docker 已就绪"
info "项目目录: $PROJECT_ROOT"

# -------------------- 版本号 --------------------
step "版本号"

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
        VERSION="$SUGGESTED"
        info "自动使用建议版本: ${VERSION}"
    else
        VERSION="1.0.0"
        info "首次发布，使用默认版本: ${VERSION}"
    fi
fi

[[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.]+)?$ ]] || die "版本号格式无效: $VERSION（期望 X.Y.Z）"
VERSION_TAG="v${VERSION}"
info "版本号: $VERSION_TAG"

# -------------------- 架构选择 --------------------
step "架构选择"

if [ -z "$ARCH" ]; then
    echo ""
    echo "  请选择目标架构："
    echo "    ${C_BOLD}1)${C_RESET} amd64   - x86_64 服务器/NAS"
    echo "    ${C_BOLD}2)${C_RESET} arm64   - ARM64 开发板（树莓派等）"
    echo "    ${C_BOLD}3)${C_RESET} all     - 同时发布 amd64 + arm64"
    echo ""
    read -rp "请输入选项 [1/2/3]: " ARCH_CHOICE
    case "$ARCH_CHOICE" in
        1) ARCH="amd64" ;;
        2) ARCH="arm64" ;;
        3) ARCH="all" ;;
        *) die "无效选项: $ARCH_CHOICE" ;;
    esac
fi

case "$ARCH" in
    amd64|arm64|all) ;;
    *) die "无效架构: $ARCH（可选: amd64, arm64, all）" ;;
esac

info "目标架构: $ARCH"

# -------------------- 确认 --------------------
if [ "$ASSUME_YES" -eq 0 ] && [ "$DRY_RUN" -eq 0 ]; then
    echo ""
    echo "  镜像:   ${C_BOLD}${IMAGE_NAME}${C_RESET}"
    echo "  版本:   ${C_BOLD}${VERSION_TAG}${C_RESET}"
    echo "  架构:   ${C_BOLD}${ARCH}${C_RESET}"
    if [ "$DO_LATEST" -eq 1 ]; then
        echo "  标签:   ${VERSION_TAG} + latest"
    fi
    if [ "$DO_PUSH" -eq 1 ]; then
        echo "  推送:   是 → Docker Hub"
    else
        echo "  推送:   否"
    fi
    echo ""
    read -rp "确认发布？(y/N) " C
    [[ "$C" =~ ^[Yy]$ ]] || die "已取消"
fi

# -------------------- Git 检查 --------------------
if command -v git >/dev/null 2>&1 && git rev-parse --git-dir >/dev/null 2>&1; then
    step "Git 状态检查"

    if [ -n "$(git status --porcelain)" ]; then
        warn "工作区有未提交的更改："
        git status --short
        echo ""
        if [ "$ASSUME_YES" -eq 0 ]; then
            read -rp "是否继续？(y/N) " C
            [[ "$C" =~ ^[Yy]$ ]] || die "已取消，请先提交更改"
        else
            warn "自动继续（-y 模式）"
        fi
    else
        ok "工作区干净"
    fi
fi

# -------------------- 构建函数 --------------------
build_and_push() {
    local arch="$1"
    local tag_suffix=""
    local platform=""

    if [ "$arch" = "arm64" ]; then
        tag_suffix="-arm64"
        platform="linux/arm64"
    elif [ "$arch" = "amd64" ]; then
        tag_suffix=""  # amd64 是默认，不加后缀
        platform="linux/amd64"
    fi

    local version_tag="${IMAGE_NAME}:${VERSION_TAG}${tag_suffix}"
    local latest_tag="${IMAGE_NAME}:latest${tag_suffix}"

    step "构建 ${arch} 镜像"

    if [ "$arch" = "arm64" ]; then
        # ARM64 需要使用 buildx
        info "检查 buildx 支持..."
        if ! docker buildx version >/dev/null 2>&1; then
            die "未找到 docker buildx，请安装 Docker Desktop 或启用 buildx 插件"
        fi

        # 创建/使用 builder
        local builder_name="nowen-builder"
        if ! docker buildx inspect "$builder_name" >/dev/null 2>&1; then
            info "创建 buildx builder: $builder_name"
            docker buildx create --name "$builder_name" --use
        else
            docker buildx use "$builder_name"
        fi

        BUILD_CMD="docker buildx build --platform ${platform} -t ${version_tag}"
        [ "$DO_LATEST" -eq 1 ] && BUILD_CMD="${BUILD_CMD} -t ${latest_tag}"

        if [ "$DO_PUSH" -eq 1 ]; then
            BUILD_CMD="${BUILD_CMD} --push"
        else
            BUILD_CMD="${BUILD_CMD} --load"
        fi
        BUILD_CMD="${BUILD_CMD} ."
    else
        # AMD64 使用普通 build
        BUILD_CMD="docker build --platform ${platform} -t ${version_tag}"
        [ "$DO_LATEST" -eq 1 ] && BUILD_CMD="${BUILD_CMD} -t ${latest_tag}"
        BUILD_CMD="${BUILD_CMD} ."
    fi

    if [ "$DRY_RUN" -eq 1 ]; then
        echo "  (dry-run) ${BUILD_CMD}"
    else
        info "开始构建 ${arch}...（可能需要几分钟）"
        eval "$BUILD_CMD"
        ok "${arch} 构建完成"
    fi

    # 推送（非 buildx 模式需要手动推送）
    if [ "$DO_PUSH" -eq 1 ] && [ "$arch" != "arm64" ]; then
        info "推送 ${version_tag}..."
        docker push "${version_tag}"
        if [ "$DO_LATEST" -eq 1 ]; then
            docker push "${latest_tag}"
        fi
        ok "${arch} 推送完成"
    fi
}

# -------------------- 开始构建 --------------------
BUILD_START=$(date +%s)

if [ "$ARCH" = "all" ]; then
    build_and_push "amd64"
    build_and_push "arm64"
else
    build_and_push "$ARCH"
fi

BUILD_END=$(date +%s)
BUILD_DURATION=$((BUILD_END - BUILD_START))

# -------------------- Git Tag --------------------
if command -v git >/dev/null 2>&1 && git rev-parse --git-dir >/dev/null 2>&1; then
    step "Git Tag"

    if git tag -l "$VERSION_TAG" | grep -q "$VERSION_TAG"; then
        warn "Git tag ${VERSION_TAG} 已存在，跳过"
    else
        if [ "$DRY_RUN" -eq 1 ]; then
            echo "  (dry-run) git tag -a ${VERSION_TAG} -m 'Release ${VERSION_TAG}'"
        else
            git tag -a "$VERSION_TAG" -m "Release ${VERSION_TAG}"
            ok "已创建 Git tag: ${VERSION_TAG}"

            info "推送 Git tag..."
            if git push origin "$VERSION_TAG" 2>/dev/null; then
                ok "Git tag 已推送"
            else
                warn "Git tag 推送失败"
            fi
        fi
    fi
fi

# -------------------- 完成 --------------------
step "发布完成"

echo ""
echo "  ${C_GREEN}镜像${C_RESET}:     ${IMAGE_NAME}:${VERSION_TAG}"
if [ "$DO_LATEST" -eq 1 ]; then
    echo "  ${C_GREEN}最新${C_RESET}:     ${IMAGE_NAME}:latest"
fi
echo "  ${C_GREEN}架构${C_RESET}:     ${ARCH}"
echo "  ${C_GREEN}耗时${C_RESET}:     ${BUILD_DURATION}秒"
echo ""

echo "拉取命令："
if [ "$ARCH" = "all" ] || [ "$ARCH" = "amd64" ]; then
    printf "    docker pull %s:%s\n" "$IMAGE_NAME" "$VERSION_TAG"
fi
if [ "$ARCH" = "all" ] || [ "$ARCH" = "arm64" ]; then
    printf "    docker pull %s:%s-arm64\n" "$IMAGE_NAME" "$VERSION_TAG"
fi

echo ""
echo "运行命令："
printf "    docker run -d -p 8080:80 --name nowen-blog %s:%s\n" "$IMAGE_NAME" "$VERSION_TAG"

echo ""
ok "发布成功 🎉"
