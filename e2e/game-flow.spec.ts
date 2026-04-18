import { expect, test, type Page } from '@playwright/test';

async function resetGame(page: Page) {
  await page.goto('/');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
}

test.beforeEach(async ({ page }) => {
  await resetGame(page);
});

test('plays the first question and shows saved progress', async ({ page }) => {
  await expect(
    page.getByRole('heading', { name: '아기', exact: true }),
  ).toBeVisible();
  await expect(page.getByText('새 게임 · 아기 1/10스테이지 · 1/8문항')).toBeVisible();
  await expect(page.getByRole('button', { name: '제출' })).toBeDisabled();

  await page.getByRole('button', { name: '3' }).click();
  await page.getByRole('button', { name: '제출' }).click();

  await expect(page.getByText('정답')).toBeVisible();
  await expect(page.getByText('콤보 1')).toBeVisible();
  await expect(page.getByText(/이어하기 저장됨/)).toBeVisible();
  await expect(
    page.getByRole('progressbar', { name: '현재 스테이지 진행률' }),
  ).toHaveAttribute('aria-valuenow', '13');
});

test('keeps progress after reload and guards storage reset', async ({ page }) => {
  await page.getByRole('button', { name: '최종 보스 바로가기' }).click();
  await expect(
    page.getByRole('heading', { name: '대학원', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('progressbar', { name: '보스 HP' })).toHaveAttribute(
    'aria-valuenow',
    '6',
  );

  await page.reload();

  await expect(
    page.getByRole('heading', { name: '대학원', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: '저장 초기화' }).click();
  await expect(page.getByText('한 번 더 누르면 진행이 삭제됩니다.')).toBeVisible();
  await expect(
    page.getByRole('heading', { name: '대학원', exact: true }),
  ).toBeVisible();

  await page.getByRole('button', { name: '정말 초기화' }).click();

  await expect(
    page.getByRole('heading', { name: '아기', exact: true }),
  ).toBeVisible();
});

test('retries a failed boss battle from the first boss question', async ({ page }) => {
  await page.getByRole('button', { name: '최종 보스 바로가기' }).click();

  await page.getByRole('button', { name: '60' }).click();
  await page.getByRole('button', { name: '제출' }).click();
  await page.getByRole('button', { name: '다음 문제' }).click();

  await page.getByLabel('숫자 답안').fill('0');
  await page.getByRole('button', { name: '제출' }).click();
  await page.getByRole('button', { name: '다음 문제' }).click();

  await page.getByRole('button', { name: '맞다' }).click();
  await page.getByRole('button', { name: '제출' }).click();

  await expect(page.getByRole('heading', { name: '보스전 재도전' })).toBeVisible();
  await page.getByRole('button', { name: '재도전' }).click();

  await expect(page.getByText('1/8').first()).toBeVisible();
  await expect(page.getByRole('progressbar', { name: '보스 HP' })).toHaveAttribute(
    'aria-valuenow',
    '6',
  );
  await expect(
    page.getByRole('progressbar', { name: '플레이어 HP' }),
  ).toHaveAttribute('aria-valuenow', '3');
});
