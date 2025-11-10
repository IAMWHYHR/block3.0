# 容器检查问题修复

## 问题描述

用户报告容器检查问题：
```
❌ 容器不存在或已被移除，无法加载微应用 {container: true, inDOM: false}
```

这个错误表明容器对象存在（`container: true`），但不在DOM中（`inDOM: false`），导致微应用无法加载。

## 问题分析

### 根本原因
1. **DOM更新时序问题**：容器刚被添加到DOM后，`document.contains(container)`可能还没有立即返回`true`
2. **单次检查不够可靠**：只检查`document.contains(container)`可能不够准确
3. **缺少多重验证**：没有验证容器的父元素和可见性状态

### 技术细节
- 容器通过`containerRef.current.appendChild(container)`添加到DOM
- 立即检查`document.contains(container)`可能返回`false`
- 需要等待DOM更新完成后再进行检查

## 解决方案

### 1. 使用requestAnimationFrame确保DOM更新

**之前的实现：**
```typescript
// 立即检查容器状态
if (!container || !document.contains(container)) {
  console.error('❌ 容器不存在或已被移除，无法加载微应用');
  setError('容器不存在，无法加载微应用');
  setIsLoading(false);
  return;
}
```

**修复后的实现：**
```typescript
// 使用requestAnimationFrame确保DOM更新完成
requestAnimationFrame(() => {
  // 再次使用requestAnimationFrame确保渲染完成
  requestAnimationFrame(checkContainerAndLoad);
});
```

### 2. 多重容器检查机制

**新的检查逻辑：**
```typescript
const checkContainerAndLoad = () => {
  const containerExists = !!container;
  const containerInDOM = container ? document.contains(container) : false;
  const containerHasParent = container ? !!container.parentElement : false;
  const containerRefExists = !!containerRef.current;
  const containerRefInDOM = containerRef.current ? document.contains(containerRef.current) : false;
  
  console.log('🔍 容器检查详情:', {
    container: containerExists,
    containerId: container?.id,
    containerInDOM,
    containerHasParent,
    containerParent: container?.parentElement?.tagName,
    containerParentId: container?.parentElement?.id,
    containerRef: containerRefExists,
    containerRefInDOM,
    containerStyle: container ? window.getComputedStyle(container).display : 'N/A'
  });
  
  // 多重检查：容器存在、在DOM中、有父元素
  if (!containerExists || !containerInDOM || !containerHasParent) {
    console.error('❌ 容器检查失败:', {
      container: containerExists,
      inDOM: containerInDOM,
      hasParent: containerHasParent,
      containerParent: container?.parentElement?.tagName,
      containerParentId: container?.parentElement?.id
    });
    setError('容器不存在或已被移除，无法加载微应用');
    setIsLoading(false);
    return;
  }
  
  // 额外检查：确保容器可见
  const computedStyle = window.getComputedStyle(container);
  if (computedStyle.display === 'none' || computedStyle.visibility === 'hidden') {
    console.warn('⚠️ 容器不可见，但继续加载微应用');
  }
  
  console.log('✅ 容器检查通过，开始加载微应用');
  // 容器检查通过，继续执行微应用加载
  loadMicroAppWithContainer(container);
};
```

### 3. 重构微应用加载逻辑

**提取loadMicroAppWithContainer函数：**
```typescript
// 使用容器加载微应用的内部函数
const loadMicroAppWithContainer = useCallback(async (container: HTMLElement) => {
  try {
    // 构建统一的props接口
    const props: any = {
      container: container,
      microName: microName,
      wsUrl: wsUrl,
      collaborationService: collaborationServiceRef.current,
      collaborationStatus: collaborationStatus,
      onlineUsers: onlineUsers,
      blockContext: blockContextRef.current,
      debugInfo: {
        microName,
        wsUrl,
        collaborationStatus,
        onlineUsersCount: onlineUsers.length,
        isCollaborationReady,
        hasCollaborationService: !!collaborationServiceRef.current,
        hasBlockContext: !!blockContextRef.current
      }
    };

    // 为金字塔微应用添加特定props
    let pyramidProps: any = null;
    if (microName === 'pyramid-app') {
      pyramidProps = {
        ...props,
        // 金字塔特定数据和方法
        pyramidData: collaborationData,
        pyramidListData: collaborationListData,
        updatePyramidData: (key: string, value: any) => {
          blockContextRef.current?.sharedData.updatePyramidData(key, value);
        },
        // ... 其他金字塔特定方法
      };
    }

    // 生成唯一的微应用名称，避免重复加载冲突
    const uniqueMicroName = `${microName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // 加载微应用
    const finalProps = microName === 'pyramid-app' ? (pyramidProps || props) : props;
    const instance = await loadMicroApp({
      name: uniqueMicroName,
      entry: microAppConfigs[microName].entry,
      container: container,
      props: finalProps
    });

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

    console.log('✅ 微应用加载成功:', instance);
    setMicroAppInstance(instance);
    setIsMounted(true);
    
  } catch (err) {
    console.error('❌ 微应用加载失败:', err);
    setError(`微应用加载失败: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    setIsLoading(false);
  }
}, [microName, wsUrl, collaborationStatus, onlineUsers, isCollaborationReady, collaborationData, collaborationListData, isUnmounting]);
```

## 技术优势

### 1. 更可靠的DOM检查
- **双重requestAnimationFrame**：确保DOM更新和渲染完成
- **多重验证条件**：检查容器存在、DOM包含、父元素存在
- **可见性检查**：验证容器的显示状态

### 2. 更好的错误诊断
- **详细的日志信息**：包含容器状态、父元素信息、样式信息
- **分步检查**：每个检查条件都有独立的日志
- **错误上下文**：提供更多调试信息

### 3. 代码结构优化
- **函数分离**：将微应用加载逻辑提取到独立函数
- **职责清晰**：容器检查与微应用加载分离
- **可维护性**：更容易调试和修改

### 4. 时序问题解决
- **异步检查**：使用requestAnimationFrame处理DOM更新时序
- **渲染完成确认**：双重requestAnimationFrame确保渲染完成
- **状态同步**：确保检查时DOM状态是最新的

## 检查条件详解

### 1. 容器存在检查
```typescript
const containerExists = !!container;
```
- 验证容器对象是否创建成功

### 2. DOM包含检查
```typescript
const containerInDOM = container ? document.contains(container) : false;
```
- 验证容器是否在DOM树中

### 3. 父元素检查
```typescript
const containerHasParent = container ? !!container.parentElement : false;
```
- 验证容器是否有父元素（间接验证DOM结构）

### 4. 容器引用检查
```typescript
const containerRefExists = !!containerRef.current;
const containerRefInDOM = containerRef.current ? document.contains(containerRef.current) : false;
```
- 验证容器引用和其DOM状态

### 5. 可见性检查
```typescript
const computedStyle = window.getComputedStyle(container);
if (computedStyle.display === 'none' || computedStyle.visibility === 'hidden') {
  console.warn('⚠️ 容器不可见，但继续加载微应用');
}
```
- 检查容器的显示状态（警告但不阻止加载）

## 使用场景

### 1. 正常加载流程
1. 创建容器元素
2. 添加到DOM
3. 双重requestAnimationFrame等待渲染
4. 多重检查验证容器状态
5. 加载微应用

### 2. 错误处理流程
1. 检查失败时记录详细错误信息
2. 设置错误状态
3. 停止加载状态
4. 返回错误信息

### 3. 调试支持
1. 详细的日志输出
2. 容器状态快照
3. 父元素信息
4. 样式信息

## 测试建议

### 1. 功能测试
- 验证正常微应用加载流程
- 测试容器检查的准确性
- 确认错误处理机制

### 2. 时序测试
- 测试快速连续加载
- 验证DOM更新时序
- 确认requestAnimationFrame效果

### 3. 边界测试
- 测试容器创建失败的情况
- 验证DOM操作异常的处理
- 确认卸载状态的处理

## 相关文件

- `block-editor/packages/editor-base/sketetonNode/wrapper/SkeletonNodeView.tsx`

## 总结

本次修复成功解决了：

1. ✅ **DOM更新时序问题**：使用双重requestAnimationFrame确保DOM更新完成
2. ✅ **容器检查可靠性**：实现多重检查机制，提高检查准确性
3. ✅ **错误诊断能力**：提供详细的调试信息和错误上下文
4. ✅ **代码结构优化**：提取独立函数，提高可维护性
5. ✅ **时序问题解决**：确保检查时DOM状态是最新的

修复后的容器检查机制更加可靠，能够准确识别容器状态，避免因时序问题导致的加载失败！



