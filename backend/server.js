require('dotenv').config({ path: '../.env' });
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

const publicCropsPath = path.join(__dirname, '..', 'public', 'crops');
app.use('/crops', express.static(publicCropsPath));

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

    const textPrompt = `You are a world-class UI/UX design expert. Analyze the attached UI screenshot. Your response MUST be in a valid JSON format.

The JSON object must have two keys: 'overallFeedback' and 'specificFeedback'.

1.  For 'overallFeedback', provide a comprehensive review of the design.
2.  For 'specificFeedback', provide an array of objects. Each object must contain three keys: 'critique', 'cropCoordinates', and 'inspirationKeywords'.

**Crucially, for 'cropCoordinates'**:
- The coordinate system's origin (0,0) is the top-left corner of the image.
- The values for 'x', 'y', 'width', and 'height' must be integers representing pixels.
- The bounding box you define MUST accurately surround the specific UI element you are critiquing. For example, if you critique a button, the box should tightly enclose only that button. Be precise.

For 'inspirationKeywords', provide 2-3 keywords for finding inspirational images on Unsplash.

Analyze the image and provide at least four specific feedback points.`;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [imagePart, { text: textPrompt }] }],
      generationConfig,
      safetySettings,
    });

    const geminiResponse = JSON.parse(result.response.candidates[0].content.parts[0].text);

    const cropsDir = path.join(__dirname, '..', 'public', 'crops');
    fs.mkdirSync(cropsDir, { recursive: true });

    for (const feedback of geminiResponse.specificFeedback) {
      const { x, y, width, height } = feedback.cropCoordinates;
      const cropFileName = `${Date.now()}-${Math.round(Math.random() * 1E9)}.png`;
      const cropPath = path.join(cropsDir, cropFileName);

      await sharp(imagePath)
        .extract({ left: x, top: y, width, height })
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