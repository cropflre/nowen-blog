variable "APP_VERSION" {
  default = "dev"
}

variable "VCS_REF" {
  default = "unknown"
}

variable "BUILD_DATE" {
  default = "unknown"
}

variable "PLATFORM" {
  default = "linux/amd64"
}

variable "IMAGE_TAGS" {
  default = "nowen-blog:local"
}

group "release" {
  targets = ["app"]
}

target "app" {
  context    = "."
  dockerfile = "Dockerfile"
  target     = "app"
  platforms  = split(",", PLATFORM)
  tags       = split(",", IMAGE_TAGS)
  args = {
    APP_VERSION = APP_VERSION
    VCS_REF     = VCS_REF
    BUILD_DATE  = BUILD_DATE
  }
}
