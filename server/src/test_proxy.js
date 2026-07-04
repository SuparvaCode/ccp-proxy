import fetch from 'node-fetch';

async function run() {
  const body = {
    model: 'groq/llama-3.1-8b-instant',
    messages: [{ role: 'user', content: 'hi' }],
    max_tokens: 1024
  };

  console.log('Sending request to proxy...');
  const res = await fetch('http://127.0.0.1:8082/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': 'super'
    },
    body: JSON.stringify(body)
  });

  console.log('Status:', res.status);
  const text = await res.text();
  console.log('Response:', text);
}

run().catch(console.error);
