import pydantic
import fastapi
import sympy
from typing import cast, Optional
from mathjson import Expression

router = fastapi.APIRouter(prefix="/expr")


class OneExpression(pydantic.BaseModel):
    expr: Expression


class TwoExpressions(pydantic.BaseModel):
    expr1: Expression
    expr2: Expression


def args(expr: sympy.Expr) -> list[sympy.Expr]:
    return cast(list[sympy.Expr], expr.args)


def flatten(expr: sympy.Expr, op=sympy.Mul) -> sympy.Expr:
    if expr.func != op:
        return expr
    terms: list[sympy.Expr] = []
    for term in args(expr):
        if term.func == op:
            terms += args(flatten(term, op))
        else:
            terms.append(term)
    return op(*terms, evaluate=False)


@router.post("/commonRoots")
def common_roots(input: TwoExpressions) -> list[str]:
    expr = sympy.solveset(input.expr1.expr).intersect(sympy.solveset(input.expr2.expr))
    return [sympy.latex(e) for e in expr]


@router.post("/degree")
def degree(input: OneExpression) -> int:
    return sympy.degree(input.expr.expr)


@router.post("/equal")
def equal(input: TwoExpressions) -> bool:
    expr = input.expr1.expr - input.expr2.expr
    if expr.is_complex:
        expr = sympy.expand_complex(expr)
    return sympy.simplify(expr) == 0


@router.post("/equivalent")
def equivalent(input: TwoExpressions) -> bool:
    eq1, eq2 = input.expr1.expr, input.expr2.expr
    if not isinstance(eq1, sympy.Eq):
        raise ValueError("expr1 must be an equation")
    if not isinstance(eq2, sympy.Eq):
        raise ValueError("expr2 must be an equation")
    eq1 = sympy.simplify(eq1.lhs - eq1.rhs)
    eq2 = sympy.simplify(eq2.lhs - eq2.rhs)
    if eq1 == True and eq2 == True:
        return True
    quotient = sympy.simplify(eq1 / eq2)
    return quotient.is_constant() and quotient != 0


@router.post("/isFactored")
def is_factored(input: OneExpression) -> bool:
    expr = input.expr.expr
    if expr.func != sympy.Mul:
        expr = sympy.Mul(1, expr, evaluate=False)
    expr = flatten(expr)
    for term in args(expr):
        if sympy.factor(term).func == sympy.Mul:
            if not (args(sympy.factor(term))[0] ** (-1)).is_integer:
                return False
        if term.func != sympy.Pow and sympy.factor(term).func == sympy.Pow:
            return False
    return True


@router.post("/isPartialFractionDecomposition")
def is_partial_fraction_decomposition(input: OneExpression) -> bool:
    expr = input.expr.expr

    def check_term(term: sympy.Expr) -> bool:
        num, den = sympy.fraction(term)
        if sympy.degree(num) >= sympy.degree(den):
            return False
        return len(set(sympy.real_roots(den))) < 2

    if expr.func == sympy.Add:
        checks = [check_term(term) for term in args(expr)]
        return all(checks)
    return check_term(expr)


@router.post("/isTrue")
def is_true(input: OneExpression) -> bool:
    return sympy.simplify(input.expr.expr) == True


@router.post("/match")
def match(input: TwoExpressions) -> bool:
    expr, pattern = sympy.expand(input.expr1.expr), input.expr2.expr
    subs = {
        s: sympy.Wild(s.name, properties=[lambda e: e.is_polynomial()])
        for s in pattern.free_symbols
    }
    pattern = sympy.expand(pattern.subs(subs))
    return expr.match(pattern) is not None


@router.post("/latex")
def latex(input: OneExpression) -> str:
    return sympy.latex(input.expr.expr)


class RootsInput(OneExpression):
    complex: Optional[bool] = False


@router.post("/roots")
def roots(input: RootsInput) -> list[str]:
    domain = sympy.S.Complexes if input.complex else sympy.S.Reals
    expr = sympy.solveset(input.expr.expr, domain=domain)
    return [sympy.latex(e) for e in expr]
