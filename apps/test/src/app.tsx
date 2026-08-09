/* @refresh reload */
import { Layout } from './Layout'
import { Router } from './router'

export default () => <Router>{(props) => <Layout>{props.children}</Layout>}</Router>
