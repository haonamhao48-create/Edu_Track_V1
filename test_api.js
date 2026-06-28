const http = require('http');

async function testApi() {
    try {
        const fetch = (await import('node-fetch')).default;
        
        // 1. Get class schedules
        const classId = "ed9e9764-859a-43d2-963f-4e9f13d62f7c"; // from screenshot
        console.log("Fetching sessions for class:", classId);
        
        const sessionsRes = await fetch(`http://localhost:7007/api/attendance/sessions?classId=${classId}`);
        const sessions = await sessionsRes.json();
        console.log("Sessions:", JSON.stringify(sessions, null, 2));
        
        if (sessions && sessions.length > 0) {
            const sessionId = sessions[0].id;
            console.log("Found session:", sessionId);
            
            // 2. Generate QR
            console.log("Generating QR for session:", sessionId);
            const qrRes = await fetch(`http://localhost:7007/api/attendance/sessions/${sessionId}/qr`, {
                method: 'POST'
            });
            const qrText = await qrRes.text();
            console.log("QR response:", qrRes.status, qrText);
        } else {
            console.log("No sessions found. Try to create one?");
            // the scheduleId in screenshot was maybe the sessionId?
            const sessionIdInUrl = "7c7df149-660e-4681-a5b2-4b9217b1f3b2";
            console.log("Checking if URL ID is a session or schedule:", sessionIdInUrl);
            
            console.log("Generating QR directly for URL ID:", sessionIdInUrl);
            const qrRes2 = await fetch(`http://localhost:7007/api/attendance/sessions/${sessionIdInUrl}/qr`, {
                method: 'POST'
            });
            const qrText2 = await qrRes2.text();
            console.log("QR response directly:", qrRes2.status, qrText2);
        }
    } catch (e) {
        console.error(e);
    }
}

testApi();
