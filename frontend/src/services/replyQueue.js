// A lightweight offline queue for Screen 4's reply-capture saves (Idea 12
// + Idea 13's connectivity concern, scoped down to just this one call
// rather than the full app-wide offline-queueing feature).
//
// Structure in localStorage: { [journeyId]: { [replyIndex]: text, ... } }
// A journey only appears here if its most recent save attempt failed —
// successful saves are never queued, this is purely a retry backlog.
const QUEUE_KEY = "kagua_pending_replies";

export function getPendingQueue() {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeQueue(queue) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // localStorage unavailable — queueing becomes best-effort only,
    // matches how saveDraft/clearDraft already degrade in App.js.
  }
}

// Merges `replies` into whatever is already queued for this journey
// (rather than overwriting), so a second failed save doesn't drop an
// earlier failed reply that hasn't been retried yet.
export function queueReplies(journeyId, replies) {
  const queue = getPendingQueue();
  queue[journeyId] = { ...(queue[journeyId] || {}), ...replies };
  writeQueue(queue);
}

// Clears a journey's queued replies once they've been successfully synced.
export function clearQueuedReplies(journeyId) {
  const queue = getPendingQueue();
  if (queue[journeyId]) {
    delete queue[journeyId];
    writeQueue(queue);
  }
}