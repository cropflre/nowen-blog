import { expect, test } from '@playwright/test';

test.describe('NOWEN Blog smoke flows', () => {
  test('loads the NOWEN help center portal, seeded content and newsletter signup', async ({ page }) => {
    await page.goto('/');

    const articleTitle = 'React + Node + SQLite 博客系统完整架构设计';
    await expect(page.getByText(articleTitle, { exact: true }).first()).toBeVisible();
    await expect(page.getByRole('heading', { name: /找到项目.*直接解决问题/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /打开帮助中心/ })).toHaveAttribute('href', '/docs');
    await expect(page.getByRole('heading', { name: '选择项目，直接解决问题' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '开发日志与技术文章' })).toBeVisible();

    const email = `e2e-${Date.now()}@example.com`;
    await page.getByPlaceholder('you@example.com').fill(email);
    await page.getByRole('button', { name: '立即订阅' }).click();
    await expect(page.getByText(/订阅成功/)).toBeVisible();

    await page.goto('/search?q=SQLite');
    await expect(page.getByRole('heading', { name: '搜索文章' })).toBeVisible();
    await expect(page.getByText(/找到\s*\d+\s*篇/)).toBeVisible();
    await expect(page.locator('mark').first()).toBeVisible();
  });

  test('keeps the NOWEN help center portal usable on a mobile viewport in both themes', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(() => localStorage.setItem('theme', 'light'));
    await page.goto('/');

    await expect(page.getByRole('heading', { name: /找到项目.*直接解决问题/ })).toBeVisible();
    await expect(page.locator('html')).not.toHaveClass(/dark/);

    const helpCenterButton = page.getByRole('link', { name: /打开帮助中心/ }).first();
    const buttonBox = await helpCenterButton.boundingBox();
    expect(buttonBox?.height ?? 0).toBeGreaterThanOrEqual(44);

    const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    expect(hasHorizontalOverflow).toBe(false);

    await page.getByRole('button', { name: '打开导航' }).click();
    await page.getByRole('button', { name: '切换主题' }).click();
    await expect(page.locator('html')).toHaveClass(/dark/);
  });

  test('creates a manual two-level project help center and exposes it as a project', async ({ page }) => {
    const suffix = `${Date.now().toString(36)}-${test.info().retry}`;
    const centerName = `E2E Note ${suffix}`;
    const sectionName = `基础功能 ${suffix}`;
    const articleName = `Docker 部署 ${suffix}`;

    await page.goto('/admin/login');
    await page.getByPlaceholder('用户名').fill('NOWEN');
    await page.getByPlaceholder('密码').fill('e2e-admin-password');
    await page.getByRole('button', { name: '登录' }).click();
    await expect(page).toHaveURL(/\/admin$/);

    await page.goto('/admin/docs');
    await expect(page.getByRole('heading', { name: '描述项目，AI 帮你写文档' })).toBeVisible();
    await page.getByRole('button', { name: '新建项目' }).click();
    const createPanel = page.locator('section').filter({ has: page.getByRole('heading', { name: '创建项目帮助中心' }) });
    await createPanel.getByLabel('项目名称').fill(centerName);
    await createPanel.getByLabel('一句话说明').fill('E2E 项目的安装和使用帮助。');
    await createPanel.getByRole('button', { name: '创建空白' }).click();
    await expect(page.getByText(/帮助中心已创建/)).toBeVisible();

    await page.getByRole('button', { name: '新建一级' }).click();
    await page.getByLabel('标题').fill(sectionName);
    await page.getByLabel('文档内容').fill(`# ${sectionName}\n\n这里汇总基础功能说明。`);
    await page.getByText('保存后立即公开').click();
    await page.getByRole('button', { name: '保存', exact: true }).click();
    await expect(page.getByText('文档已保存并公开。')).toBeVisible();

    const category = page.getByRole('button', { name: sectionName, exact: true }).first();
    await expect(category).toBeVisible();
    await category.locator('xpath=..').getByTitle('在此栏目下添加文章').click();
    await page.getByLabel('标题').fill(articleName);
    await page.getByLabel('文档内容').fill(`# ${articleName}\n\n使用 Docker Compose 启动。`);
    await page.getByText('保存后立即公开').click();
    await page.getByRole('button', { name: '保存', exact: true }).click();
    await expect(page.getByText('文档已保存并公开。')).toBeVisible();

    const publicLink = page.getByRole('link', { name: '查看前台' });
    const publicHref = await publicLink.getAttribute('href');
    expect(publicHref).toBeTruthy();
    await page.goto(publicHref!);
    await expect(page.getByRole('link', { name: `${centerName} 帮助中心`, exact: true }).first()).toBeVisible();
    await expect(page.getByRole('heading', { name: sectionName, exact: true }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: articleName, exact: true })).toBeVisible();

    await page.goto('/projects');
    await expect(page.getByRole('heading', { name: '项目与帮助中心' })).toBeVisible();
    await expect(page.getByRole('link', { name: new RegExp(centerName) })).toBeVisible();
    await expect(page.getByText(/账号|仓库同步/)).toHaveCount(0);
  });

  test('shows the AI agent panel without allowing automatic publishing', async ({ page }) => {
    await page.goto('/admin/login');
    await page.getByPlaceholder('用户名').fill('NOWEN');
    await page.getByPlaceholder('密码').fill('e2e-admin-password');
    await page.getByRole('button', { name: '登录' }).click();
    await page.goto('/admin/docs');

    await expect(page.getByRole('heading', { name: 'AI 文档 Agent' })).toBeVisible();
    await expect(page.getByText('AI 只生成待审核草稿，不会自动发布。')).toBeVisible();
    await expect(page.getByRole('button', { name: /生成完整帮助中心/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /检查并补齐文档/ })).toBeVisible();
    await expect(page.getByRole('link', { name: '模型与 API 设置' })).toHaveAttribute('href', '/admin/ai');
  });

  test('persists admin day mode across reloads and authenticated pages', async ({ page }) => {
    await page.goto('/admin/login');
    await expect(page.locator('html')).toHaveClass(/dark/);

    await page.getByRole('button', { name: '切换到日间模式' }).click();
    await expect(page.locator('html')).toHaveClass(/light/);
    await expect(page.locator('html')).not.toHaveClass(/dark/);

    await page.reload();
    await expect(page.locator('html')).toHaveClass(/light/);
    await expect(page.getByRole('button', { name: '切换到夜间模式' })).toBeVisible();

    await page.getByPlaceholder('用户名').fill('NOWEN');
    await page.getByPlaceholder('密码').fill('e2e-admin-password');
    await page.getByRole('button', { name: '登录' }).click();

    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.locator('html')).toHaveClass(/light/);
    await expect(page.getByRole('button', { name: '切换到夜间模式' })).toBeVisible();
  });

  test('previews and applies an AI-generated article title only after confirmation', async ({ page }) => {
    await page.goto('/admin/login');
    await page.getByPlaceholder('用户名').fill('NOWEN');
    await page.getByPlaceholder('密码').fill('e2e-admin-password');
    await page.getByRole('button', { name: '登录' }).click();
    await expect(page).toHaveURL(/\/admin$/);

    await page.route('**/api/admin/ai/generate', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          action: 'title',
          text: 'AI 驱动的博客写作流程',
          fields: { title: 'AI 驱动的博客写作流程' },
        }),
      });
    });

    await page.goto('/admin/posts/new');
    await page.getByPlaceholder('# 正文内容').fill('# AI 写作\n\n介绍博客中的 AI 写作流程。');
    await page.getByRole('button', { name: 'AI 写作' }).click();
    await expect(page.getByRole('dialog', { name: 'AI 写作助手' })).toBeVisible();
    await page.getByRole('button', { name: /生成标题/ }).click();
    await page.getByRole('button', { name: '开始生成' }).click();
    await expect(page.getByLabel('AI 生成结果')).toHaveValue('AI 驱动的博客写作流程');
    await page.getByRole('button', { name: '应用到文章字段' }).click();
    await expect(page.getByPlaceholder('文章标题')).toHaveValue('AI 驱动的博客写作流程');
    await expect(page.getByText('AI 结果已应用到文章字段，保存后生效。')).toBeVisible();
  });
});
