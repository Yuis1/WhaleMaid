# WhaleMaid 文档索引

## 用户文档

| 文档                                              | 内容                                 |
| ------------------------------------------------- | ------------------------------------ |
| [首页](../README.md)                              | 当前能力、边界与入口                 |
| [English 首页](../README.en.md)                   | 英文读者入口，链接英文安装和使用说明 |
| [安装说明](install.md) / [English](install.en.md) | 通用安装、固定副本、更新与卸载       |
| [使用说明](usage.md)                              | 各功能用法、默认值、关闭方法和限制   |
| [English 使用说明](usage.en.md)                   | 与中文逐节对应的操作、默认值和限制   |
| [变更记录](../CHANGELOG.md)                       | 未发布能力与对应本地提交             |

历史文档中的旧提交号可在[提交号对照](提交号对照.md)中查询新的提交号。

## 作者本机记录

| 文档                                | 内容                                                             |
| ----------------------------------- | ---------------------------------------------------------------- |
| [日常安装与自查](日常安装与自查.md) | 含作者本机路径和历史状态的记录，保留作追溯，不作为通用安装入口。 |

## 开发与查证

[授权与自主执行验证](authorized-autopilot-verification.md)说明固定版本、真实本地闭环和模型替身的证据边界。

| 文档                                            | 内容                                    |
| ----------------------------------------------- | --------------------------------------- |
| [参与开发](../CONTRIBUTING.md)                  | 提交、测试与第三方边界检查              |
| [架构与开发路线](架构与开发路线.md)             | 工程决策依据；早期章节以其标注版本为准  |
| [领域层约定](core-domain.md)                    | core 与 host 职责                       |
| [DSH API 笔记](dsh-api-notes.md)                | 实际 SDK、公开服务与接入查证            |
| [隔离联调](dev-dsh.md)                          | 独立 DSH_HOME / profile，不操作日常环境 |
| [任务提示词索引](../prompts/README.md)          | 实现与审查任务历史                      |
| [产品规划](../项目规划.txt)                     | 设计讨论稿，含未实现设想                |
| [主动性引擎设计](主动性引擎设计.md)             | F08/F10 的设计；阶段 I1 已实现          |
| [鲸鱼界面草图](coopanion/ui-redesign/README.md) | 独立插件的历史设计参考，不是运行时      |

## 任务报告

报告记录当时版本、证据与失败，不能代替当前使用说明。隔离截图、会话和运行日志保存在本地 .dsh-dev，未随仓库分发。

### WhaleMaid

| 报告                                | 主题                                                  |
| ----------------------------------- | ----------------------------------------------------- |
| [p02-report](p02-report.md)         | P02 实现与验收回报                                    |
| [p03-report](p03-report.md)         | P03 WhaleMaid 面板骨架验收回报                        |
| [p04-p05-report](p04-p05-report.md) | P04/P05 通知投递与智能选项                            |
| [p06-report](p06-report.md)         | P06 存储、授权范围与全局暂停验收回报                  |
| [p07-report](p07-report.md)         | P07 目标录入与确认授权验收回报                        |
| [p08-report](p08-report.md)         | P08 实现与验收记录                                    |
| [p09-report](p09-report.md)         | P09：独立验收、范围守卫与决策                         |
| [p10-report](p10-report.md)         | P10：调度器与三阶段闭环                               |
| [p11-report](p11-report.md)         | P11：伙伴 agent“大肥鱼”                               |
| [p12-report](p12-report.md)         | P12：大肥鱼的长期记忆                                 |
| [p12f-report](p12f-report.md)       | P12F：项目经验可跳过、整理限制来源数                  |
| [p13-report](p13-report.md)         | P13：大肥鱼提议项目管理动作                           |
| [p13b-report](p13b-report.md)       | P13B：用户决策卡的放弃与改方向                        |
| [p14-report](p14-report.md)         | P14：高权限执行模式                                   |
| [p14f-report](p14f-report.md)       | P14F：高权限命令识别审查修正                          |
| [p14g-report](p14g-report.md)       | P14G：高权限模式剩余漏判修正                          |
| [p14h-report](p14h-report.md)       | P14H：通配符只在字面指向保护项时拒绝                  |
| [p14i-report](p14i-report.md)       | P14I：危险审批的可读原因                              |
| [p15-report](p15-report.md)         | P15：大肥鱼的对话回顾与经历                           |
| [p16-report](p16-report.md)         | P16：以往的大肥鱼对话轮换归档                         |
| [p17-report](p17-report.md)         | P17：大肥鱼的每日简报                                 |
| [p18-report](p18-report.md)         | 发布准备、许可边界、包清单和待确认项                  |
| [p18b-report](p18b-report.md)       | 中英文首页、安装和使用说明；隔离安装演练              |
| [p20-report](p20-report.md)         | 对话调用 Codex、逐次审批、进程取消与 Windows 沙箱限制 |

### 独立鲸鱼插件的协作记录

产品代码和媒体在独立 AGPL 仓库，这里仅保存 WhaleMaid 编写的说明。

| 报告                                                  | 主题                                                |
| ----------------------------------------------------- | --------------------------------------------------- |
| [blank-draft-report](coopanion/blank-draft-report.md) | 桌宠列表隐藏空白草稿会话                            |
| [c01-report](coopanion/c01-report.md)                 | <!-- SPDX-License-Identifier: AGPL-3.0-or-later --> |
| [c03-report](coopanion/c03-report.md)                 | C03 全屏与普通桌面可见性修复验收                    |
| [c04-report](coopanion/c04-report.md)                 | C04 信封已处理条目的重启恢复修复                    |
| [c05-report](coopanion/c05-report.md)                 | C05 异常提醒不流泪验收                              |
| [c06-report](coopanion/c06-report.md)                 | C06 桌宠界面改版验收                                |
| [c07-report](coopanion/c07-report.md)                 | C07 新版界面细节打磨                                |
| [c08-report](coopanion/c08-report.md)                 | C08 双击直接和“大肥鱼”聊天 验收报告                 |
| [c08f-report](coopanion/c08f-report.md)               | C08F：C08 审查修正与真实宿主验收                    |
| [c09-report](coopanion/c09-report.md)                 | C09 安静模式（新消息只亮信封）验收报告              |
| [c10-report](coopanion/c10-report.md)                 | C10：会话名读取 Harness 标题                        |
