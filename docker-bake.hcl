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

variable "API_TAGS" {
  default = "nowen-blog-api:local"
}

variable "WEB_TAGS" {
  default = "nowen-blog-web:local"
}

group "release" {
  targets = ["api", "web"]
}

target "common" {
  context    = "."
  dockerfile = "Dockerfile"
  platforms  = split(",", PLATFORM)
  args = {
    APP_VERSION = APP_VERSION
    VCS_REF     = VCS_REF
    BUILD_DATE  = BUILD_DATE
  }
}

target "api" {
  inherits = ["common"]
  target   = "api"
  tags     = split(",", API_TAGS)
}

target "web" {
  inherits = ["common"]
  target   = "web"
  tags     = split(",", WEB_TAGS)
}
