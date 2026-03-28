// api/chat.js - Vercel Serverless Function

export default async function handler(req, res) {
  // CORS සිතුවිම
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // OPTIONS request සඳහා
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // POST request පමණක්
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, image } = req.body;
    const API_KEY = process.env.GEMINI_API_KEY;

    if (!message) {
      return res.status(400).json({ error: 'ප්‍රශ්නයක් ඉල්ලා ඇත' });
    }

    if (!API_KEY) {
      return res.status(500).json({ error: 'API key නිර්මිතයි' });
    }

    // සිංහල පද්ධති අණු
    const SYSTEM_PROMPT = `ඔබ "Mubra AI 8.v1" - ශ්‍රී ලංකා A/L රසායන විශේෂඥයි. 
සිංහල මාධ්‍යවෙන් පමණක් පිළිතුරු දෙන්න.
ඔබේ පිළිතුරු ගැඹුරු, ශිල්පගතව වඩාත් සඳහන් කළ පන්තිමතු ශෛලිය විසින් පසුගිය ප්‍රශ්න ශිල්පිතයි.
සෑම පිළිතුරුවෙන්ම රසායනිකමුහුණතවලින් පැහැදිලි කිරීම් සහ විස්තරිත විස්තර ඇතුලත් කරන්න.`;

    // Request body සිතුවිම
    const requestBody = {
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `${SYSTEM_PROMPT}\n\nයෙදුම ගිණුම: ${message}`
            },
            ...(image ? [
              {
                inline_data: {
                  mime_type: 'image/jpeg',
                  data: image.replace(/^data:image\/(jpeg|png|gif|webp);base64,/, '')
                }
              }
            ] : [])
          ]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048
      }
    };

    // Gemini API ට ඉල්ලා කරන්න
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Gemini API Error:', errorData);
      return res.status(response.status).json({
        error: `Gemini API Error: ${errorData.error?.message || response.statusText}`
      });
    }

    const data = await response.json();

    if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
      return res.status(500).json({ error: 'අඩුවත්කාර ප්‍රතිඩිතාවයි' });
    }

    const aiResponse = data.candidates[0].content.parts[0].text;

    res.status(200).json({
      success: true,
      response: aiResponse,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Backend Error:', error);
    res.status(500).json({
      error: `Backend Error: ${error.message}`,
      type: error.constructor.name
    });
  }
}
