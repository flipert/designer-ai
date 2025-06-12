import ImageUploader from "@/components/ImageUploader";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-800 p-8 text-white">
      <div className="w-full max-w-2xl text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          AI-Powered UI/UX Feedback
        </h1>
        <p className="mt-4 text-lg text-slate-300">
          Upload a screenshot of any UI to get instant, actionable feedback.
        </p>
        <div className="mt-8">
          <ImageUploader />
        </div>
      </div>
    </main>
  );
}
