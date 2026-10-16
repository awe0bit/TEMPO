import { defineConfig } from 'vitepress'

const repository = 'https://github.com/awe0bit/Tempo'
const downloads = `${repository}/releases/latest`

const sharedTheme = {
  logo: '/mark.svg',
  socialLinks: [{ icon: 'github' as const, link: repository }]
}

export default defineConfig({
  cleanUrls: true,
  lastUpdated: true,
  head: [
    ['meta', { name: 'theme-color', content: '#ffffff' }],
    ['meta', { name: 'color-scheme', content: 'light dark' }],
    ['link', { rel: 'icon', href: '/mark.svg', type: 'image/svg+xml' }]
  ],
  themeConfig: {
    search: {
      provider: 'local',
      options: {
        locales: {
          root: {
            translations: {
              button: {
                buttonText: '搜索文档',
                buttonAriaLabel: '搜索文档'
              },
              modal: {
                noResultsText: '没有找到相关内容',
                resetButtonTitle: '清除搜索',
                footer: {
                  selectText: '选择',
                  navigateText: '切换',
                  closeText: '关闭'
                }
              }
            }
          }
        }
      }
    }
  },
  locales: {
    root: {
      label: '简体中文',
      lang: 'zh-CN',
      title: 'Tempo 文档',
      description: 'Tempo 跨端开发、自托管同步与部署文档',
      themeConfig: {
        ...sharedTheme,
        siteTitle: 'Tempo 文档',
        nav: [
          { text: '配置', link: '/CONFIGURATION' },
          { text: '部署', link: '/DEPLOYMENT' },
          { text: '架构', link: '/ARCHITECTURE' },
          { text: '安全', link: '/SECURITY_PERFORMANCE' },
          { text: '同步协议', link: '/SYNC_PROTOCOL' },
          { text: '下载', link: downloads }
        ],
        sidebar: [
          {
            text: '开始',
            items: [
              { text: '文档首页', link: '/' },
              { text: '产品范围', link: '/PRODUCT' }
            ]
          },
          {
            text: '部署与维护',
            items: [
              { text: '完整配置指南', link: '/CONFIGURATION' },
              { text: '自托管同步', link: '/DEPLOYMENT' },
              { text: 'iOS 本机签名', link: '/IOS_PRIVATE_SIGNING' }
            ]
          },
          {
            text: '开发',
            items: [
              { text: '系统架构', link: '/ARCHITECTURE' },
              { text: 'iOS OTA 架构', link: '/architecture/ios-ota' },
              { text: '安全与性能审计', link: '/SECURITY_PERFORMANCE' },
              { text: '同步协议', link: '/SYNC_PROTOCOL' },
              { text: '跨端设计规范', link: '/DESIGN' }
            ]
          }
        ],
        outline: { level: 2, label: '本页内容' },
        lastUpdated: { text: '最后更新于' },
        docFooter: { prev: '上一篇', next: '下一篇' },
        footer: {
          message: '个人、本地优先、自托管同步',
          copyright: 'Tempo'
        }
      }
    },
    en: {
      label: 'English',
      lang: 'en-US',
      title: 'Tempo Documentation',
      description: 'Cross-platform clients and self-hosted sync for Tempo',
      themeConfig: {
        ...sharedTheme,
        siteTitle: 'Tempo Docs',
        nav: [
          { text: 'Configure', link: '/en/CONFIGURATION' },
          { text: 'Deploy', link: '/en/DEPLOYMENT' },
          { text: 'Download', link: downloads }
        ],
        sidebar: [
          {
            text: 'Get started',
            items: [
              { text: 'Overview', link: '/en/' },
              { text: 'Configuration', link: '/en/CONFIGURATION' },
              { text: 'Self-hosted sync', link: '/en/DEPLOYMENT' }
            ]
          }
        ],
        outline: { level: 2, label: 'On this page' },
        lastUpdated: { text: 'Last updated' },
        docFooter: { prev: 'Previous', next: 'Next' },
        footer: {
          message: 'Personal, local-first, self-hosted sync',
          copyright: 'Tempo'
        }
      }
    }
  }
})
