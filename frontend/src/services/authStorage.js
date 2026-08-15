const BASE_URL = "http://127.0.0.1:8002";
const CURRENT_USER_KEY = "kagua_current_user";

export async function signup({ name, phone, county, password }) {
  try {
    const response = await fetch(`${BASE_URL}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone, county, pin: password }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      return {
        success: false,
        error: data.detail || "Could not create account.",
      };
    }

    const user = await response.json();
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    return { success: true, user };
  } catch (err) {
    return { success: false, error: "Could not reach the server." };
  }
}

export async function login({ phone, password }) {
  try {
    const response = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, pin: password }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      return {
        success: false,
        error: data.detail || "Invalid phone or PIN.",
      };
    }

    const user = await response.json();
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    return { success: true, user };
  } catch (err) {
    return { success: false, error: "Could not reach the server." };
  }
}

// keep logout, getCurrentUser, fetchJourneys the same

export function logout() {
  localStorage.removeItem(CURRENT_USER_KEY);
}

export function getCurrentUser() {
  const raw = localStorage.getItem(CURRENT_USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function fetchJourneys(phone) {
  try {
    const response = await fetch(
      `${BASE_URL}/user/${encodeURIComponent(phone)}/journeys`,
    );
    if (!response.ok) return [];
    const data = await response.json();
    return data.journeys || [];
  } catch (err) {
    return [];
  }
}
