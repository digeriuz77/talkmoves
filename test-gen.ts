import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function run() {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: 'A simple test image',
    });
    console.log("Success:", !!response.candidates?.[0]?.content?.parts?.[0]?.inlineData);
  } catch (e) {
    console.error("Error:", e);
  }
}
run();
