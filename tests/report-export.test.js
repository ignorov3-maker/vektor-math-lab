const assert=require('node:assert/strict');require('../content/report-export.js');
const csv=VEKTOR_REPORT_EXPORT.csv([['Показатель','Значение'],['Учеников',8],['=HYPERLINK("x")','ёж;"тест"']]);
const bytes=Buffer.from(csv,'utf8');assert.deepEqual([...bytes.subarray(0,3)],[239,187,191]);assert(bytes.toString('utf8').includes('Показатель'));assert(csv.includes('"\'=HYPERLINK(""x"")"'));assert(csv.includes('"ёж;""тест"""'));assert(csv.includes('\r\n'));
console.log('report-export: OK');
