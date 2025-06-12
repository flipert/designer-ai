require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const axios = require("axios");
const {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} = require("@google/generative-ai");

const app = express();
const port = 8000;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

app.use(cors());
app.use('/crops', express.static(path.join(__dirname, 'public/crops')));

const upload = multer({ dest: "uploads/" });

const generationConfig = {
  temperature: 0.4,
  topK: 32,
  topP: 1,
  maxOutputTokens: 4096,
  responseMimeType: "application/json",
};

const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
];

function fileToGenerativePart(path, mimeType) {
  return {
    inlineData: {
      data: Buffer.from(fs.readFileSync(path)).toString("base64"),
      mimeType,
    },
  };
}

/*
async function fetchDribbbleShots(query) {
  try {
    const response = await axios.get("https://api.dribbble.com/v2/shots", {
      params: { q: query, per_page: 3 },
      headers: {
        Authorization: `Bearer ${process.env.DRIBBBLE_ACCESS_TOKEN}`,
      },
    });
    return response.data.map((shot) => shot.images.normal);
  } catch (error) {
    console.error("Error fetching from Dribbble:", error.response?.data || error.message);
    return [];
  }
}
*/

app.post("/api/analyze", upload.single("image"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No image file provided." });
  }

  const imagePath = req.file.path;

  try {
    const imageMimeType = req.file.mimetype;

    const imagePart = fileToGenerativePart(imagePath, imageMimeType);

    const prompt = `
    You are an expert UI/UX designer. Analyze the provided user interface screenshot.
    Based on your analysis, provide feedback in a strict JSON format. Do not include any text or formatting outside of the JSON object.
    The JSON object must have two root keys: "overallFeedback" and "specificFeedback".
    1. "overallFeedback": A string containing a high-level summary of your feedback, highlighting the main strengths and weaknesses of the design.
    2. "specificFeedback": An array of objects, where each object represents a specific point of feedback on a particular UI element. Each object in this array MUST contain the following four keys:
        - "critique": A string with your detailed critique or suggestion for that specific UI element.
        - "cropCoordinates": An object with the keys "x", "y", "width", and "height". These values should define a bounding box around the UI element you are critiquing, with coordinates relative to the image's dimensions. For now, you can return placeholder values.
        - "dribbbleKeywords": A string containing 2-3 relevant keywords based on your critique that can be used to search for design inspiration on Dribbble.
        - "uxHeuristic": The name of the closest-matching Don Norman UX heuristic from this list:
          1. Visibility of system status
          2. Match between system and the real world
          3. User control and freedom
          4. Consistency and standards
          5. Error prevention
          6. Recognition rather than recall
          7. Flexibility and efficiency of use
          8. Aesthetic and minimalist design
          9. Help users recognize, diagnose, and recover from errors
          10. Help and documentation
    Provide at least 3-5 specific feedback points.
    `;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [imagePart, { text: prompt }] }],
      generationConfig,
      safetySettings,
    });

    const geminiResponse = JSON.parse(result.response.candidates[0].content.parts[0].text);

    for (const feedback of geminiResponse.specificFeedback) {
      const { critique, cropCoordinates, inspirationKeywords } = feedback;
      // Convert string coordinates to integers
      const left = parseInt(cropCoordinates.x, 10);
      const top = parseInt(cropCoordinates.y, 10);
      const width = parseInt(cropCoordinates.width, 10);
      const height = parseInt(cropCoordinates.height, 10);

      const cropFileName = `${Date.now()}-${Math.round(Math.random() * 1E9)}.png`;
      const cropPath = path.join(__dirname, "public", "crops", cropFileName);

      await sharp(imagePath)
        .extract({ left, top, width, height })
        .toFile(cropPath);
      
      feedback.croppedImageUrl = `/crops/${cropFileName}`;

      // const dribbbleImages = await fetchDribbbleShots(feedback.dribbbleKeywords);
      // feedback.dribbbleImageUrls = dribbbleImages;
    }

    res.status(200).json(geminiResponse);

  } catch (error) {
    console.error("Error in /api/analyze:", error);
    res.status(500).json({ error: "Failed to analyze image." });
  } finally {
    fs.unlinkSync(imagePath);
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
}); 