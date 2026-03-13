import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from dist
app.use(express.static(path.join(__dirname, 'dist')));

// API endpoint for image checking (from vite.config)
app.get('/api/check-image', (req, res) => {
  const { filename } = req.query;
  if (!filename) {
    res.status(400).json({ error: 'Missing filename' });
    return;
  }
  const filepath = path.join(__dirname, 'dist', String(filename));
  const exists = fs.existsSync(filepath);
  res.json({ exists });
});

// API endpoint for saving images
app.post('/api/save-image', express.json({ limit: '50mb' }), (req, res) => {
  try {
    const { filename, base64 } = req.body;
    if (!filename || !base64) {
      res.status(400).json({ error: 'Missing filename or base64' });
      return;
    }
    const filepath = path.join(__dirname, 'dist', filename);
    const dir = path.dirname(filepath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filepath, Buffer.from(base64, 'base64'));
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Serve index.html for all other routes (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
