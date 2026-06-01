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
from sqlalchemy import and_, func, or_, text
from werkzeug.security import check_password_hash, generate_password_hash

from models import Course, Favorite, Review, User, db


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

	db_path = os.path.join(app.root_path, "app.db")
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

	def ensure_course_schema():
		columns = {
			row[1]
			for row in db.session.execute(text("PRAGMA table_info(courses)")).all()
		}
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

	with app.app_context():
		db.create_all()
		ensure_course_schema()

	@login_manager.user_loader
	def load_user(user_id):
		try:
			return db.session.get(User, int(user_id))
		except (TypeError, ValueError):
			return None

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
		}

	def serialize_course(course, favorite_counts=None, favorite_ids=None):
		reviews = course.reviews or []
		average_rating = (
			sum(review.rating for review in reviews) / len(reviews)
			if reviews
			else 0
		)
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
			"rating": round(average_rating, 1),
			"reviewCount": len(reviews),
			"followed": course.id in (favorite_ids or set()),
			"saveCount": (favorite_counts or {}).get(course.id, 0),
			"year": course.year or 0,
			"semester": course.semester or 0,
			"tags": [
				tag
				for tag in [
					course.department,
					f"{course.year} S{course.semester}"
					if course.year and course.semester
					else None,
					grade_tag,
					course.requirement,
					"全英授課" if course.english_taught else None,
				]
				if tag
			],
			"description": course.description or "No description available.",
		}

	def serialize_review(review):
		author = review.author
		return {
			"id": str(review.id),
			"author": author.username if author else "Anonymous",
			"avatar": {
				"avatarAnimal": author.avatar_animal if author else "question",
				"gender": author.gender if author else "undisclosed",
			},
			"rating": review.rating,
			"date": review.created_at.strftime("%Y-%m-%d"),
			"language": review.language or "English",
			"text": review.text,
			"likes": 0,
			"liked": False,
			"reaction": "",
			"replies": [],
		}

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
		courses_query = Course.query.outerjoin(Review).group_by(Course.id)

		filters = []
		if query_text:
			pattern = f"%{query_text}%"
			filters.append(
				or_(
					Course.title.ilike(pattern),
					Course.title_zh.ilike(pattern),
					Course.code.ilike(pattern),
					Course.department.ilike(pattern),
					Course.professor.ilike(pattern),
				)
			)
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
				Review.query.filter(Review.course_id.in_(course_ids))
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

			for token in tokens:
				lower = token.lower()
				if lower.isdigit():
					filters.append(Course.year == int(lower))
					continue

				if lower in {"s1", "sem1", "semester1", "semester-1", "semester_1"}:
					filters.append(Course.semester == 1)
					continue
				if lower in {"s2", "sem2", "semester2", "semester-2", "semester_2"}:
					filters.append(Course.semester == 2)
					continue

				text_terms.append(token)

			for term in text_terms:
				pattern = f"%{term}%"
				filters.append(
					or_(
						Course.title.ilike(pattern),
						Course.code.ilike(pattern),
						Course.department.ilike(pattern),
						Course.professor.ilike(pattern),
					)
				)

			if filters:
				courses_query = courses_query.filter(and_(*filters))

		courses_list = courses_query.order_by(Course.code).all()
		return render_template("courses.html", courses=courses_list, q=query)

	@app.route("/courses/<int:course_id>")
	def course_detail(course_id):
		course = Course.query.get_or_404(course_id)
		reviews = (
			Review.query.filter_by(course_id=course_id)
			.order_by(Review.created_at.desc())
			.all()
		)
		return render_template(
			"course_detail.html",
			course=course,
			reviews=reviews,
		)

	@app.route("/courses/<int:course_id>/review", methods=["POST"])
	@login_required
	def submit_review(course_id):
		course = Course.query.get_or_404(course_id)
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
			course_id=course.id,
			user_id=current_user.id,
			rating=rating,
			language=language,
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

		if not comment:
			return jsonify({"error": "Review text is required."}), 400

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

	@app.route("/admin/courses/add", methods=["POST"])
	@login_required
	def admin_add_course():
		if not is_admin():
			flash("權限不足：僅限管理員操作 (Access denied)")
			return redirect(url_for("index"))

		code = request.form.get("code")
		title = request.form.get("title")
		
		if code and title:
			new_course = Course(code=code, title=title)
			db.session.add(new_course)
			db.session.commit()
			flash("Course added successfully.")
		
		return redirect(url_for("courses"))

	@app.route("/admin/courses/<int:course_id>/edit", methods=["POST"])
	@login_required
	def admin_edit_course(course_id):
		if not is_admin():
			flash("權限不足：僅限管理員操作 (Access denied)")
			return redirect(url_for("index"))

		course = Course.query.get_or_404(course_id)
		new_title = request.form.get("title")
		if new_title:
			course.title = new_title
			
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
		base_dir = Path(app.root_path) / "NSYSU Course Database"
		db_files = sorted(base_dir.glob("NSYSU_Course_*.db"))
		if not db_files:
			print("No NSYSU database files found.")
			return

		with app.app_context():
			db.create_all()
			Review.query.delete()
			Course.query.delete()
			db.session.commit()

			seen = set()
			for db_file in db_files:
				year, semester = parse_term_from_filename(db_file)
				conn = sqlite3.connect(db_file)
				conn.row_factory = sqlite3.Row
				cur = conn.cursor()
				cur.execute(
					"SELECT id, name, department, teacher, credit, grade, compulsory, english, description FROM course_list"
				)
				for row in cur.fetchall():
					code = str(row["id"] or "").strip()
					if not code:
						continue
					key = (code, year, semester)
					if key in seen:
						continue
					title, title_zh = split_course_name(row["name"])
					course = Course(
						code=code,
						title=title or title_zh or code,
						title_zh=title_zh or None,
						professor=str(row["teacher"] or "").strip() or None,
						department=str(row["department"] or "").strip() or None,
						credits=parse_credits(row["credit"]),
						year=year,
						semester=semester,
						grade=normalize_grade(row["grade"]),
						requirement=parse_requirement(row["compulsory"]),
						english_taught=parse_bool(row["english"]),
						description=str(row["description"] or "").strip() or None,
					)
					db.session.add(course)
					seen.add(key)
				conn.close()

			db.session.commit()
			print(f"Seeded {len(seen)} courses from {len(db_files)} files.")

	return app


if __name__ == "__main__":
	create_app().run(debug=True)
