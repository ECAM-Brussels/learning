import pydantic
import pytest
import sympy
from sympy import E, I, Integer, Rational, S, pi

from mathjson import Expression, Num, parse_expr

x, y = sympy.symbols("x y", real=True)


def equal(a, b) -> bool:
    return sympy.simplify(a - b) == 0


class TestNumbers:
    def test_integers(self):
        assert parse_expr(3) == Integer(3)
        assert parse_expr(-3) == Integer(-3)

    @pytest.mark.parametrize(
        "number, exact",
        [(0.5, Rational(1, 2)), (0.1, Rational(1, 10)), (2.75, Rational(11, 4))],
    )
    def test_floats_are_exact_rationals(self, number, exact):
        assert parse_expr(number) == exact

    def test_decimals_add_up_exactly(self):
        assert parse_expr(["Add", 0.1, 0.2]).doit() == Rational(3, 10)

    @pytest.mark.parametrize(
        "num, exact",
        [
            ("0.333", Rational(333, 1000)),
            ("1e3", Integer(1000)),
            ("-2.5", Rational(-5, 2)),
            ("12345678901234567890", Integer(12345678901234567890)),
        ],
    )
    def test_num_objects_are_exact(self, num, exact):
        assert parse_expr(Num(num=num)) == exact

    def test_an_invalid_num_is_reported(self):
        with pytest.raises(ValueError, match="Invalid MathJSON number: 'abc'"):
            parse_expr(Num(num="abc"))


class TestSymbols:
    @pytest.mark.parametrize(
        "name, constant", [("ExponentialE", E), ("ImaginaryUnit", I), ("Pi", pi)]
    )
    def test_constants(self, name, constant):
        assert parse_expr(name) == constant

    @pytest.mark.parametrize(
        "name, domain",
        [
            ("EmptySet", S.EmptySet),
            ("ComplexNumbers", S.Complexes),
            ("RealNumbers", S.Reals),
            ("RationalNumbers", S.Rationals),
            ("Integers", S.Integers),
            ("NonNegativeIntegers", S.Naturals0),
            ("PositiveIntegers", S.Naturals),
        ],
    )
    def test_sets(self, name, domain):
        assert parse_expr(name) == domain

    def test_other_names_are_real_symbols(self):
        symbol = parse_expr("x")
        assert symbol == x
        assert symbol.is_real

    def test_real_symbols_simplify_as_reals(self):
        assert parse_expr(["Sqrt", ["Power", "x", 2]]) == sympy.Abs(x)
        assert parse_expr(["Conjugate", "x"]) == x


class TestUnevaluated:
    """Students' answers keep their shape, so that isExpanded or isFactored can inspect it."""

    def test_add(self):
        assert parse_expr(["Add", 1, 1]).args == (1, 1)

    def test_multiply(self):
        assert parse_expr(["Multiply", "x", "x"]).args == (x, x)

    def test_invisible_operator(self):
        assert parse_expr(["InvisibleOperator", 2, "x"]).args == (2, x)

    def test_power(self):
        assert parse_expr(["Power", 2, 3]).args == (2, 3)

    def test_divide(self):
        quotient = parse_expr(["Divide", 2, 4])
        assert quotient.func == sympy.Mul
        assert quotient.doit() == Rational(1, 2)

    def test_subtract(self):
        difference = parse_expr(["Subtract", 3, 3])
        assert difference.func == sympy.Add
        assert difference.doit() == 0

    @pytest.mark.parametrize("head", ["Sin", "Cos", "Tan", "Exp", "Ln"])
    def test_functions(self, head):
        assert parse_expr([head, 0]).args == (0,)

    def test_mod(self):
        assert parse_expr(["Mod", 7, 3]).func == sympy.Mod


class TestOperations:
    @pytest.mark.parametrize(
        "json, expected",
        [
            (["Abs", -2], 2),
            (["Add", 1, 2, 3], 6),
            (["Argument", ["Complex", 1, 1]], pi / 4),
            (["Complex", 3, 4], 3 + 4 * I),
            (["Conjugate", ["Complex", 1, 2]], 1 - 2 * I),
            (["Divide", 1, 3], Rational(1, 3)),
            (["Delimiter", ["Add", 1, 1]], 2),
            (["Imaginary", ["Complex", 3, 4]], 4),
            (["Real", ["Complex", 3, 4]], 3),
            (["Multiply", 2, 3, 4], 24),
            (["Negate", 5], -5),
            (["Power", 2, 10], 1024),
            (["Root", 8, 3], 2),
            (["Sqrt", 16], 4),
            (["Factorial", 5], 120),
            (["Rational", 2, 4], Rational(1, 2)),
            (["Subtract", 10, 4], 6),
        ],
    )
    def test_arithmetic(self, json, expected):
        assert equal(parse_expr(json), expected)

    @pytest.mark.parametrize(
        "a, b, expected", [(7, 3, 1), (-7, 3, 2), (7, -3, -2), (7.5, 2, Rational(3, 2))]
    )
    def test_mod_floors_like_python(self, a, b, expected):
        assert parse_expr(["Mod", a, b]).doit() == expected

    def test_divide_needs_two_arguments(self):
        with pytest.raises(ValueError, match="Divide expects exactly 2 arguments"):
            parse_expr(["Divide", 1, 2, 3])

    @pytest.mark.parametrize(
        "json, expected",
        [
            (["Cos", 0], 1),
            (["Sin", ["Divide", "Pi", 2]], 1),
            (["Tan", ["Divide", "Pi", 4]], 1),
            (["Sec", 0], 1),
            (["Csc", ["Divide", "Pi", 2]], 1),
            (["Cot", ["Divide", "Pi", 4]], 1),
            (["Arcsin", 1], pi / 2),
            (["Arccos", 1], 0),
            (["Arctan", 1], pi / 4),
            (["Sinh", 0], 0),
            (["Cosh", 0], 1),
            (["Tanh", 0], 0),
            (["Exp", 0], 1),
            (["Ln", "ExponentialE"], 1),
            (["Log", 1000], 3),
            (["Log", 8, 2], 3),
            (["Lb", 8], 3),
        ],
    )
    def test_functions(self, json, expected):
        assert equal(parse_expr(json).doit(), expected)


class TestInstructions:
    def test_derivative(self):
        assert equal(parse_expr(["Derivative", ["Power", "x", 3], "x"]), 3 * x**2)

    def test_derivative_in_another_variable(self):
        assert parse_expr(["Derivative", ["Multiply", "x", "y"], "y"]) == x

    def test_indefinite_integral(self):
        assert equal(parse_expr(["Integrate", "x", "x"]), x**2 / 2)

    def test_definite_integral(self):
        assert parse_expr(["Integrate", "x", ["Tuple", "x", 0, 2]]) == 2

    def test_expand(self):
        assert parse_expr(["Expand", ["Power", ["Add", "x", 1], 2]]) == x**2 + 2 * x + 1

    def test_factor(self):
        assert parse_expr(["Factor", ["Subtract", ["Power", "x", 2], 1]]) == (x - 1) * (
            x + 1
        )

    def test_simplify(self):
        trig = ["Add", ["Power", ["Sin", "x"], 2], ["Power", ["Cos", "x"], 2]]
        assert parse_expr(["Simplify", trig]) == 1

    def test_subs(self):
        assert parse_expr(["Subs", ["Power", "x", 2], "x", 3]).doit() == 9

    def test_subs_into_a_derivative_keeps_the_variable_bound(self):
        derivative = ["Derivative", ["Power", "x", 2], "x"]
        assert parse_expr(["Subs", derivative, "x", 3]) == 6

    def test_several_subs_are_simultaneous(self):
        swapped = parse_expr(
            ["Subs", ["Subtract", "x", "y"], ["Tuple", "x", "y"], ["Tuple", "y", "x"]]
        )
        assert equal(swapped, y - x)

    def test_series_includes_the_requested_order(self):
        series = parse_expr(["Series", ["Exp", "x"], "x", 0, 3])
        assert series.removeO() == 1 + x + x**2 / 2 + x**3 / 6

    def test_normal_drops_the_order_term(self):
        normal = parse_expr(["Normal", ["Series", ["Exp", "x"], "x", 0, 1]])
        assert normal == 1 + x

    def test_solve_over_the_reals_by_default(self):
        assert parse_expr(["Solve", ["Add", ["Power", "x", 2], 1], "x"]) == S.EmptySet

    def test_solve_over_a_given_domain(self):
        solutions = parse_expr(
            ["Solve", ["Add", ["Power", "x", 2], 1], "x", "ComplexNumbers"]
        )
        assert solutions == sympy.FiniteSet(I, -I)


class TestRelations:
    @pytest.mark.parametrize(
        "head, relation",
        [
            ("Equal", sympy.Eq),
            ("NotEqual", sympy.Ne),
            ("Less", sympy.Lt),
            ("LessEqual", sympy.Le),
            ("Greater", sympy.Gt),
            ("GreaterEqual", sympy.Ge),
        ],
    )
    def test_relations_stay_unevaluated(self, head, relation):
        parsed = parse_expr([head, 1, 1])
        assert isinstance(parsed, relation)
        assert parsed.args == (1, 1)


class TestSets:
    def test_finite_set(self):
        assert parse_expr(["Set", 1, 2, 2]) == sympy.FiniteSet(1, 2)

    def test_intersection(self):
        assert parse_expr(
            ["Intersect", ["Set", 1, 2], ["Set", 2, 3]]
        ) == sympy.FiniteSet(2)

    def test_tuple(self):
        assert parse_expr(["Tuple", 1, "x"]) == sympy.Tuple(1, x)

    @pytest.mark.parametrize(
        "bounds, interval",
        [
            ([0, 1], sympy.Interval(0, 1)),
            ([["Open", 0], 1], sympy.Interval.Lopen(0, 1)),
            ([0, ["Open", 1]], sympy.Interval.Ropen(0, 1)),
            ([["Open", 0], ["Open", 1]], sympy.Interval.open(0, 1)),
            ([["Closed", 0], ["Closed", 1]], sympy.Interval(0, 1)),
        ],
    )
    def test_intervals(self, bounds, interval):
        assert parse_expr(["Interval", *bounds]) == interval

    def test_an_interval_needs_two_bounds(self):
        with pytest.raises(ValueError, match="Interval expects exactly 2 bounds"):
            parse_expr(["Interval", 0])


class TestErrors:
    def test_unsupported_functions_are_reported_by_name(self):
        with pytest.raises(ValueError, match="Unsupported MathJSON function: 'Floor'"):
            parse_expr(["Floor", "x"])

    def test_errors_in_arguments_are_reported(self):
        with pytest.raises(ValueError, match="'Floor'"):
            parse_expr(["Add", 1, ["Floor", "x"]])

    @pytest.mark.parametrize("value", [None, {"a": 1}])
    def test_other_values_are_not_expressions(self, value):
        with pytest.raises(ValueError, match="Not a valid expression"):
            parse_expr(value)


class TestExpressionModel:
    def test_parses_its_root(self):
        assert equal(Expression.model_validate(["Add", "x", 1]).expr, x + 1)

    def test_accepts_num_objects(self):
        assert Expression.model_validate({"num": "0.5"}).expr == Rational(1, 2)

    def test_rejects_unsupported_functions(self):
        with pytest.raises(pydantic.ValidationError, match="Floor"):
            Expression.model_validate(["Floor", "x"])

    def test_rejects_values_that_are_not_mathjson(self):
        with pytest.raises(pydantic.ValidationError):
            Expression.model_validate({"a": 1})
