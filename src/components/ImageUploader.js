"use client";

import { useState, useCallback } from "react";
import axios from "axios";

export default function ImageUploader({ setFeedback, setLoading, loading }) {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
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
        "http://localhost:8000/api/analyze",
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
    <div className="w-full flex flex-col md:flex-row gap-0 h-full">
      {/* Image area (left) */}
      <div className="md:w-[420px] w-full flex flex-col items-start justify-start">
        <div
          className={`border-2 border-dashed border-neutral-300 rounded-xl text-center transition-colors bg-white w-full flex flex-col items-center justify-center ${!previewUrl ? "p-6 cursor-pointer hover:border-neutral-400" : "p-3"}`}
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
            <div className="flex flex-col items-center w-full">
              <img
                src={previewUrl}
                alt="Preview"
                className="rounded-lg border border-neutral-200 shadow-md object-contain max-h-[320px] w-auto bg-neutral-100"
                style={{ background: '#f7f7f7' }}
              />
              <div className="flex flex-wrap gap-3 mt-3 w-full justify-center">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAnalyzeClick();
                  }}
                  className="bg-black hover:bg-neutral-800 text-white font-bold py-2 px-4 rounded"
                  disabled={loading}
                >
                  Analyze
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    clearState();
                  }}
                  className="bg-neutral-300 hover:bg-neutral-400 text-black font-bold py-2 px-4 rounded"
                  disabled={loading}
                >
                  Remove Image
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-24 w-full">
              <p className="text-neutral-500 text-sm font-serif">
                Drag & drop an image here, or click to select a file
              </p>
            </div>
          )}
        </div>
        {error && (
          <div className="mt-3 text-red-500 text-center">
            <p>{error}</p>
          </div>
        )}
      </div>
    </div>
  );
} 