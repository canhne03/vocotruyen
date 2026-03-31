import os
import unicodedata
from tinydb import TinyDB, Query, where

DB_FILE = os.path.join(os.path.dirname(__file__), 'vct_db.json')
db = TinyDB(DB_FILE)

# Tables
hlv_table = db.table('hlv')
students_table = db.table('students')
rankings_table = db.table('rankings')
reset_requests_table = db.table('reset_requests')

def remove_accents(input_str):
    if not input_str:
        return ""
    nfkd_form = unicodedata.normalize('NFKD', input_str)
    return "".join([c for c in nfkd_form if not unicodedata.combining(c)]).lower()

def get_hlvs():
    return hlv_table.all()

def find_hlv(msHLV):
    return hlv_table.get(where('msHLV') == msHLV)

def get_students():
    return students_table.all()

def find_student(msVS):
    return students_table.get(where('msVS') == msVS)

def search_students_public(q):
    term = remove_accents(q)
    results = []
    
    # Tạo bản đồ CLB để tra cứu tên
    club_map = {}
    for hlv in hlv_table.all():
        for club in hlv.get('clubs', []):
            club_map[club['msCLB']] = club['tenCLB']
            
    for s in get_students():
        full_text = remove_accents(s.get('tenVS', '') + s.get('msVS', ''))
        if term in full_text:
            student_copy = s.copy()
            student_copy['tenCLB'] = club_map.get(s.get('msCLB'), "CLB: " + s.get('msCLB'))
            results.append(student_copy)
    return results

def get_rankings():
    return rankings_table.all()

def add_student(vs_data):
    students_table.insert(vs_data)
    return vs_data

def update_student(msVS, vs_data):
    students_table.update(vs_data, where('msVS') == msVS)
    return find_student(msVS)

def add_hlv_club(msHLV, club_data):
    hlv = find_hlv(msHLV)
    if hlv:
        clubs = hlv.get('clubs', [])
        clubs.append(club_data)
        hlv_table.update({'clubs': clubs}, where('msHLV') == msHLV)
        return True
    return False

# --- Reset Password Requests ---

def add_reset_request(msVS):
    import datetime
    student = find_student(msVS)
    if not student:
        return None
    
    # Check if already exists
    if reset_requests_table.get(where('msVS') == msVS):
        return "pending"
        
    club_map = {}
    for hlv in hlv_table.all():
        for club in hlv.get('clubs', []):
            club_map[club['msCLB']] = club['tenCLB']
            
    request = {
        "msVS": msVS,
        "tenVS": student['tenVS'],
        "tenCLB": club_map.get(student['msCLB'], "CLB: " + student['msCLB']),
        "ngayYeuCau": datetime.datetime.now().isoformat()
    }
    reset_requests_table.insert(request)
    return True

def get_reset_requests():
    return reset_requests_table.all()

def delete_reset_request(msVS):
    reset_requests_table.remove(where('msVS') == msVS)
    return True

def update_student_password(msVS, new_password):
    students_table.update({'password': new_password, 'doiPass': True}, where('msVS') == msVS)
    delete_reset_request(msVS)
    return True
