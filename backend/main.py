from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from typing import List
import os
from . import database, models, auth

app = FastAPI(title="VCT Tây Ninh API")

# CORS Setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

# Mount static files (HTML, CSS, JS) from the root directory
# Note: This should be at the end of the app definition or handled carefully
# to not shadow API routes.
root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

@app.get("/")
async def read_index():
    return FileResponse(os.path.join(root_dir, 'index.html'))

@app.get("/dashboard.html")
async def read_dashboard():
    return FileResponse(os.path.join(root_dir, 'dashboard.html'))

@app.get("/vosinh.html")
async def read_vosinh():
    return FileResponse(os.path.join(root_dir, 'vosinh.html'))

# Serve other static files (css, js, images)
app.mount("/css", StaticFiles(directory=os.path.join(root_dir, "css")), name="css")
app.mount("/js", StaticFiles(directory=os.path.join(root_dir, "js")), name="js")
app.mount("/img", StaticFiles(directory=os.path.join(root_dir, "img")), name="img")
app.mount("/data", StaticFiles(directory=os.path.join(root_dir, "data")), name="data")

# Dependencies
async def get_current_user(token: str = Depends(oauth2_scheme)):
    payload = auth.verify_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return payload

# Routes
@app.post("/login")
async def login(request: models.LoginRequest):
    # Try HLV login
    hlv = database.find_hlv(request.username)
    if hlv and auth.verify_password(request.password, hlv['password']):
        token = auth.create_access_token(data={"sub": hlv['msHLV'], "role": "hlv"})
        return {"access_token": token, "token_type": "bearer", "user": {"type": "hlv", "id": hlv['msHLV'], "name": hlv['tenHLV']}}
    
    # Try Student login
    vs = database.find_student(request.username)
    if vs and auth.verify_password(request.password, vs['password']):
        token = auth.create_access_token(data={"sub": vs['msVS'], "role": "vs"})
        return {"access_token": token, "token_type": "bearer", "user": {"type": "vs", "id": vs['msVS'], "name": vs['tenVS']}}
    
    raise HTTPException(status_code=400, detail="Mã số hoặc mật khẩu không đúng.")

@app.get("/search", response_model=List[models.Student])
async def search_students(q: str = ""):
    if not q:
        return []
    return database.search_students_public(q)

@app.get("/students", response_model=List[models.Student])
async def get_students(current_user: dict = Depends(get_current_user)):
    return database.get_students()

@app.post("/students", response_model=models.Student)
async def create_student(student: models.Student, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "hlv":
        raise HTTPException(status_code=403, detail="Chỉ Huấn luyện viên mới có quyền thêm võ sinh.")
    return database.add_student(student.dict())

@app.put("/students/{msVS}", response_model=models.Student)
async def update_student(msVS: str, student: models.Student, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "hlv":
        raise HTTPException(status_code=403, detail="Chỉ Huấn luyện viên mới có quyền sửa võ sinh.")
    return database.update_student(msVS, student.dict())

@app.get("/rankings")
async def get_rankings():
    return database.get_rankings()

@app.get("/hlv/me")
async def get_hlv_me(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "hlv":
        raise HTTPException(status_code=403, detail="Không có quyền truy cập.")
    hlv = database.find_hlv(current_user.get("sub"))
    if not hlv:
        raise HTTPException(status_code=404, detail="Không tìm thấy thông tin HLV.")
    return hlv

@app.post("/hlv/club")
async def add_club(club: models.Club, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "hlv":
        raise HTTPException(status_code=403, detail="Không có quyền truy cập.")
    success = database.add_hlv_club(current_user.get("sub"), club.dict())
    if not success:
        raise HTTPException(status_code=400, detail="Lỗi khi thêm lớp học.")
    return {"message": "Thêm lớp học thành công"}

# --- Password Reset Endpoints ---

@app.post("/reset-password-request")
async def reset_password_request(msVS: str):
    status = database.add_reset_request(msVS)
    if status is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy võ sinh này.")
    
    if status == "pending":
        return {"message": "Yêu cầu của bạn đang trong trạng thái chờ Huấn luyện viên xét duyệt."}
        
    return {"message": "Yêu cầu cấp lại mật khẩu đã được gửi đến Huấn luyện viên."}

@app.get("/reset-password-requests", response_model=List[models.PasswordResetRequest])
async def get_reset_password_requests(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "hlv":
        raise HTTPException(status_code=403, detail="Không có quyền truy cập.")
    return database.get_reset_requests()

@app.post("/reset-password-confirm")
async def reset_password_confirm(confirm_data: models.PasswordResetConfirm, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "hlv":
        raise HTTPException(status_code=403, detail="Không có quyền truy cập.")
    success = database.update_student_password(confirm_data.msVS, confirm_data.newPassword)
    if not success:
        raise HTTPException(status_code=400, detail="Lỗi khi cấp lại mật khẩu.")
    return {"message": "Cấp lại mật khẩu thành công."}

@app.delete("/reset-password-request/{msVS}")
async def delete_reset_password_request(msVS: str, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "hlv":
        raise HTTPException(status_code=403, detail="Không có quyền truy cập.")
    database.delete_reset_request(msVS)
    return {"message": "Đã xóa yêu cầu."}

# --- Student Specific Endpoints ---

@app.get("/vs/me")
async def get_vs_me(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "vs":
        raise HTTPException(status_code=403, detail="Không có quyền truy cập.")
    vs = database.find_student(current_user.get("sub"))
    if not vs:
        raise HTTPException(status_code=404, detail="Không tìm thấy thông tin võ sinh.")
    return vs

@app.put("/vs/update-profile")
async def update_vs_profile(profile: models.UpdateStudentProfile, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "vs":
        raise HTTPException(status_code=403, detail="Không có quyền truy cập.")
    msVS = current_user.get("sub")
    vs = database.find_student(msVS)
    if not vs:
        raise HTTPException(status_code=404, detail="Không tìm thấy thông tin võ sinh.")
    
    # Cập nhật các trường được phép
    if profile.diaChi is not None:
        vs['diaChi'] = profile.diaChi
    if profile.avatar is not None:
        vs['avatar'] = profile.avatar
        
    database.update_student(msVS, vs)
    return {"message": "Cập nhật thông tin thành công.", "user": vs}

@app.post("/vs/change-password")
async def vs_change_password(req: models.ChangePasswordRequest, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "vs":
        raise HTTPException(status_code=403, detail="Không có quyền truy cập.")
    msVS = current_user.get("sub")
    vs = database.find_student(msVS)
    if not vs:
        raise HTTPException(status_code=404, detail="Không tìm thấy võ sinh.")
    
    if not auth.verify_password(req.oldPassword, vs['password']):
        raise HTTPException(status_code=400, detail="Mật khẩu cũ không chính xác.")
    
    database.update_student_password(msVS, req.newPassword)
    return {"message": "Đổi mật khẩu thành công."}
