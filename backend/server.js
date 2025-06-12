// Optional loading of .env file - will use environment variables directly when deployed
try {
  require('dotenv').config({ path: '../.env' });
} catch (e) {
  console.log('No .env file found, using environment variables directly');
}

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

// Log environment variables (without revealing full key)
const apiKey = process.env.GEMINI_API_KEY;
console.log(`GEMINI_API_KEY present: ${!!apiKey}`);
if (apiKey) {
  console.log(`Key starts with: ${apiKey.substring(0, 4)}...`);
} else {
  console.error("WARNING: GEMINI_API_KEY is not set!");
}

let genAI, model;
try {
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  console.log("Gemini client initialized successfully");
} catch (error) {
  console.error("Failed to initialize Gemini client:", error);
}

app.use(cors());

// Use a public directory local to the backend
const publicCropsPath = path.join(__dirname, 'public', 'crops');
app.use('/crops', express.static(publicCropsPath));

const upload = multer({ dest: "uploads/" });

// Add a request timeout middleware
const timeout = 30000; // 30 seconds
app.use((req, res, next) => {
  res.setTimeout(timeout, () => {
    console.error('Request timeout reached:', req.url);
    if (!res.headersSent) {
      res.status(408).json({ error: "Request timeout" });
    }
  });
  next();
});

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

// Define the prompt for Gemini API
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

app.post("/api/analyze", upload.single("image"), async (req, res) => {
  console.log("Received analysis request");
  
  if (!req.file) {
    console.error("No image file provided");
    return res.status(400).json({ error: "No image file provided." });
  }

  const imagePath = req.file.path;
  console.log(`Image saved to ${imagePath}`);

  try {
    const imageMimeType = req.file.mimetype;
    console.log(`Image mime type: ${imageMimeType}`);
    
    const imagePart = fileToGenerativePart(imagePath, imageMimeType);
    console.log("Image converted to base64 for API");

    console.log("Sending request to Gemini API");
    const result = await Promise.race([
      model.generateContent({
        contents: [{ role: "user", parts: [imagePart, { text: textPrompt }] }],
        generationConfig,
        safetySettings,
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Gemini API request timeout")), 25000)
      )
    ]);
    
    console.log("Received response from Gemini API");
    
    let geminiResponse;
    try {
      geminiResponse = JSON.parse(result.response.candidates[0].content.parts[0].text);
      console.log("Successfully parsed Gemini response");
    } catch (parseError) {
      console.error("Failed to parse Gemini response:", parseError);
      console.log("Raw response:", result.response.candidates[0].content.parts[0].text);
      return res.status(500).json({ error: "Failed to parse AI response" });
    }

    // Use a public/crops directory local to the backend
    const cropsDir = path.join(__dirname, 'public', 'crops');
    try {
      fs.mkdirSync(cropsDir, { recursive: true });
      console.log(`Created crops directory at ${cropsDir}`);
    } catch (mkdirError) {
      console.error("Failed to create crops directory:", mkdirError);
    }

    console.log(`Processing ${geminiResponse.specificFeedback.length} feedback items`);
    
    for (const feedback of geminiResponse.specificFeedback) {
      try {
        const { x, y, width, height } = feedback.cropCoordinates;
        console.log(`Cropping image at x:${x}, y:${y}, width:${width}, height:${height}`);
        
        const cropFileName = `${Date.now()}-${Math.round(Math.random() * 1E9)}.png`;
        const cropPath = path.join(cropsDir, cropFileName);
        
        await sharp(imagePath)
          .extract({ left: x, top: y, width, height })
          .toFile(cropPath);
        
        console.log(`Saved cropped image to ${cropPath}`);
        feedback.croppedImageUrl = `/crops/${cropFileName}`;
      } catch (cropError) {
        console.error("Failed to crop image:", cropError);
        feedback.croppedImageUrl = null;
      }
    }

    console.log("Sending response to client");
    res.status(200).json(geminiResponse);

  } catch (error) {
    console.error("Error in /api/analyze:", error);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: "Failed to analyze image.",
        details: error.message || "Unknown error"
      });
    }
  } finally {
    try {
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
        console.log(`Deleted temporary file ${imagePath}`);
      }
    } catch (cleanupError) {
      console.error("Error during cleanup:", cleanupError);
    }
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
}); 