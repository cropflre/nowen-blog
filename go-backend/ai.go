package main

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
)

// AIAction AI 动作类型
type AIAction string

const (
	ActionContinue    AIAction = "continue"
	ActionRewrite     AIAction = "rewrite"
	ActionPolish      AIAction = "polish"
	ActionShorten     AIAction = "shorten"
	ActionExpand      AIAction = "expand"
	ActionTranslateEn AIAction = "translate_en"
	ActionTranslateZh AIAction = "translate_zh"
	ActionSummarize   AIAction = "summarize"
	ActionExplain     AIAction = "explain"
	ActionFixGrammar  AIAction = "fix_grammar"
	ActionFormatMD    AIAction = "format_markdown"
	ActionFormatCode  AIAction = "format_code"
	ActionCustom      AIAction = "custom"
)

// ACTION_PROMPTS 动作对应的提示词
var ACTION_PROMPTS = map[AIAction]string{
	ActionContinue:    "请根据上下文，自然流畅地续写以下内容。不要重复已有内容，直接输出续写部分。",
	ActionRewrite:     "请用不同的表达方式改写以下内容，保持原意不变。",
	ActionPolish:      "请对以下内容进行润色，使其更加专业流畅，保持原意。",
	ActionShorten:     "请将以下内容精简压缩，保留核心要点，去除冗余。",
	ActionExpand:      "请对以下内容进行扩展，增加更多细节和解释，使其更充实。",
	ActionTranslateEn: "请将以下内容翻译为英文，保持原意和风格：",
	ActionTranslateZh: "请将以下内容翻译为中文，保持原意和风格：",
	ActionSummarize:   "请为以下内容生成一个简洁的摘要（200字以内）。",
	ActionExplain:     "请用通俗易懂的语言解释以下内容。",
	ActionFixGrammar:  "请修正以下内容中的语法和拼写错误，只返回修正后的文本。",
	ActionFormatMD:    "请将以下内容按照规范的 Markdown 格式重新排版，合理使用标题、列表、代码块、表格、加粗、引用等格式元素，保持原意不变，使内容结构更清晰。",
	ActionFormatCode:  "请识别以下内容中的代码部分，用正确的编程语言标记包裹在代码块中（如 ```python），保持代码缩进和格式正确。如果内容本身就是纯代码，直接用代码块包裹并标注语言。",
	ActionCustom:      "",
}

// AIChatRequest AI 聊天请求
type AIChatRequest struct {
	Action       AIAction `json:"action"`
	Text         string   `json:"text"`
	Context      string   `json:"context,omitempty"`
	CustomPrompt string   `json:"customPrompt,omitempty"`
}

// OpenAIRequest OpenAI API 请求格式
type OpenAIRequest struct {
	Model    string          `json:"model"`
	Messages []OpenAIMessage `json:"messages"`
	Stream   bool            `json:"stream"`
}

// OpenAIMessage OpenAI 消息格式
type OpenAIMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// OpenAIResponse OpenAI API 响应格式
type OpenAIResponse struct {
	Choices []struct {
		Delta struct {
			Content string `json:"content"`
		} `json:"delta"`
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
}

// getAISettings 获取 AI 设置
func getAISettings() map[string]string {
	settings := make(map[string]string)
	var ais []AISetting
	DB.Find(&ais)
	for _, s := range ais {
		settings[s.Key] = s.Value
	}
	return settings
}

// GetAISettings 获取 AI 设置 API
func GetAISettings(c *fiber.Ctx) error {
	settings := getAISettings()

	// 隐藏完整的 API Key
	apiKey := settings["ai_api_key"]
	maskedKey := ""
	if len(apiKey) > 4 {
		maskedKey = "sk-****" + apiKey[len(apiKey)-4:]
	}

	return c.JSON(fiber.Map{
		"ai_api_url":     settings["ai_api_url"],
		"ai_api_key":     maskedKey,
		"ai_api_key_set": apiKey != "",
		"ai_model":       settings["ai_model"],
	})
}

// UpdateAISettings 更新 AI 设置 API
func UpdateAISettings(c *fiber.Ctx) error {
	var input struct {
		AIURL   string `json:"ai_api_url"`
		AIKey   string `json:"ai_api_key"`
		AIModel string `json:"ai_model"`
	}

	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	settings := map[string]string{
		"ai_api_url": input.AIURL,
		"ai_api_key": input.AIKey,
		"ai_model":   input.AIModel,
	}

	for key, value := range settings {
		var setting AISetting
		result := DB.Where("key = ?", key).First(&setting)
		if result.Error != nil {
			// 不存在则创建
			DB.Create(&AISetting{
				Key:       key,
				Value:     value,
				UpdatedAt: time.Now(),
			})
		} else {
			// 存在则更新
			setting.Value = value
			setting.UpdatedAt = time.Now()
			DB.Save(&setting)
		}
	}

	return c.JSON(fiber.Map{"success": true, "message": "AI settings updated"})
}

// TestAIConnection 测试 AI 连接
func TestAIConnection(c *fiber.Ctx) error {
	settings := getAISettings()
	apiURL := settings["ai_api_url"]
	apiKey := settings["ai_api_key"]
	model := settings["ai_model"]

	if apiURL == "" {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "API URL not configured"})
	}

	// 构建测试请求
	reqBody := OpenAIRequest{
		Model: model,
		Messages: []OpenAIMessage{
			{Role: "user", Content: "Hello, this is a test message. Please respond with OK."},
		},
		Stream: false,
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Failed to create request"})
	}

	// 发送请求
	client := &http.Client{Timeout: 30 * time.Second}
	req, err := http.NewRequest("POST", strings.TrimRight(apiURL, "/")+"/chat/completions", bytes.NewBuffer(jsonData))
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Failed to create request"})
	}

	req.Header.Set("Content-Type", "application/json")
	if apiKey != "" {
		req.Header.Set("Authorization", "Bearer "+apiKey)
	}

	resp, err := client.Do(req)
	if err != nil {
		return c.JSON(fiber.Map{"success": false, "message": "Connection failed: " + err.Error()})
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return c.JSON(fiber.Map{
			"success": false,
			"message": fmt.Sprintf("API returned status %d: %s", resp.StatusCode, string(body)),
		})
	}

	return c.JSON(fiber.Map{"success": true, "message": "Connection successful"})
}

// AIChatSSE AI 写作助手 (SSE 流式)
func AIChatSSE(c *fiber.Ctx) error {
	var req AIChatRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if req.Text == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Text is required"})
	}

	settings := getAISettings()
	apiURL := settings["ai_api_url"]
	apiKey := settings["ai_api_key"]
	model := settings["ai_model"]

	if apiURL == "" {
		return c.Status(400).JSON(fiber.Map{"error": "AI not configured"})
	}

	// 构建提示词
	systemPrompt := ACTION_PROMPTS[req.Action]
	if req.Action == ActionCustom {
		if req.CustomPrompt == "" {
			return c.Status(400).JSON(fiber.Map{"error": "Custom prompt is required"})
		}
		systemPrompt = req.CustomPrompt
	}

	// 构建用户消息
	userMessage := req.Text
	if req.Context != "" {
		contextLimit := len(req.Context)
		if contextLimit > 2000 {
			contextLimit = 2000
		}
		userMessage = "上下文:\n" + req.Context[:contextLimit] + "\n\n需要处理的内容:\n" + req.Text
	}

	// 构建 OpenAI 请求
	reqBody := OpenAIRequest{
		Model: model,
		Messages: []OpenAIMessage{
			{Role: "system", Content: systemPrompt},
			{Role: "user", Content: userMessage},
		},
		Stream: true,
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to create request"})
	}

	// 发送请求
	client := &http.Client{Timeout: 60 * time.Second}
	httpReq, err := http.NewRequest("POST", strings.TrimRight(apiURL, "/")+"/chat/completions", bytes.NewBuffer(jsonData))
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to create request"})
	}

	httpReq.Header.Set("Content-Type", "application/json")
	if apiKey != "" {
		httpReq.Header.Set("Authorization", "Bearer "+apiKey)
	}

	resp, err := client.Do(httpReq)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Request failed: " + err.Error()})
	}

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		resp.Body.Close()
		return c.Status(resp.StatusCode).JSON(fiber.Map{
			"error": fmt.Sprintf("API returned status %d: %s", resp.StatusCode, string(body)),
		})
	}

	// 设置 SSE 响应头
	c.Set("Content-Type", "text/event-stream")
	c.Set("Cache-Control", "no-cache")
	c.Set("Connection", "keep-alive")
	c.Set("Access-Control-Allow-Origin", "*")

	// 流式读取响应
	c.Context().SetBodyStreamWriter(func(w *bufio.Writer) {
		defer resp.Body.Close()

		scanner := bufio.NewScanner(resp.Body)
		for scanner.Scan() {
			line := scanner.Text()
			if line == "" {
				continue
			}

			if !strings.HasPrefix(line, "data: ") {
				continue
			}

			data := strings.TrimPrefix(line, "data: ")
			if data == "[DONE]" {
				fmt.Fprintf(w, "data: [DONE]\n\n")
				w.Flush()
				return
			}

			var openaiResp OpenAIResponse
			if err := json.Unmarshal([]byte(data), &openaiResp); err != nil {
				continue
			}

			if len(openaiResp.Choices) > 0 {
				content := openaiResp.Choices[0].Delta.Content
				if content != "" {
					sseData, _ := json.Marshal(map[string]string{"content": content})
					fmt.Fprintf(w, "data: %s\n\n", sseData)
					w.Flush()
				}
			}
		}
	})

	return nil
}
