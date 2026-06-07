"""Department category and college filter configuration."""

DEPARTMENT_CATEGORY_ORDER = [
    "通識",
    "大學部",
    "碩士班",
    "碩專班",
    "博士班",
    "校際",
    "其他",
]

UNDERGRAD_COLLEGE_DEPARTMENTS = {
    "文學院": ["文學院", "中文系", "外文系", "音樂系", "劇藝系"],
    "理學院": ["理學院", "化學系", "物理系", "生科系", "應數系"],
    "工學院": ["資工系", "資工全英班", "電機系", "機電系", "材光系", "光電系"],
    "管理學院": ["管理學院", "企管系", "資管系", "財管系", "國際經營學程", "國際學士學程"],
    "海洋科學院": ["海科院（學）", "海資系", "海工系", "海科系"],
    "社會科學院": ["社科院", "政經系", "社會系"],
    "西灣學院": ["人科學程", "國際學士原民專班"],
    "醫學院": ["醫學院", "後醫學系", "生醫科技系", "護理系"],
}

UNDERGRAD_COLLEGE_ORDER = [
    "文學院",
    "理學院",
    "工學院",
    "半導體及重點科技研究學院",
    "管理學院",
    "國際金融研究學院",
    "海洋科學院",
    "社會科學院",
    "西灣學院",
    "醫學院",
    "其他",
]

UNDERGRAD_ASSIGNED_DEPARTMENTS = {
    department
    for departments in UNDERGRAD_COLLEGE_DEPARTMENTS.values()
    for department in departments
}

MASTER_COLLEGE_DEPARTMENTS = {
    "文學院": ["中文碩", "外文碩", "音樂碩", "劇藝碩", "哲學碩", "藝管創業所"],
    "理學院": ["化學碩", "物理碩", "生科碩", "應數碩"],
    "工學院": [
        "電機碩",
        "電機電力碩",
        "通訊碩",
        "電信碩程",
        "機電碩",
        "資工碩",
        "資安碩",
        "材光碩",
        "光電碩",
        "環工碩",
        "前瞻應材",
        "積體電路碩",
        "離岸風電碩",
        "緯創資通產碩",
        "零組件研究所",
    ],
    "半導體學院": ["半導體封測所", "半導體製造碩"],
    "管理學院": [
        "管理學院(碩)",
        "企企管碩",
        "企醫管碩",
        "資管碩",
        "財管碩",
        "行銷傳播碩",
        "金融創新產碩",
        "人管碩",
        "人管英語碩程",
    ],
    "國際金融學院": ["國際資產所", "數位金融所"],
    "海洋科學院": ["海資碩", "海工碩", "海科碩", "海事碩", "海生保育碩", "海下科技碩"],
    "社會科學院": ["政治碩", "經濟碩", "社會碩", "公事碩", "亞太碩", "亞太英語碩程", "教育碩", "教人全英碩"],
    "西灣學院": ["社會創新所"],
    "醫學院": ["生醫碩", "醫科碩", "精準醫學碩", "生技醫藥碩"],
}

MASTER_COLLEGE_ORDER = [
    "文學院",
    "理學院",
    "工學院",
    "管理學院",
    "海洋科學院",
    "社會科學院",
    "西灣學院",
    "醫學院",
    "半導體學院",
    "國際金融學院",
    "其他",
]

MASTER_ASSIGNED_DEPARTMENTS = {
    department
    for departments in MASTER_COLLEGE_DEPARTMENTS.values()
    for department in departments
}

PROFESSIONAL_MASTER_COLLEGE_DEPARTMENTS = {
    "文學院": [],
    "理學院": ["生科碩專"],
    "工學院": ["環工碩專", "資電碩專", "科技偵查碩專"],
    "管理學院": ["EMBA碩專", "中山同濟EMBA", "人管碩專", "人亞碩專", "財管碩專", "資管碩專", "行傳碩專"],
    "海洋科學院": [],
    "社會科學院": ["亞太碩專", "公事碩專", "政治碩專", "經濟碩專", "社會原碩專", "EMPP碩專", "教育碩專"],
    "西灣學院": [],
    "醫學院": [],
}

DOCTORAL_COLLEGE_DEPARTMENTS = {
    "文學院": ["中文博", "外文博", "哲學博"],
    "理學院": ["化學博", "物理博", "生科博", "應數博", "理學博"],
    "工學院": ["電機博", "通訊博", "機電博", "資工博", "資工資安博", "材光博", "光電博", "環工博"],
    "管理學院": ["企管博", "企醫管博", "人管博", "財管博", "資管博"],
    "海洋科學院": ["海資博", "海工博", "海科博", "海科全英博", "海生科技博士學程"],
    "社會科學院": ["亞太博", "政治博", "公事博", "教育博", "教人全英博"],
    "西灣學院": [],
    "醫學院": ["生醫博", "醫科博", "精準醫學博", "生技醫藥博", "臨床醫博學程"],
    "半導體學院": ["半導體製造博"],
    "國際金融學院": [],
}

PROGRAM_COLLEGE_DEPARTMENTS = {
    "碩士班": MASTER_COLLEGE_DEPARTMENTS,
    "碩專班": PROFESSIONAL_MASTER_COLLEGE_DEPARTMENTS,
    "博士班": DOCTORAL_COLLEGE_DEPARTMENTS,
}

PROGRAM_COLLEGE_ORDERS = {
    "碩士班": MASTER_COLLEGE_ORDER,
    "碩專班": [
        "文學院",
        "理學院",
        "工學院",
        "管理學院",
        "海洋科學院",
        "社會科學院",
        "西灣學院",
        "醫學院",
        "其他",
    ],
    "博士班": [
        "文學院",
        "理學院",
        "工學院",
        "管理學院",
        "海洋科學院",
        "社會科學院",
        "西灣學院",
        "醫學院",
        "半導體學院",
        "國際金融學院",
        "其他",
    ],
}

PROGRAM_ASSIGNED_DEPARTMENTS = {
    category: {
        department
        for departments in college_departments.values()
        for department in departments
    }
    for category, college_departments in PROGRAM_COLLEGE_DEPARTMENTS.items()
}


DEPARTMENT_GROUP_FILTERS = {
    "跨院選修": lambda dept: dept.startswith("跨院選修"),
    "博雅": lambda dept: dept.startswith("博雅"),
    "跨院EAP/ESP": lambda dept: dept in {"跨院EAP", "跨院ESP"},
    "運動健康": lambda dept: dept.startswith("運動健康") or dept.startswith("運動進階"),
    "英文": lambda dept: dept.startswith("英文"),
    **{
        college: (lambda dept, departments=departments: dept in departments)
        for college, departments in UNDERGRAD_COLLEGE_DEPARTMENTS.items()
    },
    **{
        f"{category}:{college}": (lambda dept, departments=departments: dept in departments)
        for category, college_departments in PROGRAM_COLLEGE_DEPARTMENTS.items()
        for college, departments in college_departments.items()
    },
    "其他": lambda dept: classify_department(dept) == "大學部" and dept not in UNDERGRAD_ASSIGNED_DEPARTMENTS,
    **{
        f"{category}:其他": (
            lambda dept, category=category: classify_department(dept) == category
            and dept not in PROGRAM_ASSIGNED_DEPARTMENTS[category]
        )
        for category in PROGRAM_COLLEGE_DEPARTMENTS
    },
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
