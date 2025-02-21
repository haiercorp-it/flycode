import { Anthropic } from "@anthropic-ai/sdk"
import OpenAI, { AzureOpenAI } from "openai"
import { withRetry } from "../retry"
import { ApiHandlerOptions, azureOpenAiDefaultApiVersion, ModelInfo, openAiModelInfoSaneDefaults } from "../../shared/api"
import { ApiHandler } from "../index"
import { convertToOpenAiMessages } from "../transform/openai-format"
import { ApiStream } from "../transform/stream"

export class HaierUserCenterHandler implements ApiHandler {
	private options: ApiHandlerOptions
	/* private client: OpenAI */
	private url: string = "https://ikm.haier.net"
	private openRag = true
	private chatAssiantName: string = "new_chat_1"
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

	// 创建一个聊天助手服务
	public async createchatAssiant() {
		const url = this.url + "/api/v1/chats"
		const timestamp = Date.now()
		const chatName = `new_chat_${timestamp}`
		this.chatAssiantName = chatName
		const payload = {
			name: chatName,
			dataset_ids: ["64c57d52ef7011ef98164a389f6d0c5d"],
		}
		const headers = {
			Authorization: "",
			"Content-Type": "application/json",
			"User-Agent":
				"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
		}
		headers["Authorization"] = `Bearer` + " " + this.options.haierragflowapikey

		try {
			// 使用 fetch API 发送请求并处理流式响应
			const response = await fetch(url, {
				method: "POST",
				headers: headers,
				body: JSON.stringify(payload),
			})

			if (!response.ok) {
				throw new Error(`Failed to send request: ${response.statusText}`)
			}
			const result = await response.json()
			console.log("Response:", result)
			return result.data.id
		} catch (error) {
			console.error("Error sending request:", error)
			throw new Error(`Failed to send request: ${(error as any).message}`)
		}
	}

	// 创建聊天会话服务
	public async createChatSession(chat_id: string) {
		const url = this.url + `/api/v1/chats/${chat_id}/sessions`
		const payload = {
			name: this.chatAssiantName,
		}
		const headers = {
			Authorization: "",
			"Content-Type": "application/json",
			"User-Agent":
				"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
		}
		headers["Authorization"] = `Bearer` + " " + this.options.haierragflowapikey

		try {
			// 使用 fetch API 发送请求并处理流式响应
			const response = await fetch(url, {
				method: "POST",
				headers: headers,
				body: JSON.stringify(payload),
			})

			if (!response.ok) {
				throw new Error(`Failed to send request: ${response.statusText}`)
			}
			const result = await response.json()
			console.log("Response:", result)
			return result.data.id
		} catch (error) {
			console.error("Error sending request:", error)
			throw new Error(`Failed to send request: ${(error as any).message}`)
		}
	}

	public async converseWithchatassistant(question: string, chat_id: string) {
		const url = this.url + `/api/v1/chats/${chat_id}/completions`
		const payload = {
			name: this.chatAssiantName,
			question: "集成账号中心",
			stream: false,
		}
		const headers = {
			Authorization: "",
			"Content-Type": "application/json",
			"User-Agent":
				"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
		}
		headers["Authorization"] = `Bearer` + " " + this.options.haierragflowapikey

		try {
			// 使用 fetch API 发送请求并处理流式响应
			const response = await fetch(url, {
				method: "POST",
				headers: headers,
				body: JSON.stringify(payload),
			})
			if (!response.ok) {
				throw new Error(`Failed to send request: ${response.statusText}`)
			}
			const result = await response.json()
			console.log("Response:", result)
			return result.data.answer
		} catch (error) {
			console.error("Error sending request:", error)
			throw new Error(`Failed to send request: ${(error as any).message}`)
		}
	}

	public async *createRetrivalDocument() {
		const url = this.url + "/api/v1/retrieval "

		const payload = {
			question: "账号中心集成",
			dataset_ids: ["64c57d52ef7011ef98164a389f6d0c5d"],
			document_ids: ["d78bd6aaeff311ef94fe62707a40c49e"],
		}
		const headers = {
			"Content-Type": "application/json",
			"User-Agent":
				"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
			Authorization: "Bearer" + this.options.haierragflowapikey,
		}
		// 打印转换前的消息，检查格式
		// console.log("Original messages:", messages)
		// console.log("Original messages-json:", JSON.stringify(messages))
		// const convertedMessages = convertToOpenAiMessages(messages)
		// console.log("Converted messages:", convertedMessages)
		// console.log("Converted messages:", JSON.stringify(convertedMessages))

		const data = {}
		console.log("Request body:", JSON.stringify(data, null, 2))
		try {
			// 使用 fetch API 发送请求并处理流式响应
			const response = await fetch(url, {
				method: "POST",
				headers: headers,
				body: JSON.stringify(payload),
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
				if (done) break

				// 解码响应数据
				const chunk = new TextDecoder().decode(value)
				const lines = chunk.split("\n").filter((line) => line.trim())
				console.log("chunk-----:", chunk)
				for (const line of lines) {
					try {
						// 直接解析整个 JSON 对象
						const data = JSON.parse(line)
						if (data.message?.content) {
							hasYieldedContent = true
							yield {
								type: "text",
								text: data.message.content,
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

	public async *createChunkListDocument(): ApiStream {
		const url =
			this.url +
			`/api/v1/datasets/64c57d52ef7011ef98164a389f6d0c5d/documents/d78bd6aaeff311ef94fe62707a40c49e/chunks?keywords=账号中心&page=1&page_size=1000`
		const payload = {}
		const headers = {
			"Content-Type": "application/json",
			"User-Agent":
				"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
			Authorization: "Bearer" + " " + this.options.haierragflowapikey,
		}
		try {
			// 使用 fetch API 发送请求并处理流式响应
			const response = await fetch(url, {
				method: "get",
				headers: headers,
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
			const datastr = await response.json()
			const contentstr = datastr.data.chunks.map((item: any) => item.content).join("\n")
			console.log("response:", contentstr)
			// 获取响应流
			if (!datastr) {
				throw new Error("No response body")
			}
			yield {
				type: "text",
				text: contentstr,
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

	public async getChatAssistant() {}
	public async getAccountInfo() {
		const chatAssaitId = await this.createchatAssiant()
		const sessionId = await this.createChatSession(chatAssaitId)
		const resp = await this.converseWithchatassistant("集成账号中心前端", chatAssaitId)
		console.log("resp:", resp)
		return {
			type: "text",
			text: resp,
		}
		// const url = this.url + `/api/v1/datasets/64c57d52ef7011ef98164a389f6d0c5d/documents/d78bd6aaeff311ef94fe62707a40c49e/chunks?keywords=账号中心&page=1&page_size=1000`
		// const headers = {
		//     "Content-Type": "application/json",
		//     "User-Agent":
		//     "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
		//     Authorization: "Bearer"+" "+this.options.haierragflowapikey
		// }
		// try {
		//     // 使用 fetch API 发送请求并处理流式响应
		//     const response = await fetch(url, {
		//         method: "get",
		//         headers: headers,
		//     })

		//     if (!response.ok) {
		//         const errorText = await response.text()
		//         console.error("Error response:", {
		//             status: response.status,
		//             statusText: response.statusText,
		//             body: errorText,
		//         })
		//         throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`)
		//     }
		//     const datastr = await response.json();
		//     const contentstr = datastr.data.chunks.map((item:any)=>item.content).join("\n");
		//     console.log("response:", contentstr)
		//     // 获取响应流
		//     if (!datastr) {
		//         throw new Error("No response body")
		//     }
		//     return {
		//         type: "text",
		//         text: contentstr,
		//     }

		// } catch (error) {
		//     console.error("API call failed:", {
		//         error: error,
		//         status: error.response?.status,
		//         data: error.response?.data,
		//         message: error.message,
		//     })
		//     throw error
		// }
	}

	@withRetry()
	async *createMessage(systemPrompt: string, messages: Anthropic.Messages.MessageParam[]): ApiStream {
		if (this.openRag) {
			//    const url = this.url + "/api/v1/retrieval "
			//    const payload = {
			//       "question": "账号中心",
			//       "dataset_ids": ["64c57d52ef7011ef98164a389f6d0c5d"],
			//       "document_ids": ["d78bd6aaeff311ef94fe62707a40c49e"]
			//      };
			//    const headers = {
			//        "Content-Type": "application/json",
			//        "User-Agent":
			//        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
			//        Authorization: "Bearer"+" "+this.options.haierragflowapikey
			//    }
			//    try {
			//        // 使用 fetch API 发送请求并处理流式响应
			//        const response = await fetch(url, {
			//            method: "POST",
			//            headers: headers,
			//            body: JSON.stringify(payload),
			//        })
			//        if (!response.ok) {
			//            const errorText = await response.text()
			//            console.log("errorText:", errorText)
			//            console.error("Error response:", {
			//                status: response.status,
			//                statusText: response.statusText,
			//                body: errorText,
			//            })
			//            throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`)
			//        }
			//        const datastr = await response.json();
			//        const contentstr = datastr.data.chunks.map((item:any)=>item.content).join("\n");
			//        console.log("response:", contentstr)
			//        // 获取响应流
			//        const reader = response.body?.getReader()
			//        if (!reader) {
			//            throw new Error("No response body")
			//        }
			//        let hasYieldedContent = false // 添加标志来跟踪是否有输出内容
			//        // 处理流式响应
			//        while (true) {
			//            const { done, value } = await reader.read()
			//            if (done) break
			//            // 解码响应数据
			//            const chunk = new TextDecoder().decode(value)
			//            const lines = chunk.split("\n").filter((line) => line.trim())
			//            console.log("chunk-----:", chunk)
			//            for (const line of lines) {
			//                try {
			//                    // 直接解析整个 JSON 对象
			//                    const data = JSON.parse(line)
			//                    if (data.message?.content) {
			//                        hasYieldedContent = true
			//                        yield {
			//                            type: "text",
			//                            text: data.message.content,
			//                        }
			//                    }
			//                } catch (e) {
			//                    console.error("Error parsing chunk:", e)
			//                }
			//            }
			//        }
			//        // 如果没有任何输出，抛出错误
			//        if (!hasYieldedContent) {
			//            throw new Error("No content received from the model")
			//        }
			//    } catch (error) {
			//        console.error("API call failed:", {
			//            error: error,
			//            status: error.response?.status,
			//            data: error.response?.data,
			//            message: error.message,
			//        })
			//        throw error
			//    }
			//    const chunkstream = await this.createChunkListDocument();
			//    const iterator = chunkstream[Symbol.asyncIterator]()
			//    try {
			// 	// awaiting first chunk to see if it will throw an error
			// 	const firstChunk = await iterator.next()
			// 	yield firstChunk.value;
			// } catch (error) {
			// }
			// this.createchatAssiant();
		} else {
			// const url = "http://10.250.7.75:33607/api/v2/integrate "
			const url = "http://localhost:8000/api/v2/integrate"
			const payload = {
				requirement: "集成账号中心",
				type: "sendAI",
				userId: "client_1234567890",
				param: {},
				threadId: "thread_1234567890",
				question: "集成账号中心",
				config: {},
			}
			const headers = {
				"Content-Type": "application/json",
				"User-Agent":
					"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
			}
			// 打印转换前的消息，检查格式
			// console.log("Original messages:", messages)
			// console.log("Original messages-json:", JSON.stringify(messages))
			// const convertedMessages = convertToOpenAiMessages(messages)
			// console.log("Converted messages:", convertedMessages)
			// console.log("Converted messages:", JSON.stringify(convertedMessages))

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

			const data = {}
			console.log("Request body:", JSON.stringify(data, null, 2))
			try {
				// 使用 fetch API 发送请求并处理流式响应
				const response = await fetch(url, {
					method: "POST",
					headers: headers,
					body: JSON.stringify(payload),
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
					if (done) break

					// 解码响应数据
					const chunk = new TextDecoder().decode(value)
					const lines = chunk.split("\n").filter((line) => line.trim())
					console.log("chunk-----:", chunk)
					for (const line of lines) {
						try {
							// 直接解析整个 JSON 对象
							const data = JSON.parse(line)
							if (data.message?.content) {
								hasYieldedContent = true
								yield {
									type: "text",
									text: data.message.content,
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
	}

	getModel(): { id: string; info: ModelInfo } {
		return {
			id: this.options.openAiModelId ?? "",
			info: openAiModelInfoSaneDefaults,
		}
	}
}
