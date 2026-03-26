const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: './e2e/tests',
  timeout: 180 * 1000,
  use: {
    headless: true,
    viewport: { width: 1280, height: 720 },
    actionTimeout: 30 * 1000,
    ignoreHTTPSErrors: true
  },
  reporter: [['list'], ['html', { outputFolder: 'e2e/reports', open: 'never' }]]
});
