// Auto-upgrade HTTP to HTTPS in production for security
let apiUrl = process.env.NEXT_PUBLIC_API_URL!;

// If we're in production (HTTPS) and API URL is HTTP, upgrade to HTTPS
if (typeof window !== 'undefined' && window.location.protocol === 'https:' && apiUrl.startsWith('http://')) {
  apiUrl = apiUrl.replace('http://', 'https://');
  console.warn('⚠️ Auto-upgraded API_URL from HTTP to HTTPS for production:', apiUrl);
}

export const API_URL = apiUrl;
console.log("API_URL = ", apiUrl);


/**
 * Fetch user info (/me)
 */
export async function fetchUserInfo(token: string) {
  const res = await fetch(`${API_URL}/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    throw new Error("Failed to fetch user info");
  }
  return res.json();
}

/**
 * Fetch jobs list (/jobs)
 */
export async function fetchJobs(token: string, offset = 0, limit = 5) {
  const res = await fetch(`${API_URL}/jobs?offset=${offset}&limit=${limit}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    throw new Error("Failed to fetch jobs");
  }
  return res.json();
}


/**
 * Create a new job (/jobs)
 */
export async function createJob(
  token: string,
  formData: FormData
) {
  const res = await fetch(`${API_URL}/jobs`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });
  if (!res.ok) {
    throw new Error("Failed to create job");
  }
  return res.json();
}

interface CheckoutSessionPayload {
  plan: string;
  addon?: boolean;
  quantity?: number;
  [key: string]: unknown;
}

interface CheckoutSessionResponse {
  id: string;
}

/**
 * Create Stripe checkout session (/create_checkout_session)
 */
export async function buyCredits(
  token: string,
  payload: CheckoutSessionPayload
): Promise<CheckoutSessionResponse> {
  const res = await fetch(`${API_URL}/create_checkout_session`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.error || "Failed to initiate credit purchase");
  }

  if (!data?.id) {
    throw new Error(data?.error || "Invalid checkout session response");
  }

  return { id: data.id };
}
