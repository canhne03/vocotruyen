import json

db_path = 'd:\\Website-Quản-Lý-Võ-Sinh\\vct - Copy (2)\\backend\\vct_db.json'
with open(db_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

students = data.get('students', {})
voSinh = list(students.values())

def generateMsVS(msCLB):
    if not msCLB: return ''
    clubStudents = [vs for vs in voSinh if vs.get('msCLB') == msCLB]
    maxNum = 0
    for vs in clubStudents:
        msVS = vs.get('msVS', '')
        try:
            suffix_str = msVS[len(msCLB):]
            if suffix_str:
                suffix = int(suffix_str)
                if suffix > maxNum:
                    maxNum = suffix
        except ValueError:
            pass
    nextNum = maxNum + 1 if maxNum >= 1 else 1
    return f"{msCLB}{str(nextNum).zfill(4)}"

print("Mỹ Xuân (0012):", generateMsVS("0012"))
print("Tân Bửu (0011):", generateMsVS("0011"))
