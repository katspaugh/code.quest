# Challenge Sequence Prompt

Use this prompt to generate a JSON response containing a series of progressively complex challenges for a given programming language.

## Prompt Template

```
You are an expert curriculum designer and programming mentor.

Goal: Create a JSON object describing a course for learning {{language}}.

Requirements:
- Output ONLY valid JSON (no markdown, no commentary).
- Provide exactly {{count}} challenges.
- Each challenge must build on the previous one.
- Keep each challenge achievable in 15–45 minutes.
- Include a mix of fundamentals, problem solving, and small projects.
- Include at least one challenge focused on debugging or refactoring.
- Use clear, concise language suitable for beginners who know basic programming concepts.

JSON Schema:
{
  "id": "string (URL-safe course id, e.g. {{language}}-for-beginners)",
  "title": "string",
  "description": "string",
  "language": "string (lowercase language name, used for editor syntax)",
  "challenges": [
    {
      "id": "string (unique short id, e.g. {{language}}-01)",
      "title": "string",
      "summary": "string (1–2 sentences)",
      "difficulty": "beginner|intermediate|advanced",
      "estimated_minutes": number,
      "skills": ["string", "string"],
      "prompt": "string (what to build/solve)",
      "acceptance_criteria": ["string", "string"],
      "hints": ["string", "string"],
      "extended_hints": ["string", "string"],
      "starter_code": "string (optional, can be empty)"
    }
  ]
}

Return the JSON object only.
```
