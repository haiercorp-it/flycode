//  export const prompt = `// ... 现有基础结构 ...

// // 增加触发检测规则
// ====
// 账号中心触发规则

// 当检测到以下任一条件时自动触发SDK接入流程：
// 1. 用户输入包含 @账号中心 或 #iam
// 2. 项目存在登录相关路由（/login /auth）但无SDK引用
// 3. package.json包含@haier/iam但未找到初始化代码

// // 增加配置参数收集流程
// ====
// 账号中心配置收集

// <thinking>
// 1. 检查是否已配置必要参数：
//    - ssoUrl（SSO服务地址）
//    - clientId（应用K码）
//    - tokenUrl（令牌服务地址）
// 2. 通过search_files工具查找现有配置：
//    \`\`\regex
//    (ssoUrl|clientId|tokenUrl)\s*:\s*["'][^"']*["']
//    \`\`\`
// 3. 缺失参数时使用ask_followup_question工具询问
// </thinking>

// # 参数收集交互流程
// <replace_in_file>
// <path>src/config/auth.config.ts</path>
// <diff>
// <<<<<<< SEARCH
// export const AUTH_CONFIG = {
//   // 基础配置
// =======
// export const AUTH_CONFIG = {
//   // 账号中心配置（由@haier/iam注入）
//   ssoUrl: "${await ask_followup_question('请提供SSO服务地址 (如 https://iam.haier.net)')}",
//   clientId: "${await ask_followup_question('请输入应用K码，可在IAM控制台获取')}",
//   tokenUrl: "${await ask_followup_question('请输入令牌服务地址 (如 /api/auth/token)')}",
// >>>>>>> REPLACE
// </diff>
// </replace_in_file>

// // 增加框架检测后的动态生成
// ====
// 账号中心初始化生成

// # 动态生成configUserCenter初始化代码（根据检测到的框架）
// ${
//   framework === 'vue' ? `
// <write_to_file>
// <path>src/plugins/auth.ts</path>
// <content>
// import { configUserCenter } from '@haier/iam'
// import type { App } from 'vue'

// export default {
//   install: (app: App) => {
//     configUserCenter({
//       ssoUrl: process.env.VUE_APP_SSO_URL,
//       clientId: process.env.VUE_APP_CLIENT_ID,
//       onUserInfoChange(user) {
//         app.config.globalProperties.$user = user
//       }
//     })
//   }
// }
// </content>
// </write_to_file>

// <replace_in_file>
// <path>src/main.ts</path>
// <diff>
// <<<<<<< SEARCH
// import App from './App.vue'
// =======
// import App from './App.vue'
// import AuthPlugin from './plugins/auth'

// const app = createApp(App)
// app.use(AuthPlugin)
// >>>>>>> REPLACE
// </diff>
// </replace_in_file>`

// : framework === 'react' ? `
// <write_to_file>
// <path>src/providers/AuthProvider.tsx</path>
// <content>
// import { useEffect } from 'react'
// import { configUserCenter, useUserInfo } from '@haier/iam'

// export default function AuthProvider({ children }) {
//   const user = useUserInfo()

//   useEffect(() => {
//     configUserCenter({
//       ssoUrl: import.meta.env.VITE_SSO_URL,
//       clientId: import.meta.env.VITE_CLIENT_ID,
//       onUserInfoChange: (newUser) => {
//         // 同步到状态管理
//       }
//     })
//   }, [])

//   return children
// }
// </content>
// </write_to_file>`

// : framework === 'uniapp' ? `
// <write_to_file>
// <path>src/utils/auth.ts</path>
// <content>
// // 条件编译处理
// export const initIamSDK = async () => {
//   // #ifdef H5
//   const { configUserCenter } = await import('@haier/iam')
//   await configUserCenter({
//     ssoUrl: 'https://iam.haier.net',
//     clientId: uni.getAccountInfoSync().miniProgram.appId,
//     redirectUri: window.location.href
//   })
//   // #endif
// }
// </content>
// </write_to_file>`
// : ''
// }

// // 增加环境变量验证
// ====
// 环境配置验证

// <execute_command>
// <command>npm install dotenv --save-dev</command>
// <requires_approval>false</requires_approval>
// </execute_command>

// <replace_in_file>
// <path>.env.${framework === 'vue' ? 'local' : 'development'}</path>
// <diff>
// <<<<<<< SEARCH
// # API配置
// =======
// # 账号中心配置
// VITE_SSO_URL=${await ask_followup_question('请输入SSO生产环境地址')}
// VITE_SSO_TEST_URL=${await ask_followup_question('请输入SSO测试环境地址')}
// VITE_CLIENT_ID=${await ask_followup_question('请输入应用K码')}
// >>>>>>> REPLACE
// </diff>
// </replace_in_file>

// // 增加完成检测
// ====
// 接入完成标准

// <attempt_completion>
// <result>
// 账号中心接入完成 ✅
// ✔️ 依赖安装 @haier/iam@${await getPackageVersion('@haier/iam')}
// ✔️ 构建配置已注入
// ✔️ 环境变量配置完成
// ✔️ ${framework}初始化模块已生成
// </result>
// <command>npm run dev -- --open</command>
// </attempt_completion>`
