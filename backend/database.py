import os
import unicodedata
from tinydb import TinyDB, Query, where

DB_FILE = os.path.join(os.path.dirname(__file__), 'vct_db.json')
db = TinyDB(DB_FILE, sort_keys=False, indent=2, ensure_ascii=False)

# Tables
hlv_table = db.table('hlv')
students_table = db.table('students')
rankings_table = db.table('rankings')
reset_requests_table = db.table('reset_requests')

def _get_club_name(msCLB):
    """Tra cứu tên CLB từ danh sách các HLV"""
    hlvs = hlv_table.all()
    for hlv in hlvs:
        for club in hlv.get('clubs', []):
            if club.get('msCLB') == msCLB:
                return club.get('tenCLB')
    return None

def remove_accents(input_str):
    if not input_str:
        return ""
    nfkd_form = unicodedata.normalize('NFKD', input_str)
    return "".join([c for c in nfkd_form if not unicodedata.combining(c)]).lower()

def get_hlvs():
    return hlv_table.all()

def find_hlv(msHLV):
    return hlv_table.get(where('msHLV') == msHLV)

def update_hlv(msHLV, hlv_data):
    # Lấy thông tin HLV cũ để so sánh tên CLB
    old_hlv = find_hlv(msHLV)
    if old_hlv and 'clubs' in hlv_data:
        old_clubs = {c['msCLB']: c['tenCLB'] for c in old_hlv.get('clubs', [])}
        new_clubs = {c['msCLB']: c['tenCLB'] for c in hlv_data['clubs']}
        
        # Kiểm tra xem có CLB nào đổi tên không
        for ms, new_name in new_clubs.items():
            if ms in old_clubs and old_clubs[ms] != new_name:
                # Tên CLB đã thay đổi -> Cập nhật toàn bộ võ sinh thuộc CLB này
                students_table.update({'tenCLB': new_name}, where('msCLB') == ms)

    hlv_table.update(hlv_data, where('msHLV') == msHLV)
    return find_hlv(msHLV)

def update_hlv_password(msHLV, new_password):
    hlv_table.update({'password': new_password, 'doiPass': True}, where('msHLV') == msHLV)
    return True

def get_students():
    return students_table.all()

def find_student(msVS):
    return students_table.get(where('msVS') == msVS)

def search_public(q):
    term = remove_accents(q)
    results = []
    
    # Tạo bản đồ CLB để tra cứu tên
    club_map = {}
    hlvs = hlv_table.all()
    for hlv in hlvs:
        for club in hlv.get('clubs', []):
            club_map[club['msCLB']] = club['tenCLB']
    
    # Tìm kiếm HLV theo msHLV (ưu tiên)
    for hlv in hlvs:
        if q == hlv.get('msHLV'):
            hlv_copy = hlv.copy()
            hlv_copy['type'] = 'hlv'
            # Đảm bảo các trường cần thiết có mặt
            results.append(hlv_copy)

    # Tìm kiếm Võ sinh
    for s in get_students():
        full_text = remove_accents(s.get('tenVS', '') + s.get('msVS', ''))
        if term in full_text:
            student_copy = s.copy()
            student_copy['type'] = 'vs'
            student_copy['tenCLB'] = club_map.get(s.get('msCLB'), "CLB: " + s.get('msCLB'))
            results.append(student_copy)
    return results

def get_rankings():
    return rankings_table.all()

def add_student(vs_data):
    # Tự động điền tenCLB nếu chưa có hoặc cập nhật lại theo msCLB
    if 'msCLB' in vs_data:
        club_name = _get_club_name(vs_data['msCLB'])
        if club_name:
            vs_data['tenCLB'] = club_name
            
    students_table.insert(vs_data)
    return vs_data

def update_student(msVS, vs_data):
    # Cập nhật tenCLB nếu msCLB thay đổi
    if 'msCLB' in vs_data:
        club_name = _get_club_name(vs_data['msCLB'])
        if club_name:
            vs_data['tenCLB'] = club_name
            
    students_table.update(vs_data, where('msVS') == msVS)
    return find_student(msVS)

def add_hlv_club(msHLV, club_data):
    hlv = find_hlv(msHLV)
    if hlv:
        clubs = hlv.get('clubs', [])
        clubs.append(club_data)
        # Khi thêm CLB mới, không cần cập nhật hàng loạt vì chưa có võ sinh
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

# --- Notifications ---

def add_notification(msVS, notif_data):
    student = find_student(msVS)
    if student:
        notifications = student.get('thongBao', [])
        notifications.append(notif_data)
        students_table.update({'thongBao': notifications}, where('msVS') == msVS)
        return True
    return False

def mark_notification_read(msVS, notif_id):
    student = find_student(msVS)
    if student:
        notifications = student.get('thongBao', [])
        for n in notifications:
            if n['id'] == notif_id:
                n['daXem'] = True
        students_table.update({'thongBao': notifications}, where('msVS') == msVS)
        return True
    return False

def mark_all_notifications_read(msVS):
    student = find_student(msVS)
    if student:
        notifications = student.get('thongBao', [])
        for n in notifications:
            n['daXem'] = True
        students_table.update({'thongBao': notifications}, where('msVS') == msVS)
        return True
    return False

def delete_tuition_notification(msVS, month):
    student = find_student(msVS)
    if student:
        notifications = student.get('thongBao', [])
        # Nếu thang là list, kiểm tra xem month có nằm trong list đó không
        # Nếu thang là string (cho các tin cũ), vẫn kiểm tra so sánh trực tiếp
        new_notifications = []
        for n in notifications:
            is_match = False
            t = n.get('thang')
            if isinstance(t, list):
                if month in t:
                    is_match = True
            elif isinstance(t, str):
                if t == month:
                    is_match = True
            
            if not (n.get('loai') == 'hoc_phi' and is_match):
                new_notifications.append(n)

        if len(new_notifications) != len(notifications):
            students_table.update({'thongBao': new_notifications}, where('msVS') == msVS)
            return True
    return False
