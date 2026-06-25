const { GoogleGenAI } = require('@google/genai');
const { GoogleAuth } = require('google-auth-library');

async function test(location) {
  try {
    const auth = new GoogleAuth({
      scopes: 'https://www.googleapis.com/auth/cloud-platform'
    });
    const authClient = await auth.getClient();
    
    // Pass auth client or rely on default
    const ai = new GoogleGenAI({ 
      vertexai: { project: 'semantic-graph-demo', location } 
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

test('us');
