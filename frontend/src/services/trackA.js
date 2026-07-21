const BASE_URL = "http://localhost:8001";

export async function analyzeInput(rawInput, county = "Kiambu") {
  const response = await fetch(`${BASE_URL}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ raw_input: rawInput, county }),
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
  const response = await fetch(`${BASE_URL}/source-details`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sources_used: sourcesUsed }),
  });
  if (!response.ok) throw new Error("Source details request failed");
  return response.json();
}