import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'

import type { } from '@deepseek-ai/dsh-skill'
import type { } from '@deepseek-ai/dsh-agent'
import type { } from '@deepseek-ai/dsh-session'
import type { } from '@deepseek-ai/dsh-user-approval'

declare module '@deepseek-ai/cordis' {
  interface Events {
    'dsh-kydon-test/tick': (seconds: number) => void
  }
}

export const inject = ['tools', 'skills']
export const name = 'dsh-kydon-test'

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
    console.log('[dsh-kydon-test] apply 已执行')

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

    // 工具执行完成
    ctx.on('tools/result', (exec, result) => {
        console.log('工具完成：', exec.name, result.content)
    })

    // Agent 状态变化
    ctx.on('agent/status', ({ status }) => {
        console.log('Agent 状态：', status)
    })

    // 新消息进入 Agent 收件箱
    ctx.on('agent/inbox/inserted', () => {
        console.log('收到一条新消息')
    })

    // 会话记录追加事件
    ctx.on('session/event', (_session, event) => {
        if (event.type === 'tool/call' || event.type === 'tool/result') {
            console.log('会话事件：', event.type)
        }
    })
    // 模型请求前：记录步骤，然后继续
    ctx.on('agent/pre-step', (payload, next) => {
        console.log('即将进入步骤：', payload.turn, payload.step)
        return next()
    })

    // 模型请求失败：记录错误，然后交给后续处理
    ctx.on('agent/request-error', (payload, next) => {
        console.log('请求失败：', payload.provider)
        return next()
    })

    // 审批请求：记录后交给现有审批处理器
    ctx.on('approval/request', (_request, next) => {
        console.log('收到审批请求')
        return next()
    })
    ctx.on('agent/turn-stopping', ({ turn }) => {
        console.log('轮次即将结束：', turn)
    })

    ctx.on('dsh-kydon-test/tick', seconds => {
        console.log(`收到 tick 事件：${seconds}`)
    })

    ctx.effect(() => {
        let seconds = 0

        const timer = setInterval(() => {
            ctx.emit('dsh-kydon-test/tick', ++seconds)
        }, 10000)

        return () => clearInterval(timer)
    })
}