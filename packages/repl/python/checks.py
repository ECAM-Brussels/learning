"""Checks of students' code, called from TypeScript as `_learning_check(json)`.

Each check returns a JSON verdict, `{"passed": bool, "message": str | None, "error": str | None}`:
`error` is the traceback of the student's code when it fails, which TypeScript shortens.
Messages are shown to students, in French.
"""

import ast as _ast
import builtins as _builtins
import contextlib as _contextlib
import io as _io
import json as _json
import math as _math
import numbers as _numbers
import sys as _sys
import traceback as _traceback

from pyodide.code import eval_code as _eval_code


class _Failed(Exception):
    """A check that fails with a message, rather than with an error of the code."""


def _numpy():
    try:
        import numpy

        return numpy
    except ImportError:
        return None


def _input_from(lines):
    """An `input` that reads `lines` in order, as a terminal would show them."""
    lines = list(lines or [])

    def read(prompt=""):
        print(prompt, end="")
        if not lines:
            raise EOFError("le programme demande plus d'entrées que celles données")
        line = lines.pop(0)
        print(line)
        return line

    return read


_MATH = ("Dual", "epsilon", "delta", "eps")


class _Run:
    """Code run in a namespace of its own: its last value, what it printed, and its names."""

    def __init__(self, source, stdin=None):
        # The dual numbers, with `math`, which code expects to find, as when run on its own.
        self.namespace = {"__name__": "__main__"}
        self.namespace.update({n: globals()[n] for n in _MATH if n in globals()})
        self.printed = _io.StringIO()
        previous = _builtins.input
        _builtins.input = _input_from(stdin)
        try:
            with _contextlib.redirect_stdout(self.printed):
                self.value = _eval_code(source, self.namespace, filename="<exec>")
        finally:
            _builtins.input = previous
        self.printed = self.printed.getvalue()


def _short(value, limit=80):
    """`repr` of a value, cut to fit in a sentence."""
    text = repr(value)
    return text if len(text) <= limit else text[: limit - 1] + "…"


def _close(a, b, error):
    """Numbers within `error`, or by default up to a relative error of 1e-9, as `math.isclose`."""
    if a == b:
        return True
    if error is None:
        return abs(a - b) <= 1e-9 * max(abs(a), abs(b))
    return abs(a - b) <= error


def _equal(a, b, error=None):
    """Whether two values are equal: numbers within `error` (by default 1e-9 relative), recursively."""
    np = _numpy()
    if np is not None and (isinstance(a, np.ndarray) or isinstance(b, np.ndarray)):
        try:
            x, y = np.asarray(a), np.asarray(b)
            if x.shape != y.shape:
                return False
            if x.dtype.kind in "biufc" and y.dtype.kind in "biufc":
                if error is None:
                    return bool(np.allclose(x, y, rtol=1e-9, atol=0, equal_nan=True))
                return bool(np.allclose(x, y, rtol=0, atol=error, equal_nan=True))
            return bool(np.array_equal(x, y))
        except (TypeError, ValueError):
            return False
    if isinstance(a, bool) or isinstance(b, bool):
        return type(a) is type(b) and a == b
    if isinstance(a, _numbers.Number) and isinstance(b, _numbers.Number):
        return _close(a, b, error)
    if isinstance(a, (list, tuple)) and isinstance(b, (list, tuple)):
        return len(a) == len(b) and all(_equal(x, y, error) for x, y in zip(a, b))
    if isinstance(a, dict) and isinstance(b, dict):
        return a.keys() == b.keys() and all(_equal(a[k], b[k], error) for k in a)
    try:
        return bool(a == b)
    except Exception:
        return False


def _scalar(value):
    np = _numpy()
    containers = (list, tuple, dict, set, frozenset)
    return not isinstance(value, containers) and not (
        np is not None and isinstance(value, np.ndarray)
    )


def _same(a, b, error=None):
    """`_equal`, or, for single values, the same text: as values were compared before."""
    return _equal(a, b, error) or (
        _scalar(a) and _scalar(b) and str(a).strip() == str(b).strip()
    )


def _verdict(passed, message=None):
    return {"passed": bool(passed), "message": None if passed else message}


def _equal_that_of(check):
    """The student's value, or for `output` also what they printed last, is the model answer's."""
    student = _Run(check["code"], check.get("stdin"))
    model = _Run(check["model"], check.get("stdin"))
    error = check.get("error")
    expected = model.value if model.value is not None else _number(model.printed.strip())
    candidates = [student.value]
    printed = student.printed.strip()
    texts = []
    if check["source"] == "output" and printed:
        texts = [printed, printed.splitlines()[-1]]
        candidates += [_number(text) for text in texts]
    if any(_same(candidate, expected, error) for candidate in candidates):
        return _verdict(True)
    # A printed array or list reads as the model answer's, as Python writes it.
    if str(expected).strip() in texts:
        return _verdict(True)
    if student.value is None and printed:
        return _verdict(
            False, f"le code affiche {printed!r} au lieu de donner sa valeur en dernière ligne"
        )
    return _verdict(False, f"le résultat est {_short(student.value)}, au lieu de {_short(expected)}")


def _number(text):
    """The number a printed text is, or the text."""
    try:
        return float(text)
    except ValueError:
        return text


def _evaluate(source, namespace=None):
    """The value of a Python expression written by a teacher, with NumPy as `np` if it is there."""
    scope = {}
    np = _numpy()
    if np is not None:
        scope["np"] = np
    scope.update(namespace or {})
    return eval(source, scope)


def _to_equal(check):
    student = _Run(check["code"], check.get("stdin"))
    expected = _evaluate(check["expected"])
    if _same(student.value, expected, check.get("error")):
        return _verdict(True)
    return _verdict(
        False, f"le résultat est {_short(student.value)}, au lieu de {_short(expected)}"
    )


def _arguments(call):
    """Python source of a call's arguments: given as source, or as a list of JSON values."""
    if isinstance(call, str):
        return call
    return ", ".join(repr(argument) for argument in call)


def _function(check):
    name = check["name"]
    student = _Run(check["code"], check.get("stdin"))
    function = student.namespace.get(name)
    if function is None:
        return _verdict(False, f"la fonction {name} n'est pas définie")
    if not callable(function):
        return _verdict(False, f"{name} n'est pas une fonction")
    if check["kind"] == "function-exists":
        return _verdict(True)

    model = _Run(check["model"], check.get("stdin"))
    reference = model.namespace[name]
    for call in check["calls"]:
        arguments = _arguments(call)
        shown = f"{name}({arguments})"
        expected = _evaluate(f"_reference({arguments})", {**model.namespace, "_reference": reference})
        printed = _io.StringIO()
        try:
            with _contextlib.redirect_stdout(printed):
                value = _evaluate(f"_function({arguments})", {**student.namespace, "_function": function})
        except Exception as error:
            return _verdict(
                False, f"{shown} provoque {type(error).__name__}: {error}"
            )
        if _same(value, expected, check.get("error")):
            continue
        if value is None and printed.getvalue().strip():
            return _verdict(
                False,
                f"{shown} affiche {printed.getvalue().strip()!r} au lieu de le renvoyer avec return",
            )
        return _verdict(False, f"{shown} renvoie {_short(value)}, au lieu de {_short(expected)}")
    return _verdict(True)


_KEYWORDS = {
    "for": (_ast.For, _ast.comprehension),
    "while": (_ast.While,),
    "if": (_ast.If, _ast.IfExp),
    "def": (_ast.FunctionDef,),
    "lambda": (_ast.Lambda,),
    "return": (_ast.Return,),
    "import": (_ast.Import, _ast.ImportFrom),
    "try": (_ast.Try,),
    "with": (_ast.With,),
    "class": (_ast.ClassDef,),
}


def _dotted(node):
    """`np.linalg.solve` for the expression `np.linalg.solve`, None for anything else."""
    if isinstance(node, _ast.Name):
        return node.id
    if isinstance(node, _ast.Attribute):
        inner = _dotted(node.value)
        return f"{inner}.{node.attr}" if inner else None
    return None


def _matches(dotted, name):
    """`np.linalg.solve` matches `solve` imported from `numpy.linalg`; `sum` matches only `sum`."""
    if dotted is None:
        return False
    if "." not in name:
        return dotted == name
    return dotted == name or dotted.split(".")[-1] == name.split(".")[-1]


def _code(check):
    try:
        tree = _ast.parse(check["code"])
    except SyntaxError:
        return _verdict(False, "le code contient une erreur de syntaxe")
    kind, name = check["check"], check["name"]
    nodes = list(_ast.walk(tree))
    if kind == "call":
        found = any(isinstance(n, _ast.Call) and _matches(_dotted(n.func), name) for n in nodes)
        return _verdict(found, f"le code n'appelle pas {name}")
    if kind == "use":
        found = any(isinstance(n, _KEYWORDS[name]) for n in nodes)
        return _verdict(found, f"le code n'utilise pas {name}")
    if kind == "import":
        modules = [a.name for n in nodes if isinstance(n, _ast.Import) for a in n.names]
        modules += [n.module or "" for n in nodes if isinstance(n, _ast.ImportFrom)]
        found = any(m == name or m.startswith(name + ".") for m in modules)
        return _verdict(found, f"le code n'importe pas {name}")
    if kind == "define":
        found = any(
            (isinstance(n, (_ast.FunctionDef, _ast.ClassDef)) and n.name == name)
            or (isinstance(n, _ast.Name) and isinstance(n.ctx, _ast.Store) and n.id == name)
            for n in nodes
        )
        return _verdict(found, f"le code ne définit pas {name}")
    raise ValueError(f"Unknown code check: {kind}")


def _axes(index=None):
    """The axes of every open figure, or the one at `index`."""
    import matplotlib.pyplot as plt

    axes = [ax for number in plt.get_fignums() for ax in plt.figure(number).axes]
    if index is None:
        return axes
    return axes[index : index + 1]


def _learning_figure(prop, index=0):
    """A property of the axes at `index`, read for a check, which closes every figure."""
    import matplotlib.pyplot as plt

    try:
        axes = _axes()
        if prop == "axes":
            return len(axes)
        if not axes:
            raise _Failed("aucun graphique n'a été tracé")
        ax = axes[index]
        if prop == "legend":
            legend = ax.get_legend()
            return "\n".join(text.get_text() for text in legend.get_texts()) if legend else ""
        return {
            "title": ax.get_title,
            "xlabel": ax.get_xlabel,
            "ylabel": ax.get_ylabel,
            "xscale": ax.get_xscale,
            "yscale": ax.get_yscale,
            "lines": lambda: len(ax.get_lines()),
            "aspect": lambda: ax.get_aspect() == 1,
            "grid": lambda: any(l.get_visible() for l in ax.get_xgridlines())
            and any(l.get_visible() for l in ax.get_ygridlines()),
        }[prop]()
    finally:
        plt.close("all")


def _plot(check):
    import matplotlib.pyplot as plt

    np = _numpy()
    student = _Run(check["code"], check.get("stdin"))
    try:
        axes = _axes(check.get("axes"))
        lines = [line for ax in axes for line in ax.get_lines()]
        if not lines:
            return _verdict(False, "aucune courbe n'a été tracée")
        a, b, points, error = check["a"], check["b"], check["points"], check.get("error")
        reasons = []
        for line in lines:
            x = np.asarray(line.get_xdata(), dtype=float)
            y = np.asarray(line.get_ydata(), dtype=float)
            if len(x) == 0:
                reasons.append("une courbe est vide")
                continue
            if not (np.isclose(x[0], a, rtol=1e-9, atol=1e-12) and np.isclose(x[-1], b, rtol=1e-9, atol=1e-12)):
                reasons.append(f"une courbe va de x = {x[0]:g} à {x[-1]:g}, au lieu de {a:g} à {b:g}")
                continue
            if len(x) < points:
                reasons.append(f"une courbe n'a que {len(x)} points, au lieu d'au moins {points}")
                continue
            with np.errstate(all="ignore"):
                expected = np.broadcast_to(
                    np.asarray(_evaluate(check["fn"], {**student.namespace, "x": x}), dtype=float),
                    x.shape,
                )
            if error is None:
                same = np.allclose(y, expected, equal_nan=True)
            else:
                same = np.allclose(y, expected, rtol=0, atol=error, equal_nan=True)
            if same:
                return _verdict(True)
            reasons.append(f"une courbe ne correspond pas à {check['fn']}")
        return _verdict(False, " ; ".join(dict.fromkeys(reasons)))
    finally:
        plt.close("all")


def _scatter(check):
    import matplotlib.pyplot as plt

    np = _numpy()
    student = _Run(check["code"], check.get("stdin"))
    try:
        expected = np.column_stack(
            [np.asarray(_evaluate(source, student.namespace), dtype=float) for source in (check["x"], check["y"])]
        )
        expected = expected[np.lexsort(expected.T[::-1])]
        clouds = [c for ax in _axes(check.get("axes")) for c in ax.collections]
        if not clouds:
            return _verdict(False, "aucun nuage de points n'a été tracé")
        for cloud in clouds:
            points = np.asarray(cloud.get_offsets(), dtype=float)
            if points.shape != expected.shape:
                continue
            points = points[np.lexsort(points.T[::-1])]
            error = check.get("error")
            if error is None and np.allclose(points, expected) or error is not None and np.allclose(
                points, expected, rtol=0, atol=error
            ):
                return _verdict(True)
        return _verdict(False, "aucun nuage ne contient les points attendus")
    finally:
        plt.close("all")


_CHECKS = {
    "equal-that-of": _equal_that_of,
    "equal": _to_equal,
    "function-exists": _function,
    "function-behaves": _function,
    "code": _code,
    "plot": _plot,
    "scatter": _scatter,
}


def _learning_check(text):
    check = _json.loads(text)
    try:
        verdict = _CHECKS[check["kind"]](check)
    except _Failed as failure:
        verdict = _verdict(False, str(failure))
    except Exception as error:
        verdict = {
            "passed": False,
            "message": None,
            "error": "".join(_traceback.format_exception(error)),
        }
    return _json.dumps(verdict)
