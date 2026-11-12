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
