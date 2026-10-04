from contextlib import asynccontextmanager
import os

from fastapi import Depends, FastAPI, HTTPException, Query, Response, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from .database import Base, engine, get_db
from .models import Bookmark, Resource, Subject
from .schemas import BookmarkCreate, ResourceCreate, ResourceOut, SubjectOut


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title="Student Resource Finder API", lifespan=lifespan)
origins = os.getenv("FRONTEND_ORIGINS") or "http://localhost:5500,http://127.0.0.1:5500"
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in origins.split(",") if origin.strip()],
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Content-Type"],
)


def resource_output(resource: Resource) -> ResourceOut:
    return ResourceOut(
        id=resource.id,
        title=resource.title,
        description=resource.description,
        subject=resource.subject.name,
        semester=resource.semester,
        unit=resource.unit,
        resource_type=resource.resource_type,
        url=resource.url,
        created_at=resource.created_at,
    )


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/resources", response_model=list[ResourceOut])
def list_resources(
    search: str | None = None,
    subject: str | None = None,
    semester: int | None = Query(default=None, ge=1, le=12),
    unit: int | None = Query(default=None, ge=1, le=20),
    type: str | None = None,
    db: Session = Depends(get_db),
):
    query = select(Resource).options(joinedload(Resource.subject))
    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.where(
            Resource.title.ilike(term)
            | Resource.description.ilike(term)
            | Resource.subject.has(Subject.name.ilike(term))
        )
    if subject:
        query = query.join(Resource.subject).where(Subject.name == subject)
    if semester is not None:
        query = query.where(Resource.semester == semester)
    if unit is not None:
        query = query.where(Resource.unit == unit)
    if type:
        query = query.where(Resource.resource_type == type)
    resources = (
        db.scalars(query.order_by(Resource.created_at.desc(), Resource.id))
        .unique()
        .all()
    )
    return [resource_output(resource) for resource in resources]


@app.get("/api/resources/{resource_id}", response_model=ResourceOut)
def get_resource(resource_id: int, db: Session = Depends(get_db)):
    resource = db.scalar(
        select(Resource)
        .options(joinedload(Resource.subject))
        .where(Resource.id == resource_id)
    )
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found.")
    return resource_output(resource)


def save_resource(
    data: ResourceCreate, db: Session, resource: Resource | None = None
) -> Resource:
    subject = db.scalar(select(Subject).where(Subject.name == data.subject))
    if subject is None:
        subject = Subject(name=data.subject, code="PENDING")
        db.add(subject)
        db.flush()
        subject.code = f"SUB{subject.id}"
    if resource is None:
        resource = Resource()
        db.add(resource)
    resource.title = data.title
    resource.description = data.description
    resource.subject = subject
    resource.semester = data.semester
    resource.unit = data.unit
    resource.resource_type = data.resource_type
    resource.url = data.url
    db.commit()
    db.refresh(resource)
    return resource


@app.post(
    "/api/resources", response_model=ResourceOut, status_code=status.HTTP_201_CREATED
)
def create_resource(data: ResourceCreate, db: Session = Depends(get_db)):
    return resource_output(save_resource(data, db))


@app.put("/api/resources/{resource_id}", response_model=ResourceOut)
def update_resource(
    resource_id: int, data: ResourceCreate, db: Session = Depends(get_db)
):
    resource = db.get(Resource, resource_id)
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found.")
    return resource_output(save_resource(data, db, resource))


@app.delete("/api/resources/{resource_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_resource(resource_id: int, db: Session = Depends(get_db)):
    resource = db.get(Resource, resource_id)
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found.")
    db.delete(resource)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@app.get("/api/subjects", response_model=list[SubjectOut])
def list_subjects(db: Session = Depends(get_db)):
    return [
        {"id": subject.id, "name": subject.name, "code": subject.code}
        for subject in db.scalars(select(Subject).order_by(Subject.name)).all()
    ]


@app.get("/api/bookmarks", response_model=list[ResourceOut])
def list_bookmarks(
    user_id: str = Query(min_length=1, max_length=80), db: Session = Depends(get_db)
):
    resources = (
        db.scalars(
            select(Resource)
            .join(Bookmark)
            .options(joinedload(Resource.subject))
            .where(Bookmark.user_id == user_id)
            .order_by(Bookmark.created_at.desc())
        )
        .unique()
        .all()
    )
    return [resource_output(resource) for resource in resources]


@app.post("/api/bookmarks", status_code=status.HTTP_201_CREATED)
def add_bookmark(data: BookmarkCreate, db: Session = Depends(get_db)):
    if db.get(Resource, data.resource_id) is None:
        raise HTTPException(status_code=404, detail="Resource not found.")
    bookmark = db.scalar(
        select(Bookmark).where(
            Bookmark.resource_id == data.resource_id, Bookmark.user_id == data.user_id
        )
    )
    if bookmark is None:
        db.add(Bookmark(resource_id=data.resource_id, user_id=data.user_id))
        db.commit()
    return {"message": "Bookmark saved."}


@app.delete("/api/bookmarks/{resource_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_bookmark(
    resource_id: int,
    user_id: str = Query(min_length=1, max_length=80),
    db: Session = Depends(get_db),
):
    bookmark = db.scalar(
        select(Bookmark).where(
            Bookmark.resource_id == resource_id, Bookmark.user_id == user_id
        )
    )
    if bookmark:
        db.delete(bookmark)
        db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
