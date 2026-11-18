import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type { MainPanelId } from '@deepseek-ai/dsh-client-ui-layout/client'
// import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'

import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type {} from '@deepseek-ai/dsh-client-ui-plugin-manager/client'

import { DemoIcon, DemoPanel, DemoSettings } from './DemoUI.tsx'

export const inject = ['slots']

const PANEL_ID = 'kydon-demo' as MainPanelId

export function apply(ctx: ClientContext): void {
  // 左侧栏入口
  ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
    name: 'sidebar.panellist',
    id: PANEL_ID,
    order: 90,
    label: 'Kydon 演示',
  }, DemoIcon))

  // 点击左侧栏入口后显示的页面
  ctx.slots.inject('main', () => ctx.slots.register({
    name: 'main',
    key: PANEL_ID,
  }, DemoPanel))

  // Settings 中的一级页面
  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'kydon-demo-settings',
    order: 90,
    label: 'Kydon 演示',
  }, DemoSettings))
  // 左侧插件详情添加一个UI
  ctx.slots.inject('plugins.bundle.config', () => ctx.slots.register({
    name: 'plugins.bundle.config',
    key: '@kydon/dsh-kydon-test',
  }, DemoSettings))
}