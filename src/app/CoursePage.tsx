"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Editor from "@monaco-editor/react";
import perlCourse from "@/data/Perl-for-beginners.json";
import goCourse from "@/data/Go-for-js-developers.json";
import courses from "@/data/courses.json";

const courseMap = {
  "Perl-for-beginners": perlCourse as Course,
  "Go-for-js-developers": goCourse as Course,
} as const;

type CourseId = keyof typeof courseMap;

type CourseSummary = {
  id: string;
  title: string;
  description: string;
  language: string;
  challengeCount: number;
};

type Challenge = {
  id: string;
  title: string;
  summary: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  estimated_minutes: number;
  skills: string[];
  prompt: string;
  acceptance_criteria: string[];
  hints: string[];
  extended_hints?: string[];
  starter_code: string;
};

type Course = {
  id: string;
  title: string;
  description: string;
  language: string;
  challenges: Challenge[];
};

type FeedbackResponse = {
  result: "ok" | "needs_work";
  feedback: string;
};

export default function CoursePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const courseId = searchParams.get("course") as CourseId | null;
  const course = courseId ? courseMap[courseId] : undefined;
  const editorLanguage = course?.language ?? "plaintext";
  const stepParam = Number(searchParams.get("step") || "1");
  const [apiKey, setApiKey] = useState("");
  const [code, setCode] = useState("");
  const [feedback, setFeedback] = useState<FeedbackResponse | null>(null);
  const [feedbackText, setFeedbackText] = useState("Awaiting feedback...");
  const [isLoading, setIsLoading] = useState(false);
  const [isHelping, setIsHelping] = useState(false);
  const [challengeIndex, setChallengeIndex] = useState(0);
  const [showApiKeyInput, setShowApiKeyInput] = useState(true);
  const [showExtendedHints, setShowExtendedHints] = useState(false);

  const handleApiKeyChange = (value: string) => {
    setApiKey(value);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("code.quest.apiKey", value);
    }
    if (value.length > 0) {
      setShowApiKeyInput(false);
    }
  };

  const updateUrlStep = (nextIndex: number) => {
    if (!courseId) {
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    params.set("course", courseId);
    params.set("step", String(nextIndex + 1));
    router.replace(`/?${params.toString()}`);
  };

  const openCourse = (selectedCourseId: CourseId) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("course", selectedCourseId);
    params.set("step", "1");
    router.push(`/?${params.toString()}`);
  };

  useEffect(() => {
    const storedKey = window.localStorage.getItem("code.quest.apiKey");
    if (storedKey) {
      setApiKey(storedKey);
      setShowApiKeyInput(false);
    }
  }, []);

  useEffect(() => {
    if (!course) {
      return;
    }

    const totalChallenges = course.challenges.length;
    const normalizedStep = Number.isNaN(stepParam)
      ? 1
      : Math.min(Math.max(stepParam, 1), totalChallenges);
    const nextIndex = normalizedStep - 1;

    if (nextIndex !== challengeIndex) {
      setChallengeIndex(nextIndex);
      const starter = course.challenges[nextIndex]?.starter_code || "";
      setCode(starter);
      setFeedback(null);
      setFeedbackText("Awaiting feedback...");
      setShowExtendedHints(false);
    }

    if (!searchParams.get("step")) {
      updateUrlStep(nextIndex);
    }
  }, [course, stepParam, challengeIndex, searchParams]);

  const activeChallenge = useMemo<Challenge | undefined>(() => {
    return course?.challenges?.[challengeIndex];
  }, [course, challengeIndex]);

  useEffect(() => {
    if (!course) {
      return;
    }

    import("monaco-editor/esm/vs/basic-languages/go/go.contribution");
    import("monaco-editor/esm/vs/basic-languages/perl/perl.contribution");
  }, [course]);

  const handleNextChallenge = () => {
    if (!course) {
      return;
    }

    const nextIndex = Math.min(challengeIndex + 1, course.challenges.length - 1);
    setChallengeIndex(nextIndex);
    const starter = course.challenges[nextIndex]?.starter_code || "";
    setCode(starter);
    setFeedback(null);
    setFeedbackText("Awaiting feedback...");
    setShowExtendedHints(false);
    updateUrlStep(nextIndex);
  };

  const requestFeedback = async (intent: "evaluate" | "help") => {
    if (!activeChallenge) {
      setFeedback(null);
      setFeedbackText("No challenge found for this course.");
      return;
    }

    if (!apiKey) {
      setFeedback(null);
      setFeedbackText("Please add your OpenAI API key first.");
      return;
    }

    if (intent === "help") {
      setIsHelping(true);
      setFeedbackText("Gathering syntax tips...");
    } else {
      setIsLoading(true);
      setFeedbackText("Requesting feedback...");
    }

    setFeedback(null);

    try {
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content:
                  intent === "help"
                    ? "You are a concise coding coach. Provide syntax-focused tips based on the task and the learner's current code. Stay within the task scope. Respond with JSON only: {\"result\": \"needs_work\", \"feedback\": \"...\"}."
                    : "You are a strict evaluator. Check only the minimum requirements for completion. Do not suggest improvements beyond the scope of the task. Respond with JSON only: {\"result\": \"ok\"|\"needs_work\", \"feedback\": \"...\"}.",
              },
              {
                role: "user",
                content: `Challenge prompt:\n${activeChallenge.prompt}\n\nMinimum requirements:\n- ${activeChallenge.acceptance_criteria.join(
                  "\n- "
                )}\n\nLearner code:\n${code}`,
              },
            ],
            temperature: intent === "help" ? 0.5 : 0.2,
          }),
        }
      );

      if (!response.ok) {
        let errorMessage = "OpenAI request failed.";
        try {
          const errorData = (await response.json()) as { error?: { message?: string } };
          errorMessage = errorData.error?.message || errorMessage;
        } catch (error) {
          errorMessage = "OpenAI request failed.";
        }

        setFeedback(null);
        setFeedbackText(errorMessage);

        if (response.status === 429) {
          setShowApiKeyInput(true);
        }
        return;
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = data.choices?.[0]?.message?.content?.trim();

      if (!content) {
        setFeedback(null);
        setFeedbackText("No feedback returned.");
        return;
      }

      try {
        const parsed = JSON.parse(content) as FeedbackResponse;
        setFeedback(parsed);
        setFeedbackText(parsed.feedback || "All requirements satisfied.");
      } catch (error) {
        setFeedback(null);
        setFeedbackText("Invalid feedback response.");
      }
    } catch (error) {
      setFeedback(null);
      setFeedbackText(`Request failed: ${String(error)}`);
    } finally {
      setIsLoading(false);
      setIsHelping(false);
    }
  };

  if (!course) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-6 py-16">
          <header className="flex flex-col gap-4">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="text-sm uppercase tracking-[0.3em] text-slate-400 transition hover:text-slate-200"
            >
              code.quest
            </button>
            <div>
              <h1 className="text-3xl font-semibold text-white sm:text-4xl">
                Choose your next quest
              </h1>
              <p className="mt-2 max-w-2xl text-slate-300">
                Pick a course to jump into AI-guided challenges.
              </p>
            </div>
          </header>

          <section className="mt-10 grid gap-6 sm:grid-cols-2">
            {(courses as CourseSummary[]).map((courseItem) => (
              <button
                key={courseItem.id}
                type="button"
                onClick={() => openCourse(courseItem.id as CourseId)}
                className="flex h-full flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-left transition hover:border-indigo-400"
              >
                <div>
                  <h2 className="text-xl font-semibold text-white">
                    {courseItem.title}
                  </h2>
                  <p className="mt-2 text-sm text-slate-300">
                    {courseItem.description}
                  </p>
                </div>
                <p className="mt-6 text-xs uppercase tracking-[0.2em] text-slate-400">
                  {courseItem.challengeCount} challenges
                </p>
              </button>
            ))}
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-10">
        <header className="flex flex-col gap-4">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="text-sm uppercase tracking-[0.3em] text-slate-400 transition hover:text-slate-200"
          >
            code.quest
          </button>
          <div>
            <h1 className="text-3xl font-semibold text-white sm:text-4xl">
              {course.title}
            </h1>
            <p className="mt-2 max-w-3xl text-slate-300">{course.description}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-white">
                Current challenge: {activeChallenge?.title}
              </h2>
              <span className="rounded-full border border-slate-800 px-3 py-1 text-xs text-slate-300">
                Step {challengeIndex + 1} of {course.challenges.length}
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-300">
              {activeChallenge?.summary}
            </p>
            <p className="mt-3 text-sm text-slate-400">
              {activeChallenge?.prompt}
            </p>
            <div className="mt-4 text-xs text-slate-400">
              Minimum requirements:
              <ul className="mt-2 list-disc space-y-1 pl-4">
                {activeChallenge?.acceptance_criteria.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            {activeChallenge?.extended_hints?.length ? (
              <div className="mt-4">
                <button
                  type="button"
                  className="text-xs font-semibold text-indigo-300 transition hover:text-indigo-200"
                  onClick={() => setShowExtendedHints((value) => !value)}
                >
                  {showExtendedHints ? "Hide syntax tips" : "Show syntax tips"}
                </button>
                {showExtendedHints ? (
                  <ul className="mt-3 list-disc space-y-1 pl-4 text-xs text-slate-300">
                    {activeChallenge.extended_hints.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
          </div>
        </header>

        <main className="mt-8 grid flex-1 gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="flex flex-col rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-semibold">Editor</h3>
                <p className="text-xs text-slate-400">Language: {course.language}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  className="rounded-full border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-indigo-400 hover:text-white"
                  onClick={() => requestFeedback("help")}
                  disabled={isLoading || isHelping}
                >
                  {isHelping ? "Getting tips..." : "Need help"}
                </button>
                <button
                  className="rounded-full bg-indigo-500 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-400"
                  onClick={() => requestFeedback("evaluate")}
                  disabled={isLoading || isHelping}
                >
                  {isLoading ? "Requesting..." : "Get feedback"}
                </button>
              </div>
            </div>
            <div className="mt-4 flex-1 overflow-hidden rounded-xl border border-slate-800">
              <Editor
                height="100%"
                defaultLanguage={editorLanguage}
                theme="vs-dark"
                value={code}
                onChange={(value) => setCode(value ?? "")}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  padding: { top: 12, bottom: 12 },
                }}
              />
            </div>
          </section>

          <section className="flex flex-col rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
            <div className="border-b border-slate-800 pb-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-base font-semibold">AI Feedback</h3>
                {feedback?.result === "ok" ? (
                  <button
                    className="rounded-full border border-emerald-400 px-4 py-2 text-xs font-semibold text-emerald-200 transition hover:border-emerald-300 hover:text-white"
                    onClick={handleNextChallenge}
                  >
                    Next challenge
                  </button>
                ) : null}
              </div>
              {showApiKeyInput ? (
                <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950 p-3">
                  <p className="text-xs text-slate-400">
                    Provide your OpenAI API key to generate feedback.
                  </p>
                  <input
                    type="password"
                    placeholder="sk-..."
                    value={apiKey}
                    onChange={(event) => handleApiKeyChange(event.target.value)}
                    className="mt-3 w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-indigo-400 focus:outline-none"
                  />
                </div>
              ) : null}
            </div>
            <div className="mt-4 flex-1 whitespace-pre-wrap text-sm text-slate-200">
              {feedbackText}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
