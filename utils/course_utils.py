import re


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
