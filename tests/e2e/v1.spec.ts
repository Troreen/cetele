import { expect, test, type Page } from "@playwright/test";

async function openFresh(page: Page, path: string) {
  await page.goto(path);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
}

test("local demo exercises private manual-link handoff without claiming hosted verification", async ({ page }) => {
  await openFresh(page, "/students");
  await page.getByRole("button", { name: "Öğrenci davet et" }).click();
  await page.getByLabel("Ad soyad").fill("Selin Yılmaz");
  await page.getByRole("button", { name: "Güvenli bağlantı oluştur" }).click();
  const invitationUrl = await page.getByLabel("Davet bağlantısı").inputValue();
  expect(invitationUrl).toContain("/invite/accept#token=");
  expect(invitationUrl).not.toContain("?token=");
  await expect(page.getByText(/yalnızca davet ettiğin kişiye/)).toBeVisible();
  await expect(page.getByText(/Yerel demo bağlantısıdır/)).toBeVisible();

  await page.getByRole("link", { name: "Yerel demo bağlantısını aç" }).click();
  await expect(page.getByRole("heading", { name: "Davetini kabul et" })).toBeVisible();
  await page.getByRole("button", { name: "Daveti kabul et" }).click();
  await expect(page).toHaveURL(/today/);
  expect(new URL(page.url()).hash).toBe("");
  await expect(page.getByText("Son 7 gün")).toBeVisible();
  await expect(page.locator(".compact-list-row")).toHaveCount(2);
});

test("user signs out through the account action and reaches sign in", async ({ page }) => {
  await openFresh(page, "/today");
  await page.getByRole("button", { name: "Çıkış yap" }).click();
  await expect(page).toHaveURL(/sign-in/);
});

test("student completion survives a reload", async ({ page }) => {
  await openFresh(page, "/today");
  const focusGrid = page.getByLabel("Tefekkür: 7 günlük görünüm");
  const incomplete = focusGrid.getByRole("button", { name: /9 Ağustos Pazar: bugün bekliyor/ });
  await incomplete.click();
  await expect(focusGrid.getByRole("button", { name: /9 Ağustos Pazar: tamamlandı/ })).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expect(page.getByLabel("Tefekkür: 7 günlük görünüm").getByRole("button", { name: /9 Ağustos Pazar: tamamlandı/ })).toHaveAttribute("aria-pressed", "true");
});

test("student records a quantitative amount and a private completion note", async ({ page }) => {
  await openFresh(page, "/today");
  await page.getByLabel("Günlük okuma: 7 günlük görünüm").getByRole("button", { name: /9 Ağustos Pazar: bugün bekliyor/ }).click();
  await page.getByRole("spinbutton", { name: "Miktar", exact: true }).fill("17");
  await page.getByLabel(/Kısa not/).fill("Bugün odaklanmak daha kolaydı.");
  await page.getByRole("button", { name: "Kaydet" }).click();
  await expect(page.getByLabel("Günlük okuma: 7 günlük görünüm").getByRole("button", { name: /9 Ağustos Pazar: tamamlandı/ })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("article", { name: /Günlük okuma kartı/ }).press("Shift+F10");
  await page.getByRole("button", { name: /Bugünün notu/ }).click();
  await expect(page.getByLabel("Kısa düşünce")).toHaveValue("Bugün odaklanmak daha kolaydı.");
  await page.getByRole("button", { name: "Notu kaydet" }).click();
  await page.reload();
  await page.getByRole("article", { name: /Günlük okuma kartı/ }).press("Shift+F10");
  await page.getByRole("button", { name: /Bugünün notu/ }).click();
  await expect(page.getByLabel("Kısa düşünce")).toHaveValue("Bugün odaklanmak daha kolaydı.");
});

test("manual release blockers stay fixed across amount, notification, and home modes", async ({ page }) => {
  await openFresh(page, "/today?theme=dark");

  await page.getByRole("button", { name: "Bildirimler" }).click();
  const notifications = page.getByRole("dialog", { name: "Bildirimler" });
  await expect(notifications.getByText(/Günlük okuma · 20:30/)).toBeVisible();
  await expect(notifications.getByText(/Tefekkür · 20:30/)).toBeVisible();
  await expect(notifications.getByRole("link", { name: "Bildirim ayarlarını aç" })).toHaveAttribute("href", /\/settings\?theme=dark/);
  await notifications.getByRole("button", { name: "Kapat" }).click();

  await page.getByRole("button", { name: "Hesap menüsü: Tarik" }).click();
  const account = page.getByRole("dialog", { name: "Hesabım" });
  await expect(account.getByRole("link", { name: "Ayarları aç" })).toBeVisible();
  await account.getByRole("button", { name: "Kapat" }).click();

  await page.getByLabel("Günlük okuma: 7 günlük görünüm").getByRole("button", { name: /9 Ağustos Pazar: bugün bekliyor/ }).click();
  const amount = page.getByRole("spinbutton", { name: "Miktar", exact: true });
  await expect(amount).toHaveAttribute("step", "1");
  await expect(amount).toHaveAttribute("min", "1");
  await amount.press("ArrowUp");
  await expect(amount).toHaveValue("11");
  await amount.press("ArrowDown");
  await expect(amount).toHaveValue("10");
  await page.getByRole("button", { name: "Kaydet" }).click();

  const tabs = page.getByRole("tablist", { name: "Ana sayfa görünümü" });
  await expect(tabs.getByRole("tab", { name: "Hafta görünümü" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByText("Son 7 gün")).toBeVisible();
  await expect(page.locator(".habit-card.compact-list-row")).toHaveCount(2);
  await expect(page.locator(".habit-card .completion-action")).toHaveCount(0);
  const weeklyGrid = page.getByLabel("Tefekkür: 7 günlük görünüm");
  const weeklyCellBox = await weeklyGrid.locator(".evidence-cell").first().boundingBox();
  expect(weeklyCellBox?.width).toBeLessThanOrEqual(25);
  await weeklyGrid.getByRole("button", { name: /9 Ağustos Pazar: bugün bekliyor/ }).click();
  await expect(weeklyGrid.getByRole("button", { name: /9 Ağustos Pazar: tamamlandı/ })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("link", { name: /güncel seri/i })).toHaveCount(0);
  await tabs.getByRole("tab", { name: "6 aylık görünüm" }).click();
  await expect(page).toHaveURL(/range=six-months/);
  await expect(page.getByLabel("Tefekkür: 182 günlük görünüm")).toBeVisible();
  await expect(page.getByRole("button", { name: "Tefekkür: bugünkü tamamlamayı kaldır" })).toBeVisible();
  await expect(page.getByRole("link", { name: /güncel seri/i }).first()).toBeVisible();
});

test("student edits and removes an existing yesterday completion", async ({ page }) => {
  await openFresh(page, "/progress/mentor-reading");
  await page.getByRole("article", { name: /Günlük okuma kartı/ }).press("Shift+F10");
  await page.getByRole("button", { name: /Dünü tamamla/ }).click();
  await page.getByRole("spinbutton", { name: "Miktar", exact: true }).fill("14");
  await page.getByLabel(/Kısa not/).fill("Dünkü kayıt düzeltildi.");
  await page.getByRole("button", { name: "Kaydet" }).click();
  await page.reload();
  await page.getByRole("article", { name: /Günlük okuma kartı/ }).press("Shift+F10");
  await page.getByRole("button", { name: /Dünü tamamla/ }).click();
  await expect(page.getByRole("spinbutton", { name: "Miktar", exact: true })).toHaveValue("14");
  await expect(page.getByLabel(/Kısa not/)).toHaveValue("Dünkü kayıt düzeltildi.");
  await page.getByRole("button", { name: "Sıfırla" }).click();
  await page.reload();
  await page.getByRole("article", { name: /Günlük okuma kartı/ }).press("Shift+F10");
  await expect(page.getByRole("button", { name: /Dünü tamamla/ })).toBeVisible();
});

test("student edits eligible grid cells and reaches information through the info button", async ({ page }) => {
  await openFresh(page, "/today");
  const focusCard = page.locator("article", { has: page.getByRole("heading", { name: "Tefekkür" }) });
  await focusCard.getByRole("button", { name: /9 Ağustos Pazar: bugün bekliyor/ }).click();
  await expect(focusCard.getByRole("button", { name: /9 Ağustos Pazar: tamamlandı/ })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("tab", { name: "6 aylık görünüm" }).click();
  const fullFocusCard = page.locator("article", { has: page.getByRole("heading", { name: "Tefekkür" }) });
  await fullFocusCard.getByRole("button", { name: "Tefekkür bilgileri" }).click();
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
  await expect(page.getByText("Tarik tarafından kaydedildi.")).toBeVisible();
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

test("Today week cards stay contained at a narrow phone width", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 733 });
  await openFresh(page, "/today?range=week");

  const layout = await page.evaluate(() => {
    const viewport = document.documentElement.clientWidth;
    const cards = [...document.querySelectorAll<HTMLElement>(".habit-card")];
    const guides = [...document.querySelectorAll<HTMLElement>(".week-date-guide")];
    const titles = [...document.querySelectorAll<HTMLElement>(".habit-copy h2")];
    const responsibility = document.querySelector<HTMLElement>(".mentor-responsibility");
    const contained = [...cards, ...guides, ...(responsibility ? [responsibility] : [])]
      .every((element) => {
        const rect = element.getBoundingClientRect();
        return rect.left >= 0 && rect.right <= viewport;
      });

    return {
      viewport,
      document: document.documentElement.scrollWidth,
      contained,
      titleSlotsUsable: titles.every((title) => title.clientWidth >= 36),
      hasIntentionalTruncation: titles.some((title) => title.scrollWidth > title.clientWidth),
    };
  });

  expect(layout.document).toBeLessThanOrEqual(layout.viewport);
  expect(layout.contained).toBe(true);
  expect(layout.titleSlotsUsable).toBe(true);
  expect(layout.hasIntentionalTruncation).toBe(true);
});

test("Today combines weekly and labeled six-month history controlled by General Settings", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openFresh(page, "/progress?theme=dark&range=week");

  await expect(page).toHaveURL(/\/today\?range=six-months/);
  await expect(page.getByRole("link", { name: "İlerlemem" })).toHaveCount(0);
  const reading = page.getByRole("article").filter({ hasText: "Günlük okuma" });
  await expect(reading.getByLabel("Günlük okuma: 182 günlük görünüm")).toBeVisible();
  await expect(reading.getByLabel("Ay etiketleri")).toContainText("Şub");
  await expect(reading.getByLabel("Gün etiketleri")).toContainText("SalPerCmt");

  await page.goto("/settings?theme=dark");
  await page.getByRole("checkbox", { name: "Ay etiketlerini göster" }).uncheck();
  await page.getByRole("checkbox", { name: "Gün etiketlerini göster" }).uncheck();
  await page.goto("/today?theme=dark&range=six-months");
  await expect(page.getByLabel("Ay etiketleri")).toHaveCount(0);
  await expect(page.getByLabel("Gün etiketleri")).toHaveCount(0);
  const widths = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, document: document.documentElement.scrollWidth }));
  expect(widths.document).toBeLessThanOrEqual(widths.viewport);
});

test("senior intervention is explicit when assigning inside a deeper branch", async ({ page }) => {
  await openFresh(page, "/library");
  const reading = page.locator("article", { has: page.getByRole("heading", { name: "Günlük okuma" }) });
  await reading.getByRole("button", { name: "Öğrenciye ata" }).click();
  await expect(page.getByRole("heading", { name: "İstisnai üst mentor müdahalesi" })).toBeVisible();
  await expect(page.getByText("Sorumlu mentor: Yunus").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Okan için istisnai üst mentor müdahalesi olarak ata" })).toBeVisible();
});

test("nested mentor students keep their hierarchy and use dense evidence rows", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openFresh(page, "/students/ayse?theme=dark&range=week");

  const responsibility = page.getByRole("region", { name: "Mentor sorumluluğu" });
  await expect(responsibility.locator(".student-row")).toHaveCount(6);
  await expect(responsibility.locator(".evidence-strip")).toHaveCount(12);
  await expect(page.locator(".habit-card .completion-action")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Atamayı düzelt / sonlandır" }).first()).toHaveClass(/secondary-button/);

  const layout = await page.evaluate(() => {
    const weeklyCells = [...document.querySelectorAll<HTMLElement>(".habit-card.compact .evidence-cell")];
    return {
      viewport: document.documentElement.clientWidth,
      document: document.documentElement.scrollWidth,
      largestWeeklyCell: Math.max(0, ...weeklyCells.map((cell) => cell.getBoundingClientRect().width)),
    };
  });
  expect(layout.document).toBeLessThanOrEqual(layout.viewport);
  expect(layout.largestWeeklyCell).toBeLessThanOrEqual(24);

  await responsibility.getByRole("link", { name: "Okan ayrıntıları" }).click();
  await expect(page).toHaveURL(/\/students\/deniz/);
  const back = page.getByRole("link", { name: "Yunus grubuna dön" });
  await expect(back).toHaveAttribute("href", "/students/ayse?theme=dark&range=week");
  await back.click();
  await expect(page).toHaveURL(/\/students\/ayse\?theme=dark&range=week/);
  await expect(page.locator(".back-link")).toHaveAttribute("href", "/students?theme=dark&range=week");
});
