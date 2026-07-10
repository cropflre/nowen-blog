import { expect, test } from '@playwright/test';

test.describe('NOWEN Blog smoke flows', () => {
  test('loads seeded content, personal brand homepage and newsletter signup', async ({ page }) => {
    await page.goto('/');

    const articleTitle = 'React + Node + SQLite 博客系统完整架构设计';
    await expect(page.getByText(articleTitle, { exact: true }).first()).toBeVisible();
    await expect(page.getByRole('heading', { name: /把想法变成/ })).toBeVisible();

    const email = `e2e-${Date.now()}@example.com`;
    await page.getByPlaceholder('you@example.com').fill(email);
    await page.getByRole('button', { name: '立即订阅' }).click();
    await expect(page.getByText(/订阅成功/)).toBeVisible();

    await page.goto('/search?q=SQLite');
    await expect(page.getByRole('heading', { name: '搜索文章' })).toBeVisible();
    await expect(page.getByText(/找到\s*\d+\s*篇/)).toBeVisible();
    await expect(page.locator('mark').first()).toBeVisible();
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

    await page.goto('/projects');
    await expect(page.getByRole('heading', { name: '项目与作品' })).toBeVisible();
    await expect(page.getByText('E2E Portfolio Project', { exact: true })).toBeVisible();
  });
});
