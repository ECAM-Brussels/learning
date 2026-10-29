import numpy as _np


class Dual:
    __array_priority__ = 10000
    __slots__ = ("real", "dual")

    def __init__(self, real, dual=0.0):
        self.real = real
        self.dual = dual

    def __repr__(self):
        return f"{self.real} + {self.dual}ε"

    @staticmethod
    def _coerce(x):
        return x if isinstance(x, Dual) else Dual(x)

    def __add__(self, other):
        o = self._coerce(other)
        return Dual(self.real + o.real, self.dual + o.dual)

    __radd__ = __add__

    def __neg__(self):
        return Dual(-self.real, -self.dual)

    def __sub__(self, other):
        return self + (-self._coerce(other))

    def __rsub__(self, other):
        return self._coerce(other) - self

    def __mul__(self, other):
        o = self._coerce(other)
        return Dual(
            self.real * o.real,
            self.dual * o.real + self.real * o.dual,
        )

    __rmul__ = __mul__

    def __truediv__(self, other):
        o = self._coerce(other)
        return Dual(
            self.real / o.real,
            (self.dual * o.real - self.real * o.dual) / o.real**2,
        )

    def __rtruediv__(self, other):
        return self._coerce(other) / self

    def __pow__(self, power):
        p = self._coerce(power)
        value = self.real**p.real
        positive = self.real > 0

        if _np.isscalar(positive):
            if positive:
                with _np.errstate(divide="ignore", invalid="ignore"):
                    deriv = value * (
                        p.dual * _np.log(self.real) + p.real * self.dual / self.real
                    )
            else:
                deriv = p.real * self.real ** (p.real - 1) * self.dual
            return Dual(value, deriv)

        with _np.errstate(divide="ignore", invalid="ignore"):
            deriv_positive = value * (
                p.dual * _np.log(self.real) + p.real * self.dual / self.real
            )
        deriv_non_positive = p.real * self.real ** (p.real - 1) * self.dual
        deriv = _np.where(positive, deriv_positive, deriv_non_positive)
        return Dual(value, deriv)

    def __rpow__(self, base):
        return self._coerce(base) ** self

    # NumPy ufunc dispatch
    def __array_ufunc__(self, ufunc, method, *inputs, **kwargs):
        if method != "__call__" or kwargs:
            return NotImplemented

        x = self._coerce(inputs[0])

        unary = {
            _np.sin: lambda x: Dual(_np.sin(x.real), _np.cos(x.real) * x.dual),
            _np.cos: lambda x: Dual(_np.cos(x.real), -_np.sin(x.real) * x.dual),
            _np.tan: lambda x: Dual(_np.tan(x.real), x.dual / _np.cos(x.real) ** 2),
            _np.exp: lambda x: Dual(_np.exp(x.real), _np.exp(x.real) * x.dual),
            _np.log: lambda x: Dual(_np.log(x.real), x.dual / x.real),
            _np.sqrt: lambda x: Dual(_np.sqrt(x.real), x.dual / (2 * _np.sqrt(x.real))),
            _np.sinh: lambda x: Dual(_np.sinh(x.real), _np.cosh(x.real) * x.dual),
            _np.cosh: lambda x: Dual(_np.cosh(x.real), _np.sinh(x.real) * x.dual),
            _np.tanh: lambda x: Dual(_np.tanh(x.real), x.dual / _np.cosh(x.real) ** 2),
            _np.negative: lambda x: -x,
            _np.positive: lambda x: x,
            _np.absolute: lambda x: abs(x),
        }

        binary = {
            _np.add: lambda a, b: a + b,
            _np.subtract: lambda a, b: a - b,
            _np.multiply: lambda a, b: a * b,
            _np.divide: lambda a, b: a / b,
            _np.true_divide: lambda a, b: a / b,
            _np.power: lambda a, b: a**b,
        }

        if ufunc in unary and len(inputs) == 1:
            return unary[ufunc](x)

        if ufunc in binary and len(inputs) == 2:
            a, b = map(self._coerce, inputs)
            return binary[ufunc](a, b)

        return NotImplemented

    def __abs__(self):
        if _np.isscalar(self.real):
            if self.real > 0:
                return self
            if self.real < 0:
                return -self
            return Dual(0, _np.nan)

        real = _np.abs(self.real)
        dual = _np.where(
            self.real > 0,
            self.dual,
            _np.where(self.real < 0, -self.dual, _np.nan),
        )
        return Dual(real, dual)


epsilon = Dual(0, 1)
