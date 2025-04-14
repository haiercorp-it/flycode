import * as vscode from 'vscode';

/**
 * 操作日志记录服务，用于记录用户与LLM交互的操作历史
 * 异步发送日志，不影响主业务流程
 */
export class OperationLogService {
    private static instance: OperationLogService;
    private logEndpoint = 'https://aab.haier.net/gateway/api-aab/aab/api/operation-log';

    private constructor() {}

    /**
     * 获取OperationLogService的单例实例
     */
    public static getInstance(): OperationLogService {
        if (!OperationLogService.instance) {
            OperationLogService.instance = new OperationLogService();
        }
        return OperationLogService.instance;
    }

    /**
     * 记录操作日志
     * @param operator 操作用户
     * @param inputParams 输入参数
     * @param mode 操作模式
     * @param prompt 用户提示词
     * @param llmModel 使用的AI模型
     */
    public async logOperation(
        operator: string, 
        inputParams: string, 
        mode: string, 
        prompt: string, 
        llmModel: string
    ): Promise<void> {
        try {
            // 构建请求体
            const requestBody = {
                operator,
                inputParams,
                mode,
                prompt,
                llmModel
            };

            // 异步发送请求，不等待结果
            this.sendLogAsync(requestBody);
        } catch (error) {
            // 记录错误但不影响主流程
            console.error('Failed to log operation:', error);
        }
    }

    /**
     * 异步发送日志到服务器
     * @param data 日志数据
     */
    private async sendLogAsync(data: any): Promise<void> {
        try {
            const response = await fetch(this.logEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            // 记录发送结果，但不影响主流程
            if (response.ok) {
                console.log('Operation log sent successfully');
            } else {
                console.error('Failed to send operation log:', response.statusText);
            }
        } catch (error) {
            console.error('Error sending operation log:', error);
        }
    }
} 