import json
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

    # 你剛剛加的新欄位
    avatar_animal = db.Column("avatarAnimal", db.Text, default="question")
    gender = db.Column("gender", db.Text, default="undisclosed")

    # 👇 拜託把這三行加回來！這是系統辨識使用者身份的關鍵橋樑
    @property
    def id(self):
        return self.user_id

    # 下面的關聯保持原樣
    reviews = db.relationship("Review", back_populates="author")
    review_reactions = db.relationship("ReviewReaction", back_populates="user")
    favorites = db.relationship("Favorite", back_populates="user", cascade="all, delete-orphan")
    notifications = db.relationship(
        "Notification",
        back_populates="user",
        cascade="all, delete-orphan",
        order_by="Notification.created_at.desc()",
    )


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
    grade = db.Column(db.String(16))
    requirement = db.Column(db.String(16))
    english_taught = db.Column(db.Boolean, default=False)

    # year/semester 從最新 Section 動態取得
    @property
    def year(self):
        if self.sections:
            years = [s.roc_year for s in self.sections if s.roc_year]
            return max(years) if years else 0
        return 0

    @property
    def semester(self):
        if self.sections:
            sections_list = [s for s in self.sections if s.roc_year and s.term]
            if sections_list:
                return max(sections_list, key=lambda s: s.roc_year * 10 + s.term).term
        return 0

    # description 欄位在 DB 不存在，用 property 安全橋接
    @property
    def description(self):
        return None

    @description.setter
    def description(self, value):
        pass

    offers = db.relationship("Offer", cascade="all, delete-orphan")
    departments = association_proxy("offers", "department")
    sections = db.relationship(
        "Section",
        back_populates="course",
        cascade="all, delete-orphan",
        order_by="desc(Section.roc_year), desc(Section.term)",
    )
    favorites = db.relationship(
        "Favorite",
        back_populates="course",
        cascade="all, delete-orphan",
    )

    @property
    def title(self):
        """前端有時會呼叫 course.title，對應 courseName"""
        return self.name

    @property
    def title_zh(self):
        return ""

    @property
    def professor(self):
        names = []
        for section in self.sections:
            for instructor in section.instructors:
                if instructor:
                    names.append(instructor.name)
        return ", ".join(dict.fromkeys(names))

    @property
    def latest_section(self):
        return self.sections[0] if self.sections else None

    @property
    def department(self):
        names = [d.name for d in self.departments if d]
        return ", ".join(dict.fromkeys(names))


class Favorite(db.Model):
    __tablename__ = "CourseFavorite"

    __table_args__ = (
        db.UniqueConstraint("courseDbId", "userId", name="uq_favorite_user_course"),
    )

    id = db.Column("favoriteId", db.Integer, primary_key=True)
    user_id = db.Column(
        "userId",
        db.Integer,
        db.ForeignKey("User.userId"),
        nullable=False,
        index=True,
    )
    course_id = db.Column(
        "courseDbId",
        db.Integer,
        db.ForeignKey("Course.courseDbId"),
        nullable=False,
        index=True,
    )
    created_at = db.Column("timestamp", db.DateTime, default=datetime.utcnow)

    user = db.relationship("User", back_populates="favorites")
    course = db.relationship("Course", back_populates="favorites")


class Review(db.Model):
    __tablename__ = "Review"
    
    __table_args__ = (
        db.UniqueConstraint("sectionId", "userId", name="uq_user_section_review"),
    )
    review_id = db.Column("reviewId", db.Integer, primary_key=True)
    section_id = db.Column("sectionId", db.Integer, db.ForeignKey("Section.sectionId"), nullable=False, index=True)
    user_id = db.Column("userId", db.Integer, db.ForeignKey("User.userId"), nullable=False, index=True)

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
    rating_quality = db.Column("ratingQuality", db.Integer)
    rating_sweetness = db.Column("ratingSweetness", db.Integer)
    rating_coolness = db.Column("ratingCoolness", db.Integer)
    rating_solidity = db.Column("ratingSolidity", db.Integer)
    text = db.Column("reviewContent", db.Text, nullable=False)
    reaction_counts = db.Column("reactionCounts", db.Text, nullable=False, default="{}")
    is_visible = db.Column(db.Boolean, default=True)

    section = db.relationship("Section", back_populates="reviews")
    author = db.relationship("User", back_populates="reviews")
    parent = db.relationship(
        "Review",
        remote_side=[review_id],
        back_populates="replies",
    )
    replies = db.relationship(
        "Review",
        back_populates="parent",
        cascade="all, delete-orphan",
        foreign_keys=[parent_id],
    )
    reactions = db.relationship("ReviewReaction", back_populates="review", cascade="all, delete-orphan")
    review_replies = db.relationship("ReviewReply", back_populates="review", cascade="all, delete-orphan")

    @property
    def id(self):
        return self.review_id

    @property
    def course_id(self):
        return self.section.course_id if self.section else None

    @property
    def course(self):
        return self.section.course if self.section else None

    @property
    def language(self):
        return "English"

    @property
    def reaction_totals(self):
        if not self.reaction_counts:
            return {}
        try:
            return json.loads(self.reaction_counts)
        except (TypeError, ValueError):
            return {}


class ReviewReply(db.Model):
    __tablename__ = "ReviewReply"

    reply_id = db.Column("replyId", db.Integer, primary_key=True)
    review_id = db.Column(
        "reviewId",
        db.Integer,
        db.ForeignKey("Review.reviewId"),
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
    text = db.Column("replyContent", db.Text, nullable=False)
    created_at = db.Column("timestamp", db.DateTime, default=datetime.utcnow)
    reaction_counts = db.Column("reactionCounts", db.Text, nullable=False, default="{}")
    user_reactions = db.Column("userReactions", db.Text, nullable=False, default="{}")

    review = db.relationship("Review", back_populates="review_replies")
    author = db.relationship("User")

    @property
    def id(self):
        return self.reply_id


class ReviewReaction(db.Model):
    __tablename__ = "ReviewReaction"

    reaction_id = db.Column("reactionId", db.Integer, primary_key=True)
    review_id = db.Column(
        "reviewId",
        db.Integer,
        db.ForeignKey("Review.reviewId"),
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
    emoji = db.Column(db.String(16), nullable=False)
    created_at = db.Column("timestamp", db.DateTime, default=datetime.utcnow)

    review = db.relationship("Review", back_populates="reactions")
    user = db.relationship("User", back_populates="review_reactions")

    __table_args__ = (
        db.UniqueConstraint("reviewId", "userId", name="uq_review_reaction_user"),
    )


class Notification(db.Model):
    __tablename__ = "notifications"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer,
        db.ForeignKey("User.userId"),
        nullable=False,
        index=True,
    )
    category = db.Column(db.String(32), nullable=False, default="notification")
    message = db.Column(db.Text, nullable=False)
    link = db.Column(db.String(255), default="")
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship("User", back_populates="notifications")