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

  // Fetch all teachers
  const resTeachers = await fetch('https://api.edutrack.io.vn/api/profile/centers/teachers?page=1&pageSize=100', {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
  });
  const dataTeachers = await resTeachers.json();
  const teachersList = dataTeachers.items || [];
  const teacherNames = teachersList.map(t => t.fullName);
  console.log('Teachers in profile/centers/teachers:', teacherNames);

  // Fetch all classes
  const resClasses = await fetch('https://api.edutrack.io.vn/api/academic/classes?page=1&pageSize=1000', {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
  });
  const dataClasses = await resClasses.json();
  // Let's see the structure of classes response.
  // In normalizeListResponse, it unwraps data.data or data, and then checks items.
  const classesList = dataClasses.data?.items || dataClasses.items || dataClasses.data || dataClasses || [];
  console.log('Classes Response Keys:', Object.keys(dataClasses));
  console.log('Number of classes:', classesList.length);

  const teacherNamesInClasses = new Set();
  classesList.forEach(cls => {
    if (cls.teacherName) {
      teacherNamesInClasses.add(cls.teacherName);
    }
  });
  console.log('Teachers assigned in classes:', Array.from(teacherNamesInClasses));

  // Find missing teachers
  const missing = [];
  teacherNamesInClasses.forEach(name => {
    if (!teacherNames.includes(name)) {
      missing.push(name);
    }
  });
  console.log('Teachers in classes but missing in profile/centers/teachers list:', missing);
}

test().catch(console.error);
