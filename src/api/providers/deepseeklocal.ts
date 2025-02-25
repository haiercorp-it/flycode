import { Anthropic } from "@anthropic-ai/sdk"
import OpenAI, { AzureOpenAI } from "openai"
import { withRetry } from "../retry"
import { ApiHandlerOptions, azureOpenAiDefaultApiVersion, ModelInfo, openAiModelInfoSaneDefaults } from "../../shared/api"
import { ApiHandler } from "../index"
import { convertToOpenAiMessages } from "../transform/openai-format"
import { ApiStream } from "../transform/stream"

export class DeepSeekLocalHandler implements ApiHandler {
	private options: ApiHandlerOptions
	/* private client: OpenAI */

	constructor(options: ApiHandlerOptions) {
		this.options = options

		/* 		this.client = new OpenAI({
            baseURL: options.haierinternalAiBaseUrl, // 基础 URL
            apiKey: options.haierinternalApiKey,
            defaultHeaders: {
                "Content-Type": "application/json",
            },
        }) */
	}
	getAccountInfo() {}
	@withRetry()
	async *createMessage(systemPrompt: string, messages: Anthropic.Messages.MessageParam[]): ApiStream {
		if (!this.options.deepseekLocalUrl) {
			throw new Error("Haier internal AI base URL is not configured")
		}

		const url = this.options.deepseekLocalUrl
		const headers = {
			"Content-Type": "application/json",
		}
		// 打印转换前的消息，检查格式
		console.log("Original messages:", messages)
		console.log("Original messages-json:", JSON.stringify(messages))
		const convertedMessages = convertToOpenAiMessages(messages)
		console.log("Converted messages:", convertedMessages)
		console.log("Converted messages:", JSON.stringify(convertedMessages))

		// 将消息数组转换为字符串
		const processedMessages = messages.map((msg) => {
			if ("content" in msg && Array.isArray(msg.content)) {
				return {
					role: msg.role,
					content: msg.content.map((item) => ("text" in item ? item.text : (item as any).image_url)).join("\n"),
				}
			}
			return msg
		})

		const data = {
			model: this.options.deepseekLocalModelId,
			messages: [
				{
					role: "system",
					content: systemPrompt,
				},
				...processedMessages,
			],
			max_tokens: 1024,
			temperature: 0.07,
			stream: true,
		}
		console.log("Request body:", JSON.stringify(data, null, 2))
		try {
			// 使用 fetch API 发送请求并处理流式响应
			const response = await fetch(url, {
				method: "POST",
				headers: headers,
				body: JSON.stringify(data),
			})

			if (!response.ok) {
				const errorText = await response.text()
				console.error("Error response:", {
					status: response.status,
					statusText: response.statusText,
					body: errorText,
				})
				throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`)
			}

			// 获取响应流
			const reader = response.body?.getReader()
			if (!reader) {
				throw new Error("No response body")
			}

			let hasYieldedContent = false // 添加标志来跟踪是否有输出内容

			// 处理流式响应
			while (true) {
				const { done, value } = await reader.read()
				if (done) {
					break
				}

				// 解码响应数据
				const chunk = new TextDecoder().decode(value)
				const lines = chunk.split("\n").filter((line) => line.trim())
				console.log("chunk-----:", chunk)
				for (const line of lines) {
					try {
						const raw_line = line.replace(/^data:/, "").trim()
						// 直接解析整个 JSON 对象
						const dataw = JSON.parse(raw_line)
						console.log("dataw:", dataw.choices[0].delta.content, raw_line)

						if (dataw.choices[0].delta.content) {
							hasYieldedContent = true
							yield {
								type: "text",
								text: dataw.choices[0].delta.content,
							}
						}
					} catch (e) {
						console.error("Error parsing chunk:", e)
					}
				}
			}
			// 如果没有任何输出，抛出错误
			if (!hasYieldedContent) {
				throw new Error("No content received from the model")
			}
		} catch (error) {
			console.error("API call failed:", {
				error: error,
				status: error.response?.status,
				data: error.response?.data,
				message: error.message,
			})
			throw error
		}
	}

	getModel(): { id: string; info: ModelInfo } {
		return {
			id: this.options.openAiModelId ?? "",
			info: openAiModelInfoSaneDefaults,
		}
	}
}
