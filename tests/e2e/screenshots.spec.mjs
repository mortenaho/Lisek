import { test, _electron as electron } from '@playwright/test'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '../..')
const shotsDir = path.join(root, 'docs/screenshots')

/** @type {import('@playwright/test').ElectronApplication} */
let app
/** @type {import('@playwright/test').Page} */
let page
let userDataDir

async function capture(name) {
  await page.screenshot({
    path: path.join(shotsDir, `${name}.png`),
    animations: 'disabled'
  })
}

async function showCollections() {
  await page.getByRole('button', { name: 'Collections', exact: true }).click()
  await page.waitForTimeout(300)
}

async function openRequest(method, name) {
  await showCollections()
  await page.getByRole('button', { name: new RegExp(`^${method}\\s+${name}\\b`) }).click()
  await page.waitForTimeout(900)
}

async function openHistoryEntry(urlPattern) {
  await page.getByRole('button', { name: 'History', exact: true }).click()
  await page.getByText(urlPattern).first().click()
  await page.waitForTimeout(900)
}

test.describe.configure({ mode: 'serial' })

test.describe('Marketing screenshots', () => {
  test.beforeAll(async () => {
    const mainEntry = path.join(root, 'out/main/index.js')
    if (!fs.existsSync(mainEntry)) {
      throw new Error('Build the app first: npm run build')
    }

    userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lisek-screenshots-'))
    fs.mkdirSync(shotsDir, { recursive: true })

    app = await electron.launch({
      args: [mainEntry, `--user-data-dir=${userDataDir}`],
      env: {
        ...process.env,
        LISEK_USER_DATA: userDataDir,
        LISEK_SCREENSHOT_SEED: '1',
        LISEK_NO_DEVTOOLS: '1'
      }
    })

    page = await app.firstWindow()
    await page.setViewportSize({ width: 1400, height: 900 })
    await page.waitForLoadState('domcontentloaded')
    await page.getByRole('button', { name: /GET Get Users\b/ }).waitFor({ timeout: 30_000 })
    await page.waitForTimeout(800)
  })

  test.afterAll(async () => {
    await app?.close()
    fs.rmSync(userDataDir, { recursive: true, force: true })
  })

  test('collections — sidebar and variable URL', async () => {
    await openRequest('POST', 'Create Post')
    await capture('collections')
  })

  test('get-request — GET with JSON response', async () => {
    await openHistoryEntry(/GET.*\/users/i)
    await page.getByText('142ms ·').waitFor({ timeout: 10_000 })
    await capture('get-request')
  })

  test('delete-request — DELETE with query params', async () => {
    await openHistoryEntry(/DELETE.*\/users/i)
    await page.getByRole('tab', { name: /Params 1/ }).waitFor({ timeout: 10_000 })
    await capture('delete-request')
  })

  test('delete-response — compact JSON body', async () => {
    await openHistoryEntry(/DELETE.*\/users/i)
    await page.getByText('98ms ·').waitFor({ timeout: 10_000 })
    await capture('delete-response')
  })

  test('environments — variable editor', async () => {
    await page.getByRole('button', { name: /Production/i }).click()
    await page.getByRole('dialog').getByText('All environments').waitFor({ timeout: 10_000 })
    await capture('environments')
    await page.keyboard.press('Escape')
  })

  test('history — request log', async () => {
    await page.getByRole('button', { name: 'History', exact: true }).click()
    await page.getByText(/GET.*\/users/i).first().waitFor({ timeout: 10_000 })
    await capture('history')
  })
})
