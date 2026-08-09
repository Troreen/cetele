import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fixtureState } from "@/modules/cetele/fixtures";

const mocks = vi.hoisted(() => ({
  createManualInvitation: vi.fn(),
  dispatch: vi.fn(),
  reload: vi.fn(),
  store: { state: null as unknown, adapter: "local" as "local" | "supabase" },
}));

vi.mock("@/modules/cetele/actions", () => ({ createManualInvitation: mocks.createManualInvitation }));
vi.mock("@/modules/cetele/store", () => ({
  browserNavigation: { reload: mocks.reload },
  useCetele: () => ({ ...mocks.store, dispatch: mocks.dispatch }),
}));
vi.mock("@/modules/cetele/url-state", () => ({
  useUiSearch: () => "",
  hrefWithUiState: (path: string) => path,
}));

import { StudentsScreen } from "@/components/screens/students-screen";

describe("manual invitation UI", () => {
  beforeEach(() => {
    mocks.store.state = fixtureState;
    mocks.store.adapter = "local";
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("keeps opening the bearer link local-only and refreshes hosted invitations after close", async () => {
    mocks.store.adapter = "supabase";
    mocks.createManualInvitation.mockResolvedValue({ url: "https://cetele.example/invite/accept#token=secret", expiresAt: "2026-08-12T12:00:00.000Z" });
    render(<StudentsScreen />);

    fireEvent.click(screen.getByRole("button", { name: "Öğrenci davet et" }));
    fireEvent.change(screen.getByLabelText("Ad soyad"), { target: { value: "Selin Yılmaz" } });
    fireEvent.click(screen.getByRole("button", { name: "Güvenli bağlantı oluştur" }));

    expect(await screen.findByRole("button", { name: "Bağlantıyı kopyala" })).toBeVisible();
    expect(screen.queryByRole("link", { name: /bağlantısını aç/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Kapat" }));
    await waitFor(() => expect(mocks.reload).toHaveBeenCalledOnce());
  });

  it("labels expired invitations separately and leads through revoke before reissue", () => {
    mocks.store.state = {
      ...fixtureState,
      people: [...fixtureState.people, { id: "expired-invite", name: "Selin Yılmaz", initials: "SY", mentorId: fixtureState.currentUserId, invitation: "pending" as const, invitationExpiresAt: "2026-08-08T12:00:00.000Z" }],
    };
    render(<StudentsScreen />);

    expect(screen.getByText("Davet süresi doldu")).toBeVisible();
    expect(screen.getByText("İptal edip yeniden davet et")).toBeVisible();
    const pending = screen.getByText("Bekleyen davet").closest("div");
    expect(pending ? within(pending).getByText("1") : null).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: /Selin Yılmaz süresi dolan davetini iptal et/ }));
    expect(mocks.dispatch).toHaveBeenCalledWith({ type: "revoke-invitation", invitationId: "expired-invite" });
    expect(screen.getByRole("button", { name: "Öğrenci davet et" })).toBeVisible();
  });
});
