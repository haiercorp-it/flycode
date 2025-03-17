// u6edau52a8u5de5u5177
type State = {
	page: any
	isCompleted: boolean
	prediction: {
		args: any
		bboxes: any
		needImage: boolean
	}
	needImage: boolean
	bboxes: any[]
}
async function scroll(state: State) {
	const page = state.page
	const scrollArgs = state.prediction.args

	if (!scrollArgs || scrollArgs.length !== 2) {
		return "u56e0u53c2u6570u4e0du6b63u786eu800cu672au80fdu6edau52a8u3002"
	}

	const [target, direction] = scrollArgs

	if (target.toUpperCase() === "WINDOW") {
		// u6edau52a8u6574u4e2au7a97u53e3
		const scrollAmount = 500
		const scrollDirection = direction.toLowerCase() === "up" ? -scrollAmount : scrollAmount
		await page.evaluate(`window.scrollBy(0, ${scrollDirection})`)
		return `u5df2u5728u7a97u53e3u4e2du5411${direction === "up" ? "u4e0a" : "u4e0b"}u6edau52a8`
	} else {
		// u6edau52a8u7279u5b9au5143u7d20
		try {
			const scrollAmount = 200
			const targetId = parseInt(target)
			const bbox = state.bboxes[targetId]
			const { x, y } = bbox
			const scrollDirection = direction.toLowerCase() === "up" ? -scrollAmount : scrollAmount

			await page.mouse.move(x, y)
			await page.mouse.wheel(0, scrollDirection)

			return `u5df2u5728u5143u7d20u4e2du5411${direction === "up" ? "u4e0a" : "u4e0b"}u6edau52a8`
		} catch (error) {
			return `u9519u8bef: u672au80fdu5728u5143u7d20 ${target} u4e2du6edau52a8: ${error.message}`
		}
	}
}

// u7b49u5f85u5de5u5177
async function wait(state: State) {
	const sleepTime = 5
	await new Promise((resolve) => setTimeout(resolve, sleepTime * 1000))
	return `已等待 ${sleepTime} 秒。`
}

// u8fd4u56deu4e0au4e00u9875u5de5u5177
async function goBack(state: State) {
	const page = state.page
	await page.goBack()
	return `u5df2u8fd4u56deu4e0au4e00u9875u5230 ${await page.url()}u3002`
}

// u524du5f80u641cu7d22u5f15u64ceu5de5u5177
async function toGoogle(state: State) {
	const page = state.page
	await page.goto("https://www.google.com/")
	return "已前往 Google 搜索引擎。"
}
async function NeedImage(state: State) {
	state.needImage = true
	return "返回需要"
}
async function OpenBrowser(state: State, args: any) {
	try {
		const url = args[0] || args
		console.log("OpenBrowser函数被调用222222", url)
		if (!url || url === "default") {
			await state.page.goto("https://www.baidu.com/")
			return "已打开默认搜索引擎（百度）"
		}

		// 检查 URL 格式
		let targetUrl = url
		if (!url.startsWith("http://") && !url.startsWith("https://")) {
			targetUrl = "https://" + url
		}
		console.log("即将打开的网址11111:", targetUrl)
		await state.page.goto(targetUrl)
		return `已成功打开网址: ${targetUrl}`
	} catch (error) {
		console.error("打开网页失败:", error)
		// 如果打开失败，跳转到默认搜索引擎
		await state.page.goto("https://www.baidu.com/")
		return `打开网页失败: ${error.message}，已跳转到默认搜索引擎`
	}
}

async function Completion(state: State, args: any) {
	try {
		state.isCompleted = true
		return "已完成"
	} catch (error) {
		return `打开网页失败: ${error.message}，已跳转到默认搜索引擎`
	}
}
// u524du5f80u767eu5ea6u641cu7d22u5f15u64ce
async function toBaidu(state: State) {
	const page = state.page
	await page.goto("https://www.baidu.com/")
	return "已前往百度搜索引擎。"
}

const Click = async (state: State, args: any) => {
	try {
		const page = state.page
		const bboxes = state.bboxes
		let elementIndex = args[0]

		// 添加参数验证
		if (elementIndex === undefined || elementIndex === null) {
			return `错误: 未提供元素索引22`
		}

		// 确保索引是数字
		const index = parseInt(elementIndex)
		if (isNaN(index)) {
			return `错误: 无效的元素索引 "${elementIndex}"`
		}

		const bbox = bboxes[index]
		if (!bbox) {
			return `错误: 未找到索引为 ${index} 的元素`
		}

		const { x, y, width, height, url, type } = bbox
		console.log("Click函数被调用", elementIndex, bbox)

		// 创建导航Promise
		const navigationPromise = page
			.waitForNavigation({
				waitUntil: "networkidle0",
				timeout: 5000,
			})
			.catch(() => null) // 如果超时则返回null

		if (url) {
			await page.goto(url)
			return "已打开链接: " + url
		}

		// 点击元素
		await page.mouse.click(x + width / 2, y + height / 2)

		// 等待可能的导航完成
		const navigationResult = await navigationPromise

		// 如果发生了导航，使用新的页面
		if (navigationResult) {
			// 获取所有打开的页面
			const pages = await page.browser().pages()
			// 获取最新打开的页面
			const newPage = pages[pages.length - 1]

			if (newPage && newPage !== page) {
				// 关闭旧页面
				await page.close()
				console.log("旧页面已关闭")
				// 更新state中的页面引用
				state.page = newPage
				return `成功跳转到新页面: ${await newPage.url()}`
			}
		}

		return `成功点击元素 ${index}`
	} catch (error) {
		return `点击操作失败: ${error.message}`
	}
}

const Type = async (state: State, args: any) => {
	try {
		const page = state.page
		const bboxes = state.bboxes
		let elementIndex = args[0]
		let text = args[1]
		console.log("Type函数被调用", elementIndex, text)

		// 添加参数验证
		if (elementIndex === undefined || elementIndex === null) {
			return `错误: 未提供元素索引11`
		}

		// 确保索引是数字
		const index = parseInt(elementIndex)
		if (isNaN(index)) {
			return `错误: 无效的元素索引 "${elementIndex}"`
		}

		// 百度搜索特殊处理
		const url = await page.url()
		if (url.includes("baidu.com")) {
			try {
				await page.waitForSelector("#kw", { timeout: 5000 })
				// 直接清空输入框并输入新文本
				await page.evaluate((text: string) => {
					const input: any = document.querySelector("#kw")
					if (input) {
						input.value = "" // 清空输入框
						input.focus() // 聚焦输入框
					}
				}, text)
				await page.keyboard.type(text)
				return `已在百度搜索框中输入: ${text}`
			} catch (e) {
				console.log("尝试使用常规方法")
			}
		}

		const bbox = bboxes[index]
		if (!bbox) {
			return `错误: 未找到索引为 ${index} 的元素`
		}

		const { x, y, width, height } = bbox
		await page.mouse.click(x + width / 2, y + height / 2)

		// 使用 evaluate 清空输入框
		await page.evaluate(() => {
			const activeElement: any = document.activeElement
			if (activeElement && (activeElement.tagName === "INPUT" || activeElement.tagName === "TEXTAREA")) {
				activeElement.value = ""
			}
		})

		await page.keyboard.type(text)
		return `已在元素 ${index} 中输入: ${text}`
	} catch (error) {
		return `输入操作失败: ${error.message}`
	}
}

const tools = {
	Click: Click,
	NeedImage: NeedImage,
	OpenBrowser: OpenBrowser,
	Completion: Completion,
	Type: Type, //typeText
	Scroll: scroll,
	Wait: wait,
	GoBack: goBack,
	Google: toGoogle,
	Baidu: toBaidu,
}

module.exports = tools
