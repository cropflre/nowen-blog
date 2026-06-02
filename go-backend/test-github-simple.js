// 简单的 Node.js 脚本测试 GitHub API
const http = require('http');

const testAPI = async () => {
  console.log('=== 测试 GitHub API 端点 ===\n');

  // 测试 1: POST 方式
  console.log('[1] 测试 POST /api/github/repo-info');
  const postData = JSON.stringify({ url: 'https://github.com/facebook/react' });
  
  const postOptions = {
    hostname: 'localhost',
    port: 8080,
    path: '/api/github/repo-info',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  await new Promise((resolve) => {
    const req = http.request(postOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        console.log(`  状态码: ${res.statusCode}`);
        try {
          const json = JSON.parse(data);
          console.log(`  响应: ${JSON.stringify(json, null, 2).substring(0, 200)}...`);
        } catch {
          console.log(`  响应: ${data.substring(0, 200)}...`);
        }
        resolve();
      });
    });
    req.on('error', (e) => {
      console.log(`  ✗ 错误: ${e.message}`);
      resolve();
    });
    req.write(postData);
    req.end();
  });

  console.log('\n[2] 测试 GET /api/github/repo-info?owner=facebook&repo=react');
  
  const getOptions = {
    hostname: 'localhost',
    port: 8080,
    path: '/api/github/repo-info?owner=facebook&repo=react',
    method: 'GET'
  };

  await new Promise((resolve) => {
    const req = http.request(getOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        console.log(`  状态码: ${res.statusCode}`);
        try {
          const json = JSON.parse(data);
          console.log(`  响应: ${JSON.stringify(json, null, 2).substring(0, 200)}...`);
        } catch {
          console.log(`  响应: ${data.substring(0, 200)}...`);
        }
        resolve();
      });
    });
    req.on('error', (e) => {
      console.log(`  ✗ 错误: ${e.message}`);
      resolve();
    });
    req.end();
  });

  console.log('\n=== 测试完成 ===');
};

testAPI().catch(console.error);
