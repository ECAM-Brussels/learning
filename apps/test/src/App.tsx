import { render } from '@solidjs/web'
import { Layout } from './Layout'
import { Router } from './router'
import './style.css'

const App = () => <Router children={Layout} />

render(App, document.getElementById('root')!)
