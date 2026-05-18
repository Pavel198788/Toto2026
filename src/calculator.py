def divide(a, b):
    try:
        return a / b
    except:
        print("ошибка")
        return None


def get_number(text):
    try:
        return float(input(text))
    except:
        print("ошибка")
        return None


def calculate():
    a = get_number("Введи первое число: ")
    b = get_number("Введи второе число: ")

    if a == None or b == None:
        print("что-то пошло не так")
        return

    result = divide(a, b)

    if result == None:
        print("не получилось посчитать")
    else:
        print("Результат: " + str(result))


calculate()
