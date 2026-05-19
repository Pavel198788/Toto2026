def divide(a, b):
    if b == 0:
        raise ValueError("На ноль делить нельзя")
    return a / b


def get_number(text):
    try:
        return float(input(text))
    except ValueError:
        raise ValueError(f"Нужно ввести число, а не текст")


def calculate():
    try:
        a = get_number("Введи первое число: ")
        b = get_number("Введи второе число: ")
        result = divide(a, b)
        print(f"Результат: {result}")
    except ValueError as e:
        print(f"Ошибка: {e}")


calculate()
