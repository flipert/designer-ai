"use client";
import { useState, useMemo } from "react";
import ImageUploader from "@/components/ImageUploader";

const pastelGradients = [
  "bg-gradient-to-r from-pink-100 via-blue-100 to-green-100",
  "bg-gradient-to-r from-yellow-100 via-pink-100 to-purple-100",
  "bg-gradient-to-r from-teal-100 via-lime-100 to-amber-100",
  "bg-gradient-to-r from-indigo-100 via-sky-100 to-rose-100",
  "bg-gradient-to-r from-fuchsia-100 via-cyan-100 to-emerald-100"
];

export default function Home() {
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(false);

  // Pick a random gradient for the overall feedback card on each render
  const overallGradient = useMemo(() => {
    return pastelGradients[Math.floor(Math.random() * pastelGradients.length)];
  }, [feedback]);

  return (
    <div className="bg-neutral-50 min-h-screen">
      <main className="relative text-black">
        <div className="w-full flex flex-col md:flex-row">
          {/* Left Panel */}
          <div className="md:w-1/2 w-full md:fixed md:top-0 md:left-0 md:h-screen flex items-center justify-center bg-white border-r border-neutral-200 text-black">
            <div className="flex flex-col items-center justify-center w-full max-w-lg p-8">
              <h1 className="w-full text-left mb-2">
                <span className="block text-4xl md:text-5xl font-bold tracking-widest uppercase font-sans text-black" style={{letterSpacing: '0.1em'}}>AI POWERED</span>
                <span className="block text-4xl md:text-5xl font-serif font-normal text-black mt-1">UI UX FEEDBACK</span>
              </h1>
              <p className="text-lg text-neutral-600 mb-4 max-w-xl text-left w-full" style={{fontFamily: 'serif'}}>
                Upload a screenshot of any UI to get instant, actionable feedback and design inspiration.
              </p>
              <ImageUploader setFeedback={setFeedback} setLoading={setLoading} loading={loading} />
            </div>
          </div>
          {/* Right Panel */}
          <div className="md:w-1/2 w-full md:ml-[50%] min-h-screen bg-neutral-50 text-black">
            <div className="w-full p-8">
              {loading && (
                <div className="fixed inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-10">
                  <span className="text-xl font-serif text-neutral-600 animate-pulse">Analyzing...</span>
                </div>
              )}
              {feedback && (
                <div className="w-full max-w-2xl mx-auto">
                  <h2 className="text-2xl font-bold mb-4 text-left font-serif tracking-tight">Analysis Results</h2>
                  {/* Gradient border and background for overall feedback card */}
                  <div className={`mb-6 p-[3px] rounded-lg ${overallGradient}`}>
                    <div className={`p-6 rounded-lg ${overallGradient} bg-clip-padding backdrop-blur-sm bg-opacity-80`}> 
                      <h3 className="text-xl font-semibold mb-2 font-serif">Overall Feedback</h3>
                      <p className="font-serif">{feedback.overallFeedback}</p>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-4 text-left font-serif">Specific Feedback</h3>
                    <div className="space-y-8">
                      {feedback.specificFeedback.map((item, index) => (
                        <div key={index} className="bg-white p-6 rounded-lg flex flex-col md:flex-row gap-6 items-start border border-neutral-200">
                          <div className="flex-1">
                            <h4 className="font-bold text-lg mb-2 font-serif">{item.uxHeuristic || "[to be determined]"}</h4>
                            <p className="text-neutral-700 mb-4 font-serif">{item.critique}</p>
                          </div>
                          <div className="w-full md:w-48 flex-shrink-0 flex items-center">
                            <img src={item.croppedImageUrl} alt={`Critique area ${index + 1}`} className="rounded-lg border border-neutral-200 object-contain max-h-40 w-full bg-neutral-100" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
