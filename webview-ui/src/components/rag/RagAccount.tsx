// import { VSCodeButton, VSCodeLink, VSCodeTextArea } from "@vscode/webview-ui-toolkit/react"
import { VSCodeButton, VSCodeTextField, VSCodeTextArea } from "@vscode/webview-ui-toolkit/react"
import { memo, useEffect, useState } from "react"
import { useExtensionState } from "../../context/ExtensionStateContext"
import { validateApiConfiguration, validateModelId } from "../../utils/validate"
import { vscode } from "../../utils/vscode"
import { ApiConfiguration } from "../../../../src/shared/api"
import { getAsVar, VSC_DESCRIPTION_FOREGROUND } from "../../utils/vscStyles"
const IS_DEV = false // FIXME: use flags when packaging

type SettingsViewProps = {
	onDone: () => void
}

const RagAccountView = ({ onDone }: SettingsViewProps) => {
	const { apiConfiguration, setApiConfiguration, customInstructions, setCustomInstructions, openRouterModels } =
		useExtensionState()
	const [apiErrorMessage, setApiErrorMessage] = useState<string | undefined>(undefined)
	const [modelIdErrorMessage, setModelIdErrorMessage] = useState<string | undefined>(undefined)

	const handleSubmit = () => {
		const apiValidationResult = validateApiConfiguration(apiConfiguration)
		const modelIdValidationResult = validateModelId(apiConfiguration, openRouterModels)
		console.log("apiValidationResult", apiErrorMessage, modelIdErrorMessage)
		setApiErrorMessage(apiValidationResult)
		setModelIdErrorMessage(modelIdValidationResult)

		if (!apiValidationResult && !modelIdValidationResult) {
			vscode.postMessage({ type: "apiConfiguration", apiConfiguration })
			vscode.postMessage({
				type: "customInstructions",
				text: customInstructions,
			})
			onDone()
		}
	}

	useEffect(() => {
		setApiErrorMessage(undefined)
		setModelIdErrorMessage(undefined)
	}, [apiConfiguration])

	// validate as soon as the component is mounted
	/*
	useEffect will use stale values of variables if they are not included in the dependency array. so trying to use useEffect with a dependency array of only one value for example will use any other variables' old values. In most cases you don't want this, and should opt to use react-use hooks.
	
	useEffect(() => {
		// uses someVar and anotherVar
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [someVar])

	If we only want to run code once on mount we can use react-use's useEffectOnce or useMount
	*/

	const handleResetState = () => {
		vscode.postMessage({ type: "resetState" })
	}
	const handleInputChange = (field: keyof ApiConfiguration) => (event: any) => {
		setApiConfiguration({
			...apiConfiguration,
			[field]: event.target.value,
		})
	}
	return (
		<div
			style={{
				position: "fixed",
				top: 0,
				left: 0,
				right: 0,
				bottom: 0,
				padding: "10px 0px 0px 20px",
				display: "flex",
				flexDirection: "column",
				overflow: "hidden",
			}}>
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					marginBottom: "17px",
					paddingRight: 17,
				}}>
				<h3 style={{ color: "var(--vscode-foreground)", margin: 0 }}>RAGAccount</h3>
				<VSCodeButton onClick={handleSubmit}>Done</VSCodeButton>
			</div>
			<div
				style={{
					flexGrow: 1,
					overflowY: "scroll",
					paddingRight: 8,
					display: "flex",
					flexDirection: "column",
				}}>
				<div style={{ marginBottom: 5 }}>
					<div>
						<VSCodeTextField
							value={apiConfiguration?.haierragflowapiurl || ""}
							style={{ width: "100%" }}
							type="url"
							onInput={handleInputChange("haierragflowapiurl")}
							placeholder={"Enter base URL..."}>
							<span style={{ fontWeight: 500 }}>RAG URL</span>
						</VSCodeTextField>
						<VSCodeTextField
							value={apiConfiguration?.haierragflowapikey || ""}
							style={{ width: "100%" }}
							type="password"
							onInput={handleInputChange("haierragflowapikey")}
							placeholder="Enter API Key...">
							<span style={{ fontWeight: 500 }}>RAG API Key</span>
						</VSCodeTextField>
						<VSCodeTextField
							value={apiConfiguration?.haierragflowapidatasetid || ""}
							style={{ width: "100%" }}
							onInput={handleInputChange("haierragflowapidatasetid")}
							placeholder={"Enter Model ID..."}>
							<span style={{ fontWeight: 500 }}>RAG Dataset ID</span>
						</VSCodeTextField>

						<div
							style={{
								color: getAsVar(VSC_DESCRIPTION_FOREGROUND),
								display: "flex",
								margin: "10px 0",
								cursor: "pointer",
								alignItems: "center",
							}}
							onClick={() => {}}>
							<span
								className={`codicon ${1 ? "codicon-chevron-down" : "codicon-chevron-right"}`}
								style={{
									marginRight: "4px",
								}}></span>
							<span
								style={{
									fontWeight: 700,
									textTransform: "uppercase",
								}}>
								Custom Configuration
							</span>
						</div>

						<p
							style={{
								fontSize: "12px",
								marginTop: 3,
								color: "var(--vscode-descriptionForeground)",
							}}>
							{/* <span style={{ color: "var(--vscode-errorForeground)" }}>
								(<span style={{ fontWeight: 500 }}>Note:</span>  uses complex prompts and works best with
								Claude models. Less capable models may not work as expected.)
							</span> */}
						</p>
					</div>
				</div>

				<div style={{ marginBottom: 5 }}>
					<VSCodeTextArea
						value={customInstructions ?? ""}
						style={{ width: "100%" }}
						resize="vertical"
						rows={4}
						placeholder={'e.g. "Run unit tests at the end", "Use TypeScript with async/await", "Speak in Spanish"'}
						onInput={(e: any) => setCustomInstructions(e.target?.value ?? "")}>
						<span style={{ fontWeight: "500" }}>Custom Instructions</span>
					</VSCodeTextArea>
					<p
						style={{
							fontSize: "12px",
							marginTop: "5px",
							color: "var(--vscode-descriptionForeground)",
						}}></p>
				</div>

				{IS_DEV && (
					<>
						<div style={{ marginTop: "10px", marginBottom: "4px" }}>Debug</div>
						<VSCodeButton onClick={handleResetState} style={{ marginTop: "5px", width: "auto" }}>
							Reset State
						</VSCodeButton>
						<p
							style={{
								fontSize: "12px",
								marginTop: "5px",
								color: "var(--vscode-descriptionForeground)",
							}}></p>
					</>
				)}

				<div
					style={{
						marginTop: "auto",
						paddingRight: 8,
						display: "flex",
						justifyContent: "center",
					}}></div>
				<div
					style={{
						textAlign: "center",
						color: "var(--vscode-descriptionForeground)",
						fontSize: "12px",
						lineHeight: "1.2",
						padding: "0 8px 15px 0",
					}}>
					<p
						style={{
							wordWrap: "break-word",
							margin: 0,
							padding: 0,
						}}></p>
				</div>
			</div>
		</div>
	)
}

export default memo(RagAccountView)
