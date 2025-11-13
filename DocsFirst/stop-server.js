import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function stopServer() {
  try {
    console.log('🔍 正在查找占用端口 1234 的进程...');
    
    // 查找占用端口的进程
    const { stdout } = await execAsync('netstat -ano | findstr :1234');
    const lines = stdout.split('\n').filter(line => line.includes('LISTENING'));
    
    if (lines.length === 0) {
      console.log('✅ 端口 1234 未被占用');
      return;
    }
    
    // 提取进程ID
    const pids = new Set();
    lines.forEach(line => {
      const match = line.match(/\s+(\d+)\s*$/);
      if (match) {
        pids.add(match[1]);
      }
    });
    
    if (pids.size === 0) {
      console.log('⚠️  无法找到进程ID');
      return;
    }
    
    console.log(`📋 找到 ${pids.size} 个占用端口的进程: ${Array.from(pids).join(', ')}`);
    
    // 停止所有相关进程
    for (const pid of pids) {
      try {
        console.log(`🛑 正在停止进程 ${pid}...`);
        await execAsync(`taskkill /PID ${pid} /F`);
        console.log(`✅ 进程 ${pid} 已停止`);
      } catch (error) {
        console.error(`❌ 无法停止进程 ${pid}:`, error.message);
      }
    }
    
    console.log('✅ 所有进程已停止');
  } catch (error) {
    if (error.message.includes('findstr')) {
      console.log('✅ 端口 1234 未被占用');
    } else {
      console.error('❌ 错误:', error.message);
    }
  }
}

stopServer();

