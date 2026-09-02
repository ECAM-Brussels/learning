import { enableRichArguments } from '@solidjs/web/server-functions/rich-args'
import { Layout } from './Layout'
import { Router } from './router'
import './style.css'

enableRichArguments()

export default () => <Router children={Layout} />
