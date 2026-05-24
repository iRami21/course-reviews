from datetime import datetime

from flask_login import UserMixin
from flask_sqlalchemy import SQLAlchemy


db = SQLAlchemy()


class User(UserMixin, db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    avatar_animal = db.Column(db.String(32), default="question")
    gender = db.Column(db.String(16), default="undisclosed")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    reviews = db.relationship(
        "Review",
        back_populates="author",
        cascade="all, delete-orphan",
    )


class Course(db.Model):
    __tablename__ = "courses"

    __table_args__ = (
        db.UniqueConstraint("code", "year", "semester", name="uq_course_code_term"),
    )

    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(32), nullable=False, index=True)
    title = db.Column(db.String(200), nullable=False)
    title_zh = db.Column(db.String(200))
    professor = db.Column(db.String(120))
    department = db.Column(db.String(120))
    credits = db.Column(db.Integer)
    year = db.Column(db.Integer, index=True)
    semester = db.Column(db.Integer)
    description = db.Column(db.Text)

    reviews = db.relationship(
        "Review",
        back_populates="course",
        cascade="all, delete-orphan",
    )


class Review(db.Model):
    __tablename__ = "reviews"

    id = db.Column(db.Integer, primary_key=True)
    course_id = db.Column(
        db.Integer,
        db.ForeignKey("courses.id"),
        nullable=False,
        index=True,
    )
    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False,
        index=True,
    )
    rating = db.Column(db.Integer, nullable=False)
    language = db.Column(db.String(32), default="English")
    text = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    course = db.relationship("Course", back_populates="reviews")
    author = db.relationship("User", back_populates="reviews")
