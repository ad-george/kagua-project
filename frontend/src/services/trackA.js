const BASE_URL = "http://127.0.0.1:8000";

export async function analyzeInput(rawInput, county, phone, name) {
  const response = await fetch(`${BASE_URL}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ raw_input: rawInput, county, phone, name }),
  });
  if (!response.ok) throw new Error("Analyze request failed");
  return response.json();
}

export async function getComparison(context, fieldObservation = []) {
  const response = await fetch(`${BASE_URL}/compare`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ context, field_observation: fieldObservation }),
  });
  if (!response.ok) throw new Error("Compare request failed");
  return response.json();
}

export async function getSourceDetails(sourcesUsed) {
  // Note: Track B's /source-details takes the raw array directly as the
  // body, not wrapped in an object like Track A's own version did.
  const response = await fetch(`${BASE_URL}/source-details`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sourcesUsed),
  });
  if (!response.ok) throw new Error("Source details request failed");
  return response.json();
}

export async function completeJourney(journeyId) {
  const response = await fetch(
    `${BASE_URL}/journey/${journeyId}/status?status=completed`,
    { method: "PUT" }
  );
  if (!response.ok) throw new Error("Could not mark journey complete");
  return response.json();
}