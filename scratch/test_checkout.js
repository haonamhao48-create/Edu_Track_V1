const email = 'haonamhao48@gmail.com';
const password = 'Aa123456@';

async function test() {
  // Login
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

  // Let's get the center profile to get centerId
  const profileRes = await fetch('https://api.edutrack.io.vn/api/profile/centers/me', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  const profileData = await profileRes.json();
  const centerId = profileData.centerId || profileData.id;
  console.log('Center ID:', centerId);

  // Let's get the packages
  const packagesRes = await fetch('https://api.edutrack.io.vn/api/finance/subscriptions/packages', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  const packagesData = await packagesRes.json();
  console.log('Packages:', packagesData);
  const packagesList = packagesData.data || packagesData.items || packagesData;
  const standardPackage = packagesList.find(p => p.name === 'STANDARD' || p.name?.toLowerCase().includes('standard') || p.price > 0);
  console.log('Selected package:', standardPackage);
  if (!standardPackage) {
    console.error('No paid package found to test checkout.');
    return;
  }

  const packageId = standardPackage.id || standardPackage.packageId;

  // Let's test with the payload containing cancelUrl and returnUrl
  console.log('\n--- Test 1: Payload with cancelUrl and returnUrl ---');
  try {
    const res1 = await fetch('https://api.edutrack.io.vn/api/finance/subscriptions/checkout', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        centerId,
        packageId,
        cancelUrl: 'https://edutrack.io.vn/payment/cancel',
        returnUrl: 'https://edutrack.io.vn/payment/success',
      })
    });
    console.log('Test 1 Status:', res1.status);
    console.log('Test 1 Response:', await res1.text());
  } catch (err) {
    console.error('Test 1 Error:', err);
  }

  // Let's test with ONLY centerId and packageId
  console.log('\n--- Test 2: Payload with only centerId and packageId ---');
  try {
    const res2 = await fetch('https://api.edutrack.io.vn/api/finance/subscriptions/checkout', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        centerId,
        packageId,
      })
    });
    console.log('Test 2 Status:', res2.status);
    console.log('Test 2 Response:', await res2.text());
  } catch (err) {
    console.error('Test 2 Error:', err);
  }
}

test().catch(console.error);
