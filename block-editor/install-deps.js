const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 开始安装依赖...');

try {
  // 安装根目录依赖
  console.log('📦 安装根目录依赖...');
  execSync('npm install', { cwd: __dirname, stdio: 'inherit' });

  // 安装 editor-base 依赖
  console.log('📦 安装 editor-base 依赖...');
  execSync('npm install', { cwd: path.join(__dirname, 'packages/editor-base'), stdio: 'inherit' });

  // 安装 app 依赖
  console.log('📦 安装 app 依赖...');
  execSync('npm install', { cwd: path.join(__dirname, 'app'), stdio: 'inherit' });

  console.log('✅ 所有依赖安装完成！');
  console.log('');
  console.log('🎯 接下来可以运行:');
  console.log('  npm run build:packages  # 构建编辑器包');
  console.log('  npm run dev            # 启动开发服务器');
} catch (error) {
  console.error('❌ 安装依赖失败:', error.message);
  process.exit(1);
}





























