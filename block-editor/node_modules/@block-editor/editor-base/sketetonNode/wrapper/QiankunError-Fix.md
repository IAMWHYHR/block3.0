# Qiankun 微应用容器错误修复

## 问题描述

在 `block-editor` 启动应用编辑器工程后，插入微应用时出现以下错误：

```
react-dom.development.js:22874 Uncaught QiankunError2: [qiankun]: Wrapper element for pyramid-app_2 is not existed!
    at assertElementExist (qiankun.js?v=65b9950f:7387:13)
    at Object.appWrapperGetter (qiankun.js?v=65b9950f:7467:5)
    at Proxy.querySelector (qiankun.js?v=65b9950f:6947:80)
    at getContainer (dynamicCSS.js:30:23)
    at updateCSS (dynamicCSS.js:135:19)
```

## 根本原因

1. **时序问题**：微应用还在加载过程中，但 React 组件就被卸载了
2. **容器访问问题**：qiankun 尝试访问一个已经被移除的 DOM 容器
3. **生命周期管理不当**：缺乏对微应用加载和卸载状态的精确控制

## 修复方案

### 1. 添加卸载状态管理

```typescript
const [isUnmounting, setIsUnmounting] = useState(false);
```

### 2. 在微应用加载前检查卸载状态

```typescript
const loadMicroApplication = useCallback(async () => {
  if (isUnmounting) {
    console.log('⚠️ 组件正在卸载，跳过微应用加载');
    return;
  }
  // ... 其他加载逻辑
}, [isUnmounting, ...]);
```

### 3. 在微应用加载完成后再次检查

```typescript
// 再次检查是否正在卸载
if (isUnmounting) {
  console.log('⚠️ 微应用加载完成但组件正在卸载，跳过状态设置');
  try {
    instance.unmount();
  } catch (err) {
    console.error('❌ 卸载刚加载的微应用失败:', err);
  }
  return;
}
```

### 4. 改进清理逻辑

```typescript
useEffect(() => {
  return () => {
    console.log('🧹 SkeletonNodeView 清理开始');
    
    // 设置卸载状态，防止新的加载操作
    setIsUnmounting(true);
    
    // 等待一小段时间，确保正在进行的加载操作完成
    setTimeout(() => {
      // 执行实际清理逻辑
      if (microAppInstance && containerRef.current) {
        try {
          if (document.contains(containerRef.current)) {
            microAppInstance.unmount();
          }
        } catch (err) {
          console.error('❌ 清理时卸载微应用失败:', err);
        }
      }
    }, 100);
  };
}, [microAppInstance, collaborationManager]);
```

### 5. 容器存在性检查

在所有涉及容器操作的地方添加检查：

```typescript
// 检查容器是否仍然存在
if (!container || !document.contains(container)) {
  console.error('❌ 容器不存在或已被移除，无法加载微应用');
  setError('容器不存在，无法加载微应用');
  setIsLoading(false);
  return;
}
```

## 修复效果

1. **防止时序冲突**：通过 `isUnmounting` 状态防止在组件卸载时启动新的微应用加载
2. **安全清理**：确保只有在容器存在时才执行卸载操作
3. **错误处理**：添加了完善的错误处理和日志记录
4. **状态一致性**：确保微应用状态与组件生命周期保持一致

## 测试建议

1. 快速插入和删除微应用节点
2. 在微应用加载过程中删除节点
3. 多次连续操作微应用
4. 检查控制台日志确认修复效果

## 相关文件

- `block-editor/packages/editor-base/sketetonNode/wrapper/SkeletonNodeView.tsx`
- 主要修改：添加卸载状态管理、改进清理逻辑、增强错误处理
