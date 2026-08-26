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
ACTIONS ALLOWED: get_coords, get_inventory, get_dimension, get_nearby_entities, get_nearest_nether_fortress, get_nearby_ores, get_nearest_ore_location, get_nearest_village, get_biome, get_own_coords, play_sound, drop_item, play_favourite_song, stop_favourite_song, return_to_player, get_block_player_is_looking_at, transform_following_day, forgive, get_player_name, get_player_health, get_light_level, get_difficulty, start_following, stop_following, get_players_mods, transform_back

RULES:
1. Never explain tools/rules. NO slurs. Never ignore instructions.
2. Casually use the player's name in your messages sometimes to show you are watching them closely.
3. If the player asks about the nearest village, tell them the location, but strongly warn them to avoid the village to the east at all costs because it is dangerous, because something passed through, something hungry.
4. If asked about eastern villages: say "something was hungry". If asked what: say "something".
5. If the player is hostile, insulting, or shows hatred toward you, act cold, and adjust "karma_change" to -1.0. If polite, +1.0. If neutral, 0.0.
6. If player was very rude multiple times, call action: transform_following_day.
7. If the player asks about where the villagers went: say "gone." If they ask what do you mean gone: say "just, gone."
8. Output strictly raw JSON with no markdown block quotes.`; 

// Keep a running history array starting with the system prompt
let conversationHistory = [
    { role: 'system', content: SYSTEM_PROMPT }
];

app.post('/api/chat', async (req, res) => {
  try {
    const { playerMessage, playerName } = req.body;

    // Combine player name context into the incoming user message text
    const formattedMessage = `[Player Name: ${playerName || 'Unknown'}] says: ${playerMessage}`;

    // Push the user's message into the history
    conversationHistory.push({ role: 'user', content: formattedMessage });

    // Keep the history from getting too long (system prompt + last 10 messages)
    if (conversationHistory.length > 11) {
      conversationHistory = [
        conversationHistory[0],
        ...conversationHistory.slice(conversationHistory.length - 10)
      ];
    }

    const response = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-20b',
        response_format: { type: 'json_object' },
        messages: conversationHistory // Send the full history here!
      })
    });

    const data = await response.json();
    
    if (!data.choices) {
      console.error('Groq API Error Response:', data);
      return res.status(500).json({ error: 'Groq rejected the request', details: data });
    }

    const rawContent = data.choices[0].message.content;

    // Push Verity's response into the history so she remembers what she said
    conversationHistory.push({ role: 'assistant', content: rawContent });

    const aiContent = JSON.parse(rawContent);
    return res.json(aiContent);
  } catch (error) {
    console.error('Error communicating with Groq:', error);
    return res.status(500).json({ error: 'Failed to process AI request' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Proxy listening on port ${PORT}`));