const BASE_URL = "http://127.0.0.1:8002";

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

// Generates the Kagua Summary — takes the context plus the comparison
// result already computed by getComparison, mirroring the shape main.py's
// /summary endpoint expects (SummaryRequest: { context, comparison }).
export async function getSummary(context, comparison) {
  const response = await fetch(`${BASE_URL}/summary`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ context, comparison }),
  });
  if (!response.ok) throw new Error("Summary request failed");
  return response.json();
}

export async function getSourceDetails(sourcesUsed) {
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

// Fetches a single journey by ID, including its saved `steps` — used to
// resume an in-progress conversation exactly where the farmer left off.
export async function getJourney(journeyId) {
  const response = await fetch(`${BASE_URL}/journey/${journeyId}`);
  if (!response.ok) throw new Error("Could not fetch journey");
  return response.json();
}

export async function saveFollowUp(journeyId, outcome, rating) {
  const response = await fetch(`${BASE_URL}/journey/${journeyId}/follow-up`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ outcome: outcome ?? null, rating: rating ?? null }),
  });
  if (!response.ok) throw new Error("Could not save follow-up");
  return response.json();
}