/**
 * Test the upload API endpoint directly
 */
import { readFileSync } from 'fs';
import FormData from 'form-data';
import fetch from 'node-fetch';

async function testUpload() {
  const csvContent = readFileSync('2026-02-10-AccountStatement.csv', 'utf-8');
  
  const formData = new FormData();
  formData.append('file', Buffer.from(csvContent), {
    filename: '2026-02-10-AccountStatement.csv',
    contentType: 'text/csv',
  });

  try {
    const response = await fetch('http://localhost:3000/api/upload', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();
    
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));
    
    if (!response.ok) {
      console.error('Upload failed!');
      process.exit(1);
    }
    
    console.log('\n✅ Upload successful!');
    console.log(`Trade count: ${data.tradeCount}`);
  } catch (error: any) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

testUpload();
