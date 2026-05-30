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

// CORSMiddleware CORS 中间件
func CORSMiddleware(c *fiber.Ctx) error {
	c.Set("Access-Control-Allow-Origin", "*")
	c.Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
	c.Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
	c.Set("Access-Control-Max-Age", "86400")

	if c.Method() == "OPTIONS" {
		return c.SendStatus(200)
	}

	return c.Next()
}
