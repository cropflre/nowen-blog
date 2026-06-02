package main

import (
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

// Image 图片模型
type Image struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Filename  string    `gorm:"size:255;not null" json:"filename"`
	Original  string    `gorm:"size:255;not null" json:"original_name"`
	Path      string    `gorm:"size:500;not null" json:"path"`
	URL       string    `gorm:"size:500;not null" json:"url"`
	Size      int64     `gorm:"not null" json:"size"`
	MimeType  string    `gorm:"size:100;not null" json:"mime_type"`
	CreatedAt time.Time `json:"created_at"`
}

// 上传目录
var uploadDir string

func init() {
	uploadDir = os.Getenv("UPLOAD_DIR")
	if uploadDir == "" {
		uploadDir = "/app/uploads"
	}
	if err := os.MkdirAll(uploadDir, os.ModePerm); err != nil {
		panic("Failed to create upload directory: " + err.Error())
	}
}

// UploadImage 处理图片上传
func UploadImage(c *fiber.Ctx) error {
	// 获取上传的文件
	file, err := c.FormFile("image")
	if err != nil {
		return c.Status(400).JSON(fiber.Map{
			"status":  "error",
			"message": "No image file provided",
		})
	}

	// 验证文件类型
	allowedTypes := map[string]bool{
		".jpg":  true,
		".jpeg": true,
		".png":  true,
		".gif":  true,
		".webp": true,
		".svg":  true,
	}

	ext := filepath.Ext(file.Filename)
	if !allowedTypes[ext] {
		return c.Status(400).JSON(fiber.Map{
			"status":  "error",
			"message": "Invalid file type. Allowed: jpg, jpeg, png, gif, webp, svg",
		})
	}

	// 验证文件大小（最大 10MB）
	if file.Size > 10*1024*1024 {
		return c.Status(400).JSON(fiber.Map{
			"status":  "error",
			"message": "File too large. Maximum size is 10MB",
		})
	}

	// 生成唯一文件名
	newFilename := fmt.Sprintf("%s%s", uuid.New().String(), ext)
	
	// 按日期创建子目录
	dateDir := time.Now().Format("2006/01/02")
	uploadPath := filepath.Join(uploadDir, dateDir)
	if err := os.MkdirAll(uploadPath, os.ModePerm); err != nil {
		return c.Status(500).JSON(fiber.Map{
			"status":  "error",
			"message": "Failed to create upload directory",
		})
	}

	// 保存文件
	fullPath := filepath.Join(uploadPath, newFilename)
	if err := c.SaveFile(file, fullPath); err != nil {
		return c.Status(500).JSON(fiber.Map{
			"status":  "error",
			"message": "Failed to save file",
		})
	}

	// 构建访问 URL
	baseURL := c.BaseURL()
	imageURL := fmt.Sprintf("%s/uploads/%s/%s", baseURL, dateDir, newFilename)

	// 保存到数据库
	image := Image{
		Filename: newFilename,
		Original: file.Filename,
		Path:     fullPath,
		URL:      imageURL,
		Size:     file.Size,
		MimeType: file.Header.Get("Content-Type"),
	}

	if err := DB.Create(&image).Error; err != nil {
		// 如果数据库保存失败，删除已上传的文件
		os.Remove(fullPath)
		return c.Status(500).JSON(fiber.Map{
			"status":  "error",
			"message": "Failed to save image record",
		})
	}

	return c.Status(201).JSON(fiber.Map{
		"status": "success",
		"data": fiber.Map{
			"id":        image.ID,
			"url":       imageURL,
			"filename":  newFilename,
			"original":  file.Filename,
			"size":      file.Size,
			"mime_type": image.MimeType,
		},
		"markdown": fmt.Sprintf("![%s](%s)", file.Filename, imageURL),
	})
}

// GetImages 获取图片列表
func GetImages(c *fiber.Ctx) error {
	page := c.QueryInt("page", 1)
	pageSize := c.QueryInt("pageSize", 20)

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	var total int64
	DB.Model(&Image{}).Count(&total)

	var images []Image
	offset := (page - 1) * pageSize
	DB.Order("created_at DESC").Offset(offset).Limit(pageSize).Find(&images)

	return c.JSON(fiber.Map{
		"status": "success",
		"data":   images,
		"total":  total,
		"page":   page,
		"pageSize": pageSize,
	})
}

// DeleteImage 删除图片
func DeleteImage(c *fiber.Ctx) error {
	id := c.Params("id")

	var image Image
	if err := DB.First(&image, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{
			"status":  "error",
			"message": "Image not found",
		})
	}

	// 删除文件
	if err := os.Remove(image.Path); err != nil && !os.IsNotExist(err) {
		return c.Status(500).JSON(fiber.Map{
			"status":  "error",
			"message": "Failed to delete file",
		})
	}

	// 删除数据库记录
	DB.Delete(&image)

	return c.JSON(fiber.Map{
		"status":  "success",
		"message": "Image deleted",
	})
}