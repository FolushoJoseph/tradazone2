import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

let mockNavigate;
let mockSearchParams;
let mockUser;
let mockLastWallet;
const mockConnectWallet = vi.fn();
const mockUpdateProfile = vi.fn();

const DRAFT_KEY = "tradazone_test_signin_description_draft";

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    BrowserRouter: ({ children }) => React.createElement(React.Fragment, null, children),
    useNavigate: () => mockNavigate,
    useSearchParams: () => [mockSearchParams],
  };
});

vi.mock("../components/ui/Logo", () => ({
  default: () => React.createElement("div", { "data-testid": "logo" }),
}));

vi.mock("../assets/auth-splash.svg", () => ({ default: "signin-splash.svg" }));

vi.mock("../components/forms/RichTextEditor", () => ({
  default: ({ label, value, onChange, hint }) => (
    <div>
      <label htmlFor="mock-rich-text-editor">{label}</label>
      <textarea
        id="mock-rich-text-editor"
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {hint ? <p>{hint}</p> : null}
    </div>
  ),
}));

vi.mock("../config/env", () => ({
  STORAGE_PREFIX: "tradazone_test",
  IS_STAGING: false,
  APP_NAME: "Tradazone",
}));

vi.mock("../context/AuthContext", () => ({
  useAuthActions: () => ({
    connectWallet: mockConnectWallet,
    updateProfile: mockUpdateProfile,
  }),
  useAuthUser: () => mockUser,
  useAuthWalletState: () => ({
    lastWallet: mockLastWallet,
  }),
}));

vi.mock("../components/ui/ConnectWalletModal", () => ({
  default: ({ isOpen, onConnect }) =>
    isOpen ? (
      <button data-testid="mock-connect-success" onClick={() => onConnect()}>
        Simulate Connect
      </button>
    ) : null,
}));

async function renderSignIn() {
  const { default: SignIn } = await import("../pages/auth/SignIn");
  const { BrowserRouter } = await import("react-router-dom");

  render(
    React.createElement(BrowserRouter, null, React.createElement(SignIn)),
  );
}

beforeEach(() => {
  vi.resetModules();
  localStorage.clear();
  mockNavigate = vi.fn();
  mockSearchParams = new URLSearchParams();
  mockUser = { isAuthenticated: false, profileDescription: "" };
  mockLastWallet = "GABCD123456789";
  mockConnectWallet.mockReset();
  mockUpdateProfile.mockReset();
});

describe("SignIn", () => {
  it("renders a saved rich text draft for returning users", async () => {
    localStorage.setItem(DRAFT_KEY, "<p>Saved <strong>draft</strong></p>");

    await renderSignIn();

    expect(screen.getByLabelText(/business description/i)).toHaveValue(
      "<p>Saved <strong>draft</strong></p>",
    );
  });

  it("persists sanitized drafts to localStorage", async () => {
    await renderSignIn();

    fireEvent.change(screen.getByLabelText(/business description/i), {
      target: {
        value: "<p>Trusted <strong>merchant</strong><script>alert(1)</script></p>",
      },
    });

    expect(localStorage.getItem(DRAFT_KEY)).toBe(
      "<p>Trusted <strong>merchant</strong></p>",
    );
    expect(
      screen.getByText(/description draft will be attached to the next wallet connection/i),
    ).toBeInTheDocument();
  });

  it("syncs the sanitized description into the auth session after connect", async () => {
    const user = userEvent.setup();

    await renderSignIn();

    fireEvent.change(screen.getByLabelText(/business description/i), {
      target: {
        value: "<p>Preferred <strong>partner</strong><script>alert(1)</script></p>",
      },
    });

    await user.click(screen.getByRole("button", { name: /connect wallet/i }));
    await user.click(screen.getByTestId("mock-connect-success"));

    expect(mockUpdateProfile).toHaveBeenCalledWith({
      profileDescription: "<p>Preferred <strong>partner</strong></p>",
    });
    expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true });
  });

  it("redirects authenticated users immediately", async () => {
    mockSearchParams = new URLSearchParams("redirect=/dashboard");
    mockUser = {
      isAuthenticated: true,
      profileDescription: "<p>Existing</p>",
    };

    await renderSignIn();

    expect(mockNavigate).toHaveBeenCalledWith("/dashboard", { replace: true });
  });
});
