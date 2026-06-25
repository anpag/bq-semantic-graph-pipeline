const { GoogleGenAI } = require('@google/genai');

async function test() {
  try {
    const ai = new GoogleGenAI({ 
      enterprise: true, 
      project: 'semantic-graph-demo', 
      location: 'us' 
    });
    
    const response = await ai.models.generateContentStream({
      model: 'gemini-3.5-flash',
      contents: 'Tell me a joke.'
    });
    let full = '';
    for await (const chunk of response) {
      full += chunk.text;
    }
    console.log(`Success for stream:`, full);
  } catch (err) {
    console.error(`Error for stream:`, err.message);
  }
}

test();
