import { VSCodeButton, VSCodeTextField } from "@vscode/webview-ui-toolkit/react"
import { useCallback, useEffect, useState } from "react"
import { useEvent } from "react-use"
import { ExtensionMessage } from "../../../../src/shared/ExtensionMessage"
import { useExtensionState } from "../../context/ExtensionStateContext"
import { validateApiConfiguration } from "../../utils/validate"
import { vscode } from "../../utils/vscode"
import ApiOptions from "../settings/ApiOptions"

const WelcomeView = () => {
	const { apiConfiguration } = useExtensionState()

	const [apiErrorMessage, setApiErrorMessage] = useState<string | undefined>(undefined)
	const [email, setEmail] = useState("")
	const [isSubscribed, setIsSubscribed] = useState(false)
	console.log("apiConfiguration", isSubscribed)
	const disableLetsGoButton = apiErrorMessage != null

	const handleSubmit = () => {
		// console.log("Submitting configuration:", apiConfiguration)
		// vscode.postMessage({ type: "apiConfiguration", apiConfiguration })
		vscode.postMessage({ type: "accountLoginClicked" })
	}

	const handleSubscribe = () => {
		if (email) {
			vscode.postMessage({ type: "subscribeEmail", text: email })
		}
	}
	console.log("apiErrorMessage", handleSubscribe)

	useEffect(() => {
		const error = validateApiConfiguration(apiConfiguration)
		console.log("Submitting configuration:", apiConfiguration)
		setApiErrorMessage(error)
	}, [apiConfiguration])

	// Add message handler for subscription confirmation
	const handleMessage = useCallback((e: MessageEvent) => {
		const message: ExtensionMessage = e.data
		if (message.type === "emailSubscribed") {
			setIsSubscribed(true)
			setEmail("")
		}
	}, [])

	useEvent("message", handleMessage)

	return (
		<div
			style={{
				position: "fixed",
				top: 0,
				left: 0,
				right: 0,
				bottom: 0,
			}}>
			<div
				style={{
					height: "100%",
					padding: "0 20px",
					overflow: "auto",
				}}>
				<h2>你好，我是GI</h2>
				<p>
					我能够调用集团IT提供的大模型和知识库，从而高效地完成代码编写、SDK引入以及调试工作。我可以根据您的需求来创建和编辑文件、探索复杂项目、使用浏览器以及执行终端命令。如有必要，您还可以编写MCP工具来进一步扩展我的能力。
				</p>

				<b>（暂时您可以在下方配置大模型，以便调试，请优先使用haierinternal，这是私域大模型能力）</b>

				{/* <div
					style={{
						marginTop: "15px",
						padding: isSubscribed ? "5px 15px 5px 15px" : "12px",
						background: "var(--vscode-textBlockQuote-background)",
						borderRadius: "6px",
						fontSize: "0.9em",
					}}>
					{isSubscribed ? (
						<p style={{ display: "flex", alignItems: "center", gap: "8px" }}>
							<span style={{ color: "var(--vscode-testing-iconPassed)", fontSize: "1.5em" }}>✓</span>
							Thanks for subscribing! We'll keep you updated on new features.
						</p>
					) : (
						<>
							<p style={{ margin: 0, marginBottom: "8px" }}>
								While Cline currently requires you bring your own API key, we are working on an official accounts
								system with additional capabilities. Subscribe to our mailing list to get updates!
							</p>
							<div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
								<VSCodeTextField
									type="email"
									value={email}
									onInput={(e: any) => setEmail(e.target.value)}
									placeholder="Enter your email"
									style={{ flex: 1 }}
								/>
								<VSCodeButton appearance="secondary" onClick={handleSubscribe} disabled={!email}>
									Subscribe
								</VSCodeButton>
							</div>
						</>
					)}
				</div> */}

				<div style={{ marginTop: "15px" }}>
					{/* <ApiOptions showModelOptions={false} /> */}
					<VSCodeButton onClick={handleSubmit} disabled={disableLetsGoButton} style={{ marginTop: "3px" }}>
						开始使用！请先登录
					</VSCodeButton>
				</div>
			</div>
		</div>
	)
}

export default WelcomeView
