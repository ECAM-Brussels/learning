import pytest

x2 = ["Power", "x", 2]
square = ["Power", ["Add", "x", 1], 2]
expanded_square = ["Add", ["Power", "x", 2], ["Multiply", 2, "x"], 1]
i = "ImaginaryUnit"


def ok(response):
    assert response.status_code == 200, response.text
    return response.json()


def error(response) -> str:
    assert response.status_code == 422, response.text
    return str(response.json()["detail"])


class TestEqual:
    @pytest.mark.parametrize(
        "expr1, expr2",
        [
            (square, expanded_square),
            (
                ["Multiply", ["Subtract", "x", 2], ["Subtract", "x", 3]],
                ["Add", x2, ["Multiply", -5, "x"], 6],
            ),
            (["Add", ["Power", ["Sin", "x"], 2], ["Power", ["Cos", "x"], 2]], 1),
            (["Add", 0.1, 0.2], 0.3),
            (["Power", i, 2], -1),
            (
                ["Add", ["Cos", "x"], ["Multiply", i, ["Sin", "x"]]],
                ["Power", "ExponentialE", ["Multiply", i, "x"]],
            ),
            (
                ["Complex", 1, 1],
                [
                    "Multiply",
                    ["Sqrt", 2],
                    ["Power", "ExponentialE", ["Multiply", i, ["Divide", "Pi", 4]]],
                ],
            ),
            (["Sqrt", x2], ["Abs", "x"]),
            (["Divide", ["Subtract", x2, 1], ["Subtract", "x", 1]], ["Add", "x", 1]),
            (["Derivative", x2, "x"], ["Multiply", 2, "x"]),
            (["Integrate", "x", ["Tuple", "x", 0, 1]], ["Rational", 1, 2]),
            (["Ln", ["Power", "ExponentialE", 2]], 2),
        ],
    )
    def test_equal(self, post, expr1, expr2):
        assert ok(post("/expr/equal", expr1=expr1, expr2=expr2)) is True

    @pytest.mark.parametrize(
        "expr1, expr2",
        [
            (square, ["Add", x2, 1]),
            (["Rational", 1, 3], {"num": "0.333"}),
            (["Sqrt", x2], "x"),
            (["Ln", ["Multiply", "x", "y"]], ["Add", ["Ln", "x"], ["Ln", "y"]]),
            ("x", "y"),
            (["Abs", -5], -5),
        ],
    )
    def test_not_equal(self, post, expr1, expr2):
        assert ok(post("/expr/equal", expr1=expr1, expr2=expr2)) is False

    @pytest.mark.parametrize(
        "expr1, expr2",
        [(["Equal", "x", 2], ["Equal", 2, "x"]), ("x", ["Less", "x", 1])],
    )
    def test_relations_must_use_equivalent(self, post, expr1, expr2):
        assert "use equivalent" in error(post("/expr/equal", expr1=expr1, expr2=expr2))


class TestCompare:
    @pytest.mark.parametrize(
        "expr1, comparison, expr2, expected",
        [
            (3, "gt", 2, True),
            (3, "gt", 3, False),
            (3, "geq", 3, True),
            (2, "lt", 3, True),
            (3, "lt", 2, False),
            (2, "leq", 2, True),
            (x2, "geq", 0, True),
            (x2, "lt", 0, False),
            (["Power", "ExponentialE", "x"], "gt", 0, True),
            ("Pi", "gt", 3, True),
            (["Sqrt", 2], "lt", {"num": "1.5"}, True),
        ],
    )
    def test_decided(self, post, expr1, comparison, expr2, expected):
        body = dict(expr1=expr1, expr2=expr2, comparison=comparison)
        assert ok(post("/expr/compare", **body)) is expected

    @pytest.mark.parametrize("comparison", ["gt", "lt", "geq", "leq"])
    def test_undecidable(self, post, comparison):
        assert (
            ok(post("/expr/compare", expr1="x", expr2=0, comparison=comparison)) is None
        )

    def test_unknown_comparison(self, post):
        response = post("/expr/compare", expr1=1, expr2=2, comparison="eq")
        assert response.status_code == 422


class TestDegree:
    @pytest.mark.parametrize(
        "expr, x, degree",
        [
            (0, "x", None),
            (["Subtract", x2, x2], "x", None),
            (5, "x", 0),
            ("y", "x", 0),
            (["Add", ["Power", "x", 3], "x"], "x", 3),
            (square, "x", 2),
            (["Multiply", x2, ["Power", "y", 3]], "x", 2),
            (["Multiply", x2, ["Power", "y", 3]], "y", 3),
        ],
    )
    def test_degree(self, post, expr, x, degree):
        assert ok(post("/expr/degree", expr=expr, x=x)) == degree

    def test_in_x_by_default(self, post):
        assert ok(post("/expr/degree", expr=["Power", "x", 4])) == 4

    @pytest.mark.parametrize(
        "expr", [["Divide", 1, "x"], ["Sin", "x"], ["Sqrt", "x"], ["Power", 2, "x"]]
    )
    def test_not_a_polynomial(self, post, expr):
        assert "is not a polynomial in x" in error(post("/expr/degree", expr=expr))


class TestSets:
    @pytest.mark.parametrize(
        "expr1, expr2, expected",
        [
            (["Set", 1, 2], ["Set", 2, 1], True),
            (["Set", 1, 2], ["Set", 1, 3], False),
            (["Set", 1, 1, 2], ["Set", 1, 2], True),
            (["Interval", 0, 1], ["Interval", 0, 1], True),
            (["Interval", ["Open", 0], 1], ["Interval", 0, 1], False),
            ("EmptySet", ["Set"], True),
            (
                ["Solve", ["Subtract", x2, 4], "x"],
                ["Set", -2, 2],
                True,
            ),
            (
                ["Solve", ["Subtract", ["Power", "x", 3], 1], "x"],
                ["Set", 1],
                True,
            ),
            (
                ["Solve", ["Add", x2, 1], "x", "ComplexNumbers"],
                ["Set", i, ["Negate", i]],
                True,
            ),
            (["Intersect", ["Set", 1, 2], ["Set", 2, 3]], ["Set", 2], True),
        ],
    )
    def test_set_equal(self, post, expr1, expr2, expected):
        assert ok(post("/expr/setEqual", expr1=expr1, expr2=expr2)) is expected

    @pytest.mark.parametrize(
        "expr1, expr2, expected",
        [
            (["Set", 1], ["Set", 1, 2], True),
            (["Set", 3], ["Set", 1, 2], False),
            (["Set", 1, 2], ["Set", 1, 2], True),
            (["Interval", 0, 1], "RealNumbers", True),
            (["Set", ["Rational", 1, 2]], "Integers", False),
            ("EmptySet", ["Set", 1], True),
        ],
    )
    def test_subset(self, post, expr1, expr2, expected):
        assert ok(post("/expr/subset", expr1=expr1, expr2=expr2)) is expected


class TestEquivalent:
    @pytest.mark.parametrize(
        "expr1, expr2, expected",
        [
            (["Equal", "x", 2], ["Equal", ["Multiply", 2, "x"], 4], True),
            (["Equal", "x", 2], ["Equal", 2, "x"], True),
            (["Equal", "x", 2], ["Equal", "x", 3], False),
            (["Equal", x2, 1], ["Equal", "x", 1], False),
            (["Equal", 1, 1], ["Equal", 2, 2], True),
            (
                ["Equal", "y", ["Add", "x", 1]],
                ["Equal", ["Subtract", "y", "x"], 1],
                True,
            ),
        ],
    )
    def test_equivalent(self, post, expr1, expr2, expected):
        assert ok(post("/expr/equivalent", expr1=expr1, expr2=expr2)) is expected

    def test_the_first_must_be_an_equation(self, post):
        detail = error(post("/expr/equivalent", expr1="x", expr2=["Equal", "x", 1]))
        assert "expr1 must be an equation" in detail

    def test_the_second_must_be_an_equation(self, post):
        detail = error(post("/expr/equivalent", expr1=["Equal", "x", 1], expr2="x"))
        assert "expr2 must be an equation" in detail


class TestInSet:
    @pytest.mark.parametrize(
        "expr, set_, expected",
        [
            (2, "PositiveIntegers", True),
            (0, "NonNegativeIntegers", True),
            (0, "PositiveIntegers", False),
            (-2, "NonNegativeIntegers", False),
            (-2, "Integers", True),
            (["Rational", 1, 2], "Integers", False),
            (["Rational", 1, 2], "RationalNumbers", True),
            ("Pi", "RationalNumbers", False),
            (i, "RealNumbers", False),
            (i, "ComplexNumbers", True),
            ("x", "RealNumbers", True),
            (["Rational", 1, 2], ["Interval", 0, 1], True),
            (0, ["Interval", 0, ["Open", 1]], True),
            (1, ["Interval", 0, ["Open", 1]], False),
            (0, ["Interval", ["Open", 0], ["Open", 1]], False),
            (3, ["Set", 1, 2], False),
            (2, ["Set", 1, 2], True),
        ],
    )
    def test_decided(self, post, expr, set_, expected):
        assert ok(post("/expr/inSet", expr1=expr, expr2=set_)) is expected

    @pytest.mark.parametrize("set_", ["RationalNumbers", "Integers", ["Set", 1, 2]])
    def test_undecidable(self, post, set_):
        assert ok(post("/expr/inSet", expr1="x", expr2=set_)) is None

    def test_the_second_must_be_a_set(self, post):
        assert "is not a set" in error(post("/expr/inSet", expr1=1, expr2="x"))


class TestIsExpanded:
    @pytest.mark.parametrize(
        "expr, expected",
        [
            (expanded_square, True),
            (square, False),
            (["Multiply", "x", ["Add", "x", 1]], False),
            (["Multiply", 3, x2], True),
            (5, True),
            ("x", True),
            (["Add", ["Add", "x", 1], x2], True),
            (["Add", x2, ["Multiply", 2, ["Add", "x", 1]]], False),
            (["Subtract", x2, 1], True),
        ],
    )
    def test_is_expanded(self, post, expr, expected):
        assert ok(post("/expr/isExpanded", expr=expr)) is expected


class TestIsFactored:
    @pytest.mark.parametrize(
        "expr, expected",
        [
            (["Multiply", ["Subtract", "x", 1], ["Add", "x", 1]], True),
            (["Subtract", x2, 1], False),
            (["Multiply", 2, ["Add", "x", 1]], True),
            (["Add", ["Multiply", 2, "x"], 2], False),
            (square, True),
            (expanded_square, False),
            (["Add", x2, 1], True),
            ("x", True),
            (5, True),
            (["Multiply", "x", ["Subtract", x2, 1]], False),
        ],
    )
    def test_is_factored(self, post, expr, expected):
        assert ok(post("/expr/isFactored", expr=expr)) is expected


class TestIsPartialFractionDecomposition:
    @pytest.mark.parametrize(
        "expr, expected",
        [
            (
                [
                    "Add",
                    ["Divide", 1, ["Subtract", "x", 1]],
                    ["Divide", 1, ["Add", "x", 1]],
                ],
                True,
            ),
            (["Divide", 1, ["Subtract", x2, 1]], False),
            (["Divide", "x", ["Add", "x", 1]], False),
            (["Divide", 1, ["Power", ["Subtract", "x", 1], 2]], True),
            (["Divide", 3, ["Subtract", "x", 2]], True),
        ],
    )
    def test_is_partial_fraction_decomposition(self, post, expr, expected):
        assert ok(post("/expr/isPartialFractionDecomposition", expr=expr)) is expected


class TestIsTrue:
    @pytest.mark.parametrize(
        "expr, expected",
        [
            (["Equal", ["Add", 2, 2], 4], True),
            (["Equal", ["Add", 2, 2], 5], False),
            (["Less", 1, 2], True),
            (["LessEqual", 2, 1], False),
            (["NotEqual", 1, 2], True),
            (["GreaterEqual", x2, 0], True),
            (["Equal", "x", 2], False),
        ],
    )
    def test_is_true(self, post, expr, expected):
        assert ok(post("/expr/isTrue", expr=expr)) is expected


class TestMatch:
    @pytest.mark.parametrize(
        "expr, pattern, expected",
        [
            (expanded_square, ["Power", ["Add", "a", "b"], 2], True),
            (["Subtract", x2, 4], ["Power", ["Add", "a", "b"], 2], False),
            (
                ["Subtract", x2, 4],
                ["Multiply", ["Add", "a", "b"], ["Subtract", "a", "b"]],
                True,
            ),
        ],
    )
    def test_match(self, post, expr, pattern, expected):
        assert ok(post("/expr/match", expr1=expr, expr2=pattern)) is expected


class TestLatex:
    @pytest.mark.parametrize(
        "expr, latex",
        [
            (["Derivative", ["Sin", "x"], "x"], "\\cos{\\left(x \\right)}"),
            (["Expand", square], "x^{2} + 2 x + 1"),
            (
                ["Factor", ["Add", x2, ["Multiply", -5, "x"], 6]],
                "\\left(x - 3\\right) \\left(x - 2\\right)",
            ),
            (["Simplify", ["Add", "x", "x"]], "2 x"),
            (["Rational", 1, 2], "\\frac{1}{2}"),
            ("Pi", "\\pi"),
        ],
    )
    def test_latex(self, post, expr, latex):
        assert ok(post("/expr/latex", expr=expr)) == latex


class TestApply:
    def test_gives_latex_and_mathjson(self, post):
        assert ok(post("/expr/apply", expr=["Derivative", ["Power", "x", 3], "x"])) == {
            "latex": "3 x^{2}",
            "json": ["Multiply", 3, ["Power", "x", 2]],
        }

    def test_gives_only_latex_without_mathjson(self, post):
        result = ok(post("/expr/apply", expr=["Integrate", ["Power", "x", "x"], "x"]))
        assert result == {"latex": "\\int x^{x}\\, dx", "json": None}


class TestRoots:
    @pytest.mark.parametrize(
        "expr, complex_, roots",
        [
            (["Subtract", x2, 1], False, ["-1", "1"]),
            (["Subtract", x2, 2], False, ["- \\sqrt{2}", "\\sqrt{2}"]),
            (["Power", ["Subtract", "x", 1], 2], False, ["1"]),
            (["Add", x2, 1], False, []),
            (["Add", x2, 1], True, ["- i", "i"]),
            (["Add", ["Power", "x", 3], 1], False, ["-1"]),
            (["Equal", x2, 4], False, ["-2", "2"]),
            (5, False, []),
        ],
    )
    def test_roots(self, post, expr, complex_, roots):
        assert sorted(ok(post("/expr/roots", expr=expr, complex=complex_))) == sorted(
            roots
        )

    def test_x3_plus_1_has_three_complex_roots(self, post):
        assert (
            len(
                ok(
                    post(
                        "/expr/roots", expr=["Add", ["Power", "x", 3], 1], complex=True
                    )
                )
            )
            == 3
        )

    def test_real_by_default(self, post):
        assert ok(post("/expr/roots", expr=["Add", x2, 1])) == []

    @pytest.mark.parametrize("expr", [0, ["Sin", "x"]])
    def test_infinitely_many_roots(self, post, expr):
        assert "Cannot list the roots" in error(post("/expr/roots", expr=expr))


class TestCommonRoots:
    @pytest.mark.parametrize(
        "expr1, expr2, roots",
        [
            (
                ["Multiply", ["Subtract", "x", 1], ["Subtract", "x", 2]],
                ["Multiply", ["Subtract", "x", 2], ["Subtract", "x", 3]],
                ["2"],
            ),
            (["Subtract", "x", 1], ["Subtract", "x", 2], []),
            (["Subtract", x2, 1], ["Subtract", x2, 1], ["-1", "1"]),
        ],
    )
    def test_common_roots(self, post, expr1, expr2, roots):
        assert sorted(
            ok(post("/expr/commonRoots", expr1=expr1, expr2=expr2))
        ) == sorted(roots)


class TestValidation:
    def test_unsupported_functions_are_reported_by_name(self, post):
        response = post("/expr/latex", expr=["Floor", "x"])
        assert response.status_code == 422
        assert "Unsupported MathJSON function: 'Floor'" in response.text

    def test_missing_fields(self, post):
        assert post("/expr/equal", expr1="x").status_code == 422

    def test_invalid_numbers(self, post):
        response = post("/expr/latex", expr={"num": "abc"})
        assert response.status_code == 422
        assert "Invalid MathJSON number" in response.text

    def test_value_errors_become_422_with_their_message(self, post):
        response = post("/expr/degree", expr=["Sin", "x"])
        assert response.status_code == 422
        assert response.json() == {"detail": "sin(x) is not a polynomial in x"}

    def test_cors_allows_the_app(self, client):
        response = client.options(
            "/expr/latex",
            headers={
                "Origin": "http://localhost:3000",
                "Access-Control-Request-Method": "POST",
            },
        )
        assert (
            response.headers["access-control-allow-origin"] == "http://localhost:3000"
        )


class TestKnownBugs:
    @pytest.mark.xfail(
        strict=True, reason="equivalent never treats 0 = 0 as always true"
    )
    def test_an_impossible_equation_is_not_equivalent_to_an_identity(self, post):
        body = dict(expr1=["Equal", 0, 1], expr2=["Equal", "x", "x"])
        assert ok(post("/expr/equivalent", **body)) is False

    @pytest.mark.xfail(
        strict=True,
        reason="PositiveInfinity, as Compute Engine writes ∞, is parsed as a symbol",
    )
    def test_infinity_is_not_a_real_number(self, post):
        assert (
            ok(post("/expr/inSet", expr1="PositiveInfinity", expr2="RealNumbers"))
            is False
        )

    @pytest.mark.xfail(
        strict=True,
        reason="PositiveInfinity, as Compute Engine writes ∞, is parsed as a symbol",
    )
    def test_a_half_line_is_an_unbounded_interval(self, post):
        half_line = ["Interval", 0, ["Open", "PositiveInfinity"]]
        assert ok(post("/expr/subset", expr1=["Set", 10**9], expr2=half_line)) is True
