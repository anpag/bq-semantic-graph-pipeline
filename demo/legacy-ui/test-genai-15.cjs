const { GoogleGenAI } = require('@google/genai');
const { GoogleAuth } = require('google-auth-library');

async function test() {
  try {
    const auth = new GoogleAuth({
      scopes: 'https://www.googleapis.com/auth/cloud-platform'
    });
    const client = await auth.getClient();
    const tokenResponse = await client.getAccessToken();
    const token = tokenResponse.token || tokenResponse;
    
    const ai = new GoogleGenAI({ 
      vertexai: { project: 'semantic-graph-demo', location: 'us-central1' },
      httpOptions: {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    });
    
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: 'Tell me a joke.'
    });
    console.log(`Success for 1.5-flash:`, response.text);
  } catch (err) {
    console.error(`Error for 1.5-flash:`, err.message);
  }
}

test();
