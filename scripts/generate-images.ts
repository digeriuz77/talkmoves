import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function generateImage(prompt: string, filename: string, aspectRatio: string = "16:9") {
  console.log(`Generating ${filename}...`);
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: prompt,
      config: {
        imageConfig: {
          aspectRatio: aspectRatio
        }
      }
    });
    
    if (!response.candidates || response.candidates.length === 0) {
        console.error(`No candidates returned for ${filename}`);
        return;
    }

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        const buffer = Buffer.from(part.inlineData.data, 'base64');
        fs.writeFileSync(path.join(process.cwd(), 'public', filename), buffer);
        console.log(`Saved ${filename}`);
        return;
      }
    }
    console.error(`No image data found in response for ${filename}`);
  } catch (e) {
    console.error(`Failed to generate ${filename}:`, e);
  }
}

async function main() {
  const publicDir = path.join(process.cwd(), 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  
  // Generate sequentially to avoid rate limits
  await generateImage(
    "A realistic, slightly stylized middle school science classroom from the teacher's perspective. Three diverse students are sitting at their desks facing forward. The classroom has a whiteboard, science posters, and lab equipment. Bright, engaging, educational atmosphere.",
    "classroom_bg.jpg",
    "16:9"
  );
  
  await generateImage(
    "Glowing red monster horns, shadowy purple aura, and subtle reptilian scales centered on a pure black background. High contrast, designed to be used as a screen-blend overlay.",
    "beast_aura.jpg",
    "1:1"
  );
  
  await generateImage(
    "Glowing cyan and neon blue futuristic mechanical armor pieces, holographic HUD elements, and robotic aura centered on a pure black background. High contrast, designed to be used as a screen-blend overlay.",
    "transformer_aura.jpg",
    "1:1"
  );
}

main();
