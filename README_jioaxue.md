# 从零创建一个 DSH 插件

## 1. 教程目标与路径约定

本教程从最小的 DSH Host 插件开始，逐步增加工具、Skill、事件监听、浏览器 UI，再把插件打包成可安装的组合包。

### 1.1 开发环境

本教程以 Node.js 26.12.0、DSH 0.2.2-rc.3、pnpm 和 Git 为例。版本是本教程编写时的环境；实际开发时，应确认插件依赖的 DSH 版本与目标运行环境一致。nrm 仅在需要切换 npm registry 时使用。

### 1.2 一次性定义两个目录

请在 PowerShell 中按自己的工作区位置修改以下路径变量，之后的命令统一使用这两个变量：

~~~powershell
$DSH_ROOT = 'E:\projectWorkspace\dsh_dev\deepseek-harness'
$PLUGIN_PATH = 'E:\projectWorkspace\dsh_dev\plugins\dsh-kydon-test'
~~~

目录关系：

~~~text
dsh_dev/
├── deepseek-harness/            # DSH_ROOT
└── plugins/
    └── dsh-kydon-test/          # PLUGIN_PATH；本教程文件放在这里
~~~

### 1.3 相对路径的解析规则

命令中的相对路径以执行命令时的当前目录为基准；配置文件里的相对路径以配置文件自身所在目录为基准：

- cordis.yml 中的 ./src/index.ts，相对于 cordis.yml 所在目录，也就是 PLUGIN_PATH。
- package.json 中的 ./cordis.bundle.yml，相对于包目录，也就是 PLUGIN_PATH。
- tsconfig.host.json 中的 ../../deepseek-harness/tsconfig.base.json，相对于该 tsconfig 文件所在目录。
- 从 DSH_ROOT 执行 pnpm dsh web --patch ..\plugins\dsh-kydon-test\cordis.yml，其中的 ..\plugins\... 才会指向插件配置文件。

## 2. 初始化插件包

### 2.1 初始化 Git 和 npm 包

~~~powershell
Set-Location $PLUGIN_PATH
git init
pnpm init
~~~

pnpm init 会创建 package.json。初期可以整理为：

~~~json
{
  "name": "@kydon/dsh-kydon-test",
  "version": "0.0.1",
  "description": "用于学习 DSH 插件开发的示例插件",
  "type": "module",
  "scripts": {}
}
~~~

name 是 npm 包名，发布前要确认名称可用；version 是包版本；type: "module" 表示使用 ES Module。构建入口和 DSH 元数据会在后续加入。

### 2.2 创建初始目录结构

在 PLUGIN_PATH 下创建：

~~~text
dsh-kydon-test/
├── package.json
├── src/
│   └── index.ts
├── cordis.yml
└── README_jioaxue.md
~~~

## 3. 创建最小 Host 插件

Host 插件运行在 DSH 的 Node.js 侧，适合注册工具、Skill 和处理 Host 生命周期。

### 3.1 创建入口文件

创建 src/index.ts：

~~~ts
import type { Context } from '@deepseek-ai/cordis'

export const name = 'dsh-kydon-test'

export function apply(ctx: Context): void {
  console.log('[dsh-kydon-test] apply 已执行')
}
~~~

apply 是插件激活时执行的入口。插件没有成功导入并激活之前，apply 不会执行，因此这条日志也不会出现。

### 3.2 创建源码调试配置

在 PLUGIN_PATH 下创建 cordis.yml：

~~~yaml
- insert:
    - id: dsh-kydon-test
      name: './src/index.ts'
~~~

id 是配置树中该插件行的唯一标识。name 指向插件模块；./src/index.ts 以 cordis.yml 所在目录为基准解析。

### 3.3 从 DSH 源码仓库启动

~~~powershell
Set-Location $DSH_ROOT
pnpm dsh web --patch ..\plugins\dsh-kydon-test\cordis.yml --no-open
~~~

启动日志应包含：

~~~text
[dsh-kydon-test] apply 已执行
~~~

如果没有看到，先检查命令执行目录、patch 路径、YAML 中的 name，以及入口是否导出了 apply。

## 4. 注册工具和 Skill

### 4.1 注册一个工具

工具注册需要访问 tools 服务。在 PLUGIN_PATH 执行：

~~~powershell
Set-Location $PLUGIN_PATH
pnpm add -D @deepseek-ai/cordis@4.1.0 @deepseek-ai/dsh-tools@0.2.2-rc.3
~~~

在 src/index.ts 顶部加入：

~~~ts
import { defineTool } from '@deepseek-ai/dsh-tools'
~~~

在模块顶层声明服务依赖：

~~~ts
export const inject = ['tools']
~~~

然后在 apply 中注册工具：

~~~ts
ctx.tools.register(defineTool({
  name: 'kydon_greet',
  description: '根据名字向某人打招呼。',
  parameters: {
    name: {
      type: 'string',
      required: true,
      description: '要问候的人的名字',
    },
  },
  output: {
    schema: { type: 'string' },
    render: (_args, value) => [{ type: 'text', text: value }],
  },
  async execute(args) {
    return '你好，' + args.name + '！'
  },
}))
~~~

inject = ['tools'] 表示该插件依赖 Cordis 服务 tools。Cordis 会等待该服务可用后再激活插件。它不是文件路径，也不是客户端模块列表。

### 4.2 注册一个 Skill

Skill 注册需要访问 skills 服务。在 PLUGIN_PATH 安装对应开发依赖：

~~~powershell
pnpm add -D @deepseek-ai/dsh-skill@0.2.2-rc.3
~~~

在 src/index.ts 中加入类型导入，并把 skills 加入服务依赖列表：

~~~ts
import type {} from '@deepseek-ai/dsh-skill'

export const inject = ['tools', 'skills']
~~~

import type {} 会让 TypeScript 加载该包的类型扩展，不会生成运行时导入。
这里应将上一节的 inject 声明替换为 ['tools', 'skills']，不要在同一个文件里保留两个 export const inject。

在 apply 中注册 Skill：

~~~ts
ctx.skills.register({
  name: 'kydon-greeting',
  description: '根据场景撰写自然、简短的中文问候语。',
  whenToUse: '用户要求使用 kydon-greeting 写问候语或打招呼时。',
  source: 'runtime',
  invocation: {
    modelInvocable: true,
    userInvocable: true,
  },
  content: '# 问候写作指南\n'
    + '\n'
    + '- 使用用户提供的姓名和背景信息。\n'
    + '- 每次回复前加上“你好鸭”三个字。\n'
    + '- 使用自然、简短的中文表达。\n'
    + '- 不要编造用户没有提供的关系或事件。\n'
    + '- 用户需要多个版本时，提供正式、轻松和温暖三种语气。\n'
    + '\n'
    + '示例：\n'
    + '用户输入：Kydon，一名程序员\n'
    + '输出：你好鸭，程序员 Kydon！\n',
})
~~~

Skill 是供模型参考的提示内容，不等同于可直接执行的工具。注册成功只能说明运行时已执行注册；模型是否采用它，还与调用设置、当前会话和模型行为有关。

## 5. 监听事件与管理副作用

### 5.1 使用 ctx.on 和 ctx.emit

下面用一个计时器演示自定义事件。在 src/index.ts 中加入事件类型声明：

~~~ts
declare module '@deepseek-ai/cordis' {
  interface Events {
    'dsh-kydon-test/tick': (seconds: number) => void
  }
}
~~~

这段声明只参与 TypeScript 类型检查，不会在运行时创建事件。运行时的订阅和发送分别由 ctx.on 与 ctx.emit 完成。

在 apply 中加入：

~~~ts
ctx.on('dsh-kydon-test/tick', seconds => {
  console.log('收到 tick 事件：', seconds)
})

ctx.effect(() => {
  let seconds = 0

  const timer = setInterval(() => {
    ctx.emit('dsh-kydon-test/tick', ++seconds)
  }, 1000)

  return () => clearInterval(timer)
})
~~~

ctx.effect 用来管理需要清理的副作用。插件卸载时，返回的清理函数会被调用，从而清除定时器。

### 5.2 监听 DSH 提供的事件

除自定义事件外，也可以监听 DSH 的生命周期事件。若这些事件名在 TypeScript 中没有类型提示，需要导入提供对应事件类型扩展的包；例如本节使用的 Agent、Session 和审批事件：

~~~ts
import type {} from '@deepseek-ai/dsh-agent'
import type {} from '@deepseek-ai/dsh-session'
import type {} from '@deepseek-ai/dsh-user-approval'
~~~

这些包也需要安装到插件的开发依赖中，版本应与目标 DSH 对齐。

~~~ts
ctx.on('tools/result', (exec, result) => {
  console.log('工具执行完成：', exec.name, result.content)
})

ctx.on('agent/status', ({ status }) => {
  console.log('Agent 状态：', status)
})

ctx.on('session/event', (_session, event) => {
  if (event.type === 'tool/call' || event.type === 'tool/result') {
    console.log('会话事件：', event.type)
  }
})
~~~

观察型监听器用于读取事件信息。部分事件会影响执行流程，称为 waterfall（瀑布）事件，例如 agent/pre-step、agent/request-error 和 approval/request。这类监听器在只观察、不拦截时，应调用 next() 继续后续流程：

~~~ts
ctx.on('agent/pre-step', (payload, next) => {
  console.log('即将进入步骤：', payload.turn, payload.step)
  return next()
})
~~~

如果要改变步骤、请求失败处理或审批结果，应先查阅该事件的参数和返回类型，再实现处理逻辑。

## 6. 配置 TypeScript

### 6.1 为什么拆分 Host 和浏览器端配置

Host 代码运行于 Node.js，浏览器 UI 运行于 Web 环境，两侧的类型依赖不同，因此分别配置 TypeScript 项目。

直接继承 DSH 基础配置并保留其 paths 映射，可能使编译器解析到 DSH 仓库源码，导致插件类型检查把 DSH 内部文件也纳入检查。此处通过 "paths": {} 清空继承的路径映射，让插件通过已安装包的类型声明解析依赖。

### 6.2 创建根项目配置

在 PLUGIN_PATH 下创建 tsconfig.json：

~~~json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.host.json" },
    { "path": "./tsconfig.client.json" }
  ]
}
~~~

这两个引用路径都相对于 tsconfig.json 所在目录。

### 6.3 创建 Host 配置

创建 tsconfig.host.json：

~~~json
{
  "extends": "../../deepseek-harness/tsconfig.base.json",
  "compilerOptions": {
    "paths": {},
    "rootDir": "src",
    "outDir": "lib/types",
    "tsBuildInfoFile": "lib/tsconfig.host.tsbuildinfo"
  },
  "files": ["src/index.ts"]
}
~~~

extends 路径相对于 tsconfig.host.json 所在目录。如果新增的 Host 文件没有从 src/index.ts 导入，应把它也加入 files。

### 6.4 创建浏览器端配置

创建 tsconfig.client.json：

~~~json
{
  "extends": "../../deepseek-harness/tsconfig.base.client.json",
  "compilerOptions": {
    "paths": {},
    "rootDir": "src",
    "outDir": "lib/types",
    "tsBuildInfoFile": "lib/tsconfig.client.tsbuildinfo"
  },
  "include": ["src/client"]
}
~~~

这个配置检查 src/client 下的浏览器代码。两侧声明文件都会生成到 lib/types。

### 6.5 运行类型检查

对两个引用项目执行类型检查：

~~~powershell
Set-Location $PLUGIN_PATH
pnpm exec tsc -b tsconfig.host.json tsconfig.client.json
~~~

后续的 pnpm bundle 也会先运行 TypeScript 项目构建，再生成运行时代码。采用 project references 后，应使用 tsc -b 检查各引用项目。

## 7. 添加浏览器 UI

### 7.1 理解浏览器侧入口

浏览器代码放在 src/client 下：

- src/index.ts 是 Host 入口。
- src/client/index.ts 是浏览器侧入口。
- src/client/DemoUI.tsx 放 React UI 组件。
- dsh.client 元数据声明浏览器平台和客户端模块关系。

### 7.2 安装浏览器端开发依赖

以下命令在 PLUGIN_PATH 执行：

~~~powershell
Set-Location $PLUGIN_PATH
pnpm add -D tsdown react@18.2.0 @types/react@~18.3.1 @deepseek-ai/dsh-client-ui-layout@0.2.2-rc.3 @deepseek-ai/dsh-client-ui-renderer@0.2.2-rc.3 @deepseek-ai/dsh-client-ui-settings@0.2.2-rc.3 @deepseek-ai/dsh-client-ui-sidebar@0.2.2-rc.3 @deepseek-ai/dsh-client-ui-plugin-manager@0.2.2-rc.3 @deepseek-ai/dsh-client-ui-slots@0.2.2-rc.3
~~~

示例使用 React 18，以匹配当前 DSH 客户端的 React 依赖。实际开发时应按目标 DSH 版本的依赖约束调整。

### 7.3 创建 UI 组件

创建 src/client/DemoUI.tsx：

~~~tsx
import { useState } from 'react'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'

import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type {} from '@deepseek-ai/dsh-client-ui-plugin-manager/client'

function DemoCard({ title }: { title: string }) {
  const [count, setCount] = useState(0)

  return (
    <section style={{ padding: 24 }}>
      <h2>{title}</h2>
      <p>这是由 dsh-kydon-test 插件提供的演示界面。</p>
      <p>按钮点击次数：{count}</p>
      <button onClick={() => setCount(value => value + 1)}>点我</button>
    </section>
  )
}

export function DemoPanel(_props: PropsRuntime<'main'>) {
  return <DemoCard title="Kydon 插件页面" />
}

export function DemoSettings(_props: PropsRuntime<'settings.section'>) {
  return <DemoCard title="Kydon 设置页面" />
}

export function DemoBundleConfig(
  _props: PropsRuntime<'plugins.bundle.config'>,
) {
  return <DemoCard title="Kydon 插件配置" />
}

export function DemoIcon({ size }: PropsRuntime<'sidebar.panellist'>) {
  return (
    <span style={{ fontSize: size, lineHeight: 1 }} aria-hidden="true">
      🧪
    </span>
  )
}
~~~

DemoSettings 和 DemoBundleConfig 使用不同的 PropsRuntime 类型，因为它们注册到不同的 UI slot。一个 slot 的组件类型不能直接替代另一个 slot 的组件类型。

### 7.4 创建浏览器侧插件入口

创建 src/client/index.ts：

~~~ts
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type { MainPanelId } from '@deepseek-ai/dsh-client-ui-layout/client'

import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type {} from '@deepseek-ai/dsh-client-ui-plugin-manager/client'

import {
  DemoBundleConfig,
  DemoIcon,
  DemoPanel,
  DemoSettings,
} from './DemoUI.tsx'

export const inject = ['slots']

const PANEL_ID = 'kydon-demo' as MainPanelId

export function apply(ctx: ClientContext): void {
  ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
    name: 'sidebar.panellist',
    id: PANEL_ID,
    order: 90,
    label: 'Kydon 演示',
  }, DemoIcon))

  ctx.slots.inject('main', () => ctx.slots.register({
    name: 'main',
    key: PANEL_ID,
  }, DemoPanel))

  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'kydon-demo-settings',
    order: 90,
    label: 'Kydon 演示',
  }, DemoSettings))

  ctx.slots.inject('plugins.bundle.config', () => ctx.slots.register({
    name: 'plugins.bundle.config',
    key: '@kydon/dsh-kydon-test',
  }, DemoBundleConfig))
}
~~~

export const inject = ['slots'] 声明 Cordis 服务依赖；ctx.slots.inject('plugins.bundle.config', ...) 指定要注册到的 UI slot。二者属于不同层次的注入机制。

### 7.5 配置包入口与构建脚本

在 package.json 的 dsh 字段中加入：

~~~json
{
  "dsh": {
    "client": {
      "platform": "web",
      "inject": [
        "@deepseek-ai/dsh-client-ui-layout",
        "@deepseek-ai/dsh-client-ui-renderer",
        "@deepseek-ai/dsh-client-ui-settings",
        "@deepseek-ai/dsh-client-ui-sidebar",
        "@deepseek-ai/dsh-client-ui-plugin-manager"
      ]
    }
  }
}
~~~

dsh.client.inject 填写客户端模块包名。它不是 UI slot 名，也不能替代 package.json 的 npm 依赖声明或插件代码中的 Cordis 服务 inject。

更新 package.json 中的入口和脚本：

~~~json
{
  "main": "./lib/index.js",
  "types": "./lib/types/index.d.ts",
  "exports": {
    ".": {
      "types": "./lib/types/index.d.ts",
      "default": "./lib/index.js"
    },
    "./client": {
      "types": "./lib/types/client/index.d.ts",
      "default": "./lib/client.js"
    },
    "./package.json": "./package.json"
  },
  "scripts": {
    "bundle": "tsc -b tsconfig.host.json tsconfig.client.json && tsdown"
  }
}
~~~

实际修改时，把这些字段合并进现有 package.json，不要用片段覆盖整个文件。

创建 tsdown.config.ts：

~~~ts
import { clientBundle } from '../../deepseek-harness/packages/client/tsdown.client.ts'

export default clientBundle(import.meta.dirname, ['lib/types/index.js'])
~~~

这里的导入路径相对于 tsdown.config.ts 所在目录。该构建配置依赖同一工作区中的 DSH 源码，因此本教程的构建命令应在 PLUGIN_PATH 所在工作区中执行。

### 7.6 构建客户端代码

在 PLUGIN_PATH 执行：

~~~powershell
Set-Location $PLUGIN_PATH
pnpm bundle
~~~

构建后应能找到以下文件：

~~~text
lib/index.js
lib/client.js
lib/types/index.d.ts
lib/types/client/index.d.ts
~~~

DSH 客户端模块系统读取构建后的 lib/client.js。如果提示 client bundle 不存在，检查构建是否成功、配置文件是否存在以及当前目录是否正确。

## 8. 开发 patch 与可安装组合包

### 8.1 使用源码 patch 调试 Host 入口

cordis.yml 中的 name: './src/index.ts' 指向本地源码，适合快速调试 Host 代码：

~~~yaml
- insert:
    - id: dsh-kydon-test
      name: './src/index.ts'
~~~

从 DSH_ROOT 执行：

~~~powershell
Set-Location $DSH_ROOT
pnpm dsh web --patch ..\plugins\dsh-kydon-test\cordis.yml --no-open
~~~

### 8.2 创建组合包 patch

要把插件作为 npm 包安装，并让 DSH 根据包名找到浏览器入口，需要让组合包 patch 使用包名。

在 PLUGIN_PATH 下创建 cordis.bundle.yml：

~~~yaml
- insert:
    - id: dsh-kydon-test
      name: '@kydon/dsh-kydon-test'
~~~

然后在 package.json 中加入：

~~~json
{
  "dsh": {
    "bundle": {
      "patch": "./cordis.bundle.yml"
    }
  }
}
~~~

./cordis.bundle.yml 相对于 package.json 所在的包目录解析。cordis.yml 与 cordis.bundle.yml 用途不同：

- cordis.yml 使用相对源码路径，供 --patch 调试。
- cordis.bundle.yml 使用包名，作为可安装组合包的配置层。

浏览器侧入口从包名对应的插件行加载。仅以 ./src/index.ts 加载 Host 源码，不会自动替代已构建的客户端包入口。

### 8.3 将本地组合包安装到 web profile

先构建插件：

~~~powershell
Set-Location $PLUGIN_PATH
pnpm bundle
~~~

再把本地组合包安装到 web profile：

~~~powershell
Set-Location $DSH_ROOT
pnpm dsh plugin --profile web add ..\plugins\dsh-kydon-test
~~~

安装后启动：

~~~powershell
pnpm dsh web --no-open
~~~

这条路径会根据 dsh.bundle 声明加载组合包 patch，并使用包的 ./client 导出加载浏览器 UI。使用 profile 安装方式测试时，不要再同时通过 --patch cordis.yml 插入同一个插件，否则可能出现重复配置行。

## 9. 发布到 npm

### 9.1 配置 .gitignore

在 PLUGIN_PATH 下创建 .gitignore：

~~~gitignore
lib/
node_modules/
~~~

lib/ 可以不提交到 Git，但发布 npm 包时仍必须把构建产物放入压缩包。

### 9.2 声明发布文件

在 package.json 中设置 files，明确列出发布内容：

~~~json
{
  "files": [
    "lib/",
    "cordis.bundle.yml",
    "README.md",
    "README_jioaxue.md"
  ]
}
~~~

如果包有许可证文件，也应将许可证文件加入列表。发布内容必须覆盖 package.json 中 main、types、exports 和 dsh.bundle.patch 引用的文件。

### 9.3 声明宿主依赖

对 DSH 插件而言，devDependencies 用于本地构建和类型检查；宿主运行时需要提供的包，应按插件实际使用情况声明在 peerDependencies 中。当前示例可参考：

~~~json
{
  "peerDependencies": {
    "@deepseek-ai/cordis": "4.1.0",
    "@deepseek-ai/dsh-tools": "0.2.2-rc.3",
    "@deepseek-ai/dsh-skill": "0.2.2-rc.3",
    "react": "^18.2.0"
  }
}
~~~

构建和类型检查所需的包仍保留在 devDependencies。特别是 @deepseek-ai/dsh-tools 在 Host 入口中有运行时导入，不能只放在 devDependencies。宿主共享包的依赖声明方式应与目标 DSH 版本和插件的实际运行时导入保持一致。

这不是“所有 @deepseek-ai/dsh-* 包都放进 peerDependencies”。判断依据是插件运行时是否要求宿主提供该包或对应服务：

| 包 | 当前示例中的用途 | 建议声明 |
| --- | --- | --- |
| @deepseek-ai/cordis | 提供插件运行所依赖的 Cordis 框架契约；源码中 Context 是类型导入 | peerDependencies，并同时放入 devDependencies 供本地开发 |
| @deepseek-ai/dsh-tools | 运行时导入 defineTool，并使用 ctx.tools 服务 | peerDependencies，并同时放入 devDependencies |
| @deepseek-ai/dsh-skill | 使用 ctx.skills.register 服务；类型导入本身会被擦除 | peerDependencies，并同时放入 devDependencies |
| @deepseek-ai/dsh-agent | 当前只通过类型导入补充 Agent 事件类型 | devDependencies；若插件功能必须依赖这些事件的生产者，再声明 peer |
| @deepseek-ai/dsh-session | 当前只通过类型导入补充 session/event 类型 | devDependencies；若插件功能必须依赖该事件生产者，再声明 peer |
| @deepseek-ai/dsh-user-approval | 当前只通过类型导入补充 approval/request 类型 | devDependencies；若插件功能必须依赖审批服务，再声明 peer |
| @deepseek-ai/dsh-llm、dsh-scope、dsh-system-prompt | 当前示例源码没有导入或调用它们 | 不需要声明；若后续只用于类型检查，放 devDependencies；若运行时必须由宿主提供，再放 peerDependencies |

只为 TypeScript 事件声明提供类型的 import type 会在编译时擦除，不会出现在 lib/index.js 中；因此这类包不需要为了构建产物解析而声明为运行时 peer。反过来，如果插件的业务逻辑必须有某个事件生产者或服务才能工作，就应把相应宿主包列为 peer 依赖，并通过插件配置声明实际的 Cordis 服务依赖（适用时）。如果事件监听只是演示或可选监控，则不必强制安装事件生产者。

因此，本插件当前 package.json 中的 dsh-agent、dsh-session、dsh-user-approval 是类型开发依赖；dsh-llm、dsh-scope、dsh-system-prompt 若没有其他源文件使用，可以从 devDependencies 删除。每增加或移除一个源文件导入，都应重新按运行时导入、类型导入和服务需求核对依赖类别。

### 9.4 检查发布包并发布

在 PLUGIN_PATH 构建并预览 npm 包内容：

~~~powershell
Set-Location $PLUGIN_PATH
pnpm bundle
pnpm pack --dry-run
~~~

确认输出包含：

- lib/index.js
- lib/client.js
- lib/types/ 下的声明文件
- cordis.bundle.yml
- README 文件

然后提交代码：

~~~powershell
git add .
git commit -m "init"
~~~

发布前登录 npm：

~~~powershell
pnpm login
pnpm whoami
~~~

每次发布都要使用尚未发布过的新版本号。确认 package.json 版本已更新后，再执行：

~~~powershell
pnpm publish --access public
~~~

scoped 包使用 --access public 发布为公开包。需要切换 registry 时再使用 nrm，发布前确认 registry 指向目标 npm registry。

## 10. 常见错误与定位方法

### 10.1 Invalid or unexpected token

如果安装后提示：

~~~text
failed to import: SyntaxError: Invalid or unexpected token
~~~

表示 Node 在导入插件模块时遇到无法解析的语法。此时 apply() 尚未执行，因此插件内的 console.log 不会出现。

可以在 PLUGIN_PATH 检查构建产物：

~~~powershell
Set-Location $PLUGIN_PATH
node --check .\lib\index.js
~~~

若错误指出构建产物中出现 DSH 源码里的装饰器（例如 @Remote），通常是把 DSH 宿主包只放在了 devDependencies，导致构建时被内联进插件。将运行时由 DSH 宿主提供的包声明到 peerDependencies，保留本地构建需要的 devDependencies，重新执行 pnpm install 和 pnpm bundle，再运行 node --check。

npm 已发布的版本不能覆盖。修复后应升级插件版本、重新构建和发布，然后在 profile 中安装新版本。

### 10.2 提示找不到 lib/client.js

在 PLUGIN_PATH 运行：

~~~powershell
pnpm bundle
Test-Path .\lib\client.js
~~~

如果结果是 False，检查构建是否成功，以及 tsdown.config.ts 是否存在且导入路径正确。

### 10.3 TypeScript 报 DSH 仓库内部源码错误

检查 tsconfig.host.json 和 tsconfig.client.json 是否都声明了：

~~~json
"paths": {}
~~~

继承 DSH 基础配置中的源码路径映射可能导致编译器检查 DSH 仓库内部代码。插件项目应通过已安装依赖的类型声明来检查。

### 10.4 安装时提示没有声明 dsh.bundle

检查 package.json 中是否有 dsh.bundle.patch，并确认该字段指向的 cordis.bundle.yml 存在且被包含在 npm 发布文件内。

### 10.5 插件启用但 UI 没显示

依次检查：

1. 是否执行过 pnpm bundle，并生成 lib/client.js。
2. package.json 是否声明 dsh.client.platform 为 web。
3. dsh.client.inject 是否包含 UI 使用的客户端模块包名。
4. 注册使用的 slot 名是否准确，例如 plugins.bundle.config。
5. 组件类型是否与 slot 相匹配，例如 PropsRuntime<'plugins.bundle.config'>。
6. 当前 profile 加载的是否是包名行，而不只是 ./src/index.ts 源码行。

### 10.6 Skill 注册后模型没有使用

检查插件是否激活、inject 是否包含 skills、Skill 的调用设置是否符合预期，以及 whenToUse 是否准确描述适用场景。注册成功日志只证明执行到了注册代码，不能保证模型在每轮对话中都选择该 Skill。

### 10.7 查看 DSH 日志

先查看启动 pnpm dsh web 的终端输出。也可以在 PowerShell 中读取最近的启动日志：

~~~powershell
$log = Get-ChildItem "$env:USERPROFILE\.dsh\logs" -Filter 'startup-*.log' |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1

$log.FullName
Get-Content $log.FullName -Tail 200
~~~

如果错误发生在 Web 运行期间，终端和 DSH 日志通常比浏览器 Console 更接近插件加载过程。

## 11. 完成后的目录结构

完成本教程后，插件目录大致如下：

~~~text
dsh-kydon-test/
├── src/
│   ├── index.ts
│   └── client/
│       ├── index.ts
│       └── DemoUI.tsx
├── lib/                    # 构建产物，通常不提交 Git
├── cordis.yml              # 本地源码调试 patch
├── cordis.bundle.yml       # 可安装组合包 patch
├── package.json
├── tsconfig.json
├── tsconfig.host.json
├── tsconfig.client.json
├── tsdown.config.ts
├── .gitignore
├── README.md
└── README_jioaxue.md
~~~




