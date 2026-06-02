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
    role = db.Column(db.String(16), default="student")

    reviews = db.relationship(
        "Review",
        back_populates="author",
        cascade="all, delete-orphan",
    )
    replies = db.relationship(
        "ReviewReply",
        back_populates="author",
        cascade="all, delete-orphan",
    )
    reactions = db.relationship(
        "ReviewReaction",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    favorites = db.relationship(
        "Favorite",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    notifications = db.relationship(
        "Notification",
        back_populates="user",
        cascade="all, delete-orphan",
        order_by="Notification.created_at.desc()",
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
    grade = db.Column(db.String(16))
    requirement = db.Column(db.String(16))
    english_taught = db.Column(db.Boolean, default=False)
    description = db.Column(db.Text)

    reviews = db.relationship(
        "Review",
        back_populates="course",
        cascade="all, delete-orphan",
    )
    favorites = db.relationship(
        "Favorite",
        back_populates="course",
        cascade="all, delete-orphan",
    )


class Favorite(db.Model):
    __tablename__ = "favorites"

    __table_args__ = (
        db.UniqueConstraint("user_id", "course_id", name="uq_favorite_user_course"),
    )

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False,
        index=True,
    )
    course_id = db.Column(
        db.Integer,
        db.ForeignKey("courses.id"),
        nullable=False,
        index=True,
    )
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship("User", back_populates="favorites")
    course = db.relationship("Course", back_populates="favorites")


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
    is_visible = db.Column(db.Boolean, default=True)
    course = db.relationship("Course", back_populates="reviews")
    author = db.relationship("User", back_populates="reviews")
    replies = db.relationship(
        "ReviewReply",
        back_populates="review",
        cascade="all, delete-orphan",
        order_by="ReviewReply.created_at.asc()",
    )
    reactions = db.relationship(
        "ReviewReaction",
        back_populates="review",
        cascade="all, delete-orphan",
    )


class ReviewReply(db.Model):
    __tablename__ = "review_replies"

    id = db.Column(db.Integer, primary_key=True)
    review_id = db.Column(
        db.Integer,
        db.ForeignKey("reviews.id"),
        nullable=False,
        index=True,
    )
    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False,
        index=True,
    )
    text = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_visible = db.Column(db.Boolean, default=True)

    review = db.relationship("Review", back_populates="replies")
    author = db.relationship("User", back_populates="replies")
    reactions = db.relationship(
        "ReviewReaction",
        back_populates="reply",
        cascade="all, delete-orphan",
    )


class ReviewReaction(db.Model):
    __tablename__ = "review_reactions"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False,
        index=True,
    )
    review_id = db.Column(
        db.Integer,
        db.ForeignKey("reviews.id"),
        nullable=True,
        index=True,
    )
    reply_id = db.Column(
        db.Integer,
        db.ForeignKey("review_replies.id"),
        nullable=True,
        index=True,
    )
    reaction = db.Column(db.String(16), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship("User", back_populates="reactions")
    review = db.relationship("Review", back_populates="reactions")
    reply = db.relationship("ReviewReply", back_populates="reactions")


class Notification(db.Model):
    __tablename__ = "notifications"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False,
        index=True,
    )
    category = db.Column(db.String(32), nullable=False, default="notification")
    message = db.Column(db.Text, nullable=False)
    link = db.Column(db.String(255), default="")
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship("User", back_populates="notifications")
