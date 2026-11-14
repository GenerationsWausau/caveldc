import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// A bad edit once chopped off the bottom half of the stylesheet and shipped a broken
// tab bar. This fails the build if any screen's core styles go missing again.
describe('stylesheet', () => {
  const css = readFileSync(new URL('./index.css', import.meta.url), 'utf8')
  const required = [
    '.tabs {', '.tab {', '.hero-top {', '.scores {', '.daybar {', '.habit {', '.swap {',
    '.sheet {', '.chip {', '.field input {', '.levelup {', '.heat {', '.xp-chart {',
    '.habit-table {', '.journal {', '.totals {', '.stepper {', '.reminder {', '.btn {',
  ]
  it.each(required)('still styles %s', (selector) => {
    expect(css).toContain(selector)
  })
})
