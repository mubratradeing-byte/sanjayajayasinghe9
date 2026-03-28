// api/analyze-image.js - Vercel Serverless Function

export default async function handler(req, res) {
  // CORS සිතුවිම
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { image, question } = req.body;
    const API_KEY = process.env.GEMINI_API_KEY;

    if (!image) {
      return res.status(400).json({ error: 'රූපයක් ඉල්ලා ඇත' });
    }

    if (!API_KEY) {
      return res.status(500).json({ error: 'API key නිර්මිතයි' });
    }

    const SYSTEM_PROMPT = `ඔබ "Mubra AI 8.v1" - ශ්‍රී ලංකා A/L රසායන විශේෂඥයි. 
සිංහල මාධ්‍යවෙන් පමණක් පිළිතුරු දෙන්න.
ඔබේ පිළිතුරු ගැඹුරු, ශිල්පගතව විස්තරිතයි.`;

    // Base64 data URL පරිවර්තනය කරන්න
    const base64Data = image.replace(/^data:image\/(jpeg|png|gif|webp);base64,/, '');

    const requestBody = {
      contents: [
        {
          role: 'user',
          parts: [
            {
              inline_data: {
                mime_type: 'image/jpeg',
                data: base64Data
              }
            },
            {
              text: `${SYSTEM_PROMPT}\n\nරූපය විශ්ලේෂණ කරන්න${question ? `: ${question}` : ''}`
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048
      }
    };

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return res.status(response.status).json({
        error: `API Error: ${errorData.error?.message || response.statusText}`
      });
    }

    const data = await response.json();
    const aiResponse = data.candidates[0].content.parts[0].text;

    res.status(200).json({
      success: true,
      response: aiResponse
    });

  } catch (error) {
    console.error('Image Analysis Error:', error);
    res.status(500).json({
      error: error.message
    });
  }
}
