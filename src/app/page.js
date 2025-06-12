import ImageUploader from "@/components/ImageUploader";

export default function Home() {
  return (
    <main className="bg-slate-900 min-h-screen flex items-center justify-center text-white">
      <div className="text-center p-4">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          AI-Powered UI/UX Feedback
        </h1>
        <p className="text-lg text-slate-300 mb-8 max-w-2xl mx-auto">
          Upload a screenshot of any UI to get instant, actionable feedback and
          design inspiration.
        </p>
        <ImageUploader />
      </div>
    </main>
  );
}
