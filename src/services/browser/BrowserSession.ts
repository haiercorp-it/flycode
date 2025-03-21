import * as vscode from "vscode"
import * as fs from "fs/promises"
import * as path from "path"
import { Browser, Page, ScreenshotOptions, TimeoutError, launch } from "puppeteer-core"
// @ts-ignore
import PCR from "puppeteer-chromium-resolver"
import pWaitFor from "p-wait-for"
import delay from "delay"
import { fileExistsAtPath } from "../../utils/fs"
import { BrowserActionResult } from "../../shared/ExtensionMessage"
import { BrowserSettings } from "../../shared/BrowserSettings"
// import * as chromeLauncher from "chrome-launcher"
interface PCRStats {
	puppeteer: { launch: typeof launch }
	executablePath: string
}

// const DEBUG_PORT = 9222 // Chrome's default debugging port

export class BrowserSession {
	private context: vscode.ExtensionContext
	private browser?: Browser
	private page?: Page
	private currentMousePosition?: string
	browserSettings: BrowserSettings
	private descriptions: string = ""
	private bboxList: any[] = []
	constructor(context: vscode.ExtensionContext, browserSettings: BrowserSettings) {
		this.context = context
		this.browserSettings = browserSettings
	}

	private async ensureChromiumExists(): Promise<PCRStats> {
		const globalStoragePath = this.context?.globalStorageUri?.fsPath
		if (!globalStoragePath) {
			throw new Error("Global storage uri is invalid")
		}

		const puppeteerDir = path.join(globalStoragePath, "puppeteer")
		const dirExists = await fileExistsAtPath(puppeteerDir)
		if (!dirExists) {
			await fs.mkdir(puppeteerDir, { recursive: true })
		}

		const chromeExecutablePath = vscode.workspace.getConfiguration("cline").get<string>("chromeExecutablePath")
		if (chromeExecutablePath && !(await fileExistsAtPath(chromeExecutablePath))) {
			throw new Error(`Chrome executable not found at path: ${chromeExecutablePath}`)
		}
		const stats: PCRStats = chromeExecutablePath
			? { puppeteer: require("puppeteer-core"), executablePath: chromeExecutablePath }
			: // if chromium doesn't exist, this will download it to path.join(puppeteerDir, ".chromium-browser-snapshots")
				// if it does exist it will return the path to existing chromium
				await PCR({ downloadPath: puppeteerDir })

		return stats
	}
	addCustomStyle = () => {
		const styleTag = document.createElement("style")
		styleTag.textContent = customCSS
		document.head.append(styleTag)
	}
	// private async checkExistingChromeDebugger(): Promise<boolean> {
	// 	try {
	// 		// Try to connect to existing debugger
	// 		const response = await fetch(`http://localhost:${DEBUG_PORT}/json/version`)
	// 		return response.ok
	// 	} catch {
	// 		return false
	// 	}
	// }

	// async relaunchChromeDebugMode() {
	// 	const result = await vscode.window.showWarningMessage(
	// 		"This will close your existing Chrome tabs and relaunch Chrome in debug mode. Are you sure?",
	// 		{ modal: true },
	// 		"Yes",
	// 	)

	// 	if (result !== "Yes") {
	// 		return
	// 	}

	// 	// // Kill any existing Chrome instances
	// 	// await chromeLauncher.killAll()

	// 	// // Launch Chrome with debug port
	// 	// const launcher = new chromeLauncher.Launcher({
	// 	// 	port: DEBUG_PORT,
	// 	// 	chromeFlags: ["--remote-debugging-port=" + DEBUG_PORT, "--no-first-run", "--no-default-browser-check"],
	// 	// })

	// 	// await launcher.launch()
	// 	const installation = chromeLauncher.Launcher.getFirstInstallation()
	// 	if (!installation) {
	// 		throw new Error("Could not find Chrome installation on this system")
	// 	}
	// 	console.log("chrome installation", installation)
	// }

	// private async getSystemChromeExecutablePath(): Promise<string> {
	// 	// Find installed Chrome
	// 	const installation = chromeLauncher.Launcher.getFirstInstallation()
	// 	if (!installation) {
	// 		throw new Error("Could not find Chrome installation on this system")
	// 	}
	// 	console.log("chrome installation", installation)
	// 	return installation
	// }

	// /**
	//  * Helper to detect user’s default Chrome data dir.
	//  * Adjust for OS if needed.
	//  */
	// private getDefaultChromeUserDataDir(): string {
	// 	const homedir = require("os").homedir()
	// 	switch (process.platform) {
	// 		case "win32":
	// 			return path.join(homedir, "AppData", "Local", "Google", "Chrome", "User Data")
	// 		case "darwin":
	// 			return path.join(homedir, "Library", "Application Support", "Google", "Chrome")
	// 		default:
	// 			return path.join(homedir, ".config", "google-chrome")
	// 	}
	// }

	async launchBrowser() {
		console.log("launch browser called")
		if (this.browser) {
			// throw new Error("Browser already launched")
			await this.closeBrowser() // this may happen when the model launches a browser again after having used it already before
		}

		const stats = await this.ensureChromiumExists()
		this.browser = await stats.puppeteer.launch({
			args: [
				"--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
			],
			executablePath: stats.executablePath,
			defaultViewport: this.browserSettings.viewport,
			headless: this.browserSettings.headless,
		})

		// if (this.browserSettings.chromeType === "system") {
		// 	const userDataDir = this.getDefaultChromeUserDataDir()
		// 	this.browser = await stats.puppeteer.launch({
		// 		args: [`--user-data-dir=${userDataDir}`, "--profile-directory=Default"],
		// 		executablePath: await this.getSystemChromeExecutablePath(),
		// 		defaultViewport: this.browserSettings.viewport,
		// 		headless: this.browserSettings.headless,
		// 	})
		// } else {
		// 	this.browser = await stats.puppeteer.launch({
		// 		args: [
		// 			"--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
		// 		],
		// 		executablePath: stats.executablePath,
		// 		defaultViewport: this.browserSettings.viewport,
		// 		headless: this.browserSettings.headless,
		// 	})
		// }

		// (latest version of puppeteer does not add headless to user agent)
		this.page = await this.browser?.newPage()
		// let bbbox = await this.annotatePage()
		// this.bboxList = bbbox;
		// this.descriptions = await this.generateBBoxDescriptions(bbbox)
	}

	async closeBrowser(): Promise<BrowserActionResult> {
		if (this.browser || this.page) {
			console.log("closing browser...")
			await this.browser?.close().catch(() => {})
			this.browser = undefined
			this.page = undefined
			this.currentMousePosition = undefined
		}
		return {}
	}

	async annotatePage() {
		let page = this.page!
		const elements = await page.evaluate(() => {
			let labels = []
			function markPages() {
				const interactiveSelectors = 'a, button, input, select, textarea, [role="button"], [onclick], [tabindex="0"]'

				var items = Array.prototype.slice
					.call(document.querySelectorAll(interactiveSelectors))
					.map(function (element) {
						var vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0)
						var vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0)
						var textualContent = element.textContent.trim().replace(/\s{2,}/g, " ")
						var elementType = element.tagName.toLowerCase()
						var ariaLabel = element.getAttribute("aria-label") || ""

						var rects = [...element.getClientRects()]
							.filter((bb) => {
								var center_x = bb.left + bb.width / 2
								var center_y = bb.top + bb.height / 2
								var elAtCenter = document.elementFromPoint(center_x, center_y)
								return elAtCenter === element || element.contains(elAtCenter)
							})
							.map((bb) => {
								const rect = {
									left: Math.max(0, bb.left),
									top: Math.max(0, bb.top),
									right: Math.min(vw, bb.right),
									bottom: Math.min(vh, bb.bottom),
								}
								return {
									...rect,
									width: rect.right - rect.left,
									height: rect.bottom - rect.top,
								}
							})

						var area = rects.reduce((acc, rect) => acc + rect.width * rect.height, 0)
						var url = elementType === "a" ? element.href || "" : ""

						return {
							element: element,
							include: true, // 由于使用选择器预筛选，这里都是可交互元素
							area,
							rects,
							text: textualContent,
							type: elementType,
							ariaLabel: ariaLabel,
							url: url,
						}
					})
					.filter((item) => item.area >= 20) // 只保留面积大于 40 的元素
				// 只保留内部可点击项
				items = items.filter((x) => !items.some((y) => x.element.contains(y.element) && !(x === y)))

				// 生成随机颜色函数
				function getRandomColor() {
					var letters = "0123456789ABCDEF"
					var color = "#"
					for (var i = 0; i < 6; i++) {
						color += letters[Math.floor(Math.random() * 16)]
					}
					return color
				}

				// 创建元素上方的浮动边框
				items.forEach(function (item, index) {
					item.rects.forEach((bbox) => {
						let newElement = document.createElement("div")
						var borderColor = getRandomColor()
						newElement.style.outline = `2px dashed ${borderColor}`
						newElement.style.position = "fixed"
						newElement.style.left = bbox.left + "px"
						newElement.style.top = bbox.top + "px"
						newElement.style.width = bbox.width + "px"
						newElement.style.height = bbox.height + "px"
						newElement.style.pointerEvents = "none"
						newElement.style.boxSizing = "border-box"
						newElement.style.zIndex = "2147483647"
						// newElement.style.background = `${borderColor}80`;

						// 添加角落的浮动标签
						var label: any = document.createElement("span")
						label.textContent = index
						label.style.position = "absolute"
						// 可以根据需要调整这些值
						label.style.top = "-19px"
						label.style.left = "0px"
						label.style.background = borderColor
						// label.style.background = "black";
						label.style.color = "white"
						label.style.padding = "2px 4px"
						label.style.fontSize = "12px"
						label.style.borderRadius = "2px"
						newElement.appendChild(label)

						document.body.appendChild(newElement)
						labels.push(newElement)
						// item.element.setAttribute("-ai-label", label.textContent);
					})
				})

				// 返回坐标和元素信息
				const coordinates = items.flatMap((item, idx) =>
					item.rects.map(({ left, top, width, height }) => ({
						id: idx,
						x: (left + left + width) / 2,
						y: (top + top + height) / 2,
						width: width,
						height: height,
						type: item.type,
						text: item.text,
						ariaLabel: item.ariaLabel,
						url: item.url,
					})),
				)
				return coordinates
			}
			return markPages()
		})

		try {
			// 注入并执行页面标记脚本
			const page = this.page!

			// 注入样式
			// await page!.evaluate(addCustomStyle.toString())

			// 添加调试信息
			console.log(`当前页面 URL: ${await page.url()}`)

			// 查找和标记元素
			let bboxes
			const maxRetries = 3
			for (let i = 0; i < maxRetries; i++) {
				try {
					// 等待页面加载完成
					await page.waitForSelector("body", { timeout: 5000 })
					// 执行标记脚本
					bboxes = elements
					console.log(`标记元素找到 ${Object.keys(bboxes).length} 个元素`)
					// 如果没有找到元素，尝试使用备用选择器
					if (!bboxes || Object.keys(bboxes).length === 0) {
						console.log("使用备用选择器查找元素...")
						bboxes = await page.evaluate(() => {
							const backupBboxes: any = {}
							// 百度搜索框
							const searchInput: any = document.querySelector("#kw")
							if (searchInput) {
								const rect = searchInput.getBoundingClientRect()
								backupBboxes[0] = {
									x: rect.x,
									y: rect.y,
									width: rect.width,
									height: rect.height,
									text: searchInput.value || "",
									type: "input",
									ariaLabel: "搜索框",
								}
							}

							// 百度搜索按钮
							const searchButton = document.querySelector("#su")
							if (searchButton) {
								const rect = searchButton.getBoundingClientRect()
								backupBboxes[1] = {
									x: rect.x,
									y: rect.y,
									width: rect.width,
									height: rect.height,
									text: "百度一下",
									type: "button",
									ariaLabel: "搜索按钮",
								}
							}

							return backupBboxes
						})
						console.log(`备用选择器找到 ${Object.keys(bboxes).length} 个元素`)
					}

					break
				} catch (error) {
					console.error(`标记元素尝试 ${i + 1}/${maxRetries} 失败:`, error)
					// 等待页面加载
					await new Promise((resolve) => setTimeout(resolve, 1000))
				}
			}

			// 获取截图

			let abboxes = bboxes || {}
			return abboxes
		} catch (error) {
			console.error("标记元素失败:", error)
		}
	}
	async generateBBoxDescriptions(bboxes: any) {
		// 确保 bboxes 是对象或数组
		if (!bboxes || Array.isArray(bboxes) === false) {
			console.log("bboxes 为空")
			return "没有找到可交互元素"
		}

		// 将对象格式转换为数组格式
		let bboxArray = []
		if (Array.isArray(bboxes)) {
			bboxArray = bboxes
		} else if (typeof bboxes === "object") {
			bboxArray = Object.entries(bboxes).map(([key, value]) => ({
				index: key,
			}))
		}

		// 如果数组为空，直接返回信息
		if (bboxArray.length === 0) {
			return "页面上没有可交互元素"
		}
		console.log("bboxArray:", bboxArray)

		// 为每个边界框生成清晰的描述
		const descriptions = bboxArray
			.map((bbox) => {
				let desc = `[elementid:${bbox.id || "0"}] ${bbox.type || "元素"}`
				if (bbox.text && bbox.text.trim() !== "") {
					// 如果文本过长，截取一部分
					const trimmedText = bbox.text.length > 50 ? bbox.text.substring(0, 47) + "..." : bbox.text
					desc += `: "${trimmedText}"`
				}
				if (bbox.ariaLabel && bbox.ariaLabel.trim() !== "") {
					desc += ` (aria-label: "${bbox.ariaLabel}")`
				}
				if (bbox.x && bbox.y) {
					desc += ` (coordinate: "{${bbox.x}, ${bbox.y}}")`
				}

				return desc
			})
			.join("\n")

		return descriptions
	}

	async doAction(action: (page: Page) => Promise<void>): Promise<BrowserActionResult> {
		if (!this.page) {
			throw new Error(
				"Browser is not launched. This may occur if the browser was automatically closed by a non-`browser_action` tool.",
			)
		}

		const logs: string[] = []
		let lastLogTs = Date.now()

		const consoleListener = (msg: any) => {
			if (msg.type() === "log") {
				logs.push(msg.text())
			} else {
				logs.push(`[${msg.type()}] ${msg.text()}`)
			}
			lastLogTs = Date.now()
		}

		const errorListener = (err: Error) => {
			logs.push(`[Page Error] ${err.toString()}`)
			lastLogTs = Date.now()
		}

		// Add the listeners
		this.page.on("console", consoleListener)
		this.page.on("pageerror", errorListener)

		try {
			await action(this.page)
		} catch (err) {
			if (!(err instanceof TimeoutError)) {
				logs.push(`[Error] ${err.toString()}`)
			}
		}

		// Wait for console inactivity, with a timeout
		await pWaitFor(() => Date.now() - lastLogTs >= 500, {
			timeout: 3_000,
			interval: 100,
		}).catch(() => {})

		let options: ScreenshotOptions = {
			encoding: "base64",

			// clip: {
			// 	x: 0,
			// 	y: 0,
			// 	width: 900,
			// 	height: 600,
			// },
		}

		let screenshotBase64 = await this.page.screenshot({
			...options,
			type: "webp",
		})
		let screenshot = `data:image/webp;base64,${screenshotBase64}`

		if (!screenshotBase64) {
			console.log("webp screenshot failed, trying png")
			screenshotBase64 = await this.page.screenshot({
				...options,
				type: "png",
			})
			screenshot = `data:image/png;base64,${screenshotBase64}`
		}

		if (!screenshotBase64) {
			throw new Error("Failed to take screenshot.")
		}

		// this.page.removeAllListeners() <- causes the page to crash!
		this.page.off("console", consoleListener)
		this.page.off("pageerror", errorListener)

		return {
			screenshot,
			boxDescriptions: this.descriptions,
			logs: logs.join("\n"),
			currentUrl: this.page.url(),
			currentMousePosition: this.currentMousePosition,
		}
	}

	async navigateToUrl(url: string): Promise<BrowserActionResult> {
		return this.doAction(async (page) => {
			// networkidle2 isn't good enough since page may take some time to load. we can assume locally running dev sites will reach networkidle0 in a reasonable amount of time
			await page.goto(url, {
				timeout: 7_000,
				waitUntil: ["domcontentloaded", "networkidle2"],
			})
			// await page.goto(url, { timeout: 10_000, waitUntil: "load" })
			await this.waitTillHTMLStable(page) // in case the page is loading more resources
			// let bbbox = await this.annotatePage()
			// this.bboxList = bbbox;
			// this.descriptions = await this.generateBBoxDescriptions(bbbox)
		})
	}

	// page.goto { waitUntil: "networkidle0" } may not ever resolve, and not waiting could return page content too early before js has loaded
	// https://stackoverflow.com/questions/52497252/puppeteer-wait-until-page-is-completely-loaded/61304202#61304202
	private async waitTillHTMLStable(page: Page, timeout = 5_000) {
		const checkDurationMsecs = 500 // 1000
		const maxChecks = timeout / checkDurationMsecs
		let lastHTMLSize = 0
		let checkCounts = 1
		let countStableSizeIterations = 0
		const minStableSizeIterations = 3

		while (checkCounts++ <= maxChecks) {
			let html = await page.content()
			let currentHTMLSize = html.length

			// let bodyHTMLSize = await page.evaluate(() => document.body.innerHTML.length)
			console.log("last: ", lastHTMLSize, " <> curr: ", currentHTMLSize)

			if (lastHTMLSize !== 0 && currentHTMLSize === lastHTMLSize) {
				countStableSizeIterations++
			} else {
				countStableSizeIterations = 0 //reset the counter
			}

			if (countStableSizeIterations >= minStableSizeIterations) {
				console.log("Page rendered fully...")
				break
			}

			lastHTMLSize = currentHTMLSize
			await delay(checkDurationMsecs)
		}
	}

	async click(coordinate: string): Promise<BrowserActionResult> {
		console.log("clicking at ", coordinate)
		const [x, y] = coordinate.split(",").map(Number)
		// if(coordinate === "2"){
		// 	console.log("clicking at ", coordinate)
		// }
		// let bbox = this.bboxList[parseInt(coordinate)]
		//  if (!bbox){
		// 	return   this.doAction(async (page) => {

		// 		// Clean up listener
		// 	})
		//  }
		console.log("clicking at ", x, y)
		// let bbbox = await this.annotatePage()
		// this.bboxList = bbbox;
		// this.descriptions = await this.generateBBoxDescriptions(bbbox)
		// const [x, y] = coordinate.split(",").map(Number)
		return this.doAction(async (page) => {
			// Set up network request monitoring
			let hasNetworkActivity = false
			const requestListener = () => {
				hasNetworkActivity = true
			}
			page.on("request", requestListener)

			// Perform the click
			await page.mouse.click(x, y)
			this.currentMousePosition = coordinate

			// Small delay to check if click triggered any network activity
			await delay(100)

			if (hasNetworkActivity) {
				// If we detected network activity, wait for navigation/loading
				await page
					.waitForNavigation({
						waitUntil: ["domcontentloaded", "networkidle2"],
						timeout: 7000,
					})
					.catch(() => {})
				await this.waitTillHTMLStable(page)
			}

			// Clean up listener
			page.off("request", requestListener)
		})
	}

	async type(text: string): Promise<BrowserActionResult> {
		return this.doAction(async (page) => {
			await page.keyboard.type(text)
		})
	}

	async scrollDown(): Promise<BrowserActionResult> {
		return this.doAction(async (page) => {
			await page.evaluate(() => {
				window.scrollBy({
					top: 600,
					behavior: "auto",
				})
			})
			await delay(300)
		})
	}

	async scrollUp(): Promise<BrowserActionResult> {
		return this.doAction(async (page) => {
			await page.evaluate(() => {
				window.scrollBy({
					top: -600,
					behavior: "auto",
				})
			})
			await delay(300)
		})
	}
}
