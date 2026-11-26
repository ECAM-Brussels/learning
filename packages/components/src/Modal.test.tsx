import { fireEvent, render, screen } from '@solidjs/testing-library'
import { describe, expect, test } from 'bun:test'
import { flush, onCleanup } from 'solid-js'
import { Modal } from './Modal'

function Content(props: { log: string[] }) {
  props.log.push('mounted')
  onCleanup(() => props.log.push('cleaned up'))
  return <p>Contenu</p>
}

const openModal = () => {
  fireEvent.click(screen.getByRole('button', { name: 'Ouvrir' }))
  flush()
}

describe('Modal', () => {
  test('mounts its content only while open', () => {
    const log: string[] = []
    render(() => (
      <Modal trigger="Ouvrir" title="Titre">
        <Content log={log} />
      </Modal>
    ))
    expect(screen.queryByText('Contenu')).toBeNull()
    expect(log).toEqual([])
    openModal()
    expect(screen.getByRole('dialog')).toHaveAttribute('open')
    expect(screen.getByRole('heading', { name: 'Titre' })).toBeInTheDocument()
    expect(screen.getByText('Contenu')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Fermer' }))
    flush()
    expect(screen.queryByText('Contenu')).toBeNull()
    expect(log).toEqual(['mounted', 'cleaned up'])
  })

  test('mounts its content afresh on each opening', () => {
    const log: string[] = []
    render(() => (
      <Modal trigger="Ouvrir" title="Titre">
        <Content log={log} />
      </Modal>
    ))
    openModal()
    fireEvent.click(screen.getByRole('button', { name: 'Fermer' }))
    flush()
    openModal()
    expect(log).toEqual(['mounted', 'cleaned up', 'mounted'])
  })

  test('closes when clicking outside its content', () => {
    render(() => (
      <Modal trigger="Ouvrir" title="Titre">
        <p>Contenu</p>
      </Modal>
    ))
    openModal()
    fireEvent.click(screen.getByText('Contenu'))
    flush()
    expect(screen.getByRole('dialog')).toHaveAttribute('open')
    fireEvent.click(screen.getByRole('dialog'))
    flush()
    expect(screen.queryByText('Contenu')).toBeNull()
  })

  test('takes the width and trigger classes it is given', () => {
    render(() => (
      <Modal trigger="Ouvrir" title="Titre" width="max-w-4xl" triggerClass="link">
        <p>Contenu</p>
      </Modal>
    ))
    expect(screen.getByRole('button', { name: 'Ouvrir' }).className).toBe('link')
    const dialog = screen.getByRole('dialog', { hidden: true })
    expect(dialog.className).toContain('max-w-4xl')
    expect(dialog.className).not.toContain('max-w-2xl')
  })
})
