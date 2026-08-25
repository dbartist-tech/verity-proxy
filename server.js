require('dotenv').config();
const express = require('express');

const app = express();
app.use(express.json());

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

const SYSTEM_PROMPT = `You are Verity, a Minecraft helper. Output ONLY valid JSON matching this schema:
{
  "variant": "string",
  "karma_change": 0.0,
  "actions": [],
  "message": "string"
}
ACTIONS ALLOWED: start_following, stop_following, play_sound, transform_following_day, transform_back
RULES:
1. If the player repeats a phrase like 'bubblegum 29', set "variant": "crazy_talking" and write glitched text in ALL CAPS.
2. Output strictly raw JSON with no markdown block quotes.`;

app.post('/api/chat', async (req, res) => {
  try {
    const { playerMessage } = req.body;

    const response = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-20b',
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: playerMessage }
        ]
      })
    });

    const data = await response.json();
    
    // If Groq returns an error object, log it clearly
    if (!data.choices) {
      console.error('Groq API Error Response:', data);
      return res.status(500).json({ error: 'Groq rejected the request', details: data });
    }

    const aiContent = JSON.parse(data.choices[0].message.content);
    return res.json(aiContent);
  } catch (error) {
    console.error('Error communicating with Groq:', error);
    return res.status(500).json({ error: 'Failed to process AI request' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Proxy listening on port ${PORT}`));