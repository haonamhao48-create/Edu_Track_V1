async function runTest() {
  const email = 'haonamhao48@gmail.com';
  const password = 'Aa123456@';

  console.log('--- 1. Logging in ---');
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
  console.log('Login success. Token retrieved:', token ? token.substring(0, 30) + '...' : 'null');

  console.log('\n--- 2. Fetching Center Profile ---');
  const profileRes = await fetch('https://api.edutrack.io.vn/api/profile/centers/me', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!profileRes.ok) {
    console.error('Profile fetch failed:', profileRes.status, await profileRes.text());
    return;
  }

  const profileData = await profileRes.json();
  console.log('Profile Data:', JSON.stringify(profileData, null, 2));
  const centerId = profileData.data?.centerId || profileData.data?.id || profileData.data?.center?.id || profileData.centerId || profileData.id || '';
  console.log('Center Profile success. centerId:', centerId);

  console.log('\n--- 3. Fetching Current Subscription ---');
  const subRes = await fetch(`https://api.edutrack.io.vn/api/finance/subscriptions/center/${centerId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!subRes.ok) {
    console.log('Subscription fetch status:', subRes.status);
    console.log('Response:', await subRes.text());
  } else {
    const subData = await subRes.json();
    console.log('Current Subscription Response:', JSON.stringify(subData, null, 2));
  }

  console.log('\n--- 4. Fetching Packages ---');
  const pkgRes = await fetch('https://api.edutrack.io.vn/api/finance/subscriptions/packages', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!pkgRes.ok) {
    console.error('Packages fetch failed:', pkgRes.status, await pkgRes.text());
    return;
  }

  const pkgData = await pkgRes.json();
  console.log('Available Packages:');
  const pkgs = pkgData.data || pkgData;
  for (const pkg of pkgs) {
    console.log(`- ${pkg.name}: ID = ${pkg.id}, price = ${pkg.price}`);
  }

  if (pkgs.length > 0) {
    const targetPackageId = pkgs[0].id;
    console.log(`\n--- 5. Initiating Checkout for package ${pkgs[0].name} (${targetPackageId}) ---`);
    const checkoutRes = await fetch('https://api.edutrack.io.vn/api/finance/subscriptions/checkout', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ centerId, packageId: targetPackageId })
    });

    if (!checkoutRes.ok) {
      console.error('Checkout failed:', checkoutRes.status, await checkoutRes.text());
      return;
    }

    const checkoutData = await checkoutRes.json();
    console.log('Checkout Response:', JSON.stringify(checkoutData, null, 2));

    console.log('\n--- 6. Re-fetching Current Subscription after Checkout ---');
    const subResAfter = await fetch(`https://api.edutrack.io.vn/api/finance/subscriptions/center/${centerId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!subResAfter.ok) {
      console.log('Subscription fetch status after:', subResAfter.status);
    } else {
      const subDataAfter = await subResAfter.json();
      console.log('Current Subscription Response After Checkout:', JSON.stringify(subDataAfter, null, 2));
    }
  }
}

runTest();
