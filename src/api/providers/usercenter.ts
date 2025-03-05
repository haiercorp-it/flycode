import { Anthropic } from "@anthropic-ai/sdk"
import OpenAI, { AzureOpenAI } from "openai"
import { withRetry } from "../retry"
import { ApiHandlerOptions, azureOpenAiDefaultApiVersion, ModelInfo, openAiModelInfoSaneDefaults } from "../../shared/api"
import { ApiHandler, ApiRAGHandler } from "../index"
import { convertToOpenAiMessages } from "../transform/openai-format"
import { ApiStream } from "../transform/stream"
import { ClineProvider } from "../../core/webview/ClineProvider"

export class HaierUserCenterHandler implements ApiRAGHandler {
	private providerRef: WeakRef<ClineProvider> | undefined = undefined
	private options: ApiHandlerOptions
	/* private client: OpenAI */
	private url: string = "https://ikm.haier.net"
	private openRag = true
	private chatAssiantName: string = "new_chat_1"
	private chatAssiantId: string = ""
	constructor(options: ApiHandlerOptions) {
		this.options = options
		// this.providerRef = new WeakRef(options.provider)

		/* 		this.client = new OpenAI({
            baseURL: options.haierinternalAiBaseUrl, // 基础 URL
            apiKey: options.haierinternalApiKey,
            defaultHeaders: {
                "Content-Type": "application/json",
            },
        }) */
	}
	public setProvider(provider: ClineProvider) {
		if (!this.providerRef) {
			this.providerRef = new WeakRef(provider)
		}
	}

	public async commomRequest(url: string, payload: any, method: string = "post") {}

	public async listChatAssiants() {
		let chatAssitId
		if (this.providerRef) {
			const chatAssitIds = await this.providerRef.deref()?.getSecret("chatAssitId")
			console.log("chatAssitId", chatAssitIds)
			chatAssitId = chatAssitIds
		} else {
			return null
		}
		if (!chatAssitId) {
			return null
		}
		//694d6bfef35e11efa1bbfa163e16de57
		// const url = this.url + `/api/v1/chats?page=1&page_size=100&id=${chatAssitId}`
		const url = this.url + `/api/v1/chats?page=1&page_size=100&id=694d6bfef35e11efa1bbfa163e16de57`

		console.log("this is url", url)
		const headers = {
			Authorization: "",
			"Content-Type": "application/json",
		}
		headers["Authorization"] = `Bearer` + " " + this.options.haierragflowapikey
		const payload = {}
		try {
			// 使用 fetch API 发送请求并处理流式响应
			const response = await fetch(url, {
				method: "get",
				headers: headers,
			})

			if (!response.ok) {
				if (this.providerRef) {
					await this.providerRef.deref()?.setSecret("chatAssitId", undefined)
				}
				throw new Error(`RAG服务出问题了，@RAG功能暂无法从知识库获取到内容`)
			}
			const result = await response.json()
			if (result.data?.length === 0) {
				if (this.providerRef) {
					await this.providerRef.deref()?.setSecret("chatAssitId", undefined)
				}
			}
			console.log("Response:", result)
			return result.data
		} catch (error) {
			console.error("Error sending request:", error)
			throw new Error(`Failed to send request: ${(error as any).message}`)
		}
	}

	// 创建一个聊天助手服务
	public async createchatAssiant() {
		if (this.providerRef) {
			const chatAssitId = await this.providerRef.deref()?.getSecret("chatAssitId")
			console.log("chatAssitId", chatAssitId)
		}

		const url = this.url + "/api/v1/chats"
		const timestamp = Date.now()
		const chatName = `new_chat_${timestamp}`
		this.chatAssiantName = chatName
		const payload = {
			name: chatName,
			dataset_ids: ["64c57d52ef7011ef98164a389f6d0c5d"],
			llm: {
				// temperature: 0,
				// max_token: 5000,
				frequency_penalty: 0.7,
				max_tokens: 3000,
				model_name: "deepseek-R1",
				presence_penalty: 0.4,
				temperature: 0.1,
				top_p: 0.3,
			},
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
				throw new Error(`RAG服务出问题了，@RAG功能暂无法从知识库获取到内容`)
			}
			const result = await response.json()
			console.log("Response11111:", result)
			if (this.providerRef) {
				await this.providerRef.deref()?.setSecret("chatAssitId", result.data.id)
			}
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
				throw new Error(`RAG服务出问题了，@RAG功能暂无法从知识库获取到内容`)
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
			// name: this.chatAssiantName,
			question: question,
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
				let text = response.text()
				console.log("text", text)
				throw new Error(`RAG服务出问题了，@RAG功能暂无法从知识库获取到内容 ${text}`)
			}
			const result = await response.json()
			console.log("Response:", result)
			if (result.data === null) {
				throw new Error(`RAG服务出问题了，@RAG功能暂无法从知识库获取到内容`)
			}
			// 没有搜到内容会data 内容为 Sorry! No relevant content was found in the knowledge base!
			if (
				result.data.answer &&
				result.data.answer.includes("Sorry! No relevant content was found in the knowledge base!")
			) {
				return ""
			}
			return result.data.answer
		} catch (error) {
			console.error("Error sending request:", error)
			throw new Error(`${(error as any).message}`)
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
				if (done) {
					break
				}

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
				throw new Error(`RAG服务出问题了，@RAG功能暂无法从知识库获取到内容`)
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
	public async getAccountInfoNew(question: string) {
		const remainAssiant = await this.listChatAssiants()
		console.log("this is remainAssiant:", remainAssiant)
		let chatAssaitId = undefined
		if (remainAssiant && remainAssiant.length > 0) {
			chatAssaitId = remainAssiant[0].id
			this.chatAssiantName = remainAssiant[0].name
		} else {
			chatAssaitId = await this.createchatAssiant()
		}
		const sessionId = await this.createChatSession(chatAssaitId)
		const resp = await this.converseWithchatassistant(question, chatAssaitId)
		console.log("resp:", resp)
		return {
			type: question,
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

	public async createMessagePreaper() {
		const remainAssiant = await this.listChatAssiants()
		let chatAssaitId = undefined
		if (remainAssiant && remainAssiant.length > 0) {
			chatAssaitId = remainAssiant[0].id
			this.chatAssiantName = remainAssiant[0].name
		} else {
			chatAssaitId = await this.createchatAssiant()
		}
		await this.createChatSession(chatAssaitId)
		this.chatAssiantId = chatAssaitId
	}

	public async *readRagStreamChunk(question: string): ApiStream {
		// const remainAssiant = await this.listChatAssiants()
		const url = this.url + `/api/v1/chats/${this.chatAssiantId}/completions`
		const payload = {
			name: this.chatAssiantName,
			question: question,
			stream: true,
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
				const errorText = await response.text()
				console.error("Error response:", {
					status: response.status,
					statusText: response.statusText,
					body: errorText,
				})
				throw new Error(`RAG服务出问题了，@RAG功能暂无法从知识库获取到内容`)
			}

			// 获取响应流
			const reader = response.body?.getReader()
			if (!reader) {
				throw new Error("No response body")
			}

			let hasYieldedContent = false // 添加标志来跟踪是否有输出内容
			let tempLine = ""
			let complete = false
			// 处理流式响应
			while (true) {
				const { done, value } = await reader.read()
				if (done) {
					break
				}
				// 解码响应数据
				const chunk = new TextDecoder().decode(value)
				const lines = chunk.split("\n").filter((line) => line.trim())

				for (const line of lines) {
					try {
						// 直接解析整个 JSON 对象
						let raw_line = line.replace(/^data:/, "").trim()
						console.log("rawline------------:", raw_line)
						const regex = /data:\s*true/i // i 表示不区分大小写
						if (!raw_line.endsWith("}}") && raw_line !== `{"code": 0, "data": true}`) {
							tempLine += raw_line
							continue // 忽略非 JSON 行，例如 "data: [DONE]" 或者空行
						}
						if (!raw_line.startsWith("{") && raw_line.endsWith("}")) {
							tempLine += raw_line
							raw_line = tempLine
							complete = true
							tempLine = ""
						}
						if (!raw_line.startsWith("{") && complete === false) {
							continue
						}
						complete = false
						const data = JSON.parse(raw_line)

						console.log("data------------:", data)
						if (data.data?.answer) {
							hasYieldedContent = true
							yield {
								type: "rag",
								text: data.data.answer,
							}
						} else if (data.data === true) {
							hasYieldedContent = true
							yield {
								type: "rag",
								text: "",
								question: question,
								done: true,
							}
						}
					} catch (e) {
						const raw_line = line.replace(/^data:/, "").trim()
						console.log("Error parsing chunk:", raw_line)
						console.error("Error parsing chunk:", e)
					}
				}
			}
		} catch (error) {
			console.error("Error sending request:", error)
			throw new Error(`Failed to send request: ${(error as any).message}`)
		}
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
			// const chunkstreams = await this.createChunkListDocument();
			const chunkstream = await this.readRagStreamChunk(systemPrompt)
			yield* chunkstream
			//    const iterator = chunkstream[Symbol.asyncIterator]()
			//    try {
			// 	// awaiting first chunk to see if it will throw an error
			// 	const firstChunk = await iterator.next()
			// 	yield firstChunk.value;
			// } catch (error) {
			// }
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
					throw new Error(`RAG服务出问题了，@RAG功能暂无法从知识库获取到内容`)
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
