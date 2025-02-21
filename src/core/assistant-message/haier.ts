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
