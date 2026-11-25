from datetime import date, datetime
import re
from typing import Literal
from zoneinfo import ZoneInfo

from pydantic import BaseModel, ConfigDict, Field, field_validator


GENDER_OPTIONS = ("Male", "Female", "Other")

DEFAULT_WARD_OPTIONS = (
    "Emergency Ward",
    "General Ward",
    "ICU",
    "Maternity Ward",
    "Pediatric Ward",
    "Surgical Ward",
)

DEFAULT_DEPARTMENT_OPTIONS = (
    "Cardiology",
    "Dermatology",
    "Emergency Medicine",
    "General Medicine",
    "Gynecology",
    "Neurology",
    "Oncology",
    "Orthopedics",
    "Pediatrics",
    "Urology",
)

DEFAULT_DOCTOR_OPTIONS = (
    "Dr. Amit Kumar",
    "Dr. Neha Rao",
    "Dr. Priya Sharma",
    "Dr. Ravi",
    "Dr. Suresh Reddy",
)


def india_today() -> date:
    """Return today's date in the application's intended India timezone."""
    return datetime.now(ZoneInfo("Asia/Kolkata")).date()


class PatientBase(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    # The assignment asks for letters only; spaces are allowed between names.
    name: str = Field(
        max_length=150,
        description="Letters and spaces only.",
    )
    age: int = Field(strict=True, ge=0, le=120)
    gender: Literal["Male", "Female", "Other"]
    ward: str = Field(max_length=100)
    department: str = Field(max_length=100)
    doctor: str = Field(max_length=150)
    admission_date: date
    status: Literal["Admitted", "Discharged"] = "Admitted"

    @field_validator("name")
    @classmethod
    def validate_name_not_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Patient name is required.")
        if len(value) < 2:
            raise ValueError("Patient name must contain at least two letters.")
        if not re.fullmatch(r"[A-Za-z ]+", value):
            raise ValueError("Patient name must contain English letters and spaces only.")
        if len(value.replace(" ", "")) < 2:
            raise ValueError("Patient name must contain at least two letters.")
        return value

    @field_validator("ward")
    @classmethod
    def validate_ward_not_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Ward is required. Select a ward from the list.")
        return value

    @field_validator("department")
    @classmethod
    def validate_department_not_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Department is required. Select a department from the list.")
        return value

    @field_validator("doctor")
    @classmethod
    def validate_doctor_not_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Doctor is required. Select a doctor from the list.")
        return value

    @field_validator("admission_date")
    @classmethod
    def validate_admission_date_not_future(cls, value: date) -> date:
        if value > india_today():
            raise ValueError("Admission date cannot be in the future.")
        return value


class PatientCreate(PatientBase):
    pass


class PatientUpdate(PatientBase):
    pass


class PatientResponse(PatientBase):
    id: int

    model_config = ConfigDict(from_attributes=True)
