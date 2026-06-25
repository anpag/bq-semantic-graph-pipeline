const { VertexAI } = require('@google-cloud/vertexai');

async function test(location) {
  try {
    const vertex_ai = new VertexAI({ project: 'semantic-graph-demo', location });
    const generativeModel = vertex_ai.preview.getGenerativeModel({
      model: 'gemini-3.5-flash',
    });
    const request = { contents: [{ role: 'user', parts: [{ text: 'Hello' }] }] };
    const resp = await generativeModel.generateContent(request);
    console.log(`Success for ${location}:`, resp.response.candidates[0].content.parts[0].text);
  } catch (err) {
    console.error(`Error for ${location}:`, err.message);
  }
}

async function run() {
  await test('us-central1');
  await test('us-east1');
  await test('us-east4');
  await test('us-west1');
  await test('global');
}
run();
