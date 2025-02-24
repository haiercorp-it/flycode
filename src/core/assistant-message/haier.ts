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
