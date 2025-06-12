"use client";

import { useState, useCallback } from "react";
import axios from "axios";

export default function ImageUploader() {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const clearState = () => {
    setFile(null);
    setPreviewUrl("");
    setFeedback(null);
    setLoading(false);
    setError("");
  };

  const handleFileChange = (e) => {
    clearState();
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
    }
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    clearState();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      setFile(droppedFile);
      setPreviewUrl(URL.createObjectURL(droppedFile));
    }
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleClick = () => {
    if (!previewUrl) {
      document.getElementById("fileInput")?.click();
    }
  };

  const handleAnalyzeClick = async () => {
    if (!file) return;

    setLoading(true);
    setFeedback(null);
    setError("");
    const formData = new FormData();
    formData.append("image", file);

    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/analyze`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      setFeedback(response.data);
    } catch (error) {
      console.error("Error analyzing image:", error);
      setError("Failed to analyze image. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        className={`border-2 border-dashed border-slate-500 rounded-lg text-center transition-colors ${
          !previewUrl
            ? "p-8 cursor-pointer hover:border-slate-400"
            : "p-4"
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={handleClick}
      >
        <input
          type="file"
          id="fileInput"
          className="hidden"
          onChange={handleFileChange}
          accept="image/*"
        />
        {previewUrl ? (
          <div className="flex flex-col items-center">
            <img
              src={previewUrl}
              alt="Preview"
              className="max-w-full h-auto mx-auto rounded-lg mb-4"
            />
            <div className="flex gap-4">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleAnalyzeClick();
                }}
                className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
                disabled={loading}
              >
                {loading ? "Analyzing..." : "Analyze"}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  clearState();
                }}
                className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded"
              >
                Remove Image
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-32">
            <p className="text-slate-400">
              Drag & drop an image here, or click to select a file
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 text-red-400 text-center">
          <p>{error}</p>
        </div>
      )}

      {feedback && (
        <div className="mt-6 text-left">
          <h2 className="text-2xl font-bold mb-4 text-center">Analysis Results</h2>
          <div className="mb-6 bg-slate-800 p-6 rounded-lg">
            <h3 className="text-xl font-semibold mb-2">Overall Feedback</h3>
            <p className="text-slate-300">{feedback.overallFeedback}</p>
          </div>
          <div>
            <h3 className="text-xl font-semibold mb-4 text-center">Specific Feedback</h3>
            <div className="space-y-8">
              {feedback.specificFeedback.map((item, index) => (
                <div key={index} className="bg-slate-800 p-6 rounded-lg grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                  <div>
                    <h4 className="font-bold text-lg mb-2">Critique</h4>
                    <p className="text-slate-300 mb-4">{item.critique}</p>
                    
                    {/*
                    <h4 className="font-bold text-lg mb-2">Inspiration from Dribbble</h4>
                    <div className="grid grid-cols-3 gap-2">
                      {item.dribbbleImageUrls.map((url, i) => (
                        <a href={url} key={i} target="_blank" rel="noopener noreferrer">
                          <img src={url} alt={`Dribbble inspiration ${i + 1}`} className="rounded-md hover:opacity-80 transition-opacity" />
                        </a>
                      ))}
                    </div>
                    */}
                  </div>
                  <div>
                    <h4 className="font-bold text-lg mb-2">Cropped Area</h4>
                    <img src={item.croppedImageUrl} alt={`Critique area ${index + 1}`} className="rounded-lg border-2 border-slate-600" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 