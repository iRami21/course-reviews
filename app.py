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
from sqlalchemy import and_, func, or_
from werkzeug.security import check_password_hash, generate_password_hash

from models import Course, Review, User, db


def parse_term_from_filename(path):
	match = re.search(r"_(\d{4})\.db$", path.name)
	if not match:
		return None, None

	term = match.group(1)
	roc_year = int(term[:3])
	semester = int(term[3])
	return roc_year + 1911, semester


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
			current_user_json=(
				serialize_user(current_user)
				if current_user.is_authenticated
				else None
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

	def serialize_course(course):
		reviews = course.reviews or []
		average_rating = (
			sum(review.rating for review in reviews) / len(reviews)
			if reviews
			else 0
		)
		return {
			"id": course.id,
			"code": course.code,
			"title": course.title,
			"titleZh": course.title_zh or "",
			"professor": course.professor or "TBD",
			"department": course.department or "General",
			"credits": course.credits or 0,
			"rating": round(average_rating, 1),
			"reviewCount": len(reviews),
			"followed": False,
			"saveCount": 0,
			"year": course.year or 0,
			"semester": course.semester or 0,
			"tags": [
				tag
				for tag in [
					course.department,
					f"{course.year} S{course.semester}"
					if course.year and course.semester
					else None,
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
		department = str(request.args.get("department", "")).strip()
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
		if department:
			filters.append(Course.department == department)
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
		if course_ids:
			for review in (
				Review.query.filter(Review.course_id.in_(course_ids))
				.order_by(Review.created_at.desc())
				.all()
			):
				reviews_by_course.setdefault(str(review.course_id), []).append(
					serialize_review(review)
				)

		return {
			"courses": [serialize_course(course) for course in courses_list],
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
				if lower.isdigit() and len(lower) == 4:
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

			if not username or not email or not password:
				flash("All fields are required.")
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
					"SELECT id, name, department, teacher, credit, description FROM course_list"
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
