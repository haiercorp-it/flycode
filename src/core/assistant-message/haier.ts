export function isHaierDoc(message: string): boolean {
	// const pattern = /^(?=.*@用户中心)(?=.*@账号中心).+$/;
	const pattern = /@(用户中心|账号中心)\b/
	const flag = pattern.test(message)
	return flag
}

export const hasAccountCenter = (text: string): boolean => {
	const flag = /@账号中心/.test(text) // 移除单词边界符
	return flag
}

export const hasRAG = (text: string): boolean => {
	const flag = /@RAG/.test(text) // 移除单词边界符
	return flag
}
export interface RAGOBJInterface {
	text: string
	isRag: boolean
}
export const replaceRAG = (text: string): RAGOBJInterface => {
	const flag = /@RAG/.test(text) // 移除单词边界符
	if (flag) {
		let newText = text.replace(/@RAG/, "")
		return {
			text: newText.trim(),
			isRag: true,
		}
	}
	return {
		text: text,
		isRag: false,
	}
}

export function processRAGText(text: string): RAGOBJInterface {
	// 检查参数有效性
	if (!text || typeof text !== "string") {
		return {
			isRag: false,
			text: text || "",
		}
	}

	// 使用正则表达式匹配 @RAG 或 @Rag（不区分大小写）
	const ragRegex = /@rag|@RAG/gi
	// 检查是否包含 @RAG 或 @Rag
	const isRag = ragRegex.test(text)
	// 如果包含，则删除所有 @RAG 或 @Rag
	// 注意：需要重新创建正则表达式，因为 test() 会改变 lastIndex
	const cleanedText = isRag ? text.replace(/@rag|@RAG/gi, "").trim() : text
	return {
		isRag: isRag,
		text: cleanedText,
	}
}
