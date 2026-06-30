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

  // Fetch center profile
  const res = await fetch('https://api.edutrack.io.vn/api/profile/centers/me', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  console.log('Status:', res.status);
  const data = await res.json();
  console.log('Center Profile Response:', JSON.stringify(data, null, 2));
}

test().catch(console.error);
