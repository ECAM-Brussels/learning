import symapi from './symapi'

export function substance(formula: string) {
  return {
    latex: () => symapi.chemistry.latex({ substance: formula }),
    molarMass: () => symapi.chemistry.mass({ substance: formula }),
  }
}
