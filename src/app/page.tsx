import { Suspense } from "react";
import CoursePage from "./CoursePage";

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
      <CoursePage />
    </Suspense>
  );
}
