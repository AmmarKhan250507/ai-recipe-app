// server.js
// This is our backend: it receives photo(s) and/or a typed dish name, sends it to Gemini AI, and returns a recipe

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

// Accepts up to 5 images (field "photos") AND/OR a typed dish name (field "dishName")
app.post('/generate-recipe', upload.array('photos', 5), async (req, res) => {
  try {
    const dishName = (req.body.dishName || '').trim();
    const hasPhotos = req.files && req.files.length > 0;

    if (!hasPhotos && !dishName) {
      return res.status(400).json({ error: 'Please upload a photo or type a dish name' });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });

    let prompt;
    let contentParts = [];

    if (hasPhotos && dishName) {
      // Both photo(s) and a typed name given
      prompt = `Look at these photos of food ingredients. The user also mentioned they're thinking of making: "${dishName}".
      If the photos clearly show ingredients, use them. If the photos are unclear or you can't identify much, rely mainly on the dish name "${dishName}" instead. Respond in this exact format:

      INGREDIENTS DETECTED:
      (list what you see, or say "Used dish name instead" if photos were unclear)

      RECIPE: (name of the dish)

      ESTIMATED CALORIES:
      - Total Recipe: (approx)
      - Per Serving: (approx)

      INSTRUCTIONS:
      (short numbered step-by-step instructions)

      Keep it friendly, easy to follow, and clearly mention the calorie estimate is approximate.`;

      const imageParts = req.files.map(file => ({
        inlineData: { data: file.buffer.toString('base64'), mimeType: file.mimetype },
      }));
      contentParts = [prompt, ...imageParts];

    } else if (hasPhotos) {
      // Only photos, no typed name (original behavior)
      prompt = `Look at these photos of food ingredients (they may be separate photos of different items). Respond in this exact format:

      INGREDIENTS DETECTED:
      (list everything you see across all photos, combined into one list)

      RECIPE: (name of the dish)

      ESTIMATED CALORIES:
      - Total Recipe: (approx)
      - Per Serving: (approx)

      INSTRUCTIONS:
      (short numbered step-by-step instructions)

      Keep it friendly, easy to follow, and clearly mention the calorie estimate is approximate.
      If you genuinely cannot identify any ingredients from the photos, say so clearly under INGREDIENTS DETECTED instead of guessing.`;

      const imageParts = req.files.map(file => ({
        inlineData: { data: file.buffer.toString('base64'), mimeType: file.mimetype },
      }));
      contentParts = [prompt, ...imageParts];

    } else {
      // Only a typed dish name, no photos at all
      prompt = `The user wants a recipe for: "${dishName}". Respond in this exact format:

      RECIPE: ${dishName}

      ESTIMATED CALORIES:
      - Total Recipe: (approx)
      - Per Serving: (approx)

      INSTRUCTIONS:
      (short numbered step-by-step instructions)

      Keep it friendly, easy to follow, and clearly mention the calorie estimate is approximate.`;

      contentParts = [prompt];
    }

    const result = await model.generateContent(contentParts);
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
