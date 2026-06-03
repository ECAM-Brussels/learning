import chempy
import fastapi
import pydantic
import re

router = fastapi.APIRouter(prefix="/chemistry")


class Substance(pydantic.RootModel):
    root: str

    @property
    def substance(self) -> chempy.Substance:
        return chempy.Substance.from_formula(self.root)


class OneSubstance(pydantic.BaseModel):
    substance: Substance


@router.post("/mass")
def mass(input: OneSubstance) -> float:
    return input.substance.substance.mass


@router.post("/latex")
def latex(input: OneSubstance) -> str:
    return re.sub(
        r"([A-Z][a-z]?)", r"\\mathrm{\1}", input.substance.substance.latex_name
    )
