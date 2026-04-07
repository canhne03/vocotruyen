from pydantic import BaseModel
from typing import List, Optional, Dict

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None

class LoginRequest(BaseModel):
    username: str
    password: str

class Notification(BaseModel):
    id: str
    noiDung: str
    loai: str = "general" # hoc_phi, thong_bao
    thang: Optional[List[str]] = None # Danh sách các tháng nhắc nợ để tự động xóa
    daXem: bool = False

class Student(BaseModel):
    msVS: str
    msCLB: str
    msHLV: str
    tenVS: str
    gioiTinh: Optional[str] = None
    namSinh: Optional[str] = None
    diaChi: Optional[str] = None
    cap: int
    ngayNhapHoc: Optional[str] = None
    ngayThi: Optional[str] = None
    password: str
    doiPass: bool = False
    hocPhi: Dict[str, bool] = {}
    thanhTich: List[str] = []
    trangThaiThi: Optional[str] = None
    trangThai: Optional[str] = "Đang học"
    avatar: Optional[str] = None
    tenCLB: Optional[str] = None
    thongBao: List[Notification] = []

class UpdateStudentProfile(BaseModel):
    diaChi: Optional[str] = None
    avatar: Optional[str] = None
    deleteAvatar: bool = False

class ChangePasswordRequest(BaseModel):
    oldPassword: str
    newPassword: str

class UpdateHLVProfile(BaseModel):
    sdt: Optional[str] = None
    thanhTich: Optional[str] = None
    avatar: Optional[str] = None
    deleteAvatar: bool = False

class Club(BaseModel):
    msCLB: str
    tenCLB: str
    diaChi: str

class HLV(BaseModel):
    msHLV: str
    tenHLV: str
    cap: int
    sdt: Optional[str] = None
    thanhTich: Optional[str] = None
    avatar: Optional[str] = None
    trangThai: Optional[str] = "hoat_dong"
    password: str
    doiPass: bool = False
    clubs: List[Club] = []

class PasswordResetRequest(BaseModel):
    msVS: str
    tenVS: str
    tenCLB: str
    ngayYeuCau: str

class PasswordResetConfirm(BaseModel):
    msVS: str
    newPassword: str
