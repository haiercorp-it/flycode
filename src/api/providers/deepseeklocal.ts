import { Anthropic } from "@anthropic-ai/sdk"
import OpenAI, { AzureOpenAI } from "openai"
import { withRetry } from "../retry"
import {
	ApiHandlerOptions,
	azureOpenAiDefaultApiVersion,
	ModelInfo,
	openAiModelInfoSaneDefaults,
	deepseekModelInfoSaneDefaults,
} from "../../shared/api"
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
	public get getModelInfo(): { id: string; url: string } {
		return {
			id: this.options.deepseekLocalModelId || "DeepSeek-R1",
			url: this.options.deepseekLocalUrl || "http://120.222.7.189:1025/v1/chat/completions",
		}
	}
	@withRetry()
	async *createMessage(systemPrompt: string, messages: Anthropic.Messages.MessageParam[]): ApiStream {
		// if (!this.options.deepseekLocalUrl) {
		// 	throw new Error("Haier internal AI base URL is not configured")
		// }
		console.log("DeepSeekLocalHandler: createMessage called", this.getModelInfo.id, this.getModelInfo.url)

		const url = this.options.deepseekLocalUrl || ""
		const headers = {
			"Content-Type": "application/json",
		}
		// 打印转换前的消息，检查格式
		console.log("Original messages:", messages)
		console.log("Original messages-json:", JSON.stringify(messages))
		const convertedMessages = convertToOpenAiMessages(messages)
		console.log("Converted messages:", convertedMessages)
		console.log("Converted messages:", JSON.stringify(convertedMessages))

		const processedMessages = messages.map((msg, index) => {
			if ("content" in msg && Array.isArray(msg.content)) {
				let filteredContent = msg.content
				// 处理倒数两个之前的消息
				if (index < messages.length - 2) {
					filteredContent = msg.content.filter((item) => {
						// 过滤以 <environment_details> 开头的文本项
						if ("text" in item) {
							return !item.text.startsWith("<environment_details>")
						}
						return true // 保留非文本项
					})
				}
				// 将处理后的内容数组转换为字符串
				const contentStr = filteredContent
					.map((item) => ("text" in item ? item.text : (item as any).image_url))
					.join("\n")
				return {
					role: msg.role,
					content: contentStr,
				}
			}
			return msg
		})

		// // 将消息数组转换为字符串
		// const processedMessages = messages.map((msg,index) => {
		// 	if ("content" in msg && Array.isArray(msg.content)) {

		// 		return {
		// 			role: msg.role,
		// 			content: msg.content.map((item) => ("text" in item ? item.text : (item as any).image_url)).join("\n"),
		// 		}
		// 	}
		// 	return msg
		// })

		console.log("processedMessages:", processedMessages)
		const data = {
			model: this.options.deepseekLocalModelId || "DeepSeek-R1",
			messages: [
				{
					role: "system",
					content: systemPrompt,
				},
				...processedMessages,
			],
			max_tokens: 8000,
			temperature: 0.07,
			stream: true,
		}
		// console.log("Request body:", JSON.stringify(data, null, 2))
		try {
			// 使用 fetch API 发送请求并处理流式响应
			const response = await fetch(url, {
				method: "POST",
				headers: headers,
				body: JSON.stringify(data),
			})
			console.log("Response length:", JSON.stringify(data).length)
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
						let raw_line = line.replace(/^data:/, "").trim()
						// 直接解析整个 JSON 对象
						if (!raw_line.startsWith("{")) {
							continue // 忽略非 JSON 行，例如 "data: [DONE]" 或者空行
						}
						const dataw = JSON.parse(raw_line)
						console.log("dataw:========", dataw.choices[0].delta.content, raw_line)

						// if (dataw?.choices[0].delta.content) {
						// 	hasYieldedContent = true
						// 	yield {
						// 		type: "text",
						// 		text: dataw.choices[0].delta.content,
						// 	}
						// }
						const delta = dataw?.choices[0]?.delta
						if (delta?.content) {
							hasYieldedContent = true
							yield {
								type: "text",
								text: delta.content,
							}
						}

						if (delta && "reasoning_content" in delta && delta.reasoning_content) {
							hasYieldedContent = true
							yield {
								type: "reasoning",
								reasoning: (delta.reasoning_content as string | undefined) || "",
							}
						}

						if (dataw.usage) {
							hasYieldedContent = true
							console.log("dataw.usage:", dataw.usage)
							yield {
								type: "usage",
								inputTokens: dataw.usage.prompt_tokens || 0, // (deepseek reports total input AND cache reads/writes, see context caching: https://api-docs.deepseek.com/guides/kv_cache) where the input tokens is the sum of the cache hits/misses, while anthropic reports them as separate tokens. This is important to know for 1) context management truncation algorithm, and 2) cost calculation (NOTE: we report both input and cache stats but for now set input price to 0 since all the cost calculation will be done using cache hits/misses)
								outputTokens: dataw.usage.completion_tokens || 0,
								// @ts-ignore-next-line
								cacheReadTokens: dataw.usage.prompt_cache_hit_tokens || 0,
								// @ts-ignore-next-line
								cacheWriteTokens: dataw.usage.prompt_cache_miss_tokens || 0,
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
			info: deepseekModelInfoSaneDefaults,
		}
	}
}
