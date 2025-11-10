import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath, URL } from 'node:url';

const PORT = 7200;

export default defineConfig(({ command, mode }) => {
  const isLibBuild = process.env.BUILD_MODE === 'lib';
  const isPreview = command === 'serve' && process.env.VITE_PREVIEW_MODE === 'lib';
  
  return {
    plugins: [react()],
    root: '.',
    publicDir: 'public',
    build: {
      outDir: 'dist',
      // 根据构建模式决定是否使用 lib 模式
      ...(isLibBuild ? {
        lib: {
          entry: path.resolve(fileURLToPath(new URL('.', import.meta.url)), 'src/index.jsx'),
          name: 'microApp',
          fileName: (format) => `bundle.${format}.js`,
          formats: ['umd']
        },
        rollupOptions: {
          // 不设置external，让React包含在UMD文件中
          output: {
            globals: {
              react: 'React',
              'react-dom': 'ReactDOM'
            },
            // 确保React正确暴露到全局作用域
            name: 'microApp',
            format: 'umd',
            // 添加更兼容的配置
            exports: 'named',
            // 确保React正确初始化
            intro: `
              if (typeof globalThis === 'undefined') {
                window.globalThis = window;
              }
              if (typeof global === 'undefined') {
                window.global = window;
              }
            `
          }
        }
      } : {
        rollupOptions: {
          input: path.resolve(fileURLToPath(new URL('.', import.meta.url)), 'index.html')
        }
      }),
      sourcemap: true
    },
    server: {
      port: PORT,
      cors: true,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization'
      },
      hmr: {
        port: PORT + 1
      }
    },
    preview: {
      port: PORT,
      cors: true,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization'
      }
    },
    resolve: {
      alias: {
        '@': path.resolve(fileURLToPath(new URL('.', import.meta.url)), 'src')
      }
    },
    define: {
      // 支持 qiankun 的 publicPath 设置
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
    },
    base: process.env.NODE_ENV === 'production' ? './' : '/'
  };
});
