const { defineConfig } = require('cypress')

module.exports = defineConfig({
  e2e: {
    setupNodeEvents(on, config) {},
    baseUrl: 'http://localhost:4200',
    specPattern: 'cypress/e2e/**/*.spec.ts',
  },
})
