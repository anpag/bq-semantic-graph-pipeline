const { GoogleGenAI } = require('@google/genai');
const { GoogleAuth } = require('google-auth-library');

async function test(location) {
  try {
    const auth = new GoogleAuth({
      scopes: 'https://www.googleapis.com/auth/cloud-platform'
    });
    const client = await auth.getClient();
    const token = await client.getAccessToken();
    
    // Pass auth client or rely on default
    const ai = new GoogleGenAI({ 
      vertexai: { project: 'semantic-graph-demo', location } 
    });
    // @google/genai usually accepts `authClient` or `auth` but let's try `headers` if we can't find it.
    // Or we can manually set the token in the constructor? Let's check `ai` object.
    console.log(Object.keys(ai));
  } catch (err) {
    console.error(`Error for ${location}:`, err.message);
  }
}

test('us');
