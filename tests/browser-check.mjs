// Run validate(page) with a Playwright Page pointing at the production export.
// No site code or test-only hooks are required by these interaction checks.
export async function validate(page, baseUrl = page.url()) {
  const results = [];
  const check = (condition, label) => {
    if (!condition) throw new Error(label);
    results.push(label);
  };
  const input = page.getByRole('textbox', { name: 'What’s on your mind?' });
  const ask = page.getByRole('button', { name: 'Ask the Swarm', exact: true });
  await page.goto(baseUrl);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.keyboard.press('Tab');
  check(await page.locator('.skip-link').evaluate(el => el === document.activeElement), 'Keyboard starts at skip link');
  await page.keyboard.press('Enter');
  check(await input.evaluate(el => el === document.activeElement), 'Skip link focuses the question');
  await input.press('Enter');
  check(await page.locator('#question-error').textContent() === 'Ask it something first.', 'Empty Enter reports the exact error');
  check(await input.getAttribute('aria-invalid') === 'true', 'Empty input is marked invalid');
  check(await input.evaluate(el => el === document.activeElement), 'Invalid question retains focus');
  await input.fill('   ');
  await ask.click();
  check(await page.locator('#question-error').textContent() === 'Ask it something first.', 'Whitespace is rejected');
  await input.fill('Should I take the scenic route?');
  check(await input.getAttribute('aria-invalid') === null, 'Typing clears the error');
  await page.evaluate(() => { window.__originalRandom = Math.random; Math.random = () => 0; });
  const start = Date.now();
  await input.press('Enter');
  check(await ask.isDisabled(), 'Enter starts the thinking state and disables submission');
  check(await input.getAttribute('readonly') !== null, 'Question stays stable while thinking');
  await input.press('Enter');
  await page.waitForTimeout(900);
  check(await page.locator('.oracle').getAttribute('data-phase') === 'thinking', 'Repeated Enter does not bypass the thinking delay');
  await page.waitForFunction(() => document.querySelector('.oracle').dataset.phase === 'revealed');
  const elapsed = Date.now() - start;
  check(elapsed >= 1450 && elapsed < 3000, `Answer revealed after ${elapsed}ms`);
  check(await page.locator('#answer').textContent() === 'The swarm says yes.', 'First deterministic draw reveals the first answer');
  check(await page.locator('#announcement').textContent() === 'The swarm says yes.', 'Result updates the persistent live region');
  check(await input.inputValue() === 'Should I take the scenic route?', 'Question is retained');
  check(await ask.isEnabled(), 'Submit is ready after the answer');
  await ask.click();
  await page.waitForFunction(() => document.querySelector('.oracle').dataset.phase === 'revealed');
  check(await page.locator('#answer').textContent() === 'Absolutely not.', 'Second identical random draw cannot repeat the first answer');

  await page.evaluate(() => { Math.random = () => .72; });
  await ask.click();
  await page.waitForFunction(() => document.querySelector('.oracle').dataset.phase === 'revealed');
  check(await page.locator('#answer').textContent() === 'Too early to tell. The swarm is still thinking.', 'Longest answer is reachable');
  await page.getByRole('button', { name: 'Pause motion', exact: true }).click();
  check(await page.getByRole('button', { name: 'Resume motion', exact: true }).isVisible(), 'Pause control exposes the resume action');
  const pausedImage = await page.locator('canvas').evaluate(el => el.toDataURL());
  await page.waitForTimeout(200);
  check(await page.locator('canvas').evaluate(el => el.toDataURL()) === pausedImage, 'Paused canvas pixels stay unchanged');
  await page.getByRole('button', { name: 'Resume motion', exact: true }).click();
  await page.waitForTimeout(200);
  check(await page.locator('canvas').evaluate(el => el.toDataURL()) !== pausedImage, 'Resuming moves the swarm');

  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `No horizontal overflow at ${width}px`);
    const bounds = await page.evaluate(() => {
      const answer = document.querySelector('#answer').getBoundingClientRect();
      const stage = document.querySelector('.orb-visual').getBoundingClientRect();
      return { fits: answer.top >= stage.top && answer.bottom <= stage.bottom && answer.left >= 0 && answer.right <= innerWidth };
    });
    check(bounds.fits, `Longest answer fits at ${width}px`);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  check(await page.evaluate(() => {
    const a = document.querySelector('#answer').getBoundingClientRect();
    const t = document.querySelector('.orb-toolbar').getBoundingClientRect();
    return a.bottom <= t.top;
  }), '200% text enlargement keeps the longest answer clear of the toolbar');
  check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), '200% text enlargement does not overflow horizontally');
  await page.evaluate(() => { document.documentElement.style.fontSize = ''; });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  check(await page.getByRole('button', { name: 'Reduced motion', exact: true }).isDisabled(), 'Reduced-motion preference takes precedence');
  const reducedImage = await page.locator('canvas').evaluate(el => el.toDataURL());
  await page.waitForTimeout(200);
  check(await page.locator('canvas').evaluate(el => el.toDataURL()) === reducedImage, 'Reduced-motion canvas is static');
  await input.fill('Will this work with reduced motion?');
  await ask.click();
  await page.waitForFunction(() => document.querySelector('.oracle').dataset.phase === 'revealed');
  check((await page.locator('#answer').textContent()).length > 0, 'Reduced motion still reveals answers');
  check(await page.locator('.answer').evaluate(el => getComputedStyle(el).animationName) === 'none', 'Reduced motion disables answer animation');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.evaluate(() => { Math.random = window.__originalRandom; delete window.__originalRandom; });
  return results;
}
