import json
import os
from tinydb import TinyDB, Query

# Paths
DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'data')
DB_FILE = os.path.join(os.path.dirname(__file__), 'vct_db.json')

def migrate():
    # Initialize TinyDB
    db = TinyDB(DB_FILE)
    
    # Clear existing tables
    db.drop_tables()
    
    # Tables
    hlv_table = db.table('hlv')
    students_table = db.table('students')
    rankings_table = db.table('rankings')
    
    # Load and Insert HLV
    hlv_path = os.path.join(DATA_DIR, 'hlv.json')
    if os.path.exists(hlv_path):
        with open(hlv_path, 'r', encoding='utf-8') as f:
            hlv_data = json.load(f)
            hlv_table.insert_multiple(hlv_data)
            print(f"Migrated {len(hlv_data)} HLV records.")
            
    # Load and Insert Students
    vs_path = os.path.join(DATA_DIR, 'vo-sinh.json')
    if os.path.exists(vs_path):
        with open(vs_path, 'r', encoding='utf-8') as f:
            vs_data = json.load(f)
            students_table.insert_multiple(vs_data)
            print(f"Migrated {len(vs_data)} Student records.")
            
    # Load and Insert Rankings
    rankings_path = os.path.join(DATA_DIR, 'ranking.json')
    if os.path.exists(rankings_path):
        with open(rankings_path, 'r', encoding='utf-8') as f:
            rankings_data = json.load(f)
            rankings_table.insert_multiple(rankings_data)
            print(f"Migrated {len(rankings_data)} Ranking records.")

if __name__ == '__main__':
    migrate()
    print("Migration complete!")
