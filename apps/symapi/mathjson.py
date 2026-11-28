import pydantic
import sympy
from typing import cast


class Num(pydantic.BaseModel):
    num: str


type MathJSON = str | int | float | list["MathJSON"] | Num


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
            # Sets
            case "EmptySet":
                return cast(sympy.Expr, sympy.S.EmptySet)
            case "ComplexNumbers":
                return cast(sympy.Expr, sympy.S.Complexes)
            case "RealNumbers":
                return cast(sympy.Expr, sympy.S.Reals)
            case "RationalNumbers":
                return cast(sympy.Expr, sympy.S.Rationals)
            case "Integers":
                return cast(sympy.Expr, sympy.S.Integers)
            case "NonNegativeIntegers":
                return cast(sympy.Expr, sympy.S.Naturals0)
            case "PositiveIntegers":
                return cast(sympy.Expr, sympy.S.Naturals)
            case _:
                return sympy.Symbol(expr, real=True)
    if isinstance(expr, list):
        if expr and expr[0] == "Interval":
            return parse_interval(expr[1:])
        args = [parse_expr(e) for e in expr[1:]]
        match expr[0]:
            # Operations
            case "Abs":
                return sympy.Abs(*args, evaluate=False)
            case "Add":
                return sympy.Add(*args, evaluate=False)
            case "Argument":
                return sympy.arg(*args)
            case "Complex":
                return sympy.Add(args[0], args[1] * sympy.I, evaluate=False)
            case "Conjugate":
                return sympy.conjugate(*args)
            case "Divide":
                if len(args) != 2:
                    raise ValueError("Divide expects exactly 2 arguments")
                return sympy.Mul(
                    args[0], sympy.Pow(args[1], -1, evaluate=False), evaluate=False
                )
            case "Derivative":
                return sympy.diff(*args)
            case "Delimiter":
                return args[0]
            case "Subs":
                if isinstance(args[1], sympy.Tuple):
                    return args[0].subs(dict(zip(args[1], args[2])), simultaneous=True)
                return args[0].subs(args[1], args[2])
            case "Equal":
                return cast(sympy.Expr, sympy.Eq(*args, evaluate=False))
            case "NotEqual":
                return cast(sympy.Expr, sympy.Ne(*args, evaluate=False))
            case "Less":
                return cast(sympy.Expr, sympy.Lt(*args, evaluate=False))
            case "LessEqual":
                return cast(sympy.Expr, sympy.Le(*args, evaluate=False))
            case "Greater":
                return cast(sympy.Expr, sympy.Gt(*args, evaluate=False))
            case "GreaterEqual":
                return cast(sympy.Expr, sympy.Ge(*args, evaluate=False))
            case "Expand":
                return sympy.expand(args[0])
            case "Factor":
                return sympy.factor(args[0])
            case "Imaginary":
                return sympy.im(args[0])
            case "Integrate":
                return sympy.integrate(*args)
            case "Intersect":
                return sympy.Intersection(*args)
            case "InvisibleOperator":
                return sympy.Mul(*args, evaluate=False)
            case "Multiply":
                return sympy.Mul(*args, evaluate=False)
            case "Mod":
                return sympy.Mod(*args, evaluate=False)
            case "Negate":
                return -args[0]
            case "Normal":
                return args[0].removeO()
            case "Power":
                return sympy.Pow(*args, evaluate=False)
            case "Root":
                return sympy.root(*args)
            case "Factorial":
                return sympy.factorial(*args)
            case "Rational":
                return sympy.Rational(*args)
            case "Real":
                return sympy.re(args[0])
            case "Series":
                args[3] = args[3] + 1
                return sympy.series(*args)
            case "Set":
                return sympy.FiniteSet(*args)
            case "Simplify":
                return sympy.simplify(args[0])
            case "Solve":
                domain = args[2] if len(args) > 2 else sympy.S.Reals
                return cast(sympy.Expr, sympy.solveset(args[0], args[1], domain))
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
            case "Ln":
                return sympy.log(*args, evaluate=False)
            case "Log":
                base = args[1] if len(args) > 1 else sympy.Integer(10)
                return sympy.log(args[0], base)
            case "Lb":
                return sympy.log(args[0], 2)
            case "Sec":
                return sympy.sec(*args, evaluate=False)
            case "Csc":
                return sympy.csc(*args, evaluate=False)
            case "Cot":
                return sympy.cot(*args, evaluate=False)
            case "Arcsin":
                return sympy.asin(*args, evaluate=False)
            case "Arccos":
                return sympy.acos(*args, evaluate=False)
            case "Arctan":
                return sympy.atan(*args, evaluate=False)
            case "Sinh":
                return sympy.sinh(*args, evaluate=False)
            case "Cosh":
                return sympy.cosh(*args, evaluate=False)
            case "Tanh":
                return sympy.tanh(*args, evaluate=False)
            case "Sin":
                return sympy.sin(*args, evaluate=False)
            case "Tan":
                return sympy.tan(*args, evaluate=False)
            case head:
                raise ValueError(f"Unsupported MathJSON function: {head!r}")
    if isinstance(expr, Num):
        try:
            return sympy.Rational(expr.num)
        except:
            raise ValueError(f"Invalid MathJSON number: {expr.num!r}")
    raise ValueError("Not a valid expression")


def parse_interval(bounds: list[MathJSON]) -> sympy.Expr:
    if len(bounds) != 2:
        raise ValueError("Interval expects exactly 2 bounds")

    def bound(b: MathJSON) -> tuple[sympy.Expr, bool]:
        if isinstance(b, list) and len(b) == 2 and b[0] == "Open":
            return parse_expr(b[1]), True
        if isinstance(b, list) and len(b) == 2 and b[0] == "Closed":
            return parse_expr(b[1]), False
        return parse_expr(b), False

    (a, left_open), (b, right_open) = bound(bounds[0]), bound(bounds[1])
    return cast(sympy.Expr, sympy.Interval(a, b, left_open, right_open))


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


FUNCTIONS: dict[type, str] = {
    sympy.Abs: "Abs",
    sympy.arg: "Argument",
    sympy.conjugate: "Conjugate",
    sympy.re: "Real",
    sympy.im: "Imaginary",
    sympy.factorial: "Factorial",
    sympy.floor: "Floor",
    sympy.ceiling: "Ceil",
    sympy.sign: "Sign",
    sympy.Mod: "Mod",
    sympy.log: "Ln",
    sympy.sin: "Sin",
    sympy.cos: "Cos",
    sympy.tan: "Tan",
    sympy.sec: "Sec",
    sympy.csc: "Csc",
    sympy.cot: "Cot",
    sympy.asin: "Arcsin",
    sympy.acos: "Arccos",
    sympy.atan: "Arctan",
    sympy.sinh: "Sinh",
    sympy.cosh: "Cosh",
    sympy.tanh: "Tanh",
    sympy.Eq: "Equal",
    sympy.Ne: "NotEqual",
    sympy.Lt: "Less",
    sympy.Le: "LessEqual",
    sympy.Gt: "Greater",
    sympy.Ge: "GreaterEqual",
    sympy.FiniteSet: "Set",
    sympy.Tuple: "Tuple",
    sympy.Union: "Union",
    sympy.Intersection: "Intersect",
}

CONSTANTS: dict[sympy.Basic, str] = {
    sympy.E: "ExponentialE",
    sympy.I: "ImaginaryUnit",
    sympy.pi: "Pi",
    sympy.oo: "PositiveInfinity",
    -sympy.oo: "NegativeInfinity",
    sympy.zoo: "ComplexInfinity",
    sympy.nan: "NaN",
    sympy.true: "True",
    sympy.false: "False",
    sympy.S.EmptySet: "EmptySet",
    sympy.S.Complexes: "ComplexNumbers",
    sympy.S.Reals: "RealNumbers",
    sympy.S.Rationals: "RationalNumbers",
    sympy.S.Integers: "Integers",
    sympy.S.Naturals0: "NonNegativeIntegers",
    sympy.S.Naturals: "PositiveIntegers",
}

# Larger integers would lose digits as JavaScript numbers.
MAX_SAFE_INTEGER = 2**53 - 1


def to_mathjson(expr: sympy.Basic) -> MathJSON:
    """
    The inverse of parse_expr, for the results of computations.
    It raises ValueError for what has no MathJSON counterpart here,
    such as an integral sympy could not compute.
    """
    if expr in CONSTANTS:
        return CONSTANTS[expr]
    if isinstance(expr, sympy.Integer):
        n = int(expr)
        return n if abs(n) <= MAX_SAFE_INTEGER else Num(num=str(n))
    if isinstance(expr, sympy.Rational):
        return [
            "Rational",
            to_mathjson(sympy.Integer(expr.p)),
            to_mathjson(sympy.Integer(expr.q)),
        ]
    if isinstance(expr, sympy.Float):
        return float(expr)
    if isinstance(expr, sympy.Symbol):
        return expr.name
    if isinstance(expr, sympy.Add):
        return ["Add", *map(to_mathjson, expr.args)]
    if isinstance(expr, sympy.Mul):
        return ["Multiply", *map(to_mathjson, expr.args)]
    if isinstance(expr, sympy.Pow):
        return ["Power", *map(to_mathjson, expr.args)]
    # Written e^x, as Compute Engine reads sympy's LaTeX for it.
    if isinstance(expr, sympy.exp):
        return ["Power", "ExponentialE", to_mathjson(expr.args[0])]
    if isinstance(expr, sympy.Interval):
        a, b = to_mathjson(expr.start), to_mathjson(expr.end)
        return [
            "Interval",
            ["Open", a] if expr.left_open else a,
            ["Open", b] if expr.right_open else b,
        ]
    for cls, head in FUNCTIONS.items():
        if isinstance(expr, cls):
            return [head, *map(to_mathjson, expr.args)]
    raise ValueError(f"No MathJSON for {type(expr).__name__}: {expr}")
