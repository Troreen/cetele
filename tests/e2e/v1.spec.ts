import { expect, test, type Page } from "@playwright/test";

async function openFresh(page: Page, path: string) {
  await page.goto(path);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
}

test("invitee accepts the invitation, sets a password, and reaches Today", async ({ page }) => {
  await openFresh(page, "/invite/accept");
  await page.getByRole("button", { name: "E-postamı doğrula" }).click();
  await expect(page).toHaveURL(/set-password/);
  await page.getByRole("button", { name: "Parolayı kaydet" }).click();
  await expect(page).toHaveURL(/today/);
  await expect(page.getByRole("heading", { name: "Bugün" })).toBeVisible();
});

test("user signs out through the account action and reaches sign in", async ({ page }) => {
  await openFresh(page, "/today");
  await page.getByRole("button", { name: "Çıkış yap" }).click();
  await expect(page).toHaveURL(/sign-in/);
});

test("student completion survives a reload", async ({ page }) => {
  await openFresh(page, "/today");
  const incomplete = page.getByRole("button", { name: "Tefekkür: bugün tamamlandı olarak işaretle" });
  await incomplete.click();
  await expect(page.getByRole("button", { name: "Tefekkür: bugünkü tamamlamayı kaldır" })).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expect(page.getByRole("button", { name: "Tefekkür: bugünkü tamamlamayı kaldır" })).toHaveAttribute("aria-pressed", "true");
});

test("student records a quantitative amount and a private completion note", async ({ page }) => {
  await openFresh(page, "/today");
  await page.getByRole("button", { name: "Günlük okuma: bugün 0 / 10. Miktar gir" }).click();
  await page.getByRole("spinbutton", { name: "Miktar", exact: true }).fill("17");
  await page.getByLabel(/Kısa not/).fill("Bugün odaklanmak daha kolaydı.");
  await page.getByRole("button", { name: "Kaydet" }).click();
  await expect(page.getByText("17 / 10 bugün kaydedildi")).toBeVisible();
  await page.getByRole("button", { name: "Günlük okuma seçenekleri" }).click();
  await page.getByRole("button", { name: /Bugünün notu/ }).click();
  await expect(page.getByLabel("Kısa düşünce")).toHaveValue("Bugün odaklanmak daha kolaydı.");
  await page.getByRole("button", { name: "Notu kaydet" }).click();
  await page.reload();
  await expect(page.getByText("Not eklendi")).toBeVisible();
});

test("student edits and removes an existing yesterday completion", async ({ page }) => {
  await openFresh(page, "/progress/mentor-reading");
  await page.getByRole("button", { name: "Günlük okuma seçenekleri" }).click();
  await page.getByRole("button", { name: /Dünü tamamla/ }).click();
  await page.getByRole("spinbutton", { name: "Miktar", exact: true }).fill("14");
  await page.getByLabel(/Kısa not/).fill("Dünkü kayıt düzeltildi.");
  await page.getByRole("button", { name: "Kaydet" }).click();
  await page.reload();
  await page.getByRole("button", { name: "Günlük okuma seçenekleri" }).click();
  await page.getByRole("button", { name: /Dünü tamamla/ }).click();
  await expect(page.getByRole("spinbutton", { name: "Miktar", exact: true })).toHaveValue("14");
  await expect(page.getByLabel(/Kısa not/)).toHaveValue("Dünkü kayıt düzeltildi.");
  await page.getByRole("button", { name: "Sıfırla" }).click();
  await page.reload();
  await page.getByRole("button", { name: "Günlük okuma seçenekleri" }).click();
  await expect(page.getByRole("button", { name: /Dünü tamamla/ })).toBeVisible();
});

test("student edits eligible grid cells and reaches information through the info button", async ({ page }) => {
  await openFresh(page, "/today");
  const focusCard = page.locator("article", { has: page.getByRole("heading", { name: "Tefekkür" }) });
  await focusCard.getByRole("button", { name: /9 Ağustos Pazar: bugün bekliyor/ }).click();
  await expect(page.getByRole("button", { name: "Tefekkür: bugünkü tamamlamayı kaldır" })).toHaveAttribute("aria-pressed", "true");
  await focusCard.getByRole("button", { name: "Tefekkür bilgileri" }).click();
  const infoDialog = page.getByRole("dialog", { name: "Tefekkür" });
  await expect(infoDialog.getByRole("heading", { name: "Tefekkür" })).toBeVisible();
  await expect(infoDialog.getByText("Ne tamamlanmış sayılır?")).toBeVisible();
});

test("Daily Review and Follow-up remain separate attributable actions", async ({ page }) => {
  await openFresh(page, "/students");
  await page.getByRole("button", { name: "İncelemeyi başlat" }).click();
  await expect(page.getByText("Kayıtları taradıktan sonra incelemeyi tamamla.")).toBeVisible();
  await page.getByRole("button", { name: "İncelemeyi tamamla" }).click();
  await expect(page.getByText("Bugünkü tarama kaydedildi.")).toBeVisible();
  await page.goto("/attention");
  await page.getByRole("button", { name: "Takip edildi" }).click();
  await page.getByLabel(/Özel not/).fill("Bugün kısa bir görüşme yapıldı.");
  await page.getByRole("button", { name: "Takip edildi olarak kaydet" }).click();
  await expect(page.getByText("Bugün kısa bir görüşme yapıldı.")).toBeVisible();
  await expect(page.getByText("Mert Demir tarafından kaydedildi.")).toBeVisible();
});

test("light theme persists while the mobile mentor ledger remains within the viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openFresh(page, "/settings");
  await page.getByRole("button", { name: "Açık", exact: true }).click();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.goto("/students");
  const widths = await page.evaluate(() => ({ viewport: window.innerWidth, document: document.documentElement.scrollWidth }));
  expect(widths.document).toBeLessThanOrEqual(widths.viewport);
  await expect(page.getByRole("navigation", { name: "Mobil menü" })).toBeVisible();
  await page.getByRole("button", { name: "Daha" }).click();
  const more = page.getByRole("navigation", { name: "Diğer bölümler" });
  await expect(more.getByRole("link", { name: /Dikkat/ })).toBeVisible();
  await expect(more.getByRole("link", { name: "Alışkanlıklar" })).toBeVisible();
  await expect(more.getByRole("link", { name: "Ağ" })).toBeVisible();
  await more.getByRole("link", { name: /Dikkat/ }).click();
  await expect(page).toHaveURL(/attention/);
});

test("senior intervention is explicit when assigning inside a deeper branch", async ({ page }) => {
  await openFresh(page, "/library");
  const reading = page.locator("article", { has: page.getByRole("heading", { name: "Günlük okuma" }) });
  await reading.getByRole("button", { name: "Öğrenciye ata" }).click();
  await expect(page.getByRole("heading", { name: "İstisnai üst mentor müdahalesi" })).toBeVisible();
  await expect(page.getByText("Sorumlu mentor: Elif Acar")).toBeVisible();
  await expect(page.getByRole("button", { name: "Deniz Ak için istisnai üst mentor müdahalesi olarak ata" })).toBeVisible();
});
