from datetime import datetime
from typing import Literal
from urllib.parse import urlparse

from pydantic import BaseModel, ConfigDict, Field, field_validator

ResourceType = Literal[
    "Notes", "Question Paper", "Assignment", "Reference", "Video", "Other"
]


class ResourceCreate(BaseModel):
    title: str = Field(min_length=2, max_length=180)
    description: str = Field(min_length=2, max_length=3000)
    subject: str = Field(min_length=2, max_length=120)
    semester: int = Field(ge=1, le=12)
    unit: int = Field(ge=1, le=20)
    resource_type: ResourceType
    url: str = Field(min_length=8, max_length=1000)

    @field_validator("title", "description", "subject")
    @classmethod
    def trim_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("This field cannot be blank.")
        return value

    @field_validator("url")
    @classmethod
    def valid_web_url(cls, value: str) -> str:
        value = value.strip()
        parsed = urlparse(value)
        if parsed.scheme in {"http", "https"} and parsed.netloc:
            return value
        if parsed.scheme == "file" and (parsed.path or parsed.netloc):
            return value
        raise ValueError("Enter a complete http, https, or file URL.")


class ResourceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    description: str
    subject: str
    semester: int
    unit: int
    resource_type: str
    url: str
    created_at: datetime


class BookmarkCreate(BaseModel):
    resource_id: int
    user_id: str = Field(min_length=1, max_length=80)


class SubjectOut(BaseModel):
    id: int
    name: str
    code: str
