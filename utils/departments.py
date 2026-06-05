import re


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
