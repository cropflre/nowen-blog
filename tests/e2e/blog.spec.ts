import { expect, test } from '@playwright/test';

test.describe('NOWEN Blog smoke flows', () => {
  test('loads seeded content and renders a searchable article', async ({ page }) => {
    await page.goto('/');

    const articleTitle = 'React + Node + SQLite 博客系统完整架构设计';
    await expect(page.getByText(articleTitle, { exact: true }).first()).toBeVisible();

    await page.goto('/search?q=SQLite');
    await expect(page.getByRole('heading', { name: '搜索文章' })).toBeVisible();
    await expect(page.getByText(/找到\s*\d+\s*篇/)).toBeVisible();
    await expect(page.locator('mark').first()).toBeVisible();
  });

  test('logs into the admin dashboard with the isolated E2E account', async ({ page }) => {
    await page.goto('/admin/login');
    await page.getByPlaceholder('用户名').fill('NOWEN');
    await page.getByPlaceholder('密码').fill('e2e-admin-password');
    await page.getByRole('button', { name: '登录' }).click();

    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole('heading', { name: '数据仪表盘' })).toBeVisible();
    await expect(page.getByText('欢迎，NOWEN')).toBeVisible();
  });
});
