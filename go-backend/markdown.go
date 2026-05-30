package main

import (
	"bytes"

	"github.com/yuin/goldmark"
	"github.com/yuin/goldmark/extension"
	"github.com/yuin/goldmark/parser"
	"github.com/yuin/goldmark/renderer/html"

	chromahtml "github.com/alecthomas/chroma/v2/formatters/html"
	highlighting "github.com/yuin/goldmark-highlighting/v2"
)

// mdRenderer 全局复用的 goldmark 实例（GFM + 自动标题锚点 + 代码高亮 monokai 主题）
var mdRenderer = goldmark.New(
	goldmark.WithExtensions(
		extension.GFM,
		extension.Table,
		extension.TaskList,
		extension.Strikethrough,
		extension.Linkify,
		highlighting.NewHighlighting(
			highlighting.WithStyle("monokai"),
			highlighting.WithFormatOptions(
				chromahtml.WithLineNumbers(true),
			),
		),
	),
	goldmark.WithParserOptions(
		parser.WithAutoHeadingID(),
	),
	goldmark.WithRendererOptions(
		html.WithUnsafe(),
	),
)

// RenderMarkdown 将 Markdown 源码编译为 HTML 字符串
func RenderMarkdown(source string) (string, error) {
	var buf bytes.Buffer
	if err := mdRenderer.Convert([]byte(source), &buf); err != nil {
		return "", err
	}
	return buf.String(), nil
}
