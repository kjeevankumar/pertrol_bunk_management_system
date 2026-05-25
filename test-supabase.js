const fs = require('fs');
const path = require('path');

// Read .env.local manually
let supabaseUrl = "";
let supabaseKey = "";

try {
  const envPath = path.resolve(__dirname, '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL\s*=\s*(.+)/);
    const keyMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY\s*=\s*(.+)/);
    if (urlMatch && urlMatch[1]) supabaseUrl = urlMatch[1].trim();
    if (keyMatch && keyMatch[1]) supabaseKey = keyMatch[1].trim();
  }
} catch (e) {
  console.warn("Could not read .env.local", e);
}

console.log("Supabase URL:", supabaseUrl);
console.log("Supabase Key:", supabaseKey.substring(0, 15) + "...");

async function testSupabase() {
  const tables = ['sales', 'expenses', 'fuel_stock', 'attendance', 'ai_insights', 'branches'];
  
  for (const table of tables) {
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/${table}?select=*&limit=1`, {
        headers: {
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`
        }
      });
      
      console.log(`Table '${table}' Status:`, response.status, response.statusText);
      const text = await response.text();
      console.log(`Table '${table}' Sample Data:`, text.substring(0, 200));
    } catch (e) {
      console.error(`Error querying table '${table}':`, e);
    }
  }
}

testSupabase();
