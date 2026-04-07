import json
import os

db_path = 'vct_db.json'
with open(db_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

# Migrate students
if 'students' in data:
    for sid, student in data['students'].items():
        if 'ngaySinh' in student:
            ngay = student.pop('ngaySinh')
            # Extract year
            nam = ""
            if ngay:
                nam = ngay.split('-')[0]
            student['namSinh'] = nam

with open(db_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("Migration completed.")
