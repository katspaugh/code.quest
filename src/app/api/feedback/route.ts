import { NextResponse } from "next/server";

const openAiUrl = "https://api.openai.com/v1/chat/completions";

export async function POST(request: Request) {
  const { code, prompt, apiKey } = (await request.json()) as {
    code?: string;
    prompt?: string;
    apiKey?: string;
  };

  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing OpenAI API key." },
      { status: 400 }
    );
  }

  if (!code || !prompt) {
    return NextResponse.json(
      { error: "Missing code or prompt." },
      { status: 400 }
    );
  }

  try {
    const payload = {
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a strict evaluator. Check only the minimum requirements for completion. Do not suggest improvements beyond the scope of the task. Respond with JSON only: {\"result\": \"ok\"|\"needs_work\", \"feedback\": \"...\"}.",
        },
        {
          role: "user",
          content: `Challenge prompt:\n${prompt}\n\nLearner code:\n${code}`,
        },
      ],
      temperature: 0.2,
    };

    const response = await fetch(openAiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: "OpenAI request failed", detail: errorBody },
        { status: response.status }
      );
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const content = data.choices?.[0]?.message?.content?.trim();

    if (!content) {
      return NextResponse.json({
        result: "needs_work",
        feedback: "No feedback returned.",
      });
    }

    try {
      const parsed = JSON.parse(content) as {
        result?: "ok" | "needs_work";
        feedback?: string;
      };

      if (parsed.result && typeof parsed.feedback === "string") {
        return NextResponse.json(parsed);
      }
    } catch (error) {
      return NextResponse.json({
        result: "needs_work",
        feedback: "Invalid feedback response from model.",
      });
    }

    return NextResponse.json({
      result: "needs_work",
      feedback: "Invalid feedback response from model.",
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Unexpected server error", detail: String(error) },
      { status: 500 }
    );
  }
}
