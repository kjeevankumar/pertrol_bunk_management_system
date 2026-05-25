async function testAIProcessRoute() {
  try {
    console.log("Testing POST http://localhost:3000/api/ai/process with demo-session cookie...");
    const response = await fetch("http://localhost:3000/api/ai/process", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cookie": "demo-session=true"
      }
    });

    console.log("Response Status:", response.status, response.statusText);
    const text = await response.text();
    console.log("Response Body:", text);
  } catch (error) {
    console.error("Fetch error calling /api/ai/process:", error);
  }
}

testAIProcessRoute();
