import { render, screen, waitFor } from "@testing-library/react";

// mock Supabase client BEFORE importing AuthProvider
jest.mock("../lib/supabaseClient");

import { AuthProvider, useAuth } from "../lib/AuthProvider";

// silence console.error in tests
beforeAll(() => {
  jest.spyOn(console, "error").mockImplementation(() => {});
});

function TestComponent() {
  const { session, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  return <div>{session ? "Authenticated" : "Not Authenticated"}</div>;
}

describe("AuthProvider", () => {
  it("renders Authenticated when session exists", async () => {
    // arrange mock for authenticated session
    const { supabase } = require("../lib/supabaseClient");
    supabase.auth.getSession.mockResolvedValueOnce({
      data: {
        session: {
          user: {
            id: "123",
            email: "test@example.com",
            user_metadata: { full_name: "Test User", avatar_url: null },
          },
        },
      },
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByText("Loading...")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Authenticated")).toBeInTheDocument();
    });
  });

  it("renders Not Authenticated when session is null", async () => {
    const { supabase } = require("../lib/supabaseClient");
    supabase.auth.getSession.mockResolvedValueOnce({ data: { session: null } });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByText("Loading...")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Not Authenticated")).toBeInTheDocument();
    });
  });

  it("updates when onAuthStateChange fires", async () => {
    const { supabase } = require("../lib/supabaseClient");

    // Start unauthenticated
    supabase.auth.getSession.mockResolvedValueOnce({ data: { session: null } });

    // Mock the listener to simulate login after init
    supabase.auth.onAuthStateChange.mockImplementation((cb: any) => {
      setTimeout(() => {
        cb("SIGNED_IN", {
          user: {
            id: "456",
            email: "newuser@example.com",
            user_metadata: { full_name: "New User", avatar_url: null },
          },
        });
      }, 10);

      return { data: { subscription: { unsubscribe: jest.fn() } } };
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByText("Loading...")).toBeInTheDocument();

    // first state → Not Authenticated
    await waitFor(() => {
      expect(screen.getByText("Not Authenticated")).toBeInTheDocument();
    });

    // after event fires → Authenticated
    await waitFor(() => {
      expect(screen.getByText("Authenticated")).toBeInTheDocument();
    });
  });
});
