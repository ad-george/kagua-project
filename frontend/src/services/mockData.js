// Mock data matching Track A's real, tested output shapes.

export const mockExtractContext = {
  reported_problem: "grey rectangular spots",
  crop: "maize",
  observations: [],
  advice_received: [
    { source_type: "neighbour", organization: null, advice: "wait" },
    { source_type: "agrovet", organization: null, advice: "spray" },
  ],
  mentioned_weather: [],
  language: "english",
  extraction_confidence: "high",
  could_not_understand: false,
  raw_input: "My maize leaves have grey rectangular spots. My neighbour said wait, the agrovet said spray.",
  county: "Kiambu",
  season: null,
  growth_stage: null,
};

export const mockComparisonHigh = {
  confidence: "HIGH",
  guidance_mode: "SPECIFIC",
  sources_found: 1,
  observed: ["grey rectangular spots"],
  perspectives: [
    {
      source: "neighbour",
      view: "The neighbour thinks waiting might be the best approach, possibly because they are unsure of the cause or the best course of action.",
    },
    {
      source: "agrovet",
      view: "The agrovet suggests spraying, which might indicate they suspect a pest or disease that can be managed with spray applications.",
    },
  ],
  uncertainty: [
    "The exact cause of the grey rectangular spots is not confirmed.",
    "The best management approach is not certain without further information.",
  ],
  sources_used: [
    {
      name: "Plantwise (CABI)",
      topic: "Fungal Diseases (Grey Leaf Spot)",
      snippet:
        "Grey Leaf Spot is a fungal disease characterized by grey rectangular lesions on maize leaves, often beginning on lower leaves and moving upwards.",
      link: "https://www.plantwise.org/knowledgebank",
    },
  ],
  guardrail_triggered: false,
  guardrail_violations: [],
};

export const mockComparisonLow = {
  confidence: "LOW",
  guidance_mode: "GENERAL_OBSERVATION",
  sources_found: 0,
  observed: ["maize did not germinate"],
  perspectives: [],
  uncertainty: [
    "why the seeds did not germinate",
    "potential factors affecting seed germination",
  ],
  sources_used: [],
  guardrail_triggered: false,
  guardrail_violations: [],
};

export const mockSourceDetails = [
  {
    name: "Plantwise (CABI)",
    topic: "Fungal Diseases (Grey Leaf Spot)",
    summary:
      "Core diagnostic and non-chemical management guidelines highlighting residue carry-over mechanics, moisture thresholds within dense canopies, and variety selection criteria to suppress Grey Leaf Spot outbreaks.",
    learning_points: [
      "Recognize that Grey Leaf Spot is primarily a residue-borne disease that survives between seasons on infected maize debris.",
      "Conduct regular field scouting to identify early symptoms before severe canopy damage and blighting develop.",
      "Implement systematic crop rotation with non-host families to reduce fungal carry-over in the soil plot.",
      "Balance residue retention practices with sanitation needs, adjusting actions based on localized disease history.",
      "Prioritize maize varieties with documented tolerance or resistance to minimize structural yield impacts.",
    ],
    link: "https://www.plantwise.org/knowledgebank",
    audio_url: null,
  },
];