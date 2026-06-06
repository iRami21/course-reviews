import json
from datetime import datetime

from flask_login import UserMixin
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.ext.associationproxy import association_proxy


db = SQLAlchemy()


class User(UserMixin, db.Model):
    __tablename__ = "User"

# 1. 💡 必須完全採用後端同學的欄位對應，否則新資料庫會噴 "no such column" 錯誤
    user_id = db.Column("userId", db.Integer, primary_key=True)
    username = db.Column("userName", db.Text, nullable=False)
    email = db.Column(db.Text, nullable=False)
    password_hash = db.Column("password", db.Text, nullable=False)
    role = db.Column(db.Text, nullable=False, default="student")
    dept_id = db.Column("deptId", db.Integer, db.ForeignKey("Department.deptId"))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # 2. 💡 安全相容機制：後端同學將主鍵改名為 user_id，
    # 補上這個 property 可以確保 Flask-Login 的 current_user.id 依然通行無阻！
    @property
    def id(self):
        return self.user_id

    # 3. 💡 前後端完美橋樑：既然新資料庫實體欄位拔掉了頭像與性別，
    # 我們用虛擬屬性（Property）給予安全預設值，徹底防禦前端評價區破圖或報錯！
    @property
    def avatar_animal(self):
        return "question"

    @property
    def gender(self):
        return "undisclosed"

    reviews = db.relationship("Review", back_populates="author")
    review_reactions = db.relationship("ReviewReaction", back_populates="user")
    course_favorites = db.relationship("CourseFavorite", back_populates="user", cascade="all, delete-orphan")

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
# 1. 💡 必須採用後端同學的新實體欄位，以符合 12354.db 的資料表結構
    course_type = db.Column("courseType", db.Text)
    year_level = db.Column("yearLevel", db.Integer)
    description = db.Column(db.Text)  # 保留此欄位供課程詳情與敘述使用

    # 2. 💡 完美相容橋樑：因為學年與學期移到了 Section 模型，我們透過動態屬性（Property）
    # 自動去撈該課程最新開課的學年與學期，這樣你前面寫的搜尋引擎與動態 payload 完全不用改！
    @property
    def year(self):
        if hasattr(self, 'sections') and self.sections:
            years = [s.roc_year for s in self.sections if getattr(s, 'roc_year', None)]
            return max(years) if years else 0
        return 0

    @property
    def semester(self):
        if hasattr(self, 'sections') and self.sections:
            # 找到最新學年下的最新學期
            sections_list = [s for s in self.sections if getattr(s, 'roc_year', None) and getattr(s, 'term', None)]
            if sections_list:
                latest_section = max(sections_list, key=lambda s: (s.roc_year * 10 + s.term))
                return latest_section.term
        return 0

    # 3. 💡 自動轉換機制：將後端同學的整數年級與必選修，自動轉換回你原本寫的字串格式
    # 這樣前端卡片上的「3年級」、「必修」等精美標籤就能完美活下來！
    @property
    def grade(self):
        return f"{self.year_level}年級" if self.year_level else ""

    @property
    def requirement(self):
        return self.course_type or ""

    @property
    def english_taught(self):
        # 若新資料庫將此欄位移至他處，預設給予 False 作為前端安全防護，亦可依需求調整
        return False
    
    offers = db.relationship("Offer", cascade="all, delete-orphan")
    favorites = db.relationship("CourseFavorite", back_populates="course", cascade="all, delete-orphan")
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


class CourseFavorite(db.Model):
    __tablename__ = "CourseFavorite"

    favorite_id = db.Column("favoriteId", db.Integer, primary_key=True)
    course_id = db.Column(
        "courseDbId",
        db.Integer,
        db.ForeignKey("Course.courseDbId"),
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
    created_at = db.Column("timestamp", db.DateTime, default=datetime.utcnow)

    course = db.relationship("Course", back_populates="favorites")
    user = db.relationship("User", back_populates="course_favorites")

    __table_args__ = (
        db.UniqueConstraint("courseDbId", "userId", name="uq_course_favorite_user"),
    )


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
    reaction_counts = db.Column("reactionCounts", db.Text, nullable=False, default="{}")

    section = db.relationship("Section", back_populates="reviews")
    author = db.relationship("User", back_populates="reviews")
    
    # 💡 採用後端同學進階的自我關聯（Self-referential）設計，優雅處理巢狀回覆
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

    @property
    def id(self):
        return self.review_id

    @property
    def course_id(self):
        return self.section.course_id if self.section else None

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


# 💡 關鍵救援：完美救回被後端同學意外漏掉的 Notification 模型！
# 並將 user_id 的外鍵同步修正為新版的 "User.userId" 確保資料庫關聯正常運作。
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