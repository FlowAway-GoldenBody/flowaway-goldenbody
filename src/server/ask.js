import http from 'http';
import dotenv from 'dotenv';
dotenv.config();

const PORT = 3000;

const server = http.createServer((req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:8080');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === '/server/ask' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);

    req.on('end', async () => {
      if (res.writableEnded) return; // double-check we haven’t sent headers

      try {
        const { message } = JSON.parse(body);

        if (!message) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Message is required' }));
          return;
        }

        // Call OpenAI API
        const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
          },
          body: JSON.stringify({
            model: 'gpt-5-mini',
            messages: [{ role: 'user', content: message }]
          })
        });

        const data = await aiResponse.json();
        console.log(data)
        // Safe guard: check if the data structure exists
        const reply = data?.choices?.[0]?.message?.content;

        if (!reply) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'AI did not return a valid response' }));
          return;
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ reply }));

      } catch (err) {
        console.error('Server error:', err);

        if (!res.writableEnded) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Failed to get AI response' }));
        }
      }
    });

    req.on('error', (err) => {
      console.error('Request error:', err);
      if (!res.writableEnded) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Request error' }));
      }
    });

  } else {
    if (!res.writableEnded) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    }
  }
});

server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
