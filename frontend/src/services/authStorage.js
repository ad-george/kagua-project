const BASE_URL = "http://127.0.0.1:8000";
const CURRENT_USER_KEY = "kagua_current_user";

export async function signup({ name, phone, county }) {
  try {
    const response = await fetch(
      `${BASE_URL}/test-user?phone=${encodeURIComponent(phone)}&county=${encodeURIComponent(county)}&name=${encodeURIComponent(name)}`,
      { method: "POST" }
    );
    if (!response.ok) {
      return { success: false, error: "Could not create account. Is the backend running?" };
    }
    const user = await response.json();
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    return { success: true, user };
  } catch (err) {
    return { success: false, error: "Could not reach the server." };
  }
}

export async function login({ phone }) {
  try {
    // Looks up the existing account by phone. If it doesn't exist yet,
    // this will create one — acceptable for MVP since there's no real
    // password check on the backend either way.
    const response = await fetch(
      `${BASE_URL}/test-user?phone=${encodeURIComponent(phone)}&county=Kiambu`,
      { method: "POST" }
    );
    if (!response.ok) {
      return { success: false, error: "Could not log in. Is the backend running?" };
    }
    const user = await response.json();
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    return { success: true, user };
  } catch (err) {
    return { success: false, error: "Could not reach the server." };
  }
}

export function logout() {
  localStorage.removeItem(CURRENT_USER_KEY);
}

export function getCurrentUser() {
  const raw = localStorage.getItem(CURRENT_USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function fetchJourneys(phone) {
  try {
    const response = await fetch(`${BASE_URL}/user/${encodeURIComponent(phone)}/journeys`);
    if (!response.ok) return [];
    const data = await response.json();
    return data.journeys || [];
  } catch (err) {
    return [];
  }
}