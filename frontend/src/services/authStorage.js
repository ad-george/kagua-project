// Temporary local storage stand-in for accounts, until Track B's real
// auth endpoints are ready. Swap these functions for real fetch() calls
// later — the rest of the app doesn't need to change, just this file.

const USERS_KEY = "kagua_users";
const CURRENT_USER_KEY = "kagua_current_user";

function getAllUsers() {
  const raw = localStorage.getItem(USERS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function signup({ name, phone, county, password }) {
  const users = getAllUsers();

  const existing = users.find((u) => u.phone === phone);
  if (existing) {
    return { success: false, error: "An account with this phone number already exists." };
  }

  const newUser = {
    id: Date.now().toString(),
    name,
    phone,
    county,
    password, // NOTE: plain text, fine for local mock only — never do this in real production
    conversations: [],
  };

  users.push(newUser);
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(newUser));

  return { success: true, user: newUser };
}

export function login({ phone, password }) {
  const users = getAllUsers();
  const user = users.find((u) => u.phone === phone && u.password === password);

  if (!user) {
    return { success: false, error: "Incorrect phone number or password." };
  }

  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  return { success: true, user };
}

export function logout() {
  localStorage.removeItem(CURRENT_USER_KEY);
}

export function getCurrentUser() {
  const raw = localStorage.getItem(CURRENT_USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function saveConversation(userId, conversation) {
  const users = getAllUsers();
  const userIndex = users.findIndex((u) => u.id === userId);
  if (userIndex === -1) return;

  users[userIndex].conversations.push({
    ...conversation,
    date: new Date().toISOString(),
  });

  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(users[userIndex]));
}