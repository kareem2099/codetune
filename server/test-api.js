const hijriDate = require('./api/hijri-date');
const nextPrayer = require('./api/next-prayer');

// Mock request and response
const mockReq = (query) => ({ query });
const mockRes = () => {
    const res = {
        status: (code) => ({ json: (data) => console.log(`Status ${code}:`, JSON.stringify(data, null, 2)) }),
        json: (data) => console.log('Response:', JSON.stringify(data, null, 2))
    };
    return res;
};

async function testHijriDate() {
    console.log('Testing Hijri Date API...');
    const req = mockReq({ timezone: 'Africa/Cairo' });
    const res = mockRes();
    await hijriDate(req, res);
}

async function testNextPrayer() {
    console.log('Testing Next Prayer API...');
    const req = mockReq({ lat: '30.0444', lon: '31.2357', timezone: 'Africa/Cairo', method: '2' });
    const res = mockRes();
    await nextPrayer(req, res);
}

async function runTests() {
    await testHijriDate();
    console.log('\n');
    await testNextPrayer();
}

runTests();
