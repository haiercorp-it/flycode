// 页面标记功能
const customCSS = `
    ::-webkit-scrollbar {
        width: 10px;
    }
    ::-webkit-scrollbar-track {
        background: #27272a;
    }
    ::-webkit-scrollbar-thumb {
        background: #888;
        border-radius: 0.375rem;
    }
    ::-webkit-scrollbar-thumb:hover {
        background: #555;
    }
`

// 添加自定义样式
const addCustomStyle = () => {
	const styleTag = document.createElement("style")
	styleTag.textContent = customCSS
	document.head.append(styleTag)
}

// 标记的元素数组
let labels: any[] = []

// 移除页面上的所有标记
const unmarkPage = () => {
	// 移除所有标记
	for (const label of labels) {
		document.body.removeChild(label)
	}
	labels = []
}

// 标记页面上的交互元素
const markPage = () => {
	unmarkPage()

	var bodyRect = document.body.getBoundingClientRect()

	var items = Array.prototype.slice
		.call(document.querySelectorAll("*"))
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

			return {
				element: element,
				include:
					element.tagName === "INPUT" ||
					element.tagName === "TEXTAREA" ||
					element.tagName === "SELECT" ||
					element.tagName === "BUTTON" ||
					element.tagName === "A" ||
					element.onclick !== null ||
					window.getComputedStyle(element).cursor === "pointer" ||
					element.tagName === "IFRAME" ||
					element.tagName === "VIDEO",
				area,
				rects,
				text: textualContent,
				type: elementType,
				ariaLabel: ariaLabel,
			}
		})
		.filter((item) => item.include && item.area >= 20)

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
			var label = document.createElement("span")
			label.textContent = `${index}`
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
		})),
	)
	return coordinates
}

module.exports = {
	addCustomStyle,
	markPage,
	unmarkPage,
}
