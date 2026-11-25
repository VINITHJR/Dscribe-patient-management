from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Patient
from app.schemas import (
    DEFAULT_DEPARTMENT_OPTIONS,
    DEFAULT_DOCTOR_OPTIONS,
    DEFAULT_WARD_OPTIONS,
    GENDER_OPTIONS,
    PatientCreate,
    PatientResponse,
    PatientUpdate,
)

router = APIRouter(prefix="/patients", tags=["Patients"])


def _existing_values(db: Session, column) -> set[str]:
    """Return values already present so existing records remain editable."""
    rows = db.query(column).distinct().all()
    return {str(row[0]).strip() for row in rows if row[0] is not None and str(row[0]).strip()}


def _validate_choice(
    value: str,
    allowed_defaults: tuple[str, ...],
    existing_values: set[str],
    field_label: str,
) -> None:
    if value not in allowed_defaults and value not in existing_values:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Select a valid {field_label} from the available list.",
        )


def validate_patient_choices(patient_data: PatientCreate | PatientUpdate, db: Session) -> None:
    _validate_choice(
        patient_data.gender,
        GENDER_OPTIONS,
        _existing_values(db, Patient.gender),
        "gender",
    )
    _validate_choice(
        patient_data.ward,
        DEFAULT_WARD_OPTIONS,
        _existing_values(db, Patient.ward),
        "ward",
    )
    _validate_choice(
        patient_data.department,
        DEFAULT_DEPARTMENT_OPTIONS,
        _existing_values(db, Patient.department),
        "department",
    )
    _validate_choice(
        patient_data.doctor,
        DEFAULT_DOCTOR_OPTIONS,
        _existing_values(db, Patient.doctor),
        "doctor",
    )


@router.get("/options")
def get_patient_options(db: Session = Depends(get_db)):
    """Return form dropdown choices plus values already used by stored records."""
    return {
        "genders": sorted(set(GENDER_OPTIONS) | _existing_values(db, Patient.gender)),
        "wards": sorted(set(DEFAULT_WARD_OPTIONS) | _existing_values(db, Patient.ward)),
        "departments": sorted(
            set(DEFAULT_DEPARTMENT_OPTIONS) | _existing_values(db, Patient.department)
        ),
        "doctors": sorted(set(DEFAULT_DOCTOR_OPTIONS) | _existing_values(db, Patient.doctor)),
    }


@router.post(
    "/",
    response_model=PatientResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_patient(patient_data: PatientCreate, db: Session = Depends(get_db)):
    validate_patient_choices(patient_data, db)
    patient = Patient(**patient_data.model_dump())
    db.add(patient)
    try:
        db.commit()
        db.refresh(patient)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="The patient could not be saved. Please try again.",
        )
    return patient


@router.get("/", response_model=list[PatientResponse])
def get_patients(
    search: str | None = Query(default=None, max_length=150),
    status_filter: str | None = Query(default=None, alias="status"),
    ward: str | None = Query(default=None, max_length=100),
    department: str | None = Query(default=None, max_length=100),
    doctor: str | None = Query(default=None, max_length=150),
    db: Session = Depends(get_db),
):
    query = db.query(Patient)

    if search and search.strip():
        query = query.filter(Patient.name.ilike(f"%{search.strip()}%"))
    if status_filter:
        if status_filter not in {"Admitted", "Discharged"}:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Status must be Admitted or Discharged.",
            )
        query = query.filter(Patient.status == status_filter)
    if ward:
        query = query.filter(Patient.ward == ward)
    if department:
        query = query.filter(Patient.department == department)
    if doctor:
        query = query.filter(Patient.doctor == doctor)

    return query.order_by(Patient.id.desc()).all()


@router.get("/{patient_id}", response_model=PatientResponse)
def get_patient(patient_id: int, db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if patient is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found.",
        )
    return patient


@router.put("/{patient_id}", response_model=PatientResponse)
def update_patient(
    patient_id: int,
    patient_data: PatientUpdate,
    db: Session = Depends(get_db),
):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if patient is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found.",
        )

    validate_patient_choices(patient_data, db)
    for field, value in patient_data.model_dump().items():
        setattr(patient, field, value)

    try:
        db.commit()
        db.refresh(patient)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="The patient changes could not be saved. Please try again.",
        )
    return patient


@router.patch("/{patient_id}/discharge", response_model=PatientResponse)
def discharge_patient(patient_id: int, db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if patient is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found.",
        )

    patient.status = "Discharged"
    try:
        db.commit()
        db.refresh(patient)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="The patient could not be marked as discharged. Please try again.",
        )
    return patient


@router.delete("/{patient_id}")
def delete_patient(patient_id: int, db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if patient is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found.",
        )

    try:
        db.delete(patient)
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="The patient could not be deleted. Please try again.",
        )
    return {"message": "Patient deleted successfully."}
