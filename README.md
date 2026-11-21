# 从零创建一个dsh插件

环境说明:nvm 1.1.12、node 26.12.0、dsh 0.2.2-rc.3
前置安装要求：npm、pnpm、nrm(taobao source)、git

大致目录结构：
```txt
dsh_dev/
├── deepseek-harness/
│   ├── .agents/
│   ├── .claude/
│   ├── .github/
│   ├── apps/
│   ├── benchmarks/
│   ├── docs/
│   ├── native/
│   ├── packages/
│   ├── patches/
│   ├── python/
│   ├── scripts/
│   ├── snapshots/
│   ├── vendor/
│   ├── website/
│   ├── AGENTS.md
│   ├── LICENSE
│   ├── Makefile
│   ├── package.json
│   ├── pnpm-lock.yaml
│   ├── README.md
│   ├── tsdown.config.ts
│   ├── vitest.config.ts
└── plugins/
    └── dsh-kydon-bilibili/
        ├── .gitignore
        ├── .python-version
        ├── cordis.yml
        ├── LICENSE
        ├── package.json
        ├── pnpm-lock.yaml
        ├── pyproject.toml
        ├── README.i18n.yaml
        ├── README.md
        └── uv.lock
```
```
## 具体步骤

git init
pnpm init

这样会在仓库下生成一个package.json文件，内容修改如下
```json
{
  "name": "@kydon/dsh-kydon-test",
  "version": "0.0.1",
  "description": "测试的第一个插件",
  "main": "index.js",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "devEngines": {
    "packageManager": {
      "name": "pnpm",
      "version": "12.21.0",
      "onFail": "download"
    }
  },
  "packageManager": "pnpm@12.21.0",
  "type": "module"
}
```

创建src目录，并创建index.ts文件，内容如下：
```ts
import type { Context } from '@deepseek-ai/cordis'

export const name = 'dsh-kydon-test'

export function apply(ctx: Context): void {
  console.log('[dsh-kydon-test] apply 已执行')
}
```

插件仓库根目录创建cordis.yml，内容如下：
```yml
- insert:
    - id: dsh-kydon-test
      name: './src/index.ts'
```
然后从dsh目录启动测试下这个插件的效果
```shell
pnpm dsh web --patch ..\plugins\dsh-kydon-test\cordis.yml
```

注册一个工具，我们继续修改index.ts文件，在apply函数种添加这个工具：
```ts
export function apply(ctx: Context): void {
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
      return `你好，${args.name}！`
    },
  }))
}
```
> 这将声明一个工具给LLM进行调用

注册一个skill，我们续修改index.ts文件，在apply函数中添加这个skill：
```ts
import type {} from '@deepseek-ai/dsh-skill'
export const inject = ['tools', 'skills']

export function apply(ctx: Context): void {
  ctx.skills.register({
    name: 'kydon-greeting',
    description: '根据场景撰写自然、简短的中文问候语。',
    whenToUse: '用户要求调用kydon-greeting写问候语或打招呼时。',
    source: 'runtime',
    invocation: {
      modelInvocable: true,
      userInvocable: true,
    },
    content: `# 问候写作指南

  - 使用用户提供的姓名和背景信息。
  - 每次回复前，加上“你好鸭”三个字
  - 用自然、简短的中文表达。
  - 不要编造用户没有提供的关系或事件。
  - 用户需要多个版本时，提供正式、轻松和温暖三种语气。
  示例：
  用户输入：Kydon，一名程序员
  输出：你好鸭，程序员Kydon！
  `,
  })
  console.log('skill注册成功！')
}
```
> 这将声明一个Skill给LLM进行提示

创建一个副作用，我们续修改index.ts文件：
```ts
export function apply(ctx: Context): void {
  ctx.on('dsh-kydon-test/tick', seconds => {
    console.log(`收到 tick 事件：${seconds}`)
  })

  ctx.effect(() => {
    let seconds = 0

    const timer = setInterval(() => {
      ctx.emit('dsh-kydon-test/tick', ++seconds)
    }, 1000)

    return () => clearInterval(timer)
  })
}
```
> 这将声明一个带发送信号的副作用，我们用on来订阅



TS声明补充
插件仓库根目录添加tsconfig.json文件，内容如下：
```ts
{
  "extends": "../../deepseek-harness/tsconfig.base.json",
  "compilerOptions": {
    "composite": false,
    "incremental": false,
    "noEmit": true,
    "declaration": false,
    "declarationMap": false,
    "sourceMap": false
  },
  "include": ["src/**/*.ts"]
}
```
然后添加ts相关依赖
```shell
pnpm add -D typescript@6.0.3 @types/node@22.19.0
```

现在来给插件写一个交互界面，首先创建src/client/DemoUI.tsx文件：
```tsx
import { useState } from 'react'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'

import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'

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

export function DemoIcon({ size }: PropsRuntime<'sidebar.panellist'>) {
  return <span style={{ fontSize: size, lineHeight: 1 }} aria-hidden="true">🧪</span>
}
```


创建src/client/index.ts文件，内容同如下：
```ts
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type { MainPanelId } from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'

import { DemoIcon, DemoPanel, DemoSettings } from './DemoUI.tsx'

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
}
```

然后修改package.json文件，我们按照惯例稍后选择将对应的编译js放在lib目录下，对应的属性修改为这些：
```json
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
    "./src/*": "./src/*",
    "./package.json": "./package.json"
  },
  "dsh": {
    "client": {
      "platform": "web",
      "inject": [
        "@deepseek-ai/dsh-client-ui-layout",
        "@deepseek-ai/dsh-client-ui-renderer",
        "@deepseek-ai/dsh-client-ui-settings",
        "@deepseek-ai/dsh-client-ui-sidebar"
      ]
    }
  },
  "scripts": {
    "bundle": "tsc -b tsconfig.host.json tsconfig.client.json && tsdown"
  }
}
```

在tsconfig.json添加如下内容：
```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.host.json" },
    { "path": "./tsconfig.client.json" }
  ]
}
```
新增文件 tsconfig.host.json 添加host端ts配置
```json
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
```

新增文件 tsconfig.client.json 添加host端ts配置
```json
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
```

创建tsdown.config.ts文件，内容如下：
```ts
import { clientBundle } from '../../deepseek-harness/packages/client/tsdown.client.ts'

export default clientBundle(import.meta.dirname, ['lib/types/index.js'])
```

安装新的dsh依赖:
```shell
pnpm add -D tsdown react @types/react@~18.3.1 @deepseek-ai/cordis@4.1.0 @deepseek-ai/dsh-tools@0.2.2-rc.3 @deepseek-ai/dsh-skill@0.2.2-rc.3 @deepseek-ai/dsh-agent@0.2.2-rc.3 @deepseek-ai/dsh-llm@0.2.2-rc.3 @deepseek-ai/dsh-scope@0.2.2-rc.3 @deepseek-ai/dsh-session@0.2.2-rc.3 @deepseek-ai/dsh-system-prompt@0.2.2-rc.3 @deepseek-ai/dsh-user-approval@0.2.2-rc.3 @deepseek-ai/dsh-client-ui-layout@0.2.2-rc.3 @deepseek-ai/dsh-client-ui-renderer@0.2.2-rc.3 @deepseek-ai/dsh-client-ui-settings@0.2.2-rc.3 @deepseek-ai/dsh-client-ui-sidebar@0.2.2-rc.3 @deepseek-ai/dsh-client-ui-slots@0.2.2-rc.3
```

现在应该可以在设置界面看到插件的菜单项了。但是现在依旧无法从本地加载下载插件从而显示这个界面。
根目录新增cordis.bundle.yml文件，内容：
```yml
- insert:
    - id: dsh-kydon-test
      name: '@kydon/dsh-kydon-test'
```
然后再package.json新增这个文件的dsh.bundle.patch内容:
```json
"dsh": {
  "bundle": {
    "patch": "./cordis.bundle.yml"
  },
}
```

新增一个界面UI,在插件菜单里查看具体的详情时展示UI
首先在package.json的dsh.client.inject，注入对应位置的组件，现在我们的目标是plugins.bundle.config，导入这个组件
```txt
"@deepseek-ai/dsh-client-ui-plugin-manager"
```
安装这个依赖
```shell
pnpm add -D @deepseek-ai/dsh-client-ui-plugin-manager@0.2.2-rc.3
```
我们在client/index.ts添加如下代码：
```ts
import type {} from '@deepseek-ai/dsh-client-ui-plugin-manager/client'

// 放在 apply(ctx) 中
// 左侧插件详情添加一个UI
ctx.slots.inject('plugins.bundle.config', () => ctx.slots.register({
  name: 'plugins.bundle.config',
  key: '@kydon/dsh-kydon-test',
}, DemoSettings))
```

然后在dsh_devplugins/dsh-kydon-bilibili/目录打包
```shell
pnpm bundle
```
然后在dsh_dev/deepseek-harness/目录进行运行

```shell
pnpm dsh web  --patch ..\plugins\dsh-kydon-test\cordis.yml --no-open
```

重新bundle之后运行没有问题，我们就开始打包发布到npm
首先添加.gitignore文件：
```txt
lib/
node_modules/
```

然后提交代码
```shell
git add .
git commit -m "init"
```

然后使用nrm切换到淘宝源，然后登录npm，使用双因素发布，最后恢复淘宝源
```shell
nrm use npm
pnpm login
pnpm whoami
# 可选的版本号更新
# pnpm version patch
pnpm publish --access public 
```

> 此文档为原始记录，AI优化的文档请参见(此文档)[./README_jioaxue.md]