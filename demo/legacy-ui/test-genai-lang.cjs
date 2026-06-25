const { GoogleGenAI } = require('@google/genai');
const { GoogleAuth } = require('google-auth-library');

async function test(location) {
  try {
    const auth = new GoogleAuth({
      scopes: 'https://www.googleapis.com/auth/cloud-platform'
    });
    const client = await auth.getClient();
    const tokenResponse = await client.getAccessToken();
    const token = tokenResponse.token || tokenResponse;
    
    const ai = new GoogleGenAI({ 
      vertexai: { project: 'gen-lang-client-0294810524', location },
      httpOptions: {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    });
    
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: 'Tell me a joke.'
    });
    console.log(`Success for ${location}:`, response.text);
  } catch (err) {
    console.error(`Error for ${location}:`, err.message);
  }
}

test('us-central1');
