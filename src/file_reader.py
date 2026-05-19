def read_file(path):
    try:
        with open(path, encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        raise FileNotFoundError(f"Файл не найден: {path}")
    except PermissionError:
        raise PermissionError(f"Нет доступа к файлу: {path}")


def count_lines(path):
    try:
        data = read_file(path)
        lines = data.split("\n")
        print(f"Строк в файле: {len(lines)}")
    except (FileNotFoundError, PermissionError) as e:
        print(f"Ошибка: {e}")


def find_word(path, word):
    try:
        data = read_file(path)
        if word in data:
            print(f"Слово '{word}' найдено")
        else:
            print(f"Слово '{word}' не найдено")
    except (FileNotFoundError, PermissionError) as e:
        print(f"Ошибка: {e}")
