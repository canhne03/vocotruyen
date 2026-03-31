import os
from tinydb import TinyDB, where

DB_FILE = os.path.join('backend', 'vct_db.json')
db = TinyDB(DB_FILE)
students_table = db.table('students')
hlv_table = db.table('hlv')

c = students_table.all()[0]
print(f"Student msCLB: {repr(c.get('msCLB'))}")

for hlv in hlv_table.all():
    for club in hlv.get('clubs', []):
        print(f"Club msCLB: {repr(club['msCLB'])}, Name: {club['tenCLB']}")
