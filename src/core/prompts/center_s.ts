export const prompt = `
// ... existing tools definitions ...

====

账号中心自动生成规则

当检测到用户输入包含 @账号中心 时，自动触发以下文件生成流程：

1. 生成核心配置文件
<write_to_file>
<path>src/core/account/config.ts</path>
<content>
import { configUserCenter } from '@haier/iam';

export const initAccountCenter = () => {
  configUserCenter({
    ssoUrl: "https://iama.haier.net",
    clientId: "YOUR_K_CODE",
    tokenUrl: "/api/auth/token",
    appId: "YOUR_APP_ID",
    onUserInfoChange: (userInfo) => {
      console.log('用户信息变更:', userInfo);
    }
  });
};
</content>
</write_to_file>

2. 生成路由配置文件
<replace_in_file>
<path>src/routes/main.tsx</path>
<diff>
<<<<<<< SEARCH
import { createBrowserRouter } from 'react-router-dom';
=======
import { createBrowserRouter } from 'react-router-dom';
import { accountRoutes } from '../features/account/routes';
>>>>>>> REPLACE

<<<<<<< SEARCH
  // ... existing routes ...
=======
  ...accountRoutes,
  // ... existing routes ...
>>>>>>> REPLACE
</diff>
</replace_in_file>

3. 生成API服务层
<write_to_file>
<path>src/features/account/services/authService.ts</path>
<content>
import { login, logout, reLogin } from '@haier/iam';

export class AuthService {
  static async handleLogin() {
    const result = await login();
    if (result.success) {
      localStorage.setItem('access_token', result.token!);
      return result.userInfo;
    }
    throw new Error(result.errorMessage || '登录失败');
  }

  static async handleLogout() {
    await logout();
    localStorage.removeItem('access_token');
  }

  static async refreshToken() {
    return reLogin();
  }
}
</content>
</write_to_file>

4. 生成React Hooks
<write_to_file>
<path>src/hooks/useAuth.ts</path>
<content>
import { useUserInfo, useToken } from '@haier/iam';
import { useEffect } from 'react';

export const useAuth = () => {
  const user = useUserInfo();
  const token = useToken();

  useEffect(() => {
    if (!token) {
      window.location.href = '/login';
    }
  }, [token]);

  return {
    user,
    token,
    isAuthenticated: !!token
  };
};
</content>
</write_to_file>

====

自动触发规则

当满足以下条件时自动执行生成：
1. 用户输入包含 @账号中心 或 @用户中心
2. 项目目录中存在 react/vue 相关依赖
3. 尚未配置账号中心模块

====

安全检测规则

生成完成后自动添加安全校验：
<replace_in_file>
<path>src/App.tsx</path>
<diff>
<<<<<<< SEARCH
function App() {
=======
import { initAccountCenter } from './core/account/config';

function App() {
  // 初始化账号中心
  useEffect(() => {
    initAccountCenter();
  }, []);
>>>>>>> REPLACE
</diff>
</replace_in_file>

====

完成标准验证

<attempt_completion>
<result>
账号中心模块已成功集成，包含：
✓ 核心配置文件 (config.ts)
✓ 路由集成 (main.tsx)
✓ 认证服务层 (authService.ts)
✓ React Hooks (useAuth.ts)
✓ 自动安全校验 (App.tsx)
</result>
<command>npm run dev</command>
</attempt_completion>
`;