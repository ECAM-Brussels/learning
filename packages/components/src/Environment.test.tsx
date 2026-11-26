import { render, screen } from '@solidjs/testing-library'
import { describe, expect, test } from 'bun:test'
import { Definition, Environment, Example, Exercise, Info, Question, Remark } from './Environment'

describe('Environment', () => {
  test.each([
    ['Definition', Definition, 'Définition', 'bg-sky-100'],
    ['Example', Example, 'Exemple', 'bg-sky-100'],
    ['Exercise', Exercise, 'Exercice', 'bg-green-100'],
    ['Remark', Remark, 'Remarque', 'bg-amber-100'],
    ['Question', Question, 'Question', 'bg-blue-100'],
    ['Info', Info, 'Info', 'bg-gray-100'],
  ] as const)('%s is labelled and coloured', (_, Box, label, colour) => {
    render(() => <Box>Contenu</Box>)
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent(new RegExp(`^${label}$`))
    expect(screen.getByRole('heading', { level: 3 })).toHaveClass(colour)
    expect(screen.getByText('Contenu')).toBeInTheDocument()
  })

  test('shows its title after the label', () => {
    render(() => (
      <Environment type="definition" title={<em>Limite</em>}>
        Contenu
      </Environment>
    ))
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Définition (Limite)')
    expect(screen.getByText('Limite').tagName).toBe('EM')
  })
})
