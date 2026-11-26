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
