def read_file(path):
    try:
        f = open(path)
        data = f.read()
        f.close()
        return data
    except:
        print("файл не найден")
        return None


def count_lines(path):
    data = read_file(path)
    if data == None:
        print("не могу посчитать строки")
        return
    lines = data.split("\n")
    print("Строк в файле: " + str(len(lines)))


def find_word(path, word):
    data = read_file(path)
    if data == None:
        return
    if word in data:
        print("слово найдено")
    else:
        print("слово не найдено")
