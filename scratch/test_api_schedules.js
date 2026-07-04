const email = 'haonamhao48@gmail.com';
const password = 'Aa123456@';

async function test() {
  const loginRes = await fetch('https://api.edutrack.io.vn/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: email, password }),
  });

  if (!loginRes.ok) {
    console.error('Login failed:', loginRes.status, await loginRes.text());
    return;
  }

  const loginData = await loginRes.json();
  const token = loginData.data?.token || loginData.token;
  console.log('Login success.');

  const teacherId = 'c50ed6b7-1e73-4bab-90df-09cc592d7199';
  const startDate = '2026-06-29';
  const endDate = '2026-07-05';

  const url = `https://api.edutrack.io.vn/api/academic/schedules/teacher?startDate=${startDate}&endDate=${endDate}&teacherId=${teacherId}`;
  console.log('Fetching:', url);

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  console.log('Response Status:', res.status);
  const data = await res.json();
  console.log('Response Data:', JSON.stringify(data, null, 2));
}

test().catch(console.error);
