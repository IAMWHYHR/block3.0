/* eslint-disable no-undef */
if (window.__POWERED_BY_QIANKUN__) {
  // 动态设置运行时 publicPath，以确保资源正确加载
  // 对于 Vite，我们需要设置 import.meta.url 的 base URL
  if (window.__INJECTED_PUBLIC_PATH_BY_QIANKUN__) {
    // Vite 使用 import.meta.url 来设置 base URL
    // 这里我们通过全局变量来通知 Vite 设置正确的 base
    window.__VITE_PUBLIC_PATH__ = window.__INJECTED_PUBLIC_PATH_BY_QIANKUN__;
  }
}

















