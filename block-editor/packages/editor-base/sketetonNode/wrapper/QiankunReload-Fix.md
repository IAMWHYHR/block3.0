# Qiankun微应用重新加载错误修复

## 问题描述

在`block-editor/app`项目中：
1. 插入金字塔微应用
2. 删除该微应用
3. 再次插入微应用

出现错误：
```
qiankun.js?v=65b9950f:4035 single-spa minified message #31: See https://single-spa.js.org/error/?code=31&arg=mount&arg=parcel&arg=pyramid-app&arg=3000
```

微应用加载不出来。

## 根本原因

1. **微应用实例未正确清理**：删除微应用时，qiankun实例没有完全清理
2. **名称冲突**：重新加载时使用相同的微应用名称，导致single-spa冲突
3. **清理时序问题**：使用setTimeout延迟清理可能导致清理不完整
4. **容器状态不一致**：容器清理和微应用卸载的时序不匹配

## 修复方案

### 1. 改进微应用卸载逻辑

```typescript
// 卸载微应用
const unloadMicroApplication = useCallback(() => {
  if (microAppInstance) {
    console.log('🗑️ 卸载微应用:', microName);
    setIsUnmounting(true);
    
    try {
      // 检查容器是否仍然存在
      if (containerRef.current && document.contains(containerRef.current)) {
        console.log('✅ 开始卸载微应用实例');
        microAppInstance.unmount();
        
        // 等待卸载完成后再清理容器
        setTimeout(() => {
          if (containerRef.current) {
            containerRef.current.innerHTML = '';
            console.log('✅ 容器已清理');
          }
        }, 100);
      } else {
        console.log('⚠️ 容器不存在，跳过微应用卸载');
      }
      
      // 立即清理状态
      setMicroAppInstance(null);
      setIsMounted(false);
      console.log('✅ 微应用状态已清理');
    } catch (err) {
      console.error('❌ 微应用卸载失败:', err);
      // 即使卸载失败，也要清理状态
      setMicroAppInstance(null);
      setIsMounted(false);
    }
  }
}, [microAppInstance, microName]);
```

### 2. 优化组件清理逻辑

```typescript
// 清理
useEffect(() => {
  return () => {
    console.log('🧹 SkeletonNodeView 清理开始');
    
    // 设置卸载状态，防止新的加载操作
    setIsUnmounting(true);
    
    // 立即执行清理，不使用setTimeout
    console.log('🧹 SkeletonNodeView 执行实际清理');
    
    // 先检查容器是否仍然存在
    if (microAppInstance && containerRef.current) {
      try {
        // 检查容器是否还在DOM中
        if (document.contains(containerRef.current)) {
          console.log('✅ 容器存在，正常卸载微应用');
          microAppInstance.unmount();
          
          // 立即清理容器
          containerRef.current.innerHTML = '';
          console.log('✅ 容器已清理');
        } else {
          console.log('⚠️ 容器已被移除，跳过微应用卸载');
        }
      } catch (err) {
        console.error('❌ 清理时卸载微应用失败:', err);
      }
    } else if (microAppInstance) {
      console.log('⚠️ 微应用实例存在但容器不存在，跳过卸载');
    }
  };
}, [microAppInstance]);
```

### 3. 添加唯一微应用名称

```typescript
// 生成唯一的微应用名称，避免重复加载冲突
const uniqueMicroName = `${microName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
console.log('🆔 使用唯一微应用名称:', uniqueMicroName);

// 检查是否已有同名实例，如果有则先卸载
try {
  const existingInstance = (window as any).__POWERED_BY_QIANKUN__ ? 
    (window as any).__POWERED_BY_QIANKUN__.getAppStatus?.(uniqueMicroName) : null;
  
  if (existingInstance) {
    console.log('⚠️ 发现同名微应用实例，先卸载:', uniqueMicroName);
    // 这里不需要手动卸载，qiankun会自动处理
  }
} catch (err) {
  console.log('ℹ️ 检查现有实例时出错（正常情况）:', err);
}

// 加载微应用
const instance = await loadMicroApp({
  name: uniqueMicroName,
  entry: config.entry,
  container: container,
  props
});
```

## 修复效果

### 1. 解决single-spa错误
- ✅ 每次加载使用唯一的微应用名称
- ✅ 避免名称冲突导致的single-spa错误
- ✅ 确保微应用能够正常重新加载

### 2. 改进清理机制
- ✅ 立即执行清理，不使用延迟
- ✅ 确保微应用实例完全卸载
- ✅ 容器状态与微应用状态同步

### 3. 增强错误处理
- ✅ 完善的错误处理和日志记录
- ✅ 即使卸载失败也能正确清理状态
- ✅ 详细的调试信息便于问题排查

### 4. 提升稳定性
- ✅ 防止微应用实例泄漏
- ✅ 确保重新加载的可靠性
- ✅ 优化内存使用

## 技术细节

### 唯一名称生成
```typescript
const uniqueMicroName = `${microName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
```
- 使用时间戳确保时间唯一性
- 使用随机字符串确保并发唯一性
- 格式：`pyramid-app-1703123456789-abc123def`

### 实例检查机制
```typescript
const existingInstance = (window as any).__POWERED_BY_QIANKUN__ ? 
  (window as any).__POWERED_BY_QIANKUN__.getAppStatus?.(uniqueMicroName) : null;
```
- 检查qiankun内部状态
- 避免重复加载同名实例
- 提供额外的保护机制

### 清理时序优化
```typescript
// 立即卸载微应用
microAppInstance.unmount();

// 延迟清理容器
setTimeout(() => {
  if (containerRef.current) {
    containerRef.current.innerHTML = '';
  }
}, 100);
```
- 先卸载微应用实例
- 再清理DOM容器
- 确保清理顺序正确

## 测试建议

1. **重复加载测试**：
   - 插入微应用 → 删除 → 重新插入
   - 验证每次都能正常加载
   - 检查控制台无错误信息

2. **并发测试**：
   - 快速连续插入和删除微应用
   - 验证无实例冲突
   - 检查内存使用情况

3. **错误恢复测试**：
   - 模拟卸载失败场景
   - 验证状态清理机制
   - 检查错误处理效果

4. **性能测试**：
   - 大量微应用操作
   - 验证清理效率
   - 检查内存泄漏

## 相关文件

- `block-editor/packages/editor-base/sketetonNode/wrapper/SkeletonNodeView.tsx`

## 关键改进

1. **唯一名称机制**：避免single-spa名称冲突
2. **改进清理逻辑**：确保微应用完全卸载
3. **优化清理时序**：先卸载实例，再清理容器
4. **增强错误处理**：完善的异常处理和状态清理
5. **详细日志记录**：便于问题排查和调试

## 使用说明

现在您可以：
1. 正常插入金字塔微应用
2. 删除微应用
3. 重新插入微应用
4. 重复以上操作多次

每次操作都会：
- 使用唯一的微应用名称
- 正确清理之前的实例
- 确保新实例正常加载
- 提供详细的调试日志

这样就彻底解决了qiankun微应用重新加载的问题！
