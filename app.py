import json
import os
import re

from flask import Flask, flash, jsonify, redirect, render_template, request, url_for
from flask_login import (
    LoginManager,
    current_user,
    login_required,
    login_user,
    logout_user,
)
from sqlalchemy import and_, func, or_, text
from sqlalchemy.exc import IntegrityError
from werkzeug.security import check_password_hash, generate_password_hash

from models import Course, Favorite, Notification, Review, ReviewReaction, ReviewReply, User, db


DEPARTMENT_CATEGORY_ORDER = [
    "通識",
    "大學部",
    "碩士班",
    "碩專班",
    "博士班",
    "校際",
    "其他",
]

DEPARTMENT_GROUP_FILTERS = {
    "跨院選修": lambda dept: dept.startswith("跨院選修"),
    "博雅": lambda dept: dept.startswith("博雅"),
    "跨院EAP/ESP": lambda dept: dept in {"跨院EAP", "跨院ESP"},
    "運動健康": lambda dept: dept.startswith("運動健康") or dept.startswith("運動進階"),
    "英文": lambda dept: dept.startswith("英文"),
}

OTHER_DEPARTMENT_ORDER = [
    "AI聯盟(學)",
    "AI聯盟(碩)",
    "中學學程",
    "普通物理小組",
    "外籍華語",
    "應用性課程",
    "西灣學院",
]

HIDDEN_PROFESSOR_NAMES = {
    "待聘",
    "AI聯盟教師",
    "IGER跨校通識聯盟教師",
    "華語中心兼任教師",
    "校際選課",
}


def parse_term_from_filename(path):
    match = re.search(r"_(\d{4})\.db$", path.name)
    if not match:
        return None, None

    term = match.group(1)
    roc_year = int(term[:3])
    semester = int(term[3])
    return roc_year, semester


def split_course_name(raw):
    if not raw:
        return "", ""

    parts = [part.strip() for part in str(raw).splitlines() if part.strip()]
    if not parts:
        return "", ""

    if len(parts) == 1:
        return parts[0], ""

    return " ".join(parts[1:]), parts[0]


def parse_credits(value):
    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None
    try:
        return int(float(text))
    except ValueError:
        return None


def is_valid_email(email):
    return re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email or "") is not None


def parse_sport_activity(title_zh):
    if not title_zh:
        return ""

    parts = re.split(r"[：:]", str(title_zh), maxsplit=1)
    return parts[1].strip() if len(parts) > 1 else str(title_zh).strip()


def normalize_grade(value):
    grade = str(value or "").strip()
    return grade if grade and grade != "0" else None


def parse_requirement(value):
    if value is None:
        return None

    try:
        return "必修" if bool(int(value)) else "選修"
    except (TypeError, ValueError):
        return None


def parse_bool(value):
    if value is None:
        return False

    try:
        return bool(int(value))
    except (TypeError, ValueError):
        return str(value).strip().lower() in {"true", "yes", "y", "1"}


def format_grade_tag(grade):
    if not grade:
        return None

    return f"{grade}年級" if str(grade).isdigit() else str(grade)


def clean_professor_name(professor):
    names = [
        name.strip()
        for name in re.split(r"[,，、]", professor or "")
        if name.strip()
    ]
    visible_names = [
        name for name in names if name not in HIDDEN_PROFESSOR_NAMES
    ]
    return ",".join(visible_names)


def classify_department(department):
    dept = department or ""
    if dept.startswith("校際"):
        return "校際"

    if "AI聯盟" in dept or dept == "中學學程":
        return "其他"

    if dept in {"普通物理小組", "外籍華語", "應用性課程", "西灣學院"}:
        return "其他"

    if dept == "國際經營學程":
        return "大學部"

    if dept == "前瞻應材":
        return "碩士班"

    general_terms = [
        "博雅",
        "中文思辨",
        "英文初級",
        "英文中級",
        "英文中高級",
        "英文高級",
        "服務學習",
        "運動健康",
        "運動進階",
        "跨院選修",
        "跨院EAP",
        "跨院ESP",
    ]
    if any(term in dept for term in general_terms):
        return "通識"

    if "碩專" in dept or "EMBA" in dept or "EMPP" in dept:
        return "碩專班"

    if "博" in dept or "博士" in dept:
        return "博士班"

    master_terms = ["碩", "所", "研究所", "產碩", "碩程", "(碩)", "（碩）"]
    if any(term in dept for term in master_terms):
        return "碩士班"

    undergrad_terms = [
        "系",
        "學士",
        "學士學程",
        "人科學程",
        "(學)",
        "（學）",
        "全英班",
        "院",
    ]
    if any(term in dept for term in undergrad_terms):
        return "大學部"

    return "其他"


def create_app():
    app = Flask(__name__, static_folder="static", template_folder="templates")
    app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "dev")

    db_path = os.path.join(app.root_path, "12354.db")
    app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{db_path}"
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    db.init_app(app)

    login_manager = LoginManager()
    login_manager.login_view = "login"
    login_manager.init_app(app)

    @login_manager.unauthorized_handler
    def handle_unauthorized():
        if request.path.startswith("/api/"):
            return jsonify({"error": "Authentication required."}), 401
        return redirect(url_for("login", next=request.path))

    def get_table_columns(table_name):
        return {
            row[1]
            for row in db.session.execute(text(f"PRAGMA table_info({table_name})")).all()
        }

    def ensure_app_schema():
        user_columns = get_table_columns("users")
        if "role" not in user_columns:
            db.session.execute(
                text("ALTER TABLE users ADD COLUMN role VARCHAR(16) DEFAULT 'student'")
            )

        review_columns = get_table_columns("reviews")
        if "is_visible" not in review_columns:
            db.session.execute(
                text("ALTER TABLE reviews ADD COLUMN is_visible BOOLEAN DEFAULT 1")
            )

        db.session.commit()

    def ensure_course_schema():
        columns = get_table_columns("courses")
        if "grade" not in columns:
            db.session.execute(text("ALTER TABLE courses ADD COLUMN grade VARCHAR(16)"))
        if "requirement" not in columns:
            db.session.execute(
                text("ALTER TABLE courses ADD COLUMN requirement VARCHAR(16)")
            )
        if "english_taught" not in columns:
            db.session.execute(
                text("ALTER TABLE courses ADD COLUMN english_taught BOOLEAN DEFAULT 0")
            )
        db.session.commit()

    def ensure_admin_user():
        admin_username = os.environ.get("ADMIN_USERNAME", "admin")
        admin_email = os.environ.get("ADMIN_EMAIL", "admin@example.com")
        admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")

        user_by_username = User.query.filter_by(username=admin_username).first()
        user_by_email = User.query.filter_by(email=admin_email).first()

        if user_by_username:
            if user_by_username.role != "admin":
                user_by_username.role = "admin"
                db.session.commit()
            return

        if user_by_email:
            if user_by_email.role != "admin":
                user_by_email.role = "admin"
                db.session.commit()
            return

        admin_user = User(
            username=admin_username,
            email=admin_email,
            password_hash=generate_password_hash(admin_password, method="pbkdf2:sha256"),
            role="admin",
        )
        db.session.add(admin_user)
        db.session.commit()

    with app.app_context():
        db.create_all()
        ensure_app_schema()
        ensure_course_schema()
        ensure_admin_user()

    @login_manager.user_loader
    def load_user(user_id):
        try:
            return db.session.get(User, int(user_id))
        except (TypeError, ValueError):
            return None

    def ensure_review_schema():
        inspector = inspect(db.engine)
        columns = {column["name"] for column in inspector.get_columns("Review")}
        if "reactionCounts" not in columns:
            db.session.execute(
                text("ALTER TABLE Review ADD COLUMN reactionCounts TEXT NOT NULL DEFAULT '{}'")
            )
        db.session.commit()

        rows = Review.query.filter((Review.reaction_counts.is_(None)) | (Review.reaction_counts == ""))
        for review in rows:
            review.reaction_counts = json.dumps({})
        db.session.commit()

    with app.app_context():
        db.create_all()
        ensure_review_schema()

    @app.route("/")
    def index():
        payload = get_courses_payload(page=1, per_page=100)
        return render_template(
            "index.html",
            courses_json=payload["courses"],
            reviews_json=payload["reviews"],
            course_pagination_json=payload["pagination"],
            department_groups=get_department_groups(),
            sport_activity_options=get_sport_activity_options(),
            current_user_json=(
                serialize_user(current_user)
                if current_user.is_authenticated
                else None
            ),
        )

    def get_department_groups():
        rows = (
            db.session.query(Course.department, func.count(Course.id).label("total"))
            .filter(Course.department.isnot(None), Course.department != "")
            .group_by(Course.department)
            .order_by(func.count(Course.id).desc(), Course.department.asc())
            .all()
        )
        groups = {category: [] for category in DEPARTMENT_CATEGORY_ORDER}
        for department, total in rows:
            groups[classify_department(department)].append({
                "name": department,
                "count": total,
            })
        groups["其他"].sort(
            key=lambda item: (
                OTHER_DEPARTMENT_ORDER.index(item["name"])
                if item["name"] in OTHER_DEPARTMENT_ORDER
                else len(OTHER_DEPARTMENT_ORDER),
                item["name"],
            )
        )
        return groups

    def get_departments_by_category(category):
        if category not in DEPARTMENT_CATEGORY_ORDER:
            return []

        return [
            item["name"]
            for item in get_department_groups().get(category, [])
        ]

    def get_departments_by_group(department_group):
        matcher = DEPARTMENT_GROUP_FILTERS.get(department_group)
        if not matcher:
            return []

        return [
            item["name"]
            for items in get_department_groups().values()
            for item in items
            if matcher(item["name"])
        ]

    def get_sport_activity_options():
        rows = (
            db.session.query(Course.title_zh, func.count(Course.id).label("total"))
            .filter(Course.department.in_(["運動健康(必)", "運動進階(選)"]))
            .group_by(Course.title_zh)
            .order_by(func.count(Course.id).desc(), Course.title_zh.asc())
            .all()
        )
        activities = {}
        for title_zh, total in rows:
            activity = parse_sport_activity(title_zh)
            if activity:
                activities[activity] = activities.get(activity, 0) + total

        preferred = ["特別班", "體適能", "初級游泳"]
        return sorted(
            activities,
            key=lambda activity: (
                preferred.index(activity)
                if activity in preferred
                else len(preferred),
                -activities[activity],
                activity,
            ),
        )

    def serialize_user(user):
        return {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "avatarAnimal": user.avatar_animal,
            "gender": user.gender,
            "role": user.role or "student",
        }


    def favorite_counts_for_courses(course_ids=None):
        query = db.session.query(CourseFavorite.course_id, func.count(CourseFavorite.favorite_id))
        if course_ids:
            query = query.filter(CourseFavorite.course_id.in_(course_ids))
        rows = query.group_by(CourseFavorite.course_id).all()
        return {course_id: count for course_id, count in rows}

    def user_favorite_course_ids(course_ids=None):
        if not current_user.is_authenticated:
            return set()
        query = db.session.query(CourseFavorite.course_id).filter(
            CourseFavorite.user_id == current_user.id
        )
        if course_ids:
            query = query.filter(CourseFavorite.course_id.in_(course_ids))
        return {course_id for (course_id,) in query.all()}

    def serialize_course(course, review_stats=None, favorite_counts=None, favorite_course_ids=None):
        review_count = 0
        average_rating = 0
        if review_stats is not None:
            review_count, average_rating = review_stats.get(course.id, (0, 0))
        else:
            reviews = reviews_for_course(course.id).all()
            ratings = [review.rating for review in reviews if review.rating]
            review_count = len(reviews)
            average_rating = sum(ratings) / len(ratings) if ratings else 0

        if favorite_counts is not None:
            save_count = favorite_counts.get(course.id, 0)
        else:
            save_count = CourseFavorite.query.filter_by(course_id=course.id).count()

        if favorite_course_ids is not None:
            followed = course.id in favorite_course_ids
        else:
            followed = (
                current_user.is_authenticated
                and CourseFavorite.query.filter_by(course_id=course.id, user_id=current_user.id).first() is not None
            )

        # 💡 完美保留你原本寫的：把丟給前端的文字做清洗與格式化，這樣你的前端排版才不會壞掉！
        grade_tag = format_grade_tag(course.grade)
        professor_name = clean_professor_name(course.professor)


        return {
            "id": course.id,
            "code": course.code,
            "title": course.title,
            "titleZh": course.title_zh or "",
            "professor": professor_name,
            "department": course.department or "General",
            "credits": course.credits or 0,
            "grade": course.grade or "",
            "requirement": course.requirement or "",
            "englishTaught": bool(course.english_taught),
            "rating": round(float(average_rating or 0), 1),
            "reviewCount": int(review_count or 0),
            "followed": followed,
            "saveCount": int(save_count or 0),
            "year": course.year or 0,
            "semester": course.semester or 0,
            # 💡 完美保留你精心設計的豐富標籤，讓前端的標籤搜尋功能可以繼續點擊！
            "tags": [
                tag
                for tag in [
                    course.department,
                    f"{course.year} S{course.semester}" if course.year and course.semester else None,
                    grade_tag,
                    course.requirement,
                    "全英授課" if course.english_taught else None,
                ]
                if tag
            ],
            "description": course.description or "No description available.",
        }

    def summarize_reactions(reactions):
        counts = {}
        for reaction in reactions or []:
            if not reaction.reaction:
                continue
            counts[reaction.reaction] = counts.get(reaction.reaction, 0) + 1
        return [
            {"reaction": reaction, "count": count}
            for reaction, count in sorted(
                counts.items(),
                key=lambda item: (-item[1], item[0]),
            )
        ]

    def serialize_review(review, current_user_id=None):
        author = review.author
        reaction_totals = review.reaction_totals or {}
        user_reaction = None
        if current_user_id is not None:
            user_reaction = next(
                (reaction.emoji for reaction in review.reactions if reaction.user_id == current_user_id),
                None,
            )

        section_label = None
        if review.section:
            section_label = f"{review.section.roc_year} S{review.section.term}"

        return {
            "id": str(review.id),
            "author": author.username if author else "Anonymous",
            # 💡 完美救回被後端刪除的頭像結構，防止前端大頭貼破圖！
            "avatar": {
                "avatarAnimal": author.avatar_animal if author else "question",
                "gender": author.gender if author else "undisclosed",
            },
            "rating": review.rating,
            "date": review.created_at.strftime("%Y-%m-%d"),
            "sectionLabel": section_label,
            "language": review.language or "English",
            "text": review.text,
            "likes": reaction_totals.get("❤️", 0),
            "liked": bool(user_reaction),
            "reaction": user_reaction or "",
            "reactionCounts": reaction_totals,
            "reactionSummary": summarize_reactions(review.reactions),
            "parentId": getattr(review, 'parent_id', None),
            "replies": [
                serialize_review(reply, current_user_id=current_user_id)
                for reply in sorted(review.replies, key=lambda item: item.created_at or review.created_at)
            ],
        }

    # =========================================================================
    # 🔽 以下完整保留後端同學寫的效能優化與子查詢函式，確保後端運算不崩潰
    # =========================================================================

    def build_search_pattern(term):
        cleaned = term.strip()
        if not cleaned:
            return None
        if len(cleaned) == 1:
            return f"{cleaned}%"
        return f"%{cleaned}%"

    def build_section_filter(year_tokens=None, semester_tokens=None):
        year_values = [int(value) for value in (year_tokens or [])]
        semester_values = [int(value) for value in (semester_tokens or [])]

        if not year_values and not semester_values:
            return None

        conditions = []
        if year_values:
            conditions.append(Section.roc_year.in_(year_values))
        if semester_values:
            conditions.append(Section.term.in_(semester_values))

        return Course.sections.any(and_(*conditions))

    def course_query_with_details():
        return Course.query.options(
            selectinload(Course.offers).selectinload(Offer.department),
            selectinload(Course.sections)
            .selectinload(Section.teaches)
            .selectinload(Teach.instructor),
        )

    def course_review_stats(course_ids=None):
        query = (
            db.session.query(
                Section.course_id,
                func.count(Review.review_id),
                func.avg(Review.rating),
            )
            .join(Review, Review.section_id == Section.section_id)
            .filter(Review.parent_id.is_(None))
        )
        if course_ids:
            query = query.filter(Section.course_id.in_(course_ids))
        rows = query.group_by(Section.course_id).all()
        return {course_id: (count, average or 0) for course_id, count, average in rows}

    def review_stats_subquery():
        return (
            db.session.query(
                Section.course_id.label("course_id"),
                func.count(Review.review_id).label("review_count"),
                func.avg(Review.rating).label("average_rating"),
            )
            .join(Review, Review.section_id == Section.section_id)
            .filter(Review.parent_id.is_(None))
            .group_by(Section.course_id)
            .subquery()
        )

    def favorite_stats_subquery():
        return (
            db.session.query(
                CourseFavorite.course_id.label("course_id"),
                func.count(CourseFavorite.favorite_id).label("save_count"),
            )
            .group_by(CourseFavorite.course_id)
            .subquery()
        )

    def latest_section_subquery():
        return (
            db.session.query(
                Section.course_id.label("course_id"),
                func.max(Section.roc_year * 10 + Section.term).label("latest_key"),
            )
            .group_by(Section.course_id)
            .subquery()
        )

    def filter_by_offered_section(courses_query, year=None, semester=None):
        section_filters = []
        if year is not None:
            section_filters.append(Section.roc_year == year)
        if semester is not None:
            section_filters.append(Section.term == semester)
        if not section_filters:
            return courses_query
        return courses_query.filter(Course.sections.any(and_(*section_filters)))

    def reviews_for_course(course_id):
        return (
            Review.query.options(
                selectinload(Review.author),
                selectinload(Review.section),
                selectinload(Review.reactions),
                selectinload(Review.replies).selectinload(Review.author),
                selectinload(Review.replies).selectinload(Review.reactions),
            )
            .join(Section)
            .filter(Section.course_id == course_id, Review.parent_id.is_(None))
            .order_by(Review.created_at.desc())
        )

    # =========================================================================
    # 🔽 完美守住你 HEAD 原有的通知功能、搜尋資料包與 API 路由，防止功能人間蒸發
    # =========================================================================

    def save_notification(user_id, message, link="", category="notification"):
        if not user_id or not message:
            return None
        notification = Notification(
            user_id=user_id,
            category=category,
            message=message,
            link=link or "",
            is_read=False,
        )
        db.session.add(notification)
        return notification

    def serialize_notification(notification):
        return {
            "id": str(notification.id),
            "message": notification.message,
            "link": notification.link or "",
            "category": notification.category,
            "isRead": notification.is_read,
            "createdAt": notification.created_at.strftime("%Y-%m-%d %H:%M"),
        }

    def get_user_notifications(limit=30):
        if not current_user.is_authenticated:
            return []
        return Notification.query.filter_by(user_id=current_user.id).order_by(Notification.created_at.desc()).limit(limit).all()

    def get_courses_payload(page=None, per_page=None):
        page = max(1, int(page or request.args.get("page", 1)))
        per_page = min(100, max(1, int(per_page or request.args.get("per_page", 100))))
        query_text = str(request.args.get("q", "")).strip()
        year = str(request.args.get("year", "")).strip()
        department_category = str(request.args.get("department_category", "")).strip()
        department_group = str(request.args.get("department_group", "")).strip()
        department = str(request.args.get("department", "")).strip()
        sport_activity = str(request.args.get("sport_activity", "")).strip()
        semester = str(request.args.get("semester", "")).strip()
        min_rating_raw = str(request.args.get("min_rating", "")).strip()
        sort_by = str(request.args.get("sort", "popular")).strip() or "popular"

        avg_rating = func.coalesce(func.avg(Review.rating), 0)
        review_count = func.count(Review.id)
        courses_query = Course.query.outerjoin(
            Review,
            and_(Review.course_id == Course.id, Review.is_visible.is_(True)),
        ).group_by(Course.id)

        filters = []
        if query_text:
            search_filters = []
            text_terms = []
            tokens = [token for token in re.split(r"\s+", query_text) if token]

            if query_text in {"必修", "選修"}:
                search_filters.append(Course.requirement == query_text)
            elif query_text == "全英授課":
                search_filters.append(Course.english_taught.is_(True))
            elif re.fullmatch(r"\d+年級", query_text):
                search_filters.append(Course.grade == query_text.replace("年級", ""))
            else:
                for token in tokens:
                    lower = token.lower()
                    if lower.isdigit():
                        search_filters.append(Course.year == int(lower))
                        continue

                    if lower in {"s1", "sem1", "semester1", "semester-1", "semester_1"}:
                        search_filters.append(Course.semester == 1)
                        continue
                    if lower in {"s2", "sem2", "semester2", "semester-2", "semester_2"}:
                        search_filters.append(Course.semester == 2)
                        continue

                    text_terms.append(token)

                for term in text_terms:
                    pattern = f"%{term}%"
                    search_filters.append(
                        or_(
                            Course.title.ilike(pattern),
                            Course.title_zh.ilike(pattern),
                            Course.code.ilike(pattern),
                            Course.department.ilike(pattern),
                            Course.professor.ilike(pattern),
                            Course.requirement.ilike(pattern),
                        )
                    )

            if search_filters:
                filters.extend(search_filters)
        if year:
            filters.append(Course.year == int(year))
        if department_category:
            category_departments = get_departments_by_category(department_category)
            if category_departments:
                filters.append(Course.department.in_(category_departments))
            else:
                filters.append(Course.department == "__NO_SUCH_DEPARTMENT__")
        if department_group:
            group_departments = get_departments_by_group(department_group)
            if group_departments:
                filters.append(Course.department.in_(group_departments))
            else:
                filters.append(Course.department == "__NO_SUCH_DEPARTMENT__")
        if department:
            filters.append(Course.department == department)
        if sport_activity:
            filters.append(
                or_(
                    Course.title_zh.ilike(f"%：{sport_activity}"),
                    Course.title_zh.ilike(f"%:{sport_activity}"),
                )
            )
        if semester:
            filters.append(Course.semester == int(semester))
        if filters:
            courses_query = courses_query.filter(and_(*filters))
        if min_rating_raw:
            courses_query = courses_query.having(avg_rating >= float(min_rating_raw))

        if sort_by == "latest":
            courses_query = courses_query.order_by(
                Course.year.desc(),
                Course.semester.desc(),
                Course.code.asc(),
            )
        elif sort_by == "rating":
            courses_query = courses_query.order_by(avg_rating.desc(), Course.code.asc())
        else:
            courses_query = courses_query.order_by(review_count.desc(), Course.code.asc())

        total = courses_query.count()
        total_pages = max(1, (total + per_page - 1) // per_page)
        page = min(page, total_pages)
        courses_list = courses_query.offset((page - 1) * per_page).limit(per_page).all()

        reviews_by_course = {}
        course_ids = [course.id for course in courses_list]
        favorite_counts = {}
        favorite_ids = set()
        if course_ids:
            for review in (
                Review.query.filter(
                    Review.course_id.in_(course_ids),
                    Review.is_visible.is_(True),
                )
                .order_by(Review.created_at.desc())
                .all()
            ):
                reviews_by_course.setdefault(str(review.course_id), []).append(
                    serialize_review(review)
                )
            favorite_counts = {
                course_id: total
                for course_id, total in (
                    db.session.query(Favorite.course_id, func.count(Favorite.id))
                    .filter(Favorite.course_id.in_(course_ids))
                    .group_by(Favorite.course_id)
                    .all()
                )
            }
            if current_user.is_authenticated:
                favorite_ids = {
                    course_id
                    for (course_id,) in (
                        db.session.query(Favorite.course_id)
                        .filter(
                            Favorite.user_id == current_user.id,
                            Favorite.course_id.in_(course_ids),
                        )
                        .all()
                    )
                }

        return {
            "courses": [
                serialize_course(course, favorite_counts, favorite_ids)
                for course in courses_list
            ],
            "reviews": reviews_by_course,
            "pagination": {
                "page": page,
                "perPage": per_page,
                "total": total,
                "totalPages": total_pages,
            },
        }

    @app.route("/api/courses")
    def api_courses():
        return jsonify(get_courses_payload())

    @app.route("/api/courses/<int:course_id>/favorite", methods=["POST"])
    @login_required
    def api_toggle_favorite(course_id):
        course = Course.query.get_or_404(course_id)
        favorite = Favorite.query.filter_by(
            user_id=current_user.id,
            course_id=course.id,
        ).first()

        if favorite:
            db.session.delete(favorite)
            followed = False
        else:
            db.session.add(Favorite(user_id=current_user.id, course_id=course.id))
            followed = True

        db.session.commit()
        save_count = Favorite.query.filter_by(course_id=course.id).count()
        return jsonify({
            "followed": followed,
            "saveCount": save_count,
            "course": serialize_course(
                course,
                {course.id: save_count},
                {course.id} if followed else set(),
            ),
        })
    @app.route("/courses")
    def courses():
        query = request.args.get("q", "").strip()
        courses_query = Course.query
        if query:
            tokens = [token for token in re.split(r"\s+", query) if token]
            filters = []
            text_terms = []
            year_tokens = []
            semester_tokens = []

            for token in tokens:
                lower = token.lower()
    
                if lower.isdigit() and len(lower) in {3, 4}:
                    year_val = int(lower)
                    if len(lower) == 4:
                        year_val -= 1911
                    search_filters.append(Course.year == year_val)
                    continue

                if lower in {"s1", "sem1", "semester1", "semester-1", "semester_1"}:
                    semester_tokens.append(1)
                    continue
                if lower in {"s2", "sem2", "semester2", "semester-2", "semester_2"}:
                    semester_tokens.append(2)
                    continue

                text_terms.append(token)

            section_filter = build_section_filter(year_tokens, semester_tokens)
            if section_filter is not None:
                filters.append(section_filter)

            for term in text_terms:
                pattern = build_search_pattern(term)
                if pattern is None:
                    continue
                filters.append(
                    or_(
                        Course.name.ilike(pattern),
                        Course.code.ilike(pattern),
                        Course.offers.any(
                            Offer.department.has(Department.name.ilike(pattern))
                        ),
                        Course.sections.any(
                            Section.teaches.any(
                                Teach.instructor.has(Instructor.name.ilike(pattern))
                            )
                        ),
                    )
                )

            if filters:
                courses_query = courses_query.filter(and_(*filters))

        courses_list = courses_query.order_by(Course.code).limit(300).all()
        favorite_counts = favorite_counts_for_courses([course.id for course in courses_list])
        return render_template(
            "courses.html",
            courses=courses_list,
            q=query,
            favorite_counts=favorite_counts,
        )

    @app.route("/api/courses")
    def api_courses():
        query = request.args.get("q", "").strip()
        department = request.args.get("department", "").strip()
        year = request.args.get("year", "").strip()
        semester = request.args.get("semester", "").strip()
        sort_by = request.args.get("sort", "popular").strip()
        min_rating_raw = request.args.get("min_rating", "").strip()
        page = max(request.args.get("page", 1, type=int), 1)
        per_page = request.args.get("per_page", 20, type=int)
        per_page = min(max(per_page, 1), 50)

        courses_query = course_query_with_details()
        if query:
            pattern = build_search_pattern(query)
            if pattern is not None:
                courses_query = courses_query.filter(
                    or_(
                        Course.name.ilike(pattern),
                        Course.code.ilike(pattern),
                        Course.offers.any(Offer.department.has(Department.name.ilike(pattern))),
                        Course.sections.any(
                            Section.teaches.any(
                                Teach.instructor.has(Instructor.name.ilike(pattern))
                            )
                        ),
                    )
                )

        if department:
            courses_query = courses_query.filter(
                Course.offers.any(Offer.department.has(Department.name == department))
            )
        year_value = None
        semester_value = None
        if year:
            try:
                year_value = int(year)
            except ValueError:
                return jsonify({"error": "Invalid year."}), 400
        if semester:
            try:
                semester_value = int(semester)
            except ValueError:
                return jsonify({"error": "Invalid semester."}), 400
        if year_value is not None or semester_value is not None:
            courses_query = filter_by_offered_section(
                courses_query,
                year=year_value,
                semester=semester_value,
            )

        stats = review_stats_subquery()
        if min_rating_raw:
            try:
                min_rating = float(min_rating_raw)
            except ValueError:
                return jsonify({"error": "Invalid minimum rating."}), 400
            courses_query = courses_query.outerjoin(stats, stats.c.course_id == Course.course_id)
            courses_query = courses_query.filter(
                func.coalesce(stats.c.average_rating, 0) >= min_rating
            )

        total = courses_query.order_by(None).count()
        total_pages = max(1, (total + per_page - 1) // per_page)
        page = min(page, total_pages)

        if sort_by in {"popular", "rating"} and min_rating_raw:
            sort_stats = stats
        elif sort_by in {"popular", "rating"}:
            sort_stats = review_stats_subquery()
            courses_query = courses_query.outerjoin(
                sort_stats,
                sort_stats.c.course_id == Course.course_id,
            )
        else:
            sort_stats = None

        if sort_by == "latest":
            latest = latest_section_subquery()
            courses_query = courses_query.outerjoin(latest, latest.c.course_id == Course.course_id)
            courses_query = courses_query.order_by(
                func.coalesce(latest.c.latest_key, 0).desc(),
                Course.code,
            )
        elif sort_by == "rating":
            courses_query = courses_query.order_by(
                func.coalesce(sort_stats.c.average_rating, 0).desc(),
                Course.code,
            )
        elif sort_by == "popular":
            favorite_stats = favorite_stats_subquery()
            courses_query = courses_query.outerjoin(
                favorite_stats,
                favorite_stats.c.course_id == Course.course_id,
            )
            courses_query = courses_query.order_by(
                func.coalesce(favorite_stats.c.save_count, 0).desc(),
                func.coalesce(sort_stats.c.review_count, 0).desc(),
                Course.code,
            )
        else:
            courses_query = courses_query.order_by(Course.code)

        courses_list = courses_query.offset((page - 1) * per_page).limit(per_page).all()
        course_ids = [course.id for course in courses_list]
        review_stats = course_review_stats(course_ids)
        favorite_counts = favorite_counts_for_courses(course_ids)
        favorite_course_ids = user_favorite_course_ids(course_ids)
        return jsonify(
            {
                "courses": [
                    serialize_course(
                        course,
                        review_stats=review_stats,
                        favorite_counts=favorite_counts,
                        favorite_course_ids=favorite_course_ids,
                    )
                    for course in courses_list
                ],
                "pagination": {
                    "page": page,
                    "perPage": per_page,
                    "total": total,
                    "totalPages": total_pages,
                },
            }
        )

    @app.route("/api/courses/<int:course_id>/favorite", methods=["POST"])
    @login_required
    def api_toggle_course_favorite(course_id):
        course = Course.query.get_or_404(course_id)
        payload = request.get_json(silent=True) or {}
        wanted = payload.get("followed")
        existing = CourseFavorite.query.filter_by(
            course_id=course.id,
            user_id=current_user.id,
        ).first()

        if wanted is None:
            should_follow = existing is None
        else:
            should_follow = bool(wanted)

        if should_follow and existing is None:
            db.session.add(CourseFavorite(course_id=course.id, user_id=current_user.id))
        elif not should_follow and existing is not None:
            db.session.delete(existing)

        db.session.commit()
        save_count = CourseFavorite.query.filter_by(course_id=course.id).count()
        return jsonify(
            {
                "courseId": course.id,
                "followed": should_follow,
                "saveCount": save_count,
            }
        )

    @app.route("/api/filter-options")
    def api_filter_options():
        years = [
            row[0]
            for row in db.session.query(Section.roc_year)
            .filter(Section.roc_year.isnot(None))
            .distinct()
            .order_by(Section.roc_year.desc())
            .all()
        ]
        semesters = [
            row[0]
            for row in db.session.query(Section.term)
            .filter(Section.term.isnot(None))
            .distinct()
            .order_by(Section.term)
            .all()
        ]
        departments = [
            row[0]
            for row in db.session.query(Department.name)
            .filter(Department.name.isnot(None), Department.name != "")
            .distinct()
            .order_by(Department.name)
            .all()
        ]
        return jsonify(
            {
                "years": years,
                "semesters": semesters,
                "departments": departments,
            }
        )

    @app.route("/courses/<int:course_id>")
    def course_detail(course_id):
        course = Course.query.get_or_404(course_id)

        reviews = reviews_for_course(course_id).all()

        return render_template(
            "course_detail.html",
            course=course,
            reviews=reviews,
        )

    @app.route("/api/courses/<int:course_id>/reviews")
    def api_course_reviews(course_id):
        course = Course.query.get_or_404(course_id)
        reviews = reviews_for_course(course_id).all()
        average_rating = (
            sum(review.rating for review in reviews if review.rating) / len(reviews)
            if reviews
            else 0
        )
        current_user_id = current_user.id if current_user.is_authenticated else None
        return jsonify(
            {
                "courseId": course.id,
                "reviewCount": len(reviews),
                "averageRating": round(float(average_rating), 1),
                "reviews": [serialize_review(review, current_user_id=current_user_id) for review in reviews],
            }
        )

    @app.route("/api/courses/<int:course_id>/reviews", methods=["POST"])
    @login_required
    def api_submit_course_review(course_id):
        course = Course.query.get_or_404(course_id)
        payload = request.get_json(silent=True) or {}
        comment = str(payload.get("comment", request.form.get("comment", ""))).strip()
        parent_id = payload.get("parentId")
        if parent_id in (None, ""):
            parent_id = None
        else:
            try:
                parent_id = int(parent_id)
            except (TypeError, ValueError):
                return jsonify({"error": "Parent review id must be an integer."}), 400

        if not comment:
            return jsonify({"error": "Review text is required."}), 400

        section = course.latest_section
        if not section:
            return jsonify({"error": "This course has no section to review."}), 400

        section_id = section.section_id
        rating = None
        if parent_id is None:
            rating_raw = str(payload.get("rating", request.form.get("rating", ""))).strip()
            try:
                rating = int(rating_raw)
            except ValueError:
                return jsonify({"error": "Rating must be a number between 1 and 5."}), 400
            if rating < 1 or rating > 5:
                return jsonify({"error": "Rating must be between 1 and 5."}), 400
        else:
            parent_review = Review.query.get(parent_id)
            if parent_review is None:
                return jsonify({"error": "Parent review not found."}), 404
            if parent_review.course_id != course.id:
                return jsonify({"error": "Parent review does not belong to this course."}), 400
            section_id = parent_review.section_id

        review = Review(
            section_id=section_id,
            user_id=current_user.id,
            parent_id=parent_id,
            rating=rating,
            text=comment,
        )
        db.session.add(review)
        db.session.commit()

        reviews = reviews_for_course(course_id).all()
        average_rating = (
            sum(review.rating for review in reviews if review.rating) / len(reviews)
            if reviews
            else 0
        )
        current_user_id = current_user.id if current_user.is_authenticated else None
        return jsonify(
            {
                "courseId": course.id,
                "reviewCount": len(reviews),
                "averageRating": round(float(average_rating), 1),
                "review": serialize_review(review, current_user_id=current_user_id),
                "reviews": [serialize_review(review_item, current_user_id=current_user_id) for review_item in reviews],
            }
        )

    @app.route("/api/courses/<int:course_id>/reviews/<int:review_id>", methods=["PATCH"])
    @login_required
    def api_update_review(course_id, review_id):
        course = Course.query.get_or_404(course_id)
        review = (
            Review.query.join(Section)
            .filter(Review.review_id == review_id, Section.course_id == course.id)
            .first_or_404()
        )
        if review.user_id != current_user.id:
            return jsonify({"error": "You can only edit your own review."}), 403

        payload = request.get_json(silent=True) or {}
        new_text = str(payload.get("text", "")).strip()
        if not new_text:
            return jsonify({"error": "Review text is required."}), 400

        review.text = new_text
        db.session.commit()

        reviews = reviews_for_course(course_id).all()
        average_rating = (
            sum(review_item.rating for review_item in reviews if review_item.rating) / len(reviews)
            if reviews
            else 0
        )
        current_user_id = current_user.id if current_user.is_authenticated else None
        return jsonify(
            {
                "courseId": course.id,
                "reviewCount": len(reviews),
                "averageRating": round(float(average_rating), 1),
                "review": serialize_review(review, current_user_id=current_user_id),
                "reviews": [serialize_review(review_item, current_user_id=current_user_id) for review_item in reviews],
            }
        )

    @app.route("/api/courses/<int:course_id>/reviews/<int:review_id>", methods=["DELETE"])
    @login_required
    def api_delete_review(course_id, review_id):
        course = Course.query.get_or_404(course_id)
        review = (
            Review.query.join(Section)
            .filter(Review.review_id == review_id, Section.course_id == course.id)
            .first_or_404()
        )
        if review.user_id != current_user.id:
            return jsonify({"error": "You can only delete your own review."}), 403

        db.session.delete(review)
        db.session.commit()

        reviews = reviews_for_course(course_id).all()
        average_rating = (
            sum(review_item.rating for review_item in reviews if review_item.rating) / len(reviews)
            if reviews
            else 0
        )
        current_user_id = current_user.id if current_user.is_authenticated else None
        return jsonify(
            {
                "courseId": course.id,
                "reviewCount": len(reviews),
                "averageRating": round(float(average_rating), 1),
                "review": serialize_review(review, current_user_id=current_user_id),
                "reviews": [serialize_review(review_item, current_user_id=current_user_id) for review_item in reviews],
            }
        )

    @app.route("/api/courses/<int:course_id>/reviews/<int:review_id>/reactions", methods=["POST"])
    @login_required
    def api_react_to_review(course_id, review_id):
        course = Course.query.get_or_404(course_id)
        review = (
            Review.query.join(Section)
            .filter(Review.review_id == review_id, Section.course_id == course.id)
            .first_or_404()
        )
        payload = request.get_json(silent=True) or {}
        reaction = str(payload.get("reaction", "")).strip()
        remove = bool(payload.get("remove"))
        allowed_reactions = {"❤️", "😮", "👍", "🔥"}

        if reaction not in allowed_reactions and not remove:
            return jsonify({"error": "Unsupported reaction."}), 400

        reaction_totals = review.reaction_totals or {}
        existing_reaction = (
            ReviewReaction.query.filter_by(review_id=review.id, user_id=current_user.id)
            .first()
        )

        if remove and existing_reaction:
            old_emoji = existing_reaction.emoji
            if old_emoji in reaction_totals:
                reaction_totals[old_emoji] = max(0, reaction_totals[old_emoji] - 1)
                if reaction_totals[old_emoji] == 0:
                    del reaction_totals[old_emoji]
            db.session.delete(existing_reaction)
        elif reaction in allowed_reactions:
            if existing_reaction is None:
                existing_reaction = ReviewReaction(review_id=review.id, user_id=current_user.id, emoji=reaction)
                db.session.add(existing_reaction)
                reaction_totals[reaction] = reaction_totals.get(reaction, 0) + 1
            elif existing_reaction.emoji == reaction:
                remove = True
                old_emoji = existing_reaction.emoji
                if old_emoji in reaction_totals:
                    reaction_totals[old_emoji] = max(0, reaction_totals[old_emoji] - 1)
                    if reaction_totals[old_emoji] == 0:
                        del reaction_totals[old_emoji]
                db.session.delete(existing_reaction)
                existing_reaction = None
            else:
                old_emoji = existing_reaction.emoji
                if old_emoji in reaction_totals:
                    reaction_totals[old_emoji] = max(0, reaction_totals[old_emoji] - 1)
                    if reaction_totals[old_emoji] == 0:
                        del reaction_totals[old_emoji]
                existing_reaction.emoji = reaction
                reaction_totals[reaction] = reaction_totals.get(reaction, 0) + 1

        review.reaction_counts = json.dumps(reaction_totals)
        db.session.commit()
        current_user_id = current_user.id if current_user.is_authenticated else None
        return jsonify(
            {
                "review": serialize_review(review, current_user_id=current_user_id),
                "reactionCounts": reaction_totals,
            }
        )

    @app.route("/courses/<int:course_id>/review", methods=["POST"])
    @login_required
    def submit_review(course_id):
        course = Course.query.get_or_404(course_id)
        section = course.latest_section
        if not section:
            flash("This course has no section to review.")
            return redirect(url_for("course_detail", course_id=course.id))

        rating_raw = request.form.get("rating", "").strip()
        comment = request.form.get("comment", "").strip()
        language = request.form.get("language", "English").strip() or "English"

        try:
            rating = int(rating_raw)
        except ValueError:
            flash("Rating must be a number between 1 and 5.")
            return redirect(url_for("course_detail", course_id=course.id))

        if rating < 1 or rating > 5:
            flash("Rating must be between 1 and 5.")
            return redirect(url_for("course_detail", course_id=course.id))

        if not comment:
            flash("Review text is required.")
            return redirect(url_for("course_detail", course_id=course.id))

        review = Review(
            section_id=section.section_id,
            user_id=current_user.id,
            rating=rating,
            text=comment,
        )
        db.session.add(review)
        db.session.commit()
        flash("Review submitted.")
        return redirect(url_for("course_detail", course_id=course.id))

    @app.route("/api/courses/<int:course_id>/review", methods=["POST"])
    @login_required
    def api_submit_review(course_id):
        course = Course.query.get_or_404(course_id)
        data = request.get_json(silent=True) or request.form
        comment = str(data.get("comment", data.get("text", ""))).strip()
        language = str(data.get("language", "English")).strip() or "English"

        try:
            rating = int(data.get("rating", ""))
        except (TypeError, ValueError):
            return jsonify({"error": "Rating must be a number between 1 and 5."}), 400

        if rating < 1 or rating > 5:
            return jsonify({"error": "Rating must be between 1 and 5."}), 400

        review = Review(
            course_id=course.id,
            user_id=current_user.id,
            rating=rating,
            language=language,
            text=comment,
        )
        db.session.add(review)
        db.session.commit()
        return jsonify({
            "review": serialize_review(review),
            "course": serialize_course(course),
        }), 201

    def can_modify_review(review):
        return (
            current_user.is_authenticated
            and (review.user_id == current_user.id or is_admin())
        )

    @app.route("/api/reviews/<int:review_id>", methods=["PATCH"])
    @login_required
    def api_update_review(review_id):
        review = Review.query.get_or_404(review_id)
        if not review.is_visible:
            return jsonify({"error": "Review not found."}), 404
        if not can_modify_review(review):
            return jsonify({"error": "You can only edit your own reviews."}), 403

        data = request.get_json(silent=True) or request.form
        text_value = str(data.get("text", data.get("comment", ""))).strip()
        if not text_value:
            return jsonify({"error": "Review text is required."}), 400

        review.text = text_value
        db.session.commit()
        return jsonify({
            "review": serialize_review(review),
            "course": serialize_course(review.course),
        })

    @app.route("/api/reviews/<int:review_id>", methods=["DELETE"])
    @login_required
    def api_delete_review(review_id):
        review = Review.query.get_or_404(review_id)
        if not review.is_visible:
            return jsonify({"ok": True})
        if not can_modify_review(review):
            return jsonify({"error": "You can only delete your own reviews."}), 403

        course = review.course
        review.is_visible = False
        db.session.commit()
        return jsonify({
            "ok": True,
            "reviewId": str(review.id),
            "course": serialize_course(course),
        })

    @app.route("/api/reviews/<int:review_id>/reply", methods=["POST"])
    @login_required
    def api_submit_reply(review_id):
        review = Review.query.get_or_404(review_id)
        if not review.is_visible:
            return jsonify({"error": "Review not found."}), 404
        data = request.get_json(silent=True) or request.form
        text_value = str(data.get("text", "")).strip()

        if not text_value:
            return jsonify({"error": "Reply text is required."}), 400

        reply = ReviewReply(
            review_id=review.id,
            user_id=current_user.id,
            text=text_value,
        )
        db.session.add(reply)
        if review.author and review.author.id != current_user.id:
            save_notification(
                review.author.id,
                f"{current_user.username} replied to your review on {review.course.title or review.course.code}.",
                link=url_for("course_detail", course_id=review.course_id),
                category="activity",
            )
        db.session.commit()
        return jsonify({
            "reply": serialize_reply(reply),
            "review": serialize_review(review),
        }), 201

    def save_reaction(user_id, reaction, review_id=None, reply_id=None):
        if not review_id and not reply_id:
            return None

        query = ReviewReaction.query.filter_by(user_id=user_id)
        if review_id:
            query = query.filter_by(review_id=review_id, reply_id=None)
        else:
            query = query.filter_by(review_id=None, reply_id=reply_id)

        existing = query.first()
        reaction_value = str(reaction or "").strip()
        if not reaction_value:
            if existing:
                db.session.delete(existing)
            return None

        if existing:
            existing.reaction = reaction_value
            return existing

        new_reaction = ReviewReaction(
            user_id=user_id,
            review_id=review_id,
            reply_id=reply_id,
            reaction=reaction_value,
        )
        db.session.add(new_reaction)
        return new_reaction

    @app.route("/api/reviews/<int:review_id>/reaction", methods=["POST"])
    @login_required
    def api_review_reaction(review_id):
        review = Review.query.get_or_404(review_id)
        if not review.is_visible:
            return jsonify({"error": "Review not found."}), 404
        data = request.get_json(silent=True) or request.form
        reaction_value = str(data.get("reaction", "")).strip()
        save_reaction(
            current_user.id,
            reaction_value,
            review_id=review.id,
        )
        if review.author and review.author.id != current_user.id and reaction_value:
            save_notification(
                review.author.id,
                f"{current_user.username} reacted {reaction_value} to your review on {review.course.title or review.course.code}.",
                link=url_for("course_detail", course_id=review.course_id),
                category="activity",
            )
        db.session.commit()
        return jsonify({"review": serialize_review(review)})

    @app.route("/api/replies/<int:reply_id>/reaction", methods=["POST"])
    @login_required
    def api_reply_reaction(reply_id):
        reply = ReviewReply.query.get_or_404(reply_id)
        data = request.get_json(silent=True) or request.form
        reaction_value = str(data.get("reaction", "")).strip()
        save_reaction(
            current_user.id,
            reaction_value,
            reply_id=reply.id,
        )
        if reply.author and reply.author.id != current_user.id and reaction_value:
            save_notification(
                reply.author.id,
                f"{current_user.username} reacted {reaction_value} to your comment.",
                link=url_for("course_detail", course_id=reply.review.course_id),
                category="activity",
            )
        db.session.commit()
        return jsonify({
            "reply": serialize_reply(reply),
            "review": serialize_review(reply.review),
        })

    @app.route("/api/notifications")
    @login_required
    def api_notifications():
        notifications = get_user_notifications(limit=30)
        unread_count = Notification.query.filter_by(user_id=current_user.id, is_read=False).count()
        serialized = [serialize_notification(n) for n in notifications]
        return jsonify({
            "notifications": serialized,
            "activity": serialized,
            "unreadCount": unread_count,
        })

    @app.route("/api/notifications/mark_read", methods=["POST"])
    @login_required
    def api_mark_notifications_read():
        data = request.get_json(silent=True) or request.form
        ids = data.get("ids")
        query = Notification.query.filter_by(user_id=current_user.id, is_read=False)
        if isinstance(ids, list) and ids:
            valid_ids = [int(item) for item in ids if str(item).isdigit()]
            if valid_ids:
                query = query.filter(Notification.id.in_(valid_ids))
        updated = query.update({"is_read": True}, synchronize_session=False)
        db.session.commit()
        return jsonify({"marked": updated})

    @app.route("/register", methods=["GET", "POST"])
    def register():
        if request.method == "POST":
            username = request.form.get("username", "").strip()
            email = request.form.get("email", "").strip().lower()
            password = request.form.get("password", "")
            confirm_password = request.form.get("confirm_password", "")

            if not username or not email or not password or not confirm_password:
                flash("All fields are required.")
                return render_template("register.html"), 400

            if not is_valid_email(email):
                flash("Please enter a valid email address.")
                return render_template("register.html"), 400

            if password != confirm_password:
                flash("Confirm password does not match the password.")
                return render_template("register.html"), 400

            if User.query.filter_by(username=username).first():
                flash("Username already exists.")
                return render_template("register.html"), 400

            if User.query.filter_by(email=email).first():
                flash("Email already registered.")
                return render_template("register.html"), 400

            user = User(
                username=username,
                email=email,
                password_hash=generate_password_hash(password, method="pbkdf2:sha256"),
            )
            db.session.add(user)
            db.session.commit()
            flash("Account created. Please log in.")
            return redirect(url_for("login"))

        return render_template("register.html")

    @app.route("/api/register", methods=["POST"])
    def api_register():
        data = request.get_json(silent=True) or request.form
        username = str(data.get("username", "")).strip()
        email = str(data.get("email", "")).strip().lower()
        password = str(data.get("password", ""))
        avatar_animal = str(data.get("avatarAnimal", "question")).strip()
        gender = str(data.get("gender", "undisclosed")).strip()

        if not username or not email or not password:
            return jsonify({"error": "All fields are required."}), 400

        if not is_valid_email(email):
            return jsonify({"error": "Please enter a valid email address."}), 400

        if User.query.filter_by(username=username).first():
            return jsonify({"error": "Username already exists."}), 400

        if User.query.filter_by(email=email).first():
            return jsonify({"error": "Email already registered."}), 400

        user = User(
            username=username,
            email=email,
            password_hash=generate_password_hash(password, method="pbkdf2:sha256"),
            avatar_animal=avatar_animal or "question",
            gender=gender or "undisclosed",
        )
        db.session.add(user)
        db.session.commit()
        login_user(user)
        return jsonify({"user": serialize_user(user)}), 201

    @app.route("/login", methods=["GET", "POST"])
    def login():
        if request.method == "POST":
            email = request.form.get("email", "").strip().lower()
            password = request.form.get("password", "")
            user = User.query.filter_by(email=email).first()

            if not user or not check_password_hash(user.password_hash, password):
                flash("Invalid email or password.")
                return render_template("login.html"), 401

            login_user(user)
            next_url = request.form.get("next") or request.args.get("next")
            if next_url and next_url.startswith("/"):
                return redirect(next_url)
            return redirect(url_for("index"))

        return render_template("login.html")

    @app.route("/api/login", methods=["POST"])
    def api_login():
        data = request.get_json(silent=True) or request.form
        email = str(data.get("email", "")).strip().lower()
        identifier = str(data.get("identifier", "")).strip()
        password = str(data.get("password", ""))

        user = None
        if email:
            user = User.query.filter_by(email=email).first()
        elif identifier:
            if "@" in identifier:
                user = User.query.filter_by(email=identifier.lower()).first()
            else:
                user = User.query.filter_by(username=identifier).first()

        if not user or not check_password_hash(user.password_hash, password):
            return jsonify({"error": "Invalid email or password."}), 401

        login_user(user)
        return jsonify({"user": serialize_user(user)})

    @app.route("/api/session")
    def api_session():
        if not current_user.is_authenticated:
            return jsonify({"authenticated": False, "user": None})
        return jsonify({"authenticated": True, "user": serialize_user(current_user)})

    @app.route("/logout")
    @login_required
    def logout():
        logout_user()
        return redirect(url_for("login"))

    @app.route("/api/logout", methods=["POST"])
    @login_required
    def api_logout():
        logout_user()
        return jsonify({"ok": True})

    @app.route("/api/profile", methods=["PATCH"])
    @login_required
    def api_profile():
        data = request.get_json(silent=True) or {}
        username = str(data.get("username", "")).strip()
        avatar_animal = str(data.get("avatarAnimal", "")).strip()
        gender = str(data.get("gender", "")).strip()

        if username:
            if username != current_user.username and User.query.filter_by(
                username=username
            ).first():
                return jsonify({"error": "Username already exists."}), 400
            current_user.username = username

        if avatar_animal:
            current_user.avatar_animal = avatar_animal
        if gender:
            current_user.gender = gender

        db.session.commit()
        return jsonify({"user": serialize_user(current_user)})

    def is_admin():
        return current_user.is_authenticated and getattr(current_user, 'role', 'student') == "admin"

    def admin_required_json():
        if not is_admin():
            return jsonify({"error": "Admin access required."}), 403
        return None

    def parse_optional_int(value, field_name):
        value = str(value or "").strip()
        if not value:
            return None
        try:
            return int(value)
        except ValueError:
            raise ValueError(f"{field_name} must be a number.")

    def get_course_admin_data():
        data = request.get_json(silent=True) or request.form
        return {
            "code": str(data.get("code", "")).strip(),
            "title": str(data.get("title", "")).strip(),
            "title_zh": str(data.get("title_zh", data.get("titleZh", ""))).strip() or None,
            "professor": str(data.get("professor", "")).strip() or None,
            "department": str(data.get("department", "")).strip() or None,
            "credits": parse_optional_int(data.get("credits"), "Credits"),
            "year": parse_optional_int(data.get("year"), "Year"),
            "semester": parse_optional_int(data.get("semester"), "Semester"),
            "grade": str(data.get("grade", "")).strip() or None,
            "requirement": str(data.get("requirement", "")).strip() or None,
            "description": str(data.get("description", "")).strip() or None,
            "english_taught": bool(data.get("english_taught", data.get("englishTaught", False))),
        }

    def apply_course_admin_data(course, data, require_identity=False):
        if require_identity and (not data["code"] or not data["title"]):
            raise ValueError("Course code and title are required.")
        if data["code"]:
            course.code = data["code"]
        if data["title"]:
            course.title = data["title"]
        course.title_zh = data["title_zh"]
        course.professor = data["professor"]
        course.department = data["department"]
        course.credits = data["credits"]
        course.year = data["year"]
        course.semester = data["semester"]
        course.grade = data["grade"]
        course.requirement = data["requirement"]
        course.description = data["description"]
        course.english_taught = data["english_taught"]
        return course

    @app.route("/api/admin/courses", methods=["POST"])
    @login_required
    def api_admin_add_course():
        access_error = admin_required_json()
        if access_error:
            return access_error

        try:
            data = get_course_admin_data()
            course = apply_course_admin_data(Course(), data, require_identity=True)
            db.session.add(course)
            db.session.commit()
        except ValueError as error:
            return jsonify({"error": str(error)}), 400
        except IntegrityError:
            db.session.rollback()
            return jsonify({"error": "A course with the same code, year, and semester already exists."}), 400

        return jsonify({"course": serialize_course(course)}), 201

    @app.route("/api/admin/courses/<int:course_id>", methods=["PATCH"])
    @login_required
    def api_admin_edit_course(course_id):
        access_error = admin_required_json()
        if access_error:
            return access_error

        course = Course.query.get_or_404(course_id)
        try:
            apply_course_admin_data(course, get_course_admin_data())
            db.session.commit()
        except ValueError as error:
            return jsonify({"error": str(error)}), 400
        except IntegrityError:
            db.session.rollback()
            return jsonify({"error": "A course with the same code, year, and semester already exists."}), 400

        return jsonify({"course": serialize_course(course)})

    @app.route("/api/admin/courses/<int:course_id>", methods=["DELETE"])
    @login_required
    def api_admin_delete_course(course_id):
        access_error = admin_required_json()
        if access_error:
            return access_error

        course = Course.query.get_or_404(course_id)
        db.session.delete(course)
        db.session.commit()
        return jsonify({"ok": True, "courseId": course_id})

    @app.route("/admin/courses/add", methods=["POST"])
    @login_required
    def admin_add_course():
        if not is_admin():
            flash("權限不足：僅限管理員操作 (Access denied)")
            return redirect(url_for("index"))

        code = str(request.form.get("code", "")).strip()
        title = str(request.form.get("title", "")).strip()
        title_zh = str(request.form.get("title_zh", "")).strip() or None
        professor = str(request.form.get("professor", "")).strip() or None
        department = str(request.form.get("department", "")).strip() or None
        credits_raw = request.form.get("credits", "").strip()
        year_raw = request.form.get("year", "").strip()
        semester_raw = request.form.get("semester", "").strip()
        grade = str(request.form.get("grade", "")).strip() or None
        requirement = str(request.form.get("requirement", "")).strip() or None
        description = str(request.form.get("description", "")).strip() or None
        english_taught = bool(request.form.get("english_taught"))

        credits = None
        if credits_raw:
            try:
                credits = int(credits_raw)
            except ValueError:
                credits = None

        year = None
        if year_raw:
            try:
                year = int(year_raw)
            except ValueError:
                year = None

        semester = None
        if semester_raw:
            try:
                semester = int(semester_raw)
            except ValueError:
                semester = None

        if code and title:
            new_course = Course(
                code=code,
                title=title,
                title_zh=title_zh,
                professor=professor,
                department=department,
                credits=credits,
                year=year,
                semester=semester,
                grade=grade,
                requirement=requirement,
                english_taught=english_taught,
                description=description,
            )
            db.session.add(new_course)
            db.session.commit()
            flash("Course added successfully.")
        else:
            flash("Please provide both code and title.")

        return redirect(url_for("courses"))

    @app.route("/admin/courses/<int:course_id>/edit", methods=["POST"])
    @login_required
    def admin_edit_course(course_id):
        if not is_admin():
            flash("權限不足：僅限管理員操作 (Access denied)")
            return redirect(url_for("index"))

        course = Course.query.get_or_404(course_id)
        code = str(request.form.get("code", "")).strip()
        title = str(request.form.get("title", "")).strip()
        title_zh = str(request.form.get("title_zh", "")).strip() or None
        professor = str(request.form.get("professor", "")).strip() or None
        department = str(request.form.get("department", "")).strip() or None
        credits_raw = request.form.get("credits", "").strip()
        year_raw = request.form.get("year", "").strip()
        semester_raw = request.form.get("semester", "").strip()
        grade = str(request.form.get("grade", "")).strip() or None
        requirement = str(request.form.get("requirement", "")).strip() or None
        description = str(request.form.get("description", "")).strip() or None
        english_taught = bool(request.form.get("english_taught"))

        if code:
            course.code = code
        if title:
            course.title = title
        course.title_zh = title_zh
        course.professor = professor
        course.department = department
        course.grade = grade
        course.requirement = requirement
        course.description = description
        course.english_taught = english_taught

        try:
            course.credits = int(credits_raw) if credits_raw else None
        except ValueError:
            pass

        try:
            course.year = int(year_raw) if year_raw else None
        except ValueError:
            pass

        try:
            course.semester = int(semester_raw) if semester_raw else None
        except ValueError:
            pass

        db.session.commit()
        flash("Course updated successfully.")
        return redirect(url_for("course_detail", course_id=course.id))

    @app.route("/admin/courses/<int:course_id>/delete", methods=["POST"])
    @login_required
    def admin_delete_course(course_id):
        if not is_admin():
            flash("權限不足：僅限管理員操作 (Access denied)")
            return redirect(url_for("index"))

        course = Course.query.get_or_404(course_id)
        db.session.delete(course)
        db.session.commit()
        flash("Course deleted successfully.")
        return redirect(url_for("courses"))
    
    @app.route("/admin/reviews/<int:review_id>/hide", methods=["POST"])
    @login_required
    def admin_hide_review(review_id):
        if not is_admin():
            flash("權限不足：僅限管理員操作 (Access denied)")
            return redirect(url_for("index"))

        review = Review.query.get_or_404(review_id)
        review.is_visible = False
        db.session.commit()
        flash("Review has been hidden.")
        return redirect(request.referrer or url_for("index"))

    @app.route("/admin/reviews/<int:review_id>/delete", methods=["POST"])
    @login_required
    def admin_delete_review(review_id):
        if not is_admin():
            flash("權限不足：僅限管理員操作 (Access denied)")
            return redirect(url_for("index"))

        review = Review.query.get_or_404(review_id)
        db.session.delete(review)
        db.session.commit()
        flash("Review deleted permanently.")
        return redirect(request.referrer or url_for("index"))
    
    @app.route("/profile")
    @login_required
    def profile():
        return render_template("profile.html")

    @app.cli.command("init-db")
    def init_db():
        with app.app_context():
            db.create_all()
        print(f"Initialized database at {db_path}")

    @app.cli.command("seed-nsysu")
    def seed_nsysu():
# 💡 採用後端同學的提示：目前專案已切換至整合完畢的 12354.db 主資料庫
        print("12354.db already contains the normalized NSYSU course data.")
        print("Run `flask init-db` only if you need Flask to create missing tables.")

        # =========================================================================
        # 備用資產：如果你未來需要重新從 "NSYSU Course Database" 資料夾解析原始檔案，
        # 可以將下方你寫的精準解析引擎解除註解（請注意：執行時會清空現有 Review 與 Course 資料）
        # =========================================================================
        # base_dir = Path(app.root_path) / "NSYSU Course Database"
        # db_files = sorted(base_dir.glob("NSYSU_Course_*.db"))
        # if not db_files:
        #     print("No NSYSU database files found.")
        #     return
        #
        # with app.app_context():
        #     db.create_all()
        #     Review.query.delete()
        #     Course.query.delete()
        #     db.session.commit()
        #
        #     seen = set()
        #     for db_file in db_files:
        #         year, semester = parse_term_from_filename(db_file)
        #         conn = sqlite3.connect(db_file)
        #         conn.row_factory = sqlite3.Row
        #         cur = conn.cursor()
        #         cur.execute(
        #             "SELECT id, name, department, teacher, credit, grade, compulsory, english, description FROM course_list"
        #         )
        #         for row in cur.fetchall():
        #             code = str(row["id"] or "").strip()
        #             if not code:
        #                 continue
        #             key = (code, year, semester)
        #             if key in seen:
        #                 continue
        #             title, title_zh = split_course_name(row["name"])
        #             course = Course(
        #                 code=code,
        #                 title=title or title_zh or code,
        #                 title_zh=title_zh or None,
        #                 professor=str(row["teacher"] or "").strip() or None,
        #                 department=str(row["department"] or "").strip() or None,
        #                 credits=parse_credits(row["credit"]),
        #                 year=year,
        #                 semester=semester,
        #                 grade=normalize_grade(row["grade"]),
        #                 requirement=parse_requirement(row["compulsory"]),
        #                 english_taught=parse_bool(row["english"]),
        #                 description=str(row["description"] or "").strip() or None,
        #             )
        #             db.session.add(course)
        #             seen.add(key)
        #         conn.close()
        #
        #     db.session.commit()
        #     print(f"Seeded {len(seen)} courses from {len(db_files)} files.")

    return app


if __name__ == "__main__":
    create_app().run(debug=True)
