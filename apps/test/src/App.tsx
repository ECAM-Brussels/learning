import Code from '@learning/components/Code'
import Factor from '@learning/exercises/math/factor/index'
import dedent from 'dedent'
import { Loading } from 'solid-js'
import './style.css'

export default () => (
  <Loading>
    <div class="container mx-auto">
      <Code lang="python" run math>
        {dedent /* python */ `
          from sympy import *
          x = Symbol("x")
          expr = (x + 1) * (x - 2) * (x + 4)
          expand(expr)
        `}
      </Code>
      <Factor data={{ name: 'math/factor', question: { expr: '(x + 1)(x + 2)' }, attempt: [] }} />
    </div>
  </Loading>
)
