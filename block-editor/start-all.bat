@echo off
echo 启动 Block Editor 开发环境...

echo.
echo 1. 启动协同服务器 (端口 1234)...
start "协同服务器" cmd /k "cd ..\MainApp3 && npm run collaboration-server"

echo.
echo 2. 启动后端API服务 (端口 3000)...
start "后端API" cmd /k "cd ..\block-end && npm start"

echo.
echo 3. 启动微应用 (端口 7200)...
start "微应用" cmd /k "cd ..\MicroApp && npm start"

echo.
echo 4. 启动主应用 (端口 3001)...
start "主应用" cmd /k "cd app && npm run dev"

echo.
echo 所有服务正在启动中...
echo 请等待所有服务启动完成后访问: http://localhost:3001
echo.
echo 服务端口说明:
echo - 主应用: http://localhost:3001
echo - 微应用: http://localhost:7200  
echo - 后端API: http://localhost:3000
echo - 协同服务器: ws://localhost:1234
echo.
pause


























