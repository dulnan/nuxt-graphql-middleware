// .vitepress/theme/index.js
import DefaultTheme from 'vitepress/theme'
import { VPHomeHero } from 'vitepress/theme'
import { h } from 'vue'
import './custom.css'
import HeroIllustration from './components/HeroIllustration.vue'

export default {
  ...DefaultTheme,
  enhanceApp({ app }) {},
  // Layout() {
  //   return h(DefaultTheme.Layout, null, {
  //     'home-hero-after': () => h(HeroIllustration),
  //   })
  // },
}
