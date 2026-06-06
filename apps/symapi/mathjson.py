import pydantic
import sympy
from typing import cast

type MathJSON = str | int | float | list["MathJSON"]


def parse_expr(expr: MathJSON) -> sympy.Expr:
    if isinstance(expr, int):
        return sympy.Integer(expr)
    if isinstance(expr, float):
        return sympy.Rational(str(expr))
    if isinstance(expr, str):
        match expr:
            case "ExponentialE":
                return sympy.E
            case "ImaginaryUnit":
                return sympy.I
            case "Pi":
                return sympy.pi
            case _:
                return sympy.Symbol(expr)
    if isinstance(expr, list):
        args = [parse_expr(e) for e in expr[1:]]
        match expr[0]:
            # Operations
            case "Abs":
                return sympy.Abs(*args, evaluate=False)
            case "Add":
                return sympy.Add(*args, evaluate=False)
            case "Complex":
                return sympy.Add(args[0], args[1] * sympy.I, evaluate=False)
            case "Divide":
                if len(args) != 2:
                    raise ValueError("Divide expects exactly 2 arguments")
                return sympy.Mul(
                    args[0], sympy.Pow(args[1], -1, evaluate=False), evaluate=False
                )
            case "Derivative":
                return sympy.diff(*args)
            case "Equal":
                return cast(sympy.Expr, sympy.Eq(*args, evaluate=False))
            case "Expand":
                return sympy.expand(args[0])
            case "Factor":
                return sympy.factor(args[0])
            case "Integrate":
                return sympy.integrate(*args)
            case "InvisibleOperator":
                return sympy.Mul(*args, evaluate=False)
            case "Multiply":
                return sympy.Mul(*args, evaluate=False)
            case "Negate":
                return -args[0]
            case "Power":
                return sympy.Pow(*args, evaluate=False)
            case "Rational":
                return sympy.Rational(*args)
            case "Simplify":
                return sympy.simplify(args[0])
            case "Subtract":
                return sympy.Add(args[0], -args[1], evaluate=False)
            case "Sqrt":
                return sympy.sqrt(*args)
            case "Tuple":
                return cast(sympy.Expr, sympy.Tuple(*args))
            # Functions
            case "Cos":
                return sympy.cos(*args, evaluate=False)
            case "Exp":
                return sympy.exp(*args, evaluate=False)
            case "Log":
                return sympy.log(*args, evaluate=False)
            case "Sin":
                return sympy.sin(*args, evaluate=False)
            case "Tan":
                return sympy.tan(*args, evaluate=False)
    raise ValueError("Not a valid expression")


class Expression(pydantic.RootModel):
    root: MathJSON

    _expr: sympy.Expr | None = pydantic.PrivateAttr(default=None)

    @pydantic.model_validator(mode="after")
    def _parse(self):
        self._expr = parse_expr(self.root)
        return self

    @property
    def expr(self) -> sympy.Expr:
        if self._expr is None:
            raise ValueError(f"{self.root} is not a valid LaTeX expression")
        return self._expr
