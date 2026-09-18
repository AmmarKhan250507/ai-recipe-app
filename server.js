// server.js
// This is our backend: it receives photo(s), sends them to Gemini AI, and returns a recipe

require('dotenv').config();
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.static('public'));

const upload = multer({ storage: multer.memoryStorage() });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Accepts up to 5 images, sent under the field name "photos"
app.post('/generate-recipe', upload.array('photos', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No images uploaded' });
    }

    // Convert every uploaded image into the format Gemini understands
    const imageParts = req.files.map(file => ({
      inlineData: {
        data: file.buffer.toString('base64'),
        mimeType: file.mimetype,
      },
    }));

    const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });

    const prompt = `Look at these photos of food ingredients (they may be separate photos of different items). Respond in this exact format:

    INGREDIENTS DETECTED:
    (list everything you see across all photos, combined into one list)

    RECIPE: (name of the dish)

    ESTIMATED CALORIES: (approximate total calories for the whole recipe, and per serving, as a rough estimate)

    INSTRUCTIONS:
    (short numbered step-by-step instructions)

    Keep it friendly, easy to follow, and clearly mention the calorie estimate is approximate.`;

    // Send prompt + all images together to Gemini
    const result = await model.generateContent([prompt, ...imageParts]);
    const text = result.response.text();

    res.json({ recipe: text });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Something went wrong generating the recipe' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});