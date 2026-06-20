import fetch from 'node-fetch'; // wait, node-fetch might not be installed, we can use native fetch since we are on Node 18+

async function test() {
  try {
    const res = await fetch('http://localhost:3000/api/health');
    console.log("Health Check Status:", res.status);
    const text = await res.text();
    console.log("Health Check Body:", text);
  } catch (err) {
    console.error("Health Check failed:", err);
  }

  try {
    const res = await fetch('http://localhost:3000/');
    console.log("Root Page Status:", res.status);
    const text = await res.text();
    console.log("Root Page Body snippet:", text.substring(0, 300));
  } catch (err) {
    console.error("Root Page fetch failed:", err);
  }
}

test();
