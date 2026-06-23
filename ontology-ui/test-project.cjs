const { GoogleAuth } = require('google-auth-library');

async function checkProject() {
  const auth = new GoogleAuth();
  const projectId = await auth.getProjectId();
  console.log("Default Project ID:", projectId);
}
checkProject();
