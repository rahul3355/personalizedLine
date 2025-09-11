export const supabase = {
  auth: {
    getSession: jest.fn().mockResolvedValue({
  data: {
    session: {
      user: {
        id: "123",
        email: "test@example.com",
        user_metadata: {
          full_name: "Test User",
          avatar_url: null,
        },
      },
    },
  },
}),
    onAuthStateChange: jest.fn((_cb: any) => {
      return { data: { subscription: { unsubscribe: jest.fn() } } };
    }),
  },
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
  insert: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue({ data: null, error: null }),
};
