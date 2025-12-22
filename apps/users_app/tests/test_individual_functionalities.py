import re

import pytest


@pytest.mark.parametrize(
    "number, match",
    [
        ("+5333211430", True),
        ("5333211430", True),
        ("33211430", True),
        ("332114dfd30", False),
        ("+3321140000000030", True),
    ],
)
def test_phone_number_regex(number, match):
    pattern = r"^\+?\d+$"
    assert match == bool(re.match(pattern, number))
