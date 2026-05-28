from datetime import datetime

from flask_login import UserMixin
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.ext.associationproxy import association_proxy


db = SQLAlchemy()


class User(UserMixin, db.Model):
    __tablename__ = "User"

    user_id = db.Column("userId", db.Integer, primary_key=True)
    username = db.Column("userName", db.Text, nullable=False)
    email = db.Column(db.Text, nullable=False)
    password_hash = db.Column("password", db.Text, nullable=False)
    role = db.Column(db.Text, nullable=False, default="student")
    dept_id = db.Column("deptId", db.Integer, db.ForeignKey("Department.deptId"))

    reviews = db.relationship("Review", back_populates="author")

    @property
    def id(self):
        return self.user_id

    @property
    def avatar_animal(self):
        return "question"

    @avatar_animal.setter
    def avatar_animal(self, value):
        pass

    @property
    def gender(self):
        return "undisclosed"

    @gender.setter
    def gender(self, value):
        pass


class Department(db.Model):
    __tablename__ = "Department"

    dept_id = db.Column("deptId", db.Integer, primary_key=True)
    name = db.Column("deptName", db.Text, nullable=False)


class Instructor(db.Model):
    __tablename__ = "Instructor"

    instructor_id = db.Column("instructorId", db.Integer, primary_key=True)
    name = db.Column("instructorName", db.Text, nullable=False)


class Offer(db.Model):
    __tablename__ = "Offers"

    course_id = db.Column(
        "courseDbId",
        db.Integer,
        db.ForeignKey("Course.courseDbId"),
        primary_key=True,
    )
    dept_id = db.Column(
        "deptId",
        db.Integer,
        db.ForeignKey("Department.deptId"),
        primary_key=True,
    )

    department = db.relationship("Department")


class Teach(db.Model):
    __tablename__ = "Teaches"

    section_id = db.Column(
        "sectionId",
        db.Integer,
        db.ForeignKey("Section.sectionId"),
        primary_key=True,
    )
    instructor_id = db.Column(
        "instructorId",
        db.Integer,
        db.ForeignKey("Instructor.instructorId"),
        primary_key=True,
    )

    instructor = db.relationship("Instructor")


class Section(db.Model):
    __tablename__ = "Section"

    section_id = db.Column("sectionId", db.Integer, primary_key=True)
    course_id = db.Column(
        "courseDbId",
        db.Integer,
        db.ForeignKey("Course.courseDbId"),
        nullable=False,
        index=True,
    )
    term = db.Column(db.Integer, nullable=False)
    roc_year = db.Column("year", db.Integer, nullable=False)
    name = db.Column("sectionName", db.Text)

    course = db.relationship("Course", back_populates="sections")
    teaches = db.relationship("Teach", cascade="all, delete-orphan")
    instructors = association_proxy("teaches", "instructor")
    reviews = db.relationship("Review", back_populates="section")

class Course(db.Model):
    __tablename__ = "Course"

    course_id = db.Column("courseDbId", db.Integer, primary_key=True)
    code = db.Column("courseCode", db.Text, nullable=False, index=True)
    name = db.Column("courseName", db.Text, nullable=False)
    credits = db.Column(db.Integer)
    course_type = db.Column("courseType", db.Text)
    year_level = db.Column("yearLevel", db.Integer)

    offers = db.relationship("Offer", cascade="all, delete-orphan")
    departments = association_proxy("offers", "department")
    sections = db.relationship(
        "Section",
        back_populates="course",
        cascade="all, delete-orphan",
        order_by="desc(Section.roc_year), desc(Section.term)",
    )

    @property
    def id(self):
        return self.course_id

    @property
    def title_parts(self):
        parts = [part.strip() for part in (self.name or "").splitlines() if part.strip()]
        if len(parts) >= 2:
            return " ".join(parts[1:]), parts[0]
        if parts:
            return parts[0], ""
        return self.code, ""

    @property
    def title(self):
        return self.title_parts[0]

    @property
    def title_zh(self):
        return self.title_parts[1]

    @property
    def latest_section(self):
        return self.sections[0] if self.sections else None

    @property
    def year(self):
        section = self.latest_section
        return section.roc_year if section else None

    @property
    def semester(self):
        section = self.latest_section
        return section.term if section else None

    @property
    def department(self):
        names = [department.name for department in self.departments if department]
        return ", ".join(dict.fromkeys(names))

    @property
    def professor(self):
        names = []
        for section in self.sections:
            for instructor in section.instructors:
                if instructor:
                    names.append(instructor.name)
        return ", ".join(dict.fromkeys(names))

    @property
    def description(self):
        pieces = []
        if self.course_type:
            pieces.append(f"Type: {self.course_type}")
        if self.year_level:
            pieces.append(f"Year level: {self.year_level}")
        return " | ".join(pieces)


class Review(db.Model):
    __tablename__ = "Review"

    review_id = db.Column("reviewId", db.Integer, primary_key=True)
    section_id = db.Column(
        "sectionId",
        db.Integer,
        db.ForeignKey("Section.sectionId"),
        nullable=False,
        index=True,
    )
    user_id = db.Column(
        "userId",
        db.Integer,
        db.ForeignKey("User.userId"),
        nullable=False,
        index=True,
    )
    parent_id = db.Column("parentId", db.Integer, db.ForeignKey("Review.reviewId"))
    created_at = db.Column("timestamp", db.DateTime, default=datetime.utcnow)
    rating = db.Column(db.Integer)
    text = db.Column("reviewContent", db.Text, nullable=False)

    section = db.relationship("Section", back_populates="reviews")
    author = db.relationship("User", back_populates="reviews")
    replies = db.relationship("Review", cascade="all, delete-orphan")

    @property
    def id(self):
        return self.review_id

    @property
    def course_id(self):
        return self.section.course_id if self.section else None

    @property
    def language(self):
        return "English"
