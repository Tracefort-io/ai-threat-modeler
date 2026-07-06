import { test, expect, type Page } from '@playwright/test'

async function stubAuthAndSettings(page: Page): Promise<void> {
  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({
        user: { id: 1, username: 'admin', email: 'admin@test.local', role: 'Admin', password_changed: true },
      }),
    })
  })
  const settingsBody = {
    status: 'success',
    settings: {
      encryption_key_configured: true,
      anthropic_api_key: '***ENCRYPTED***',
      anthropic_base_url: 'https://api.anthropic.com',
      openai_api_key: null,
      openai_base_url: 'https://api.openai.com/v1',
      llm_provider: 'claude',
      claude_model: null,
      openai_model: 'gpt-4.1',
      claude_code_max_output_tokens: 32000,
      github_max_archive_size_mb: 50,
      updated_at: new Date().toISOString(),
    },
  }
  await page.route('**/api/settings', async (route) => {
    const method = route.request().method()
    if (method === 'GET' || method === 'PUT') {
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify(settingsBody),
      })
      return
    }
    await route.continue()
  })
  // Settings page loads model dropdowns on mount (v2.0.1); stub so these
  // requests don't fall through to the network during PAT-focused tests.
  await page.route('**/api/settings/models**', async (route) => {
    const provider = route.request().url().includes('provider=codex') ? 'codex' : 'claude'
    await route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ status: 'success', provider, models: [] }),
    })
  })
}

test.beforeEach(async ({ page }) => {
  await stubAuthAndSettings(page)
  await page.addInitScript(() => {
    localStorage.setItem('auth_token', 'e2e-admin-token')
  })
})

test.describe('GitHub PAT settings', () => {
  test('SEC-009: encryption key is never displayed in Settings', async ({ page }) => {
    await page.route('**/api/github/token', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200, contentType: 'application/json',
          body: JSON.stringify({ token: { exists: false, name: null, createdAt: null, updatedAt: null, lastUsedAt: null } }),
        })
        return
      }
      await route.continue()
    })
    await page.goto('/')
    await page.getByRole('button', { name: 'Settings' }).click()
    await expect(page.getByTestId('encryption-status-configured')).toBeVisible()
    // Encryption key input must not exist
    await expect(page.locator('input[id="encryption-key"]')).toHaveCount(0)
    // The configured key must not appear anywhere on the page
    const html = await page.content()
    expect(html).not.toMatch(/encryption_key"\s*:/i)
  })

  test('saves a PAT and shows it as configured', async ({ page }) => {
    let getCount = 0
    await page.route('**/api/github/token', async (route) => {
      const method = route.request().method()
      if (method === 'GET') {
        getCount += 1
        if (getCount === 1) {
          await route.fulfill({
            status: 200, contentType: 'application/json',
            body: JSON.stringify({ token: { exists: false, name: null, createdAt: null, updatedAt: null, lastUsedAt: null } }),
          })
        } else {
          await route.fulfill({
            status: 200, contentType: 'application/json',
            body: JSON.stringify({
              token: {
                exists: true, name: 'my-pat',
                createdAt: '2026-05-09T12:00:00Z', updatedAt: '2026-05-09T12:00:00Z', lastUsedAt: null,
              },
            }),
          })
        }
        return
      }
      if (method === 'POST') {
        const body = route.request().postDataJSON() as { token: string; name?: string | null }
        expect(body.token.length).toBeGreaterThan(0)
        await route.fulfill({
          status: 200, contentType: 'application/json',
          body: JSON.stringify({
            status: 'success',
            githubLogin: 'octocat',
            token: {
              exists: true, name: body.name ?? null,
              createdAt: '2026-05-09T12:00:00Z', updatedAt: '2026-05-09T12:00:00Z', lastUsedAt: null,
            },
          }),
        })
        return
      }
      await route.continue()
    })

    await page.goto('/')
    await page.getByRole('button', { name: 'Settings' }).click()
    await page.locator('#github-token-name').fill('my-pat')
    await page.locator('#github-token').fill('ghp_e2e_token')
    // The PAT is persisted by the global bottom "Save Configuration" button.
    await page.getByRole('button', { name: 'Save Configuration' }).click()
    await expect(page.getByText(/PAT configured \(my-pat\)/)).toBeVisible()
  })

  test('Test validates the entered PAT against the backend', async ({ page }) => {
    await page.route('**/api/github/token', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200, contentType: 'application/json',
          body: JSON.stringify({ token: { exists: false, name: null, createdAt: null, updatedAt: null, lastUsedAt: null } }),
        })
        return
      }
      await route.continue()
    })
    let validateBody: { token?: string } | null = null
    await page.route('**/api/github/token/validate', async (route) => {
      validateBody = route.request().postDataJSON() as { token?: string }
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ valid: true, login: 'octocat', scopes: ['repo'] }),
      })
    })

    await page.goto('/')
    await page.getByRole('button', { name: 'Settings' }).click()
    await page.locator('#github-token').fill('ghp_test_token')
    await page.getByRole('button', { name: 'Test GitHub PAT' }).click()
    await expect(page.getByText(/GitHub PAT is valid/)).toBeVisible()
    expect(validateBody).toEqual({ token: 'ghp_test_token' })
  })

  test('Test validates the saved PAT when the field is blank', async ({ page }) => {
    await page.route('**/api/github/token', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200, contentType: 'application/json',
          body: JSON.stringify({
            token: { exists: true, name: 'mine', createdAt: 't', updatedAt: 't', lastUsedAt: null },
          }),
        })
        return
      }
      await route.continue()
    })
    let validateBody: Record<string, unknown> | null = null
    await page.route('**/api/github/token/validate', async (route) => {
      validateBody = route.request().postDataJSON() as Record<string, unknown>
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ valid: true, login: 'octocat', scopes: ['repo'] }),
      })
    })

    await page.goto('/')
    await page.getByRole('button', { name: 'Settings' }).click()
    await expect(page.getByText(/PAT configured \(mine\)/)).toBeVisible()
    await page.getByRole('button', { name: 'Test GitHub PAT' }).click()
    await expect(page.getByText(/Saved GitHub PAT is valid/)).toBeVisible()
    // No token sent → backend falls back to the stored one.
    expect(validateBody).toEqual({})
  })
})
