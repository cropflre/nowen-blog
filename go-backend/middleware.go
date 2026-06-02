package main

import (
	"strings"

	"github.com/gofiber/fiber/v2"
)

// JWTMiddleware JWT 认证中间件
func JWTMiddleware(c *fiber.Ctx) error {
	authHeader := c.Get("Authorization")
	if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
		return c.Status(401).JSON(fiber.Map{"error": "Authorization header required"})
	}

	tokenString := strings.TrimPrefix(authHeader, "Bearer ")

	claims, err := ValidateToken(tokenString)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"error": "Invalid or expired token"})
	}

	// 将用户信息存入 Locals
	c.Locals("userID", claims.UserID)
	c.Locals("username", claims.Username)
	c.Locals("role", claims.Role)

	return c.Next()
}