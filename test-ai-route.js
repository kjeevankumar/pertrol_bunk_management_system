async function testAIRoute() {
  try {
    console.log("Testing POST http://localhost:3000/api/ai with demo cookie...");
    const response = await fetch("http://localhost:3000/api/ai", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cookie": "demo-session=true"
      },
      body: JSON.stringify({
        prompt: "Hello, give me a very short 1-sentence diagnostic message to verify you are working.",
        context: {
          sales: { total_count: 5, total_revenue: 15000 },
          expenses: { total_today: 3000 },
          fuel: [{ type: "petrol", stock: 12000, capacity: 20000 }],
          attendance: { present: 4, late: 1 }
        }
      })
    });

    console.log("Response Status:", response.status, response.statusText);
    const data = await response.json();
    console.log("Response Data:", JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Fetch error calling /api/ai:", error);
  }
}

testAIRoute();
