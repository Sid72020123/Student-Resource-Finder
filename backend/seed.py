from sqlalchemy import select

from .database import Base, SessionLocal, engine
from .main import save_resource
from .models import Resource, Subject
from .schemas import ResourceCreate

SAMPLE_RESOURCES = [
    (
        "DBMS Unit 3 - Normalization Notes",
        "Clear notes on 1NF, 2NF, 3NF and BCNF, with worked examples.",
        "Database Management Systems",
        3,
        3,
        "Notes",
        "https://www.postgresql.org/docs/current/ddl-constraints.html",
    ),
    (
        "DBMS - SQL Practice Questions",
        "A short set of joins, grouping and subquery practice prompts.",
        "Database Management Systems",
        3,
        2,
        "Assignment",
        "https://www.postgresql.org/docs/current/tutorial.html",
    ),
    (
        "Operating Systems - Deadlocks",
        "Deadlock conditions, prevention and avoidance explained with examples.",
        "Operating Systems",
        3,
        2,
        "Notes",
        "https://pages.cs.wisc.edu/~remzi/OSTEP/",
    ),
    (
        "OS Unit 1 Question Paper",
        "Previous-year style questions on processes, threads and scheduling.",
        "Operating Systems",
        3,
        1,
        "Question Paper",
        "https://pages.cs.wisc.edu/~remzi/OSTEP/",
    ),
    (
        "Computer Networks - TCP/IP Notes",
        "A concise guide to the TCP/IP model and common protocols.",
        "Computer Networks",
        4,
        2,
        "Notes",
        "https://www.rfc-editor.org/rfc/rfc9293.html",
    ),
    (
        "Networks - Subnetting Reference",
        "Examples for CIDR notation, subnet masks and address ranges.",
        "Computer Networks",
        4,
        3,
        "Reference",
        "https://www.rfc-editor.org/rfc/rfc4632.html",
    ),
    (
        "Data Structures - Trees Question Bank",
        "Practice questions on binary trees, traversals and BST operations.",
        "Data Structures",
        2,
        4,
        "Question Paper",
        "https://opendsa-server.cs.vt.edu/ODSA/Books/Everything/html/BinaryTree.html",
    ),
    (
        "Data Structures - Sorting Assignment",
        "Compare sorting methods and explain their time complexity.",
        "Data Structures",
        2,
        3,
        "Assignment",
        "https://opendsa-server.cs.vt.edu/ODSA/Books/Everything/html/Sorting.html",
    ),
    (
        "OOP - Inheritance and Polymorphism",
        "Lecture notes with simple examples of inheritance and overriding.",
        "Object Oriented Programming",
        2,
        3,
        "Notes",
        "https://docs.python.org/3/tutorial/classes.html",
    ),
    (
        "OOP - Class Design Video",
        "A beginner-friendly walkthrough of classes and object relationships.",
        "Object Oriented Programming",
        2,
        1,
        "Video",
        "https://www.youtube.com/watch?v=JeznW_7DlB0",
    ),
]


def seed():
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        if db.scalar(select(Resource.id).limit(1)) is not None:
            print("Resources already exist; sample data was not added.")
            return
        for name in dict.fromkeys(row[2] for row in SAMPLE_RESOURCES):
            if db.scalar(select(Subject.id).where(Subject.name == name)) is not None:
                continue
            subject = Subject(name=name, code="PENDING")
            db.add(subject)
            db.flush()
            subject.code = f"SUB{subject.id}"
        for (
            title,
            description,
            subject,
            semester,
            unit,
            resource_type,
            url,
        ) in SAMPLE_RESOURCES:
            save_resource(
                ResourceCreate(
                    title=title,
                    description=description,
                    subject=subject,
                    semester=semester,
                    unit=unit,
                    resource_type=resource_type,
                    url=url,
                ),
                db,
            )
        print(f"Added {len(SAMPLE_RESOURCES)} sample resources.")


if __name__ == "__main__":
    seed()
