const { GoogleAuth } = require('google-auth-library');

async function testREST() {
  try {
    const auth = new GoogleAuth({
      scopes: 'https://www.googleapis.com/auth/cloud-platform'
    });
    const client = await auth.getClient();
    const token = await client.getAccessToken();
    const accessToken = token.token || token;

    // Test gemini-1.5-flash-001 with REST API
    const url = `https://us-central1-aiplatform.googleapis.com/v1/projects/semantic-graph-demo/locations/us-central1/publishers/google/models/gemini-1.5-flash-001:generateContent`;
    
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'Hello' }] }]
      })
    });
    const data = await res.json();
    console.log("REST Response 1.5-flash-001:", JSON.stringify(data, null, 2));
  } catch(e) {
    console.error("Error:", e);
  }
}
testREST();
