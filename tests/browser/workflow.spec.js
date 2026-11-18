import { test, expect } from "@playwright/test";
test("validates, saves draft, generates suggestion, submits and reviews in RTL", async ({
  page,
}) => {
  await page.goto("/step/2");
  await expect(page).toHaveURL(/step\/0/);
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.locator("#fullName")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await page.locator("#fullName").fill("Test Applicant");
  await page.locator("#nationalId").fill("784-1990-1234567-1");
  await page.getByRole("radio", { name: "Female", exact: true }).check();
  await page.locator("#phone").fill("+971501234567");
  await page.locator("#email").fill("test@example.com");
  await page.reload();
  await expect(page.locator("#fullName")).toHaveValue("Test Applicant");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.locator("#maritalStatus").selectOption("single");
  await page.locator("#employmentStatus").selectOption("unemployed");
  await page.locator("#monthlyIncome").fill("0");
  await page.locator("#housingStatus").selectOption("rented");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page
    .locator("#financialSituation")
    .fill("I lost my job and need help paying rent.");
  await page.route("**/api/openAi", (route) =>
    route.fulfill({
      json: { text: "I need temporary support while I look for work." },
    }),
  );
  await page
    .getByRole("button", { name: /Help me write/ })
    .first()
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.locator("#suggestion").fill("An edited factual statement.");
  await page.getByRole("button", { name: "Accept", exact: true }).click();
  await expect(page.locator("#financialSituation")).toHaveValue(
    "An edited factual statement.",
  );
  await page.locator("#consent").check();
  await page.getByRole("button", { name: "Submit", exact: true }).click();
  await expect(page).toHaveURL(/review\//);
  await expect(page.getByText("An edited factual statement.")).toBeVisible();
  await page.getByRole("button", { name: "Change language" }).click();
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.locator("html")).toHaveAttribute("lang", "ar");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await page.goto("/history");
  await expect(page.getByText("Test Applicant")).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/step/0");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/angular-arabic-mobile.png",
    fullPage: true,
  });
});
test("AI failure keeps entered description intact", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() =>
    sessionStorage.setItem(
      "ss-angular-draft",
      JSON.stringify({
        fullName: "Test",
        nationalId: "784-1990-1234567-1",
        gender: "male",
        phone: "+971501234567",
        email: "test@example.com",
        maritalStatus: "single",
        employmentStatus: "unemployed",
        monthlyIncome: "0",
        housingStatus: "rented",
      }),
    ),
  );
  await page.goto("/step/2");
  await page.locator("#financialSituation").fill("My original description.");
  await page.route("**/api/openAi", (r) =>
    r.fulfill({ status: 503, json: { error: "Not configured" } }),
  );
  await page
    .getByRole("button", { name: /Help me write/ })
    .first()
    .click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.locator("#financialSituation")).toHaveValue(
    "My original description.",
  );
});

test("National ID keeps its mask during typing, paste and editing in both languages", async ({
  page,
}) => {
  await page.goto("/");
  const id = page.locator("#nationalId");
  await id.pressSequentially("784203212323235");
  await expect(id).toHaveValue("784-2032-1232323-5");
  await id.fill("٧٨٤٢٠٣٢١٢٣٢٣٢٣٥");
  await expect(id).toHaveValue("784-2032-1232323-5");
  await id.fill("784-2032-1232323-599");
  await expect(id).toHaveValue("784-2032-1232323-5");
  await id.evaluate((el) => {
    el.focus();
    el.setSelectionRange(4, 4);
  });
  await id.press("Backspace");
  await expect(id).toHaveValue("782-0321-2323235");
  await id.fill("784203212323235");
  await id.evaluate((el) => {
    el.focus();
    el.setSelectionRange(3, 3);
  });
  await id.press("Delete");
  await expect(id).toHaveValue("784-0321-2323235");
  await id.fill("784203212323235");
  await id.evaluate((el) => {
    el.focus();
    el.setSelectionRange(4, 8);
  });
  await id.pressSequentially("1990");
  await expect(id).toHaveValue("784-1990-1232323-5");
  await page.getByRole("button", { name: "Change language" }).click();
  await expect(id).toHaveAttribute("dir", "ltr");
  await id.fill("۷۸۴۱۹۹۰۱۲۳۴۵۶۷۱");
  await expect(id).toHaveValue("784-1990-1234567-1");
  await page.reload();
  await expect(id).toHaveValue("784-1990-1234567-1");
});


test("Emirates ID rejects incomplete numbers and non-UAE prefixes in both languages", async ({ page }) => {
  await page.goto("/");
  const id = page.locator("#nationalId");
  const next = page.locator('button[type="submit"]');
  for (const value of ["78419901234567", "123199012345671"]) {
    await id.fill(value);
    await next.click();
    await expect(id).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByText("Enter a 15-digit Emirates ID starting with 784 (784-XXXX-XXXXXXX-X).", { exact: true })).toBeVisible();
    await expect(page).toHaveURL(/step\/0/);
  }
  await page.getByRole("button", { name: "Change language" }).click();
  await expect(page.getByText("أدخل رقم هوية إماراتية مكوّنًا من 15 رقمًا يبدأ بـ 784 (784-XXXX-XXXXXXX-X).", { exact: true })).toBeVisible();
  await id.fill("٧٨٤١٩٩٠١٢٣٤٥٦٧١");
  await next.click();
  await expect(id).toHaveValue("784-1990-1234567-1");
  await expect(id).toHaveAttribute("aria-invalid", "false");
});


test('Material datepicker selects DOB without moving the form and restores focus', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-12T12:00:00Z'));
  await page.goto('/');
  const field = page.locator('#dateOfBirth');
  const before = await page.locator('#phone').boundingBox();
  await page.getByRole('button', {name: 'Open calendar', exact: true}).click();
  const calendar = page.locator('mat-calendar');
  await expect(calendar).toBeVisible();
  await expect(page.locator('.cdk-overlay-pane')).toBeVisible();
  const after = await page.locator('#phone').boundingBox();
  expect(after.y).toBe(before.y);
  await expect(calendar.locator('.mat-calendar-period-button')).toContainText('NOV 2026');
  await calendar.getByRole('button', { name: 'Choose year', exact: true }).click();
  await calendar.getByRole('button', { name: 'Previous years', exact: true }).click();
  const year = calendar.locator('.mat-calendar-body-cell').filter({hasText: /^\s*1996\s*$/});
  await year.click();
  await calendar.locator('.mat-calendar-body-cell').filter({hasText: /^\s*JAN\s*$/i}).click();
  await calendar.locator('.mat-calendar-body-cell').filter({hasText: /^\s*15\s*$/}).click();
  await expect(calendar).not.toBeVisible();
  await expect(field).toHaveValue('15/01/1996');
  await expect(page.getByRole('button', {name: 'Open calendar', exact: true})).toBeFocused();
  await page.reload();
  await expect(field).toHaveValue('15/01/1996');
  await page.getByRole('button', {name: 'Open calendar', exact: true}).click();
  await expect(calendar.locator('.mat-calendar-period-button')).toContainText('JAN 1996');
  await page.keyboard.press('Escape');
  await expect(calendar).not.toBeVisible();
  await expect(page.getByRole('button', {name: 'Open calendar', exact: true})).toBeFocused();
  await page.getByRole('button', { name: 'Change language' }).click();
  await page.getByRole('button', { name: 'فتح التقويم' }).click();
  await expect(calendar).toBeVisible();
  await expect(page.locator('.cdk-overlay-container [dir="rtl"]')).toBeVisible();
});


test('DOB accepts typed dates, retains invalid input, and rejects future dates', async ({page}) => {
  await page.goto('/');
  const field = page.locator('#dateOfBirth');
  await field.fill('15/01/1996');
  await field.press('Tab');
  await expect(field).toHaveValue('15/01/1996');
  await expect(page.locator('mat-calendar')).not.toBeVisible();
  await page.reload();
  await expect(field).toHaveValue('15/01/1996');
  for (const value of ['31/02/1996', '12/11/2999', '15/01']) {
    await field.fill(value);
    await field.press('Tab');
    await page.getByRole('button', {name:'Next',exact:true}).click();
    await expect(field).toHaveValue(value);
    await expect(field).toHaveAttribute('aria-invalid','true');
  }
  await field.fill('');
  await field.press('Tab');
  await page.getByRole('button', {name:'Next',exact:true}).click();
  await expect(field).toHaveAttribute('aria-invalid','false');
});

test('DOB formats digits while typing, editing and pasting', async ({ page }) => {
  await page.goto('/');
  const field = page.locator('#dateOfBirth');
  await field.pressSequentially('15011996');
  await expect(field).toHaveValue('15/01/1996');
  await field.press('Tab');
  await page.reload();
  await expect(field).toHaveValue('15/01/1996');
  await field.evaluate(el => { el.focus(); el.setSelectionRange(3, 3); });
  await field.press('Backspace');
  await expect(field).toHaveValue('10/11/996');
  await field.fill('١٥٠١١٩٩٦');
  await expect(field).toHaveValue('15/01/1996');
  await field.fill('۱۵۰۱۱۹۹۶');
  await expect(field).toHaveValue('15/01/1996');
  await field.evaluate(el => { el.focus(); el.setSelectionRange(3, 5); });
  await field.pressSequentially('02');
  await expect(field).toHaveValue('15/02/1996');
  await field.press('Tab');
  await page.reload();
  await expect(field).toHaveValue('15/02/1996');
});


test('DOB accepts manual separators for single-digit days and months', async ({ page }) => {
  await page.goto('/');
  const field = page.locator('#dateOfBirth');
  await field.pressSequentially('8/9/1989');
  await expect(field).toHaveValue('08/09/1989');
  await field.press('Tab');
  await page.reload();
  await expect(field).toHaveValue('08/09/1989');
  await field.fill('8/9/1989');
  await expect(field).toHaveValue('08/09/1989');
  await field.fill('');
  await field.pressSequentially('15/01/1996');
  await expect(field).toHaveValue('15/01/1996');
});

test('only the active AI writing button shows Generating while all assist buttons are disabled', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => sessionStorage.setItem('ss-angular-draft', JSON.stringify({
    fullName: 'Test Applicant', nationalId: '784-1990-1234567-1', gender: 'male',
    phone: '+971501234567', email: 'test@example.com', maritalStatus: 'single',
    employmentStatus: 'unemployed', monthlyIncome: '0', housingStatus: 'rented',
    financialSituation: 'I need help with rent.', employmentCircumstances: 'I lost my job.',
    reasonForApplying: 'I need temporary support.',
  })));
  await page.goto('/step/2');
  let respond;
  const pending = new Promise(resolve => { respond = resolve; });
  await page.route('**/api/openAi', async route => {
    await pending;
    await route.fulfill({ json: { text: 'I need temporary help with rent.' } });
  });
  const buttons = page.locator('button.assist');
  await buttons.nth(0).click();
  await expect(buttons.nth(0)).toContainText('Generating');
  for (let index = 0; index < 3; index++) await expect(buttons.nth(index)).toBeDisabled();
  await expect(buttons.nth(1)).toContainText('Help me write');
  await expect(buttons.nth(2)).toContainText('Help me write');
  respond();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(buttons.nth(0)).toContainText('Help me write');
});
