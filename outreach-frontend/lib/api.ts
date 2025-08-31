export const API_URL = process.env.NEXT_PUBLIC_API_URL!;

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
export async function fetchJobs(token: string) {
  const res = await fetch(`${API_URL}/jobs`, {
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

/**
 * Buy extra credits (/buy-credits)
 */
export async function buyCredits(token: string, addon: string) {
  const formData = new FormData();
  formData.append("addon", addon);

  const res = await fetch(`${API_URL}/buy-credits`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!res.ok) {
    throw new Error("Failed to initiate credit purchase");
  }

  return res.json(); // returns { checkout_url }
}
