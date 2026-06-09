import json
import os
import re
import sqlite3
from pathlib import Path
from flask import Flask, flash, jsonify, redirect, render_template, request, url_for
from flask_login import (
    LoginManager,
    current_user,
    login_required,
    login_user,
    logout_user,
)
from sqlalchemy import and_, func, inspect, or_, text
from sqlalchemy.orm import selectinload
from sqlalchemy.exc import IntegrityError
from werkzeug.security import check_password_hash, generate_password_hash
from functools import cmp_to_key

from models import (
    Course,
    Department,
    Favorite,
    Instructor,
    Notification,
    Offer,
    Review,
    ReviewReaction,
    ReviewReply,
    Section,
    Teach,
    User,
    db,
)
from utils.course_utils import (
    clean_professor_name,
    format_grade_tag,
    is_valid_email,
    parse_sport_activity,
    parse_term_from_filename,
)
from utils.department_filters import (
    DEPARTMENT_CATEGORY_ORDER,
    DEPARTMENT_GROUP_FILTERS,
    OTHER_DEPARTMENT_ORDER,
    PROGRAM_COLLEGE_DEPARTMENTS,
    UNDERGRAD_COLLEGE_DEPARTMENTS,
    classify_department,
)


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
        user_columns = get_table_columns("User")
        if "role" not in user_columns:
            db.session.execute(
                text("ALTER TABLE \"User\" ADD COLUMN role VARCHAR(16) DEFAULT 'student'")
            )
            
        if "avatarAnimal" not in user_columns:
            db.session.execute(
                text("ALTER TABLE \"User\" ADD COLUMN avatarAnimal TEXT DEFAULT 'question'")
            )
        if "gender" not in user_columns:
            db.session.execute(
                text("ALTER TABLE \"User\" ADD COLUMN gender TEXT DEFAULT 'undisclosed'")
            )

        db.session.commit()

    def ensure_course_schema():
        columns = get_table_columns("Course")
        if "grade" not in columns:
            db.session.execute(text("ALTER TABLE \"Course\" ADD COLUMN grade VARCHAR(16)"))
        if "requirement" not in columns:
            db.session.execute(
                text("ALTER TABLE \"Course\" ADD COLUMN requirement VARCHAR(16)")
            )
        if "english_taught" not in columns:
            db.session.execute(
                text("ALTER TABLE \"Course\" ADD COLUMN english_taught BOOLEAN DEFAULT 0")
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

    def ensure_notifications_table():
        inspector = inspect(db.engine)
        if "notifications" not in inspector.get_table_names():
            db.session.execute(text("""
                CREATE TABLE notifications (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    userId INTEGER NOT NULL,
                    category VARCHAR(32) NOT NULL DEFAULT 'notification',
                    message TEXT NOT NULL,
                    link VARCHAR(255) DEFAULT '',
                    is_read BOOLEAN DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (userId) REFERENCES "User"(userId)
                )
            """))
            db.session.commit()
            print("Created notifications table")

    with app.app_context():
        db.create_all()
        ensure_app_schema()
        ensure_course_schema()
        ensure_admin_user()
        ensure_notifications_table()

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
        if "is_visible" not in columns:
            db.session.execute(
                text("ALTER TABLE Review ADD COLUMN is_visible BOOLEAN DEFAULT 1")
            )
        if "ratingQuality" not in columns:
            db.session.execute(text("ALTER TABLE Review ADD COLUMN ratingQuality INTEGER"))
        if "ratingSweetness" not in columns:
            db.session.execute(text("ALTER TABLE Review ADD COLUMN ratingSweetness INTEGER"))
        if "ratingCoolness" not in columns:
            db.session.execute(text("ALTER TABLE Review ADD COLUMN ratingCoolness INTEGER"))
        if "ratingSolidity" not in columns:
            db.session.execute(text("ALTER TABLE Review ADD COLUMN ratingSolidity INTEGER"))
        if "updatedAt" not in columns:
            db.session.execute(text("ALTER TABLE Review ADD COLUMN updatedAt DATETIME"))
        db.session.commit()

        rows = Review.query.filter((Review.reaction_counts.is_(None)) | (Review.reaction_counts == ""))
        for review in rows:
            review.reaction_counts = json.dumps({})
        db.session.commit()

        # Ensure ReviewReply has reaction columns
        try:
            reply_columns = {column["name"] for column in inspector.get_columns("ReviewReply")}
        except Exception:
            reply_columns = set()
        if "reactionCounts" not in reply_columns:
            db.session.execute(
                text("ALTER TABLE ReviewReply ADD COLUMN reactionCounts TEXT NOT NULL DEFAULT '{}'")
            )
        if "userReactions" not in reply_columns:
            db.session.execute(
                text("ALTER TABLE ReviewReply ADD COLUMN userReactions TEXT NOT NULL DEFAULT '{}'")
            )
        if "is_visible" not in reply_columns:
            db.session.execute(
                text("ALTER TABLE ReviewReply ADD COLUMN is_visible BOOLEAN DEFAULT 1")
            )
        db.session.commit()

    with app.app_context():
        db.create_all()
        ensure_review_schema()

    @app.route("/")
    def index():
        payload = get_courses_payload(page=1, per_page=60)
        return render_template(
            "index.html",
            courses_json=payload["courses"],
            reviews_json=payload["reviews"],
            course_pagination_json=payload["pagination"],
            department_groups=get_department_groups(),
            sport_activity_options=get_sport_activity_options(),
            latest_course_year=get_latest_course_year(),
            current_user_json=(
                serialize_user(current_user)
                if current_user.is_authenticated
                else None
            ),
        )

    def get_latest_course_year():
        return db.session.query(func.max(Section.roc_year)).scalar() or 0

    def get_department_groups():
        rows = (
            db.session.query(Department.name, func.count(Course.course_id).label("total"))
            .join(Offer, Offer.dept_id == Department.dept_id)
            .join(Course, Course.course_id == Offer.course_id)
            .filter(Department.name.isnot(None), Department.name != "")
            .group_by(Department.name)
            .order_by(func.count(Course.course_id).desc(), Department.name.asc())
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
        department_names = {
            item["name"]
            for items in get_department_groups().values()
            for item in items
        }

        if department_group in UNDERGRAD_COLLEGE_DEPARTMENTS:
            return [
                department
                for department in UNDERGRAD_COLLEGE_DEPARTMENTS[department_group]
                if department in department_names
            ]

        if ":" in department_group:
            category, college = department_group.split(":", 1)
            college_departments = PROGRAM_COLLEGE_DEPARTMENTS.get(category, {}).get(college)
            if college_departments is not None:
                return [
                    department
                    for department in college_departments
                    if department in department_names
                ]

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
        # 運動課程透過 Offers->Department 篩選，courseName 即為中文名稱
        sport_depts = ["運動健康(必)", "運動進階(選)"]
        rows = (
            db.session.query(Course.name, func.count(Course.course_id).label("total"))
            .join(Offer, Offer.course_id == Course.course_id)
            .join(Department, Department.dept_id == Offer.dept_id)
            .filter(Department.name.in_(sport_depts))
            .group_by(Course.name)
            .order_by(func.count(Course.course_id).desc(), Course.name.asc())
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
        query = db.session.query(Favorite.course_id, func.count(Favorite.id))
        if course_ids:
            query = query.filter(Favorite.course_id.in_(course_ids))
        rows = query.group_by(Favorite.course_id).all()
        return {course_id: count for course_id, count in rows}

    def user_favorite_course_ids(course_ids=None):
        if not current_user.is_authenticated:
            return set()
        query = db.session.query(Favorite.course_id).filter(
            Favorite.user_id == current_user.id
        )
        if course_ids:
            query = query.filter(Favorite.course_id.in_(course_ids))
        return {course_id for (course_id,) in query.all()}

    def serialize_course(course, review_stats=None, favorite_counts=None, favorite_course_ids=None):
        review_count = 0
        average_rating = 0
        if review_stats is not None:
            review_count, average_rating = review_stats.get(course.course_id, (0, 0))
        else:
            reviews = reviews_for_course(course.course_id).all()
            ratings = [review.rating for review in reviews if review.rating]
            review_count = len(reviews)
            average_rating = sum(ratings) / len(ratings) if ratings else 0

        if favorite_counts is not None:
            save_count = favorite_counts.get(course.course_id, 0)
        else:
            save_count = Favorite.query.filter_by(course_id=course.course_id).count()

        if favorite_course_ids is not None:
            followed = course.course_id in favorite_course_ids
        else:
            # 這裡的邏輯非常重要，確保 Favorite 表裡面真的有這一筆資料
            followed = (
                current_user.is_authenticated
                and Favorite.query.filter_by(course_id=course.course_id, user_id=current_user.id).first() is not None
            )
            
        grade_value = course.grade or (str(course.year_level) if course.year_level else "")
        grade_tag = format_grade_tag(grade_value)

        # 校際課程直接顯示「校際課程」，不顯示教授名
        dept_str = course.department or ""
        is_intercollegiate = "校際" in dept_str

        if is_intercollegiate:
            professor_name = "校際課程"
        else:
            # 只取最新 section 的教授，避免把所有學期的教授全部串在一起
            latest = course.latest_section
            if latest:
                names = [
                    clean_professor_name(i.name)
                    for i in latest.instructors
                    if i and i.name
                ]
                professor_name = "、".join(dict.fromkeys(n for n in names if n))
            else:
                professor_name = ""


        return {
            "id": course.course_id,
            "code": course.code,
            "title": course.title,
            "titleZh": course.title_zh or "",
            "professor": professor_name,
            "department": course.department or "General",
            "credits": course.credits or 0,
            "grade": grade_value,
            "requirement": course.requirement or course.course_type or "",
            "courseType": course.course_type or "",
            "englishTaught": bool(course.english_taught),
            "rating": round(float(average_rating or 0), 1),
            "reviewCount": int(review_count or 0),
            "commentTotal": int(review_count or 0),
            "followed": followed,
            "saveCount": int(save_count or 0),
            "year": course.year or 0,
            "semester": course.semester or 0,

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
            "description": getattr(course, "description", None) or "No description available.",
        }

    raw_course_meeting_cache = {}
    raw_program_tag_search_cache = {}

    def parse_course_room(raw_room):
        room_text = str(raw_room or "").strip()
        if not room_text:
            return "", ""

        match = re.match(r"^([^()]+?)(?:\(([^()]*)\))?$", room_text)
        if not match:
            return room_text, ""

        time_text = re.sub(r"^([一二三四五六日])", r"\1 ", match.group(1).strip())
        location_text = (match.group(2) or "").strip()
        return time_text, location_text

    def get_raw_course_meeting(code, year, semester):
        if not (code and year and semester):
            return {"classTime": "", "location": "", "rawRoom": "", "programTags": []}

        cache_key = (str(code), int(year), int(semester))
        if cache_key in raw_course_meeting_cache:
            return raw_course_meeting_cache[cache_key]

        result = {"classTime": "", "location": "", "rawRoom": "", "programTags": []}
        base_dir = Path(app.root_path) / "NSYSU Course Database"
        if not base_dir.exists():
            raw_course_meeting_cache[cache_key] = result
            return result

        for db_file in sorted(base_dir.glob("NSYSU_Course_*.db")):
            file_year, file_semester = parse_term_from_filename(db_file)
            if file_year != int(year) or file_semester != int(semester):
                continue
            conn = None
            try:
                conn = sqlite3.connect(db_file)
                conn.row_factory = sqlite3.Row
                row = conn.execute(
                    "SELECT room, classTime, tags FROM course_list WHERE id = ? LIMIT 1",
                    (str(code),),
                ).fetchone()
            except sqlite3.Error:
                row = None
            finally:
                if conn is not None:
                    try:
                        conn.close()
                    except Exception:
                        pass
            if row:
                parsed_time, parsed_location = parse_course_room(row["room"])
                raw_tags = str(row["tags"] or "").strip()
                result = {
                    "classTime": parsed_time or str(row["classTime"] or "").strip(),
                    "location": parsed_location,
                    "rawRoom": str(row["room"] or "").strip(),
                    "programTags": [tag.strip() for tag in raw_tags.split(",") if tag.strip()],
                }
                break

        raw_course_meeting_cache[cache_key] = result
        return result


    def find_course_codes_by_program_tag(term):
        cleaned = str(term or "").strip()
        if not cleaned:
            return set()
        if cleaned in raw_program_tag_search_cache:
            return raw_program_tag_search_cache[cleaned]

        matched_codes = set()
        base_dir = Path(app.root_path) / "NSYSU Course Database"
        if not base_dir.exists():
            raw_program_tag_search_cache[cleaned] = matched_codes
            return matched_codes

        for db_file in sorted(base_dir.glob("NSYSU_Course_*.db")):
            conn = None
            try:
                conn = sqlite3.connect(db_file)
                rows = conn.execute(
                    "SELECT id FROM course_list WHERE tags LIKE ?",
                    (f"%{cleaned}%",),
                ).fetchall()
            except sqlite3.Error:
                rows = []
            finally:
                if conn is not None:
                    try:
                        conn.close()
                    except Exception:
                        pass
            for row in rows:
                if row and row[0]:
                    matched_codes.add(str(row[0]).strip())

        raw_program_tag_search_cache[cleaned] = matched_codes
        return matched_codes

    def display_course_group_key(course):
  
        prof_names = []
        for s in course.sections:
            for i in s.instructors:
                if i and i.name:
                    cleaned = clean_professor_name(i.name)
                    if cleaned and cleaned not in prof_names:
                        prof_names.append(cleaned)
        prof_names.sort()
  
        title_key = re.sub(r"\s+", " ", (course.title or course.name or "").strip()).casefold()
        prof_key = "|".join(prof_names).casefold()
        
        dept_str = course.department or ""
        if "校際" in dept_str or not prof_key:
            return (f"unique_course_{course.course_id}_{title_key}", "none")
            
       
        return (title_key, prof_key)
    
    def build_course_display_groups(courses):
        groups = []
        group_lookup = {}
        for course in courses:
            key = display_course_group_key(course)
            if key not in group_lookup:
                group_lookup[key] = {"representative": course, "courses": [], "codes": []}
                groups.append(group_lookup[key])
            group = group_lookup[key]
            group["courses"].append(course)
            if course.code and course.code not in group["codes"]:
                group["codes"].append(course.code)
        return groups

    def serialize_course_display_group(group, reviews_by_course=None, favorite_counts=None, favorite_course_ids=None):
        representative = group["representative"]
        course_ids = [course.course_id for course in group["courses"]]
        payload = serialize_course(
            representative,
            favorite_counts=favorite_counts,
            favorite_course_ids=favorite_course_ids,
        )

        all_ratings = []
        total_reviews = 0
        
        for course_id in course_ids:
            serialized_reviews = (reviews_by_course or {}).get(str(course_id), [])
            total_reviews += len(serialized_reviews)
            for review in serialized_reviews:
                rating = review.get("rating")
                if rating:
                    all_ratings.append(float(rating))


        departments = []
        history_terms = []
        program_tags = []
        
        for c in group["courses"]:
            if c.department and c.department not in departments:
                departments.append(c.department)
                
            for section in c.sections:
                if not section.roc_year or not section.term:
                    continue
                    
                term_label = f"{section.roc_year} S{section.term}"
                
               
                meeting_data = get_raw_course_meeting(c.code, section.roc_year, section.term)
                for tag in meeting_data.get("programTags", []):
                    if tag not in program_tags:
                        program_tags.append(tag)
                

                prof_names = [clean_professor_name(i.name) for i in section.instructors if i and i.name]
                prof_text = "、".join(dict.fromkeys(n for n in prof_names if n))
                
                term_info = {
                    "year": section.roc_year,
                    "semester": section.term,
                    "label": term_label,
                    "professorText": prof_text,
                    "classTime": meeting_data.get("classTime", ""),
                    "location": meeting_data.get("location", ""),
                    "rawRoom": meeting_data.get("rawRoom", ""),
                    "searchValue": term_label
                }
                

                if not any(t["year"] == section.roc_year and t["semester"] == section.term for t in history_terms):
                    history_terms.append(term_info)
                    
        # 依年份和學期由新到舊排序，抓出最新的一學期
        history_terms.sort(key=lambda x: (x["year"], x["semester"]), reverse=True)
        latest_term = history_terms[0] if history_terms else None
        # ────────────────────────────────────────────────

        payload["codes"] = group["codes"]
        payload["groupCourseIds"] = course_ids
        payload["code"] = group["codes"][0] if group["codes"] else payload.get("code", "")
        
        if latest_term:
            payload["year"] = latest_term["year"]
            payload["semester"] = latest_term["semester"]
            payload["latestTerm"] = latest_term["label"]
            payload["professor"] = latest_term["professorText"]
            payload["classTime"] = latest_term["classTime"]
            payload["location"] = latest_term["location"]
            payload["rawRoom"] = latest_term["rawRoom"]
            
        payload["historyTerms"] = history_terms
        
        if departments:
            payload["department"] = "、".join(departments)

        payload["tags"] = program_tags
            
        payload["reviewCount"] = total_reviews
        # 嚴謹模式：留言總數等於主評價數量
        payload["commentTotal"] = total_reviews 
        payload["rating"] = round(sum(all_ratings) / len(all_ratings), 1) if all_ratings else 0
        payload["saveCount"] = int(sum((favorite_counts or {}).get(course_id, 0) for course_id in course_ids))
        payload["followed"] = any(course_id in (favorite_course_ids or set()) for course_id in course_ids)
        
        return payload
    
    def summarize_reactions(reactions):
        counts = {}
        for reaction in reactions or []:
            if not reaction.emoji:
                continue
            counts[reaction.emoji] = counts.get(reaction.emoji, 0) + 1
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
            
            "avatar": {
                "avatarAnimal": author.avatar_animal if author else "question",
                "gender": author.gender if author else "undisclosed",
            },
            "rating": review.rating,
            "ratingQuality": review.rating_quality,
            "ratingSweetness": review.rating_sweetness,
            "ratingCoolness": review.rating_coolness,
            "ratingSolidity": review.rating_solidity,
            "date": (review.created_at + __import__("datetime").timedelta(hours=8)).strftime("%Y-%m-%d %H:%M") if review.created_at else "",
            "updatedAt": (review.updated_at + __import__("datetime").timedelta(hours=8)).strftime("%Y-%m-%d %H:%M") if review.updated_at and review.updated_at != review.created_at else None,
            "sectionLabel": section_label,
            "language": review.language or "English",
            "text": review.text,
            "likes": sum(reaction_totals.values()),
            "liked": bool(user_reaction),
            "reaction": user_reaction or "",
            "reactionCounts": reaction_totals,
            "reactionSummary": summarize_reactions(review.reactions),
            "parentId": getattr(review, 'parent_id', None),
            "replies": [
                serialize_reply(reply, current_user_id=current_user_id)
                for reply in sorted(review.review_replies, key=lambda item: item.created_at or review.created_at)
            ],
        }

    

    def serialize_reply(reply, current_user_id=None):
        author = reply.author
        try:
            reaction_totals = json.loads(reply.reaction_counts or "{}")
        except (TypeError, ValueError):
            reaction_totals = {}
        try:
            user_reactions = json.loads(reply.user_reactions or "{}")
        except (TypeError, ValueError):
            user_reactions = {}
        user_reaction = user_reactions.get(str(current_user_id)) if current_user_id else None
        total_likes = sum(reaction_totals.values())
        reaction_summary = [
            {"reaction": emoji, "count": count}
            for emoji, count in sorted(reaction_totals.items(), key=lambda x: (-x[1], x[0]))
        ]
        return {
            "id": str(reply.id),
            "author": author.username if author else "Anonymous",
            "avatar": {
                "avatarAnimal": author.avatar_animal if author else "question",
                "gender": author.gender if author else "undisclosed",
            },
            "text": reply.text,
            "date": (reply.created_at + __import__("datetime").timedelta(hours=8)).strftime("%Y-%m-%d %H:%M") if reply.created_at else "",
            "reviewId": str(reply.review_id),
            "likes": total_likes,
            "liked": bool(user_reaction),
            "reaction": user_reaction or "",
            "reactionCounts": reaction_totals,
            "reactionSummary": reaction_summary,
        }

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
                Favorite.course_id.label("course_id"),
                func.count(Favorite.id).label("save_count"),
            )
            .group_by(Favorite.course_id)
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
            .filter(
                Section.course_id == course_id,
                Review.parent_id.is_(None),
                Review.is_visible.isnot(False),  # FIX: 過濾管理員隱藏的留言
            )
            .order_by(Review.created_at.desc())
        )

 

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
        per_page = min(60, max(1, int(per_page or request.args.get("per_page", 60))))
        query_text = str(request.args.get("q", "")).strip()
        year = str(request.args.get("year", "")).strip()
        grade = str(request.args.get("grade", "")).strip()
        department_category = str(request.args.get("department_category", "")).strip()
        department_group = str(request.args.get("department_group", "")).strip()
        department = str(request.args.get("department", "")).strip()
        sport_activity = str(request.args.get("sport_activity", "")).strip()
        semester = str(request.args.get("semester", "")).strip()
        min_rating_raw = str(request.args.get("min_rating", "")).strip()
        
        sort_by = str(request.args.get("sort", "popular")).strip() or "popular"

        from models import Section, Review
        
        visible_review_cond = and_(
            Review.parent_id.is_(None),
            Review.is_visible.isnot(False),
        )
        
        # 建立精確的基礎計分欄位（只看主評價）
        avg_rating = func.coalesce(func.avg(Review.rating).filter(visible_review_cond), 0)
        review_count = func.count(Review.review_id).filter(visible_review_cond)
        latest_review_time = func.coalesce(func.max(Review.created_at).filter(visible_review_cond), "1970-01-01 00:00:00")
        
        fav_sq = favorite_stats_subquery()

        # 基礎統計查詢（不 JOIN 子回覆表，維持嚴謹模式）
        id_query = (
            db.session.query(
                Course.course_id, 
                Course.code, 
                Course.name,
                review_count.label("rev_cnt"),
                avg_rating.label("avg_rat"),
                func.coalesce(fav_sq.c.save_count, 0).label("fav_cnt"),
                latest_review_time.label("lat_rev")
            )
            .outerjoin(Section, Section.course_id == Course.course_id)
            .outerjoin(Review, Review.section_id == Section.section_id)
            .outerjoin(fav_sq, fav_sq.c.course_id == Course.course_id)
            .group_by(Course.course_id)
        )

        # 注入過濾條件
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
                search_filters.append(Course.year_level == int(query_text.replace("年級", "")))
            else:
                for token in tokens:
                    lower = token.lower()
                    if lower.isdigit() and len(lower) == 3:
                        search_filters.append(Course.sections.any(Section.roc_year == int(lower)))
                        continue
                    if lower in {"s1", "sem1", "semester1"}:
                        search_filters.append(Course.sections.any(Section.term == 1))
                        continue
                    if lower in {"s2", "sem2", "semester2"}:
                        search_filters.append(Course.sections.any(Section.term == 2))
                        continue
                    text_terms.append(token)

                for term in text_terms:
                    pattern = f"%{term}%"
                    program_codes = find_course_codes_by_program_tag(term)
                    search_targets = [
                        Course.name.ilike(pattern),
                        Course.code.ilike(pattern),
                        Course.offers.any(Offer.department.has(Department.name.ilike(pattern))),
                        Course.sections.any(Section.teaches.any(Teach.instructor.has(Instructor.name.ilike(pattern)))),
                    ]
                    if program_codes:
                        search_targets.append(Course.code.in_(program_codes))
                    search_filters.append(or_(*search_targets))
            if search_filters:
                filters.extend(search_filters)

        if year:
            filters.append(Course.sections.any(Section.roc_year == int(year)))
        if grade:
            filters.append(Course.year_level == int(grade))
        if department_category:
            cat_depts = get_departments_by_category(department_category)
            filters.append(Course.offers.any(Offer.department.has(Department.name.in_(cat_depts))) if cat_depts else Course.course_id == -1)
        if department_group:
            grp_depts = get_departments_by_group(department_group)
            filters.append(Course.offers.any(Offer.department.has(Department.name.in_(grp_depts))) if grp_depts else Course.course_id == -1)
        if department:
            filters.append(Course.offers.any(Offer.department.has(Department.name == department)))
        if sport_activity:
            filters.append(Course.name.ilike(f"%{sport_activity}%"))
        if semester:
            filters.append(Course.sections.any(Section.term == int(semester)))
        
        if filters:
            id_query = id_query.filter(and_(*filters))
        if min_rating_raw:
            id_query = id_query.having(avg_rating >= float(min_rating_raw))

        id_rows = id_query.all()
        all_id_set = [row.course_id for row in id_rows]

        all_courses_for_group = (
            Course.query
            .options(
                selectinload(Course.offers).selectinload(Offer.department),
                selectinload(Course.sections).selectinload(Section.teaches).selectinload(Teach.instructor),
            )
            .filter(Course.course_id.in_(all_id_set))
            .all()
        )

        stat_map = {
            row.course_id: {
                "rev_cnt": row.rev_cnt,
                "avg_rat": row.avg_rat,
                "fav_cnt": row.fav_cnt,
                "lat_rev": row.lat_rev
            } for row in id_rows
        }

        group_lookup = {}
        ordered_keys = []
        
        for course in all_courses_for_group:
            key = display_course_group_key(course)
            stats = stat_map.get(course.course_id, {"rev_cnt": 0, "avg_rat": 0, "fav_cnt": 0, "lat_rev": "1970-01-01 00:00:00"})
            
            if key not in group_lookup:
                group_lookup[key] = {
                    "courses": [course],
                    "total_rev": stats["rev_cnt"],
                    "total_fav": stats["fav_cnt"],
                    "max_lat_rev": stats["lat_rev"],
                    "ratings_list": [stats["avg_rat"]] if stats["rev_cnt"] > 0 else []
                }
                ordered_keys.append(key)
            else:
                g = group_lookup[key]
                g["courses"].append(course)
                g["total_rev"] += stats["rev_cnt"]
                g["total_fav"] += stats["fav_cnt"]
                if stats["lat_rev"] > g["max_lat_rev"]:
                    g["max_lat_rev"] = stats["lat_rev"]
                if stats["rev_cnt"] > 0:
                    g["ratings_list"].append(stats["avg_rat"])

    
        def compare_hottest(k1, k2):
            g1, g2 = group_lookup[k1], group_lookup[k2]
            score1 = g1["total_rev"] + g1["total_fav"]
            score2 = g2["total_rev"] + g2["total_fav"]
            
            if score1 != score2:
                return -1 if score1 > score2 else 1
            if g1["max_lat_rev"] != g2["max_lat_rev"]:
                return -1 if g1["max_lat_rev"] > g2["max_lat_rev"] else 1
            return -1 if g1["courses"][0].course_id < g2["courses"][0].course_id else 1

        def compare_latest(k1, k2):
            g1, g2 = group_lookup[k1], group_lookup[k2]
            if g1["max_lat_rev"] != g2["max_lat_rev"]:
                return -1 if g1["max_lat_rev"] > g2["max_lat_rev"] else 1
            
            score1 = g1["total_rev"] + g1["total_fav"]
            score2 = g2["total_rev"] + g2["total_fav"]
            if score1 != score2:
                return -1 if score1 > score2 else 1
            return -1 if g1["courses"][0].course_id < g2["courses"][0].course_id else 1

        def compare_rating(k1, k2):
            g1, g2 = group_lookup[k1], group_lookup[k2]
            def get_avg(lst):
                return sum(lst) / len(lst) if lst else 0
            avg1 = get_avg(g1["ratings_list"])
            avg2 = get_avg(g2["ratings_list"])
            
            if avg1 != avg2:
                return -1 if avg1 > avg2 else 1
            if g1["total_rev"] != g2["total_rev"]:
                return -1 if g1["total_rev"] > g2["total_rev"] else 1
            return -1 if g1["courses"][0].course_id < g2["courses"][0].course_id else 1

        # ── 執行精確排序 ──
        if sort_by == "latest":
            ordered_keys.sort(key=cmp_to_key(compare_latest))
        elif sort_by == "rating":
            ordered_keys.sort(key=cmp_to_key(compare_rating))
        else:
            ordered_keys.sort(key=cmp_to_key(compare_hottest))

        # ── 這裡就是上一輪被截斷的結尾：處理分頁與回傳 Payload ──
        total = len(ordered_keys)
        total_pages = max(1, (total + per_page - 1) // per_page)
        page = min(page, total_pages)
        
        page_keys = ordered_keys[(page - 1) * per_page: page * per_page]
        
        serialized_groups = []
        reviews_by_course = {}
        
        page_all_cids = []
        for k in page_keys:
            page_all_cids.extend([c.course_id for c in group_lookup[k]["courses"]])

        favorite_counts = {}
        favorite_ids = set()
        if page_all_cids:
            favorite_counts = {cid: count for cid, count in db.session.query(Favorite.course_id, func.count(Favorite.id)).filter(Favorite.course_id.in_(page_all_cids)).group_by(Favorite.course_id).all()}
            if current_user.is_authenticated:
                favorite_ids = {cid for (cid,) in db.session.query(Favorite.course_id).filter(Favorite.user_id == current_user.id, Favorite.course_id.in_(page_all_cids)).all()}

            current_user_id = current_user.id if current_user.is_authenticated else None
            for r in Review.query.join(Section).filter(Section.course_id.in_(page_all_cids), visible_review_cond).order_by(Review.created_at.desc()).all():
                reviews_by_course.setdefault(str(r.course_id), []).append(serialize_review(r, current_user_id=current_user_id))

        for k in page_keys:
            g_data = group_lookup[k]
            fake_group = {
                "representative": g_data["courses"][0],
                "courses": g_data["courses"],
                "codes": list(dict.fromkeys([c.code for c in g_data["courses"] if c.code]))
            }
            serialized_groups.append(
                serialize_course_display_group(
                    fake_group,
                    reviews_by_course=reviews_by_course,
                    favorite_counts=favorite_counts,
                    favorite_course_ids=favorite_ids
                )
            )

        representative_reviews = {}
        for k in page_keys:
            g_data = group_lookup[k]
            rep_id = str(g_data["courses"][0].course_id)
            
            combined_reviews = []
            for sub_course in g_data["courses"]:
                sub_id = str(sub_course.course_id)
                if sub_id in reviews_by_course:
                    combined_reviews.extend(reviews_by_course[sub_id])
            
            combined_reviews.sort(key=lambda x: x.get("created_at", ""), reverse=True)
            representative_reviews[rep_id] = combined_reviews

        return {
            "courses": serialized_groups,
            "reviews": representative_reviews,
            "pagination": {
                "page": page,
                "perPage": per_page,
                "total": total,
                "totalPages": total_pages,
            },
        }
                    
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
                    filters.append(Course.sections.any(Section.roc_year == year_val))
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
        favorite_counts = favorite_counts_for_courses([course.course_id for course in courses_list])
        return render_template(
            "courses.html",
            courses=courses_list,
            q=query,
            favorite_counts=favorite_counts,
        )

    @app.route("/api/courses")
    def api_courses():
        try:
            return jsonify(get_courses_payload())
        except ValueError as error:
            return jsonify({"error": str(error)}), 400

    @app.route("/api/courses/<int:course_id>/favorite", methods=["POST"])
    @login_required
    def api_toggle_course_favorite(course_id):
        course = Course.query.get_or_404(course_id)
        payload = request.get_json(silent=True) or {}
        wanted = payload.get("followed")
        existing = Favorite.query.filter_by(
            course_id=course.course_id,
            user_id=current_user.id,
        ).first()

        if wanted is None:
            should_follow = existing is None
        else:
            should_follow = bool(wanted)

        if should_follow and existing is None:
            db.session.add(Favorite(course_id=course.course_id, user_id=current_user.id))
        elif not should_follow and existing is not None:
            db.session.delete(existing)

        db.session.commit()
        save_count = Favorite.query.filter_by(course_id=course.course_id).count()
        return jsonify(
            {
                "courseId": course.course_id,
                "followed": should_follow,
                "saveCount": save_count,
            }
        )

    @app.route("/api/user/favorites")
    @login_required
    def api_user_favorites():
        """Return all favorited courses for the current user (no pagination)."""
        favorite_course_ids = {
            course_id
            for (course_id,) in db.session.query(Favorite.course_id)
            .filter(Favorite.user_id == current_user.id)
            .all()
        }
        if not favorite_course_ids:
            return jsonify({"courses": []})

        courses_list = Course.query.filter(
            Course.course_id.in_(favorite_course_ids)
        ).all()

        fav_counts = {
            course_id: total
            for course_id, total in (
                db.session.query(Favorite.course_id, func.count(Favorite.id))
                .filter(Favorite.course_id.in_(favorite_course_ids))
                .group_by(Favorite.course_id)
                .all()
            )
        }

        return jsonify({
            "courses": [
                serialize_course(
                    course,
                    favorite_counts=fav_counts,
                    favorite_course_ids=favorite_course_ids,
                )
                for course in courses_list
            ]
        })

    @app.route("/api/courses/<int:course_id>")
    def api_get_course(course_id):
        course = Course.query.options(
            selectinload(Course.offers).selectinload(Offer.department),
            selectinload(Course.sections)
            .selectinload(Section.teaches)
            .selectinload(Teach.instructor),
        ).get_or_404(course_id)
        fav_counts = {course_id: Favorite.query.filter_by(course_id=course_id).count()}
        fav_ids = user_favorite_course_ids([course_id])
        # Use serialize_course_display_group so historyTerms is included
        group = {"representative": course, "courses": [course], "codes": [course.code]}
        serialized = serialize_course_display_group(
            group,
            favorite_counts=fav_counts,
            favorite_course_ids=fav_ids,
        )
        return jsonify({"course": serialized})

    @app.route("/api/user/activity")
    @login_required
    def api_user_activity():
        """Return the current user's personal activity log.

        personal_actions: things the user did themselves
          - favorites: courses they saved (with timestamp)
          - reviews: reviews/ratings they wrote
          - reactions: emoji reactions they gave to others' reviews

        interactions: notifications received from others (replies, reactions on your reviews)
          - comes from Notification model with category="activity"
        """
        uid = current_user.id

        # ── 1. Favorites ────────────────────────────────────────────────────────
        favorites = (
            Favorite.query
            .filter_by(user_id=uid)
            .order_by(Favorite.created_at.desc())
            .limit(50)
            .all()
        )
        fav_course_ids = [f.course_id for f in favorites]
        fav_courses = {}
        if fav_course_ids:
            for course in Course.query.filter(Course.course_id.in_(fav_course_ids)).all():
                fav_courses[course.course_id] = course

        personal_actions = []
        for fav in favorites:
            course = fav_courses.get(fav.course_id)
            if not course:
                continue
            personal_actions.append({
                "type": "favorite",
                "icon": "⭐",
                "message": f"You saved <strong>{course.name}</strong>",
                "courseId": course.course_id,
                "courseName": course.name,
                "courseCode": course.code,
                "link": f"/courses/{course.course_id}",
                "createdAt": fav.created_at.strftime("%Y-%m-%d %H:%M") if fav.created_at else "",
            })

        # ── 2. Reviews the user wrote ────────────────────────────────────────────
        reviews = (
            Review.query
            .options(selectinload(Review.section).selectinload(Section.course))
            .filter(Review.user_id == uid, Review.parent_id.is_(None))
            .order_by(Review.created_at.desc())
            .limit(50)
            .all()
        )
        for review in reviews:
            course = review.course
            if not course:
                continue
            personal_actions.append({
                "type": "review",
                "icon": "✍️",
                "message": f"You reviewed <strong>{course.name}</strong>",
                "courseId": course.course_id,
                "courseName": course.name,
                "courseCode": course.code,
                "rating": review.rating,
                "ratingStars": "★" * (review.rating or 0) + "☆" * (5 - (review.rating or 0)),
                "reviewSnippet": (review.text or "")[:80] + ("…" if len(review.text or "") > 80 else ""),
                "link": f"/courses/{course.course_id}",
                "createdAt": review.created_at.strftime("%Y-%m-%d %H:%M") if review.created_at else "",
            })

        # ── 3. Reactions the user gave ───────────────────────────────────────────
        reactions = (
            ReviewReaction.query
            .options(
                selectinload(ReviewReaction.review)
                .selectinload(Review.section)
                .selectinload(Section.course)
            )
            .filter(ReviewReaction.user_id == uid)
            .order_by(ReviewReaction.created_at.desc())
            .limit(50)
            .all()
        )
        for rxn in reactions:
            review = rxn.review
            if not review or not review.course:
                continue
            course = review.course
            personal_actions.append({
                "type": "reaction",
                "icon": rxn.emoji,
                "message": f"You reacted {rxn.emoji} to a review on <strong>{course.name}</strong>",
                "courseId": course.course_id,
                "courseName": course.name,
                "courseCode": course.code,
                "emoji": rxn.emoji,
                "link": f"/courses/{course.course_id}",
                "createdAt": rxn.created_at.strftime("%Y-%m-%d %H:%M") if rxn.created_at else "",
            })

        # Sort all personal actions by date desc
        personal_actions.sort(key=lambda x: x.get("createdAt", ""), reverse=True)

        # ── 4. Interactions: notifications received ──────────────────────────────
        notifications = (
            Notification.query
            .filter_by(user_id=uid, category="activity")
            .order_by(Notification.created_at.desc())
            .limit(50)
            .all()
        )
        interactions = [serialize_notification(n) for n in notifications]
        unread_interaction_count = Notification.query.filter_by(
            user_id=uid, category="activity", is_read=False
        ).count()

        return jsonify({
            "personalActions": personal_actions,
            "interactions": interactions,
            "unreadInteractionCount": unread_interaction_count,
        })

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
        try:
            reviews = reviews_for_course(course_id).all()
            rated = [r for r in reviews if r.rating]
            average_rating = sum(r.rating for r in rated) / len(rated) if rated else 0
            current_user_id = current_user.id if current_user.is_authenticated else None
            return jsonify(
                {
                    "courseId": course.course_id,
                    "reviewCount": len(reviews),
                    "averageRating": round(float(average_rating), 1),
                    "reviews": [serialize_review(review, current_user_id=current_user_id) for review in reviews],
                }
            )
        except Exception as e:
            import traceback
            return jsonify({"error": str(e), "trace": traceback.format_exc()}), 500

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
        rating_quality = rating_sweetness = rating_coolness = rating_solidity = None
        if parent_id is None:
            def parse_rating(key):
                val = str(payload.get(key, request.form.get(key, ""))).strip()
                try:
                    v = int(val)
                    return v if 1 <= v <= 5 else None
                except ValueError:
                    return None

            rating_quality   = parse_rating("ratingQuality")
            rating_sweetness = parse_rating("ratingSweetness")
            rating_coolness  = parse_rating("ratingCoolness")
            rating_solidity  = parse_rating("ratingSolidity")

            scores = [x for x in [rating_quality, rating_sweetness, rating_coolness, rating_solidity] if x]
            if not scores:
                return jsonify({"error": "Please rate all four dimensions."}), 400
            rating = round(sum(scores) / len(scores))
        else:
            parent_review = Review.query.get(parent_id)
            if parent_review is None:
                return jsonify({"error": "Parent review not found."}), 404
            if parent_review.course_id != course.course_id:
                return jsonify({"error": "Parent review does not belong to this course."}), 400
            section_id = parent_review.section_id

        review = Review(
            section_id=section_id,
            user_id=current_user.id,
            parent_id=parent_id,
            rating=rating,
            rating_quality=rating_quality,
            rating_sweetness=rating_sweetness,
            rating_coolness=rating_coolness,
            rating_solidity=rating_solidity,
            text=comment,
        )
        db.session.add(review)
        db.session.commit()

        reviews = reviews_for_course(course_id).all()
        average_rating = (
            sum(r.rating for r in reviews if r.rating) / len([r for r in reviews if r.rating])
            if any(r.rating for r in reviews)
            else 0
        )
        current_user_id = current_user.id if current_user.is_authenticated else None
        return jsonify(
            {
                "courseId": course.course_id,
                "reviewCount": len(reviews),
                "averageRating": round(float(average_rating), 1),
                "review": serialize_review(review, current_user_id=current_user_id),
                "reviews": [serialize_review(review_item, current_user_id=current_user_id) for review_item in reviews],
            }
        )

    @app.route("/api/courses/<int:course_id>/reviews/<int:review_id>", methods=["PATCH"])
    @login_required
    def api_update_course_review(course_id, review_id):
        course = Course.query.get_or_404(course_id)
        review = (
            Review.query.join(Section)
            .filter(Review.review_id == review_id, Section.course_id == course.course_id)
            .first_or_404()
        )
        if review.user_id != current_user.id:
            return jsonify({"error": "You can only edit your own review."}), 403

        payload = request.get_json(silent=True) or {}
        new_text = str(payload.get("text", "")).strip()
        if not new_text:
            return jsonify({"error": "Review text is required."}), 400

        review.text = new_text
        review.updated_at = __import__('datetime').datetime.utcnow()
        db.session.commit()

        reviews = reviews_for_course(course_id).all()
        average_rating = (
            sum(r.rating for r in reviews if r.rating) / len([r for r in reviews if r.rating])
            if any(r.rating for r in reviews)
            else 0
        )
        current_user_id = current_user.id if current_user.is_authenticated else None
        return jsonify(
            {
                "courseId": course.course_id,
                "reviewCount": len(reviews),
                "averageRating": round(float(average_rating), 1),
                "review": serialize_review(review, current_user_id=current_user_id),
                "reviews": [serialize_review(review_item, current_user_id=current_user_id) for review_item in reviews],
            }
        )

    @app.route("/api/courses/<int:course_id>/reviews/<int:review_id>", methods=["DELETE"])
    @login_required
    def api_delete_course_review(course_id, review_id):
        course = Course.query.get_or_404(course_id)
        review = (
            Review.query.join(Section)
            .filter(Review.review_id == review_id, Section.course_id == course.course_id)
            .first_or_404()
        )
        if review.user_id != current_user.id:
            return jsonify({"error": "You can only delete your own review."}), 403

        db.session.delete(review)
        db.session.commit()

        reviews = reviews_for_course(course_id).all()
        average_rating = (
            sum(r.rating for r in reviews if r.rating) / len([r for r in reviews if r.rating])
            if any(r.rating for r in reviews)
            else 0
        )
        current_user_id = current_user.id if current_user.is_authenticated else None
        return jsonify(
            {
                "courseId": course.course_id,
                "reviewCount": len(reviews),
                "averageRating": round(float(average_rating), 1),
                # FIX: 不再序列化已刪除的 review 物件，改回傳被刪除的 id
                "deletedReviewId": str(review_id),
                "reviews": [serialize_review(review_item, current_user_id=current_user_id) for review_item in reviews],
            }
        )

    @app.route("/api/courses/<int:course_id>/reviews/<int:review_id>/reactions", methods=["POST"])
    @login_required
    def api_react_to_review(course_id, review_id):
        course = Course.query.get_or_404(course_id)
        review = (
            Review.query.join(Section)
            .filter(Review.review_id == review_id, Section.course_id == course.course_id)
            .first_or_404()
        )
        payload = request.get_json(silent=True) or {}
        reaction = str(payload.get("reaction", "")).strip()
        remove = bool(payload.get("remove"))
        allowed_reactions = {"❤️", "🙂", "😮", "😭", "👍", "🔥"}

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
            return redirect(url_for("course_detail", course_id=course.course_id))

        rating_raw = request.form.get("rating", "").strip()
        comment = request.form.get("comment", "").strip()
        language = request.form.get("language", "English").strip() or "English"

        try:
            rating = int(rating_raw)
        except ValueError:
            flash("Rating must be a number between 1 and 5.")
            return redirect(url_for("course_detail", course_id=course.course_id))

        if rating < 1 or rating > 5:
            flash("Rating must be between 1 and 5.")
            return redirect(url_for("course_detail", course_id=course.course_id))

        if not comment:
            flash("Review text is required.")
            return redirect(url_for("course_detail", course_id=course.course_id))

        review = Review(
            section_id=section.section_id,
            user_id=current_user.id,
            rating=rating,
            text=comment,
        )
        db.session.add(review)
        db.session.commit()
        flash("Review submitted.")
        return redirect(url_for("course_detail", course_id=course.course_id))

    @app.route("/api/courses/<int:course_id>/review", methods=["POST"])
    @login_required
    def api_submit_review(course_id):
        course = Course.query.get_or_404(course_id)
        section = course.latest_section
        if not section:
            return jsonify({"error": "This course has no section to review."}), 400

      
        existing_review = Review.query.filter(
            Review.section_id == section.section_id,
            Review.user_id == current_user.id,
            Review.is_visible.isnot(False),
        ).first()
        
        if existing_review:
            return jsonify({"error": "You have already submitted a review for this course. Multiple reviews are not allowed."}), 400

        # ---- 底下維持你原本的計算與防禦邏輯 ----
        data = request.get_json(silent=True) or request.form
        comment = str(data.get("comment", data.get("text", ""))).strip()

        def parse_dim(key):
            try:
                v = int(data.get(key, ""))
                return v if 1 <= v <= 5 else None
            except (TypeError, ValueError):
                return None

        rating_quality   = parse_dim("ratingQuality")
        rating_sweetness = parse_dim("ratingSweetness")
        rating_coolness  = parse_dim("ratingCoolness")
        rating_solidity  = parse_dim("ratingSolidity")

        scores = [x for x in [rating_quality, rating_sweetness, rating_coolness, rating_solidity] if x]
        if not scores:
            return jsonify({"error": "Please rate all four dimensions."}), 400
        rating = round(sum(scores) / len(scores))

        review = Review(
            section_id=section.section_id,
            user_id=current_user.id,
            rating=rating,
            rating_quality=rating_quality,
            rating_sweetness=rating_sweetness,
            rating_coolness=rating_coolness,
            rating_solidity=rating_solidity,
            text=comment,
        )
        
        try:
            db.session.add(review)
            db.session.commit()
        except IntegrityError: # 雙重保險：如果因併發衝突觸發資料庫 Unique 限制
            db.session.rollback()
            return jsonify({"error": "You have already reviewed this course."}), 400

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
        review.updated_at = __import__('datetime').datetime.utcnow()
        db.session.commit()
        return jsonify({
            "review": serialize_review(review),
            "course": serialize_course(review.course),
        })

    @app.route("/api/reviews/<int:review_id>", methods=["DELETE"])
    @login_required
    def api_delete_review(review_id):
        review = Review.query.get_or_404(review_id)
        if not can_modify_review(review):
            return jsonify({"error": "You can only delete your own reviews."}), 403

        course = review.course
        db.session.delete(review)
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
            "reply": serialize_reply(reply, current_user_id=current_user.id),
            "review": serialize_review(review, current_user_id=current_user.id),
        }), 201

    def save_reaction(user_id, reaction, review_id=None, reply_id=None):
        if not review_id and not reply_id:
            return None
        if reply_id:
            return None

        query = ReviewReaction.query.filter_by(user_id=user_id)
        if review_id:
            query = query.filter_by(review_id=review_id)

        existing = query.first()
        reaction_value = str(reaction or "").strip()
        if not reaction_value:
            if existing:
                db.session.delete(existing)
            return None

        if existing:
            existing.emoji = reaction_value
            return existing

        new_reaction = ReviewReaction(
            user_id=user_id,
            review_id=review_id,
            emoji=reaction_value,
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
        allowed_reactions = {"❤️", "🙂", "😮", "😭", "👍", "🔥"}

        reaction_totals = review.reaction_totals or {}
        existing = ReviewReaction.query.filter_by(
            review_id=review.id, user_id=current_user.id
        ).first()

        notify_reaction = None

        if not reaction_value:
            # 清除 reaction
            if existing:
                old = existing.emoji
                reaction_totals[old] = max(0, reaction_totals.get(old, 1) - 1)
                if reaction_totals[old] == 0:
                    del reaction_totals[old]
                db.session.delete(existing)
        elif reaction_value not in allowed_reactions:
            return jsonify({"error": "Unsupported reaction."}), 400
        elif existing is None:
            # 新增
            db.session.add(ReviewReaction(
                review_id=review.id, user_id=current_user.id, emoji=reaction_value
            ))
            reaction_totals[reaction_value] = reaction_totals.get(reaction_value, 0) + 1
            notify_reaction = reaction_value
        elif existing.emoji == reaction_value:
            # toggle off（取消同一個 emoji）
            reaction_totals[reaction_value] = max(0, reaction_totals.get(reaction_value, 1) - 1)
            if reaction_totals[reaction_value] == 0:
                del reaction_totals[reaction_value]
            db.session.delete(existing)
        else:
            # 換成不同 emoji
            old = existing.emoji
            reaction_totals[old] = max(0, reaction_totals.get(old, 1) - 1)
            if reaction_totals[old] == 0:
                del reaction_totals[old]
            reaction_totals[reaction_value] = reaction_totals.get(reaction_value, 0) + 1
            existing.emoji = reaction_value
            notify_reaction = reaction_value

        review.reaction_counts = json.dumps(reaction_totals)

        if notify_reaction and review.author and review.author.id != current_user.id:
            save_notification(
                review.author.id,
                f"{current_user.username} reacted {notify_reaction} to your review on {review.course.title or review.course.code}.",
                link=url_for("course_detail", course_id=review.course_id),
                category="activity",
            )
        db.session.commit()
        current_user_id = current_user.id if current_user.is_authenticated else None
        return jsonify({"review": serialize_review(review, current_user_id=current_user_id)})

    @app.route("/api/replies/<int:reply_id>", methods=["PATCH"])
    @login_required
    def api_update_reply(reply_id):
        reply = ReviewReply.query.get_or_404(reply_id)
        if reply.user_id != current_user.id and not is_admin():
            return jsonify({"error": "You can only edit your own replies."}), 403
        data = request.get_json(silent=True) or request.form
        text_value = str(data.get("text", "")).strip()
        if not text_value:
            return jsonify({"error": "Reply text is required."}), 400
        reply.text = text_value
        db.session.commit()
        current_user_id = current_user.id if current_user.is_authenticated else None
        return jsonify({
            "reply": serialize_reply(reply, current_user_id=current_user_id),
            "review": serialize_review(reply.review, current_user_id=current_user_id),
        })

    @app.route("/api/replies/<int:reply_id>", methods=["DELETE"])
    @login_required
    def api_delete_reply(reply_id):
        reply = ReviewReply.query.get_or_404(reply_id)
        if reply.user_id != current_user.id and not is_admin():
            return jsonify({"error": "You can only delete your own replies."}), 403
        review = reply.review
        db.session.delete(reply)
        db.session.commit()
        current_user_id = current_user.id if current_user.is_authenticated else None
        return jsonify({
            "ok": True,
            "replyId": str(reply_id),
            "review": serialize_review(review, current_user_id=current_user_id),
        })

    @app.route("/api/replies/<int:reply_id>/reaction", methods=["POST"])
    @login_required
    def api_reply_reaction(reply_id):
        reply = ReviewReply.query.get_or_404(reply_id)
        data = request.get_json(silent=True) or request.form
        reaction_value = str(data.get("reaction", "")).strip()
        allowed_reactions = {"❤️", "🙂", "😮", "😭", "👍", "🔥"}

        # 從 JSON 欄位讀取目前計數
        try:
            reaction_totals = json.loads(reply.reaction_counts or "{}")
        except (TypeError, ValueError):
            reaction_totals = {}

        # 用 review_id + user_id + reply_id 的組合來查找既有 reaction
        # ReviewReaction 目前有 (reviewId, userId) unique constraint，
        # 我們借用它，但用 review_id=None 無法插入，故直接在 reply.reaction_counts JSON 記錄
        # 並用獨立欄位追蹤「此 user 對此 reply 的 reaction」
        # user 選擇記錄在額外的 user_reactions key 裡
        try:
            user_reactions = json.loads(reply.user_reactions or "{}")
        except (TypeError, ValueError):
            user_reactions = {}

        user_id_str = str(current_user.id)
        existing_emoji = user_reactions.get(user_id_str)
        notify_reaction = None

        if not reaction_value:
            # 清除
            if existing_emoji:
                reaction_totals[existing_emoji] = max(0, reaction_totals.get(existing_emoji, 1) - 1)
                if reaction_totals[existing_emoji] == 0:
                    del reaction_totals[existing_emoji]
                del user_reactions[user_id_str]
        elif reaction_value not in allowed_reactions:
            return jsonify({"error": "Unsupported reaction."}), 400
        elif existing_emoji is None:
            # 新增
            reaction_totals[reaction_value] = reaction_totals.get(reaction_value, 0) + 1
            user_reactions[user_id_str] = reaction_value
            notify_reaction = reaction_value
        elif existing_emoji == reaction_value:
            # toggle off
            reaction_totals[reaction_value] = max(0, reaction_totals.get(reaction_value, 1) - 1)
            if reaction_totals[reaction_value] == 0:
                del reaction_totals[reaction_value]
            del user_reactions[user_id_str]
        else:
            # 換 emoji
            reaction_totals[existing_emoji] = max(0, reaction_totals.get(existing_emoji, 1) - 1)
            if reaction_totals[existing_emoji] == 0:
                del reaction_totals[existing_emoji]
            reaction_totals[reaction_value] = reaction_totals.get(reaction_value, 0) + 1
            user_reactions[user_id_str] = reaction_value
            notify_reaction = reaction_value

        reply.reaction_counts = json.dumps(reaction_totals)
        reply.user_reactions = json.dumps(user_reactions)

        if notify_reaction and reply.author and reply.author.id != current_user.id:
            save_notification(
                reply.author.id,
                f"{current_user.username} reacted {notify_reaction} to your comment.",
                link=url_for("course_detail", course_id=reply.review.course_id),
                category="activity",
            )
        db.session.commit()
        return jsonify({
            "reply": serialize_reply(reply, current_user_id=current_user.id),
            "review": serialize_review(reply.review, current_user_id=current_user.id),
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
            course.name = data["title"]
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
        return redirect(url_for("course_detail", course_id=course.course_id))

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

        print("12354.db already contains the normalized NSYSU course data.")
        print("Run `flask init-db` only if you need Flask to create missing tables.")

        
    return app


if __name__ == "__main__":
    create_app().run(debug=True)