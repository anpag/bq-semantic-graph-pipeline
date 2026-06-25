const { GoogleGenAI } = require('@google/genai');
const { GoogleAuth } = require('google-auth-library');

async function test(location) {
  try {
    const auth = new GoogleAuth({
      scopes: 'https://www.googleapis.com/auth/cloud-platform'
    });
    const client = await auth.getClient();
    
    const ai = new GoogleGenAI({ 
      vertexai: { project: 'semantic-graph-demo', location },
      auth: client
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
