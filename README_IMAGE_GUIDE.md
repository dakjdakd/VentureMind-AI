# README Image Guide / README 配图建议

| 位置 | 推荐文件名 | 图片类型 | 内容说明 | 尺寸建议 | 是否必需 | 没有图片时的占位方式 |
| --- | --- | --- | --- | --- | --- | --- |
| Logo / Icon | `docs/images/venturemind-logo.svg` | Logo / 图标 | 设计一个简洁的 VentureMind AI 标识，建议结合“决策节点、脑图、董事会备忘录”中的一个视觉概念。图标应适合深色背景和 GitHub README 顶部居中展示。 | SVG 优先；位图建议 512 x 512 | 必需 | 在 README 顶部保留 `[Project Logo]` |
| Hero Banner 或 Hero Demo | `docs/images/hero-board.png` | 产品主图 | 展示完整首页：顶部输入框、中间五个 Agent 工作流节点、右下角实时日志窗口。重点让读者第一眼理解这是一个多智能体创业分析控制台。 | 1600 x 900 或 1440 x 900 | 必需 | `[Hero Demo Image: show the VentureMind AI board, live agent states, logs, and final memo preview here]` |
| 主功能截图 | `docs/images/main-workflow.png` | 界面截图 | 截取用户输入创业想法并启动分析后的状态，露出 Research、Product、Technical、Critic、Supervisor 的运行状态变化。 | 1440 x 900 | 必需 | `[Main Screenshot: show the input console, five-agent workflow, and floating live logs window]` |
| 核心流程图 | `docs/images/workflow-diagram.png` | 流程图 | 用一张干净的图展示 idea input → API → Research → Product/Technical → Critic → recheck → Supervisor → board memo 的数据流。README 当前已提供 Mermaid，可在需要品牌化视觉时替换为图片。 | 1400 x 800 | 可选 | 保留 README 中的 Mermaid 流程图 |
| 使用场景图或结果图 | `docs/images/final-report.png` | 结果页截图 | 展示最终 Board Memorandum 页面，重点露出 Board Decision、Score Reconciliation、Agent Consensus 和报告正文区域。 | 1440 x 900 | 必需 | `[Final Report Screenshot: show the board memorandum, decision score panel, agent consensus, and live logs]` |
| 配置界面或配置示例图 | `docs/images/config-example.png` | 配置示例图 | 展示 `backend/.env` 的关键配置片段，建议只露出变量名和示例值，不展示真实 API Key。可以用终端或代码编辑器截图。 | 1200 x 700 | 可选 | 使用 README 中的配置表格即可 |
| 架构图 | `docs/images/architecture.png` | 系统架构图 | 展示 React 前端、FastAPI API、内存任务存储、SSE Event Bus、Agent Workflow、OpenAI-compatible LLM、Search Provider 之间的关系。 | 1600 x 900 | 可选 | 使用 README 中的模块表和 Mermaid 流程图 |
| 可选 GIF / 动图 | `docs/images/agent-run-demo.gif` | GIF / 动图 | 录制 8 到 12 秒动图，展示从输入创业想法、点击 Start Analysis、Agent 节点依次运行到出现最终报告入口的过程。动图应服务于理解，不需要展示完整等待过程。 | 1280 x 720，控制在 8 MB 以内 | 可选 | 使用 Hero Demo 静态截图 |
| 社区、赞助或生态相关图片 | `docs/images/community-strip.png` | 社区 / 生态图 | 如果项目后续有文档站、Discord、赞助或案例生态，可以放一张横向入口图；当前项目尚未提供这些信息，暂不建议放入 README 主体。 | 1200 x 360 | 可选 | 不放图，保留维护者信息占位符 |

