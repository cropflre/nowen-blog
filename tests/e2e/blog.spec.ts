import { expect, test } from '@playwright/test';

test.describe('NOWEN Blog smoke flows', () => {
  test('loads the NOWEN product portal, seeded content and newsletter signup', async ({ page }) => {
    await page.goto('/');

    const articleTitle = 'React + Node + SQLite 博客系统完整架构设计';
    await expect(page.getByText(articleTitle, { exact: true }).first()).toBeVisible();
    await expect(page.getByRole('heading', { name: /让个人工具.*更简单、更好用/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /打开帮助中心/ })).toHaveAttribute('href', '/docs');
    await expect(page.getByRole('heading', { name: '选择项目，直接解决问题' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '持续维护的开源项目' })).toBeVisible();
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

  test('keeps the NOWEN product portal usable on a mobile viewport in both themes', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(() => localStorage.setItem('theme', 'light'));
    await page.goto('/');

    await expect(page.getByRole('heading', { name: /让个人工具.*更简单、更好用/ })).toBeVisible();
    await expect(page.locator('html')).not.toHaveClass(/dark/);

    const helpCenterButton = page.getByRole('link', { name: /打开帮助中心/ }).first();
    const buttonBox = await helpCenterButton.boundingBox();
    expect(buttonBox?.height ?? 0).toBeGreaterThanOrEqual(44);

    const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    expect(hasHorizontalOverflow).toBe(false);

    await page.getByRole('button', { name: '切换主题' }).click();
    await expect(page.locator('html')).toHaveClass(/dark/);
  });

  test('creates a two-level project help center through the simplified admin', async ({ page }) => {
    await page.goto('/admin/login');
    await page.getByPlaceholder('用户名').fill('NOWEN');
    await page.getByPlaceholder('密码').fill('e2e-admin-password');
    await page.getByRole('button', { name: '登录' }).click();
    await expect(page).toHaveURL(/\/admin$/);

    await page.goto('/admin/docs');
    await expect(page.getByRole('heading', { name: '像写笔记一样维护帮助文档' })).toBeVisible();
    await page.getByRole('button', { name: '新建项目帮助中心' }).click();
    await page.getByLabel('项目名称').fill('E2E Note');
    await page.getByLabel('一句话说明').fill('E2E 项目的安装和使用帮助。');
    await page.getByRole('button', { name: '创建并开始写' }).click();
    await expect(page.getByText(/帮助中心已创建/)).toBeVisible();

    await page.getByRole('button', { name: '新建一级' }).click();
    await page.getByLabel('标题').fill('基础功能');
    await page.getByLabel('文档内容').fill('# 基础功能\n\n这里汇总基础功能说明。');
    await page.getByText('保存后立即公开').click();
    await page.getByRole('button', { name: '保存', exact: true }).click();
    await expect(page.getByText('文档已保存并公开。')).toBeVisible();

    const category = page.getByRole('button', { name: '基础功能', exact: true });
    await expect(category).toBeVisible();
    const categoryCard = category.locator('xpath=..');
    await categoryCard.getByTitle('在此栏目下添加文章').click();
    await page.getByLabel('标题').fill('Docker 部署');
    await page.getByLabel('文档内容').fill('# Docker 部署\n\n使用 Docker Compose 启动。');
    await page.getByText('保存后立即公开').click();
    await page.getByRole('button', { name: '保存', exact: true }).click();
    await expect(page.getByText('文档已保存并公开。')).toBeVisible();

    const publicLink = page.getByRole('link', { name: '查看前台' });
    const publicHref = await publicLink.getAttribute('href');
    expect(publicHref).toBeTruthy();
    await page.goto(publicHref!);
    await expect(page.getByRole('heading', { name: 'E2E Note 帮助中心' })).toBeVisible();
    await expect(page.getByRole('link', { name: '基础功能', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Docker 部署', exact: true })).toBeVisible();
  });

  test('shows a GitHub account public projects without login or persistence', async ({ page }) => {
    await page.route('https://api.github.com/users/cropflre', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          login: 'cropflre',
          name: 'Cropflre',
          avatar_url: 'https://avatars.githubusercontent.com/u/21305704?v=4',
          bio: 'Open-source builder',
          html_url: 'https://github.com/cropflre',
          blog: 'https://example.com',
          location: 'Shenzhen',
          public_repos: 10,
          followers: 20,
          following: 3,
        }),
      });
    });
    await page.route('https://api.github.com/users/cropflre/repos?*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 1701,
            name: 'nowen-note',
            full_name: 'cropflre/nowen-note',
            description: 'A public note project loaded directly from GitHub.',
            html_url: 'https://github.com/cropflre/nowen-note',
            homepage: 'https://note.example.com',
            language: 'TypeScript',
            topics: ['react', 'electron'],
            stargazers_count: 88,
            forks_count: 9,
            fork: false,
            archived: false,
            disabled: false,
            pushed_at: '2026-07-10T00:00:00Z',
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2026-07-10T00:00:00Z',
          },
          {
            id: 1702,
            name: 'ignored-fork',
            full_name: 'cropflre/ignored-fork',
            description: 'This fork must not be displayed.',
            html_url: 'https://github.com/cropflre/ignored-fork',
            homepage: null,
            language: 'JavaScript',
            topics: [],
            stargazers_count: 0,
            forks_count: 0,
            fork: true,
            archived: false,
            disabled: false,
            pushed_at: null,
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-01-01T00:00:00Z',
          },
        ]),
      });
    });

    await page.goto('/projects');
    await page.getByLabel('GitHub 账号或主页').fill('https://github.com/cropflre/');
    await page.getByRole('button', { name: '一键展示项目' }).click();

    await expect(page).toHaveURL(/\/projects\?github=cropflre/);
    await expect(page.getByRole('heading', { name: 'Cropflre' })).toBeVisible();
    await expect(page.getByText('@cropflre', { exact: true })).toBeVisible();
    await expect(page.getByText('nowen-note', { exact: true })).toBeVisible();
    await expect(page.getByText('ignored-fork', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('link', { name: /查看 GitHub 主页/ })).toHaveAttribute('href', 'https://github.com/cropflre');
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

  test('logs in, creates a project and renders it on the public projects page', async ({ page }) => {
    await page.goto('/admin/login');
    await page.getByPlaceholder('用户名').fill('NOWEN');
    await page.getByPlaceholder('密码').fill('e2e-admin-password');
    await page.getByRole('button', { name: '登录' }).click();

    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole('heading', { name: '数据仪表盘' })).toBeVisible();
    await expect(page.getByText('欢迎，NOWEN')).toBeVisible();

    await page.goto('/admin/projects');
    await page.getByLabel('项目名称').fill('E2E Portfolio Project');
    await page.getByLabel('项目描述').fill('Created by the Playwright portfolio workflow.');
    await page.getByLabel('主要语言').fill('TypeScript');
    await page.getByLabel('Topics').fill('react, testing');
    await page.getByRole('button', { name: '创建项目' }).click();
    await expect(page.getByText('项目已创建。')).toBeVisible();

    await page.route('https://api.github.com/**', (route) => route.abort());
    await page.goto('/projects');
    await expect(page.getByRole('heading', { name: '项目与作品' })).toBeVisible();
    await expect(page.getByText('E2E Portfolio Project', { exact: true })).toBeVisible();
  });
});
