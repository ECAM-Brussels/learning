import { PythonCode } from '@learning/exercises/python/Code'

export const Square = () => (
  <PythonCode
    id="demo-carre"
    prompt={
      <p>
        Définissez une fonction <code>carre</code> qui renvoie le carré d'un nombre.
      </p>
    }
    initialCode={'def carre(x):\n    '}
    tests={(expect) => ({
      'carre(3) vaut 9': expect.with('carre(3)').toReturn(9),
      'carre(-2) vaut 4': expect.with('carre(-2)').toReturn(4),
      'carre(0.5) vaut 0.25': expect.with('carre(0.5)').toReturn(0.25),
    })}
  />
)

export const Greeting = () => (
  <PythonCode
    id="demo-bonjour"
    prompt={
      <p>
        Écrivez un programme qui demande un nom avec <code>input</code>, puis affiche{' '}
        <code>Bonjour</code> suivi de ce nom.
      </p>
    }
    initialCode={'nom = input("Votre nom ? ")\n'}
    tests={(expect) => ({
      'Bonjour Alice': expect.withInput('Alice').toShow('Bonjour Alice'),
      'Bonjour Bob': expect.withInput('Bob').toShow('Bonjour Bob'),
    })}
  />
)
