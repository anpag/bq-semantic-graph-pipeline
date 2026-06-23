const { GoogleGenAI } = require('@google/genai');

async function test(location) {
  try {
    const ai = new GoogleGenAI({ vertexai: { project: 'semantic-graph-demo', location } });
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: 'Tell me a joke.'
    });
    console.log(`Success for ${location}:`, response.text);
  } catch (err) {
    console.error(`Error for ${location}:`, err.message);
  }
}

async function run() {
  await test('us-central1');
  await test('us');
  await test('global');
}
run();
