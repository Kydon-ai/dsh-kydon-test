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