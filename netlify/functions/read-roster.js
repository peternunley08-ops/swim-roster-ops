// Reads a roster photo with Claude vision. The API key stays on the server.
export default async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Server not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Bad request" }), { status: 400 });
  }

  const { image, media_type } = body;
  if (!image) {
    return new Response(JSON.stringify({ error: "No image provided" }), { status: 400 });
  }

  const prompt = `This is a photo of a swim lesson roster sheet (ACTIVE Network custom report). Extract the data.

The printed table has columns: Participant Name, Primary P/G Name (parent/guardian), Season name, Session name (which contains the level like "Level 3 - Stroke Readiness"), Age, Balance.

There is also handwriting on the sheet: usually the LEVEL (e.g. "LEVEL 3"), a TIME (e.g. "10AM"), and instructor first names (e.g. "Whitney, Abby, Layla"). Names that are crossed out should be flagged. A name written in below the table may be an added student.

Return ONLY valid JSON, no markdown, no preamble, in this exact shape:
{
  "time": "10am",
  "level": "Level 3",
  "instructors": ["Whitney","Abby"],
  "students": [
    {"name":"Full Name","guardian":"Parent Name","age":8,"level":"Level 3","balance":0,"crossedOut":false}
  ]
}
Normalize time to one of: 10am, 11am, 12pm, 1pm, 2pm. Normalize level to "Level 1".."Level 6". If a student row shows a different session/level than the handwritten one, use that row's actual level.`;

  try {
    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1500,
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: media_type || "image/jpeg", data: image } },
              { type: "text", text: prompt },
            ],
          },
        ],
      }),
    });

    const data = await aiRes.json();
    const text = (data.content || [])
      .filter((i) => i.type === "text")
      .map((i) => i.text)
      .join("\n")
      .replace(/```json|```/g, "")
      .trim();

    const parsed = JSON.parse(text);
    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Could not read the sheet" }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }
};
